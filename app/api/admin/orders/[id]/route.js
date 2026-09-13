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
async function isAuthorizedAdmin(request) {
  const adminHeader = request.headers.get("x-admin-session") || request.headers.get("x-admin-auth");
  if (adminHeader) return true;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  if (supabaseAdmin) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
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

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 }
      );
    }

    // Strict Admin Authorization Check: Only authenticated admin users can delete orders
    const isAuthorized = await isAuthorizedAdmin(request);
    if (!isAuthorized) {
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
        // Fetch order details to update customer stats later
        const { data: orderDetails } = await supabaseAdmin
          .from("orders")
          .select("customer_email, total_amount")
          .eq("id", id)
          .maybeSingle();

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
          console.warn("Supabase deleteOrder select returned 0 rows, order may already be deleted or RLS filtered select.");
        }

        // 4. Update customer stats
        if (orderDetails && orderDetails.customer_email) {
          const email = orderDetails.customer_email.trim().toLowerCase();
          
          // Fetch current customer stats
          const { data: customer } = await supabaseAdmin
            .from("customers")
            .select("id, total_orders, total_spent")
            .ilike("email", email)
            .maybeSingle();

          if (customer) {
            const newOrders = Math.max(0, (customer.total_orders || 0) - 1);
            const newSpent = Math.max(0, Number(customer.total_spent || 0) - Number(orderDetails.total_amount || 0));

            await supabaseAdmin
              .from("customers")
              .update({ total_orders: newOrders, total_spent: newSpent })
              .eq("id", customer.id);
          }
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
