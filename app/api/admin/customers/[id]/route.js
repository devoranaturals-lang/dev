import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key to bypass RLS for admin operations
const supabaseAdmin =
  supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
    : null;

function isValidUUID(val) {
  return (
    typeof val === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      val.trim()
    )
  );
}

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
    if (token === "admin@devoranaturals.com") return true;
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64").toString("utf-8")
        );
        if (
          payload.email === "admin@devoranaturals.com" ||
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

/** DELETE /api/admin/customers/[id] — permanently delete a customer record */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID is required." },
        { status: 400 }
      );
    }

    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized: Only authenticated admin users can delete customers." },
        { status: 403 }
      );
    }

    if (supabaseAdmin) {
      if (isValidUUID(id)) {
        // Delete directly by UUID
        const { error } = await supabaseAdmin
          .from("customers")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Supabase deleteCustomer error:", error);
          return NextResponse.json(
            { error: "Supabase error: " + error.message },
            { status: 500 }
          );
        }
      } else {
        // Non-UUID local id: delete by email if we can find a match
        const { data: found } = await supabaseAdmin
          .from("customers")
          .select("id, email")
          .eq("id", id)
          .maybeSingle();

        if (found?.email) {
          await supabaseAdmin
            .from("customers")
            .delete()
            .ilike("email", found.email.trim().toLowerCase());
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Customer ${id} deleted successfully.`,
      id,
    });
  } catch (err) {
    console.error("Unexpected error deleting customer:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete customer" },
      { status: 500 }
    );
  }
}

/** PUT /api/admin/customers/[id] — update a customer record (bypasses RLS) */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID is required." },
        { status: 400 }
      );
    }

    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 403 }
      );
    }

    const ALLOWED_COLUMNS = [
      "name", "email", "phone", "address", "city",
      "state", "pincode", "status", "total_orders", "total_spent", "notes",
    ];

    const payload = {};
    for (const col of ALLOWED_COLUMNS) {
      if (body[col] !== undefined) payload[col] = body[col];
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase not configured." },
        { status: 503 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("customers")
      .update(payload)
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json(
        { error: "Supabase error: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, customer: data?.[0] || null });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to update customer" },
      { status: 500 }
    );
  }
}
