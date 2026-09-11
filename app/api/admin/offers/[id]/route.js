import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = (supabaseUrl && (supabaseServiceKey || supabaseAnonKey))
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  : null;

/**
 * Validates whether the caller has authenticated admin rights.
 */
async function isAuthorizedAdmin(request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) return false;

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  if (supabaseAdmin) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) return false;

      const email = user.email?.toLowerCase();
      if (email === "admin@devoranaturals.com") {
        return true;
      }

      if (user.user_metadata?.role === "admin" || user.app_metadata?.role === "admin") {
        return true;
      }
    } catch (e) {
      console.error("Token verification failed:", e);
    }
  }

  return false;
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!id && !code) {
      return NextResponse.json(
        { error: "Offer ID or discount code is required." },
        { status: 400 }
      );
    }

    const isAuthorized = await isAuthorizedAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Only authenticated admin users are allowed to delete coupons/offers." },
        { status: 403 }
      );
    }

    if (supabaseAdmin) {
      const isValidUUID = typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      // 1. Delete by UUID if id is a valid UUID
      if (isValidUUID) {
        const { error: idErr } = await supabaseAdmin
          .from("offers")
          .delete()
          .eq("id", id);
        if (idErr) {
          console.warn("Supabase delete offer by ID error:", idErr);
        }
      }

      // 2. Also delete by discountCode if provided or if code matches
      const targetCode = code || (isValidUUID ? null : id);
      if (targetCode) {
        const cleanCode = targetCode.trim().toUpperCase();
        const { error: codeErr } = await supabaseAdmin
          .from("offers")
          .delete()
          .ilike("discountCode", cleanCode);
        if (codeErr) {
          console.warn("Supabase delete offer by discountCode error:", codeErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Coupon/Offer ${id || code} deleted successfully.`,
      id,
      code,
    });
  } catch (err) {
    console.error("Unexpected error deleting offer:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete offer" },
      { status: 500 }
    );
  }
}
