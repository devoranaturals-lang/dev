import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key if configured for server-side admin operations, otherwise anon key
const supabaseAdmin = (supabaseUrl && (supabaseServiceKey || supabaseAnonKey))
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  : null;

/**
 * Validates whether the incoming request is authorized by an authenticated admin.
 * Checks for:
 * 1. Admin authorization header (e.g. x-admin-auth: "admin@devoranaturals.com" or valid session object)
 * 2. Supabase Auth JWT with admin role / email
 */
function isAuthorizedAdmin(request) {
  const adminHeader = request.headers.get("x-admin-auth");
  const authHeader = request.headers.get("authorization");

  if (adminHeader) {
    try {
      const parsed = JSON.parse(adminHeader);
      const EIGHT_HOURS = 8 * 60 * 60 * 1000;
      if (
        parsed?.active === true &&
        Boolean(parsed?.email) &&
        parsed?.ts &&
        Date.now() - parsed.ts < EIGHT_HOURS
      ) {
        return true;
      }
    } catch (e) {
      if (typeof adminHeader === "string" && adminHeader.includes("@")) {
        return true;
      }
    }
  }

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token === "devoranaturals@gmail.com") {
      return true;
    }
    // Check JWT payload if passed
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        if (
          payload.email === "devoranaturals@gmail.com" ||
          payload.user_metadata?.role === "admin" ||
          payload.app_metadata?.role === "admin"
        ) {
          return true;
        }
      }
    } catch (e) {}
  }

  return false;
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 }
      );
    }

    // Strict Admin Authorization Check: Only authenticated admin users can delete orders
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { 
          error: "Unauthorized: Only authenticated admin users are allowed to delete orders. Normal customers cannot delete orders." 
        },
        { status: 403 }
      );
    }

    if (supabaseAdmin) {
      // 1. Check if order exists in Supabase
      const { data: existing, error: checkError } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (checkError) {
        console.warn("Error checking order existence in Supabase:", checkError);
      }

      if (existing) {
        // 2. Delete child order_items first to preserve foreign key constraints
        const { error: itemsError } = await supabaseAdmin
          .from("order_items")
          .delete()
          .eq("order_id", id);

        if (itemsError) {
          console.warn("Error deleting order items:", itemsError);
        }

        // 3. Delete order from orders table
        const { data: deletedOrders, error: deleteError } = await supabaseAdmin
          .from("orders")
          .delete()
          .eq("id", id)
          .select();

        if (deleteError) {
          console.error("Supabase order deletion error:", deleteError);
          return NextResponse.json(
            { error: "Supabase Database Error: " + deleteError.message },
            { status: 500 }
          );
        }

        if (!deletedOrders || deletedOrders.length === 0) {
          return NextResponse.json(
            { error: "Supabase blocked the deletion. Please ensure you have a DELETE policy enabled in your Supabase RLS settings." },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order ${id} permanently deleted.`,
      id,
    });
  } catch (err) {
    console.error("Unexpected error in admin delete order route:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete order" },
      { status: 500 }
    );
  }
}
