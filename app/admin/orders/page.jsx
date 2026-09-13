"use client";

import { useEffect, useState } from "react";
import { getOrders, updateOrderStatus, updateOrder, getContactDetails, deleteOrder } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { ShoppingBag, RefreshCw, Phone, MapPin, Clock, Edit2, X, Check, Mail, FileDown, Printer, Trash2, AlertTriangle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable, { applyPlugin } from "jspdf-autotable";

try {
  applyPlugin(jsPDF);
} catch (e) {}

export default function AdminOrdersPage() {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("devora_mock_orders_v1");
        if (stored) return JSON.parse(stored);
      } catch (_) {}
    }
    return [];
  });
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [storeContact, setStoreContact] = useState({
    phone: "8608540400",
    email: "support@devoranaturals.com",
    address: "Kerala Botanical Organic Farm, India",
  });

  const [shippingForm, setShippingForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const loadOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [data, contact] = await Promise.all([getOrders(), getContactDetails()]);
      if (data) setOrders(data);
      if (contact) {
        setStoreContact({
          phone: contact.whatsapp || contact.phone || "8608540400",
          email: contact.email || "support@devoranaturals.com",
          address: contact.address || "Kerala Botanical Organic Farm, India",
        });
      }
    } catch (e) {
      console.warn("loadOrders error:", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (orders.length === 0) {
      loadOrders(true);
    } else {
      loadOrders(false);
    }
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setSuccessMsg(`Order ${orderId} marked as "${newStatus}".`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    if (!isAdmin) {
      alert("Unauthorized: Only authenticated admin users can delete orders.");
      return;
    }
    try {
      setSaving(true);
      await deleteOrder(orderToDelete.id, { user, isAdmin });
      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      setSuccessMsg(`Order ${orderToDelete.id} permanently deleted.`);
      const deletedId = orderToDelete.id;
      setOrderToDelete(null);
      setTimeout(() => setSuccessMsg(""), 3500);
      // Refresh order list to ensure synchronization with Supabase and local storage
      const refreshed = await getOrders();
      setOrders(refreshed.filter(o => String(o.id) !== String(deletedId)));
    } catch (err) {
      console.error(err);
      alert("Failed to delete order: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const openEditShipping = (order) => {
    setEditOrder(order);
    setShippingForm({
      customer_name: order.customer_name || "",
      customer_phone: order.customer_phone || "",
      customer_email: order.customer_email || "",
      address: order.address || "",
      city: order.city || "",
      state: order.state || "",
      pincode: order.pincode || "",
    });
  };

  const handleSaveShipping = async (e) => {
    e.preventDefault();
    if (!shippingForm.customer_name || !shippingForm.customer_phone) {
      alert("Customer Name and Phone are required.");
      return;
    }

    try {
      setSaving(true);
      await updateOrder(editOrder.id, shippingForm);
      setSuccessMsg(`Shipping details for Order ${editOrder.id} updated successfully!`);
      setEditOrder(null);
      setTimeout(() => setSuccessMsg(""), 3000);
      await loadOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to update shipping details: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Color mapping based on requested color scheme
  const getStatusColorClass = (status) => {
    switch (status) {
      case "Order Placed":
        return "bg-amber-100 text-amber-900 border-amber-300 focus:ring-amber-400"; // Yellow
      case "Packing":
        return "bg-orange-100 text-orange-900 border-orange-300 focus:ring-orange-400"; // Orange
      case "Out for Delivery":
        return "bg-lime-100 text-lime-900 border-lime-400 focus:ring-lime-400"; // Light Green
      case "Delivered":
        return "bg-emerald-100 text-emerald-900 border-emerald-400 focus:ring-emerald-400"; // Green
      case "Cancelled":
        return "bg-red-100 text-red-900 border-red-300 focus:ring-red-400"; // Red
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  // PDF Generator for Shipping Label with FROM (Devora Naturals, 8608540400) and TO (Customer Address)
  const generateShippingLabelPDF = (order) => {
    try {
      const doc = new jsPDF();

      // Outer Border
      doc.setDrawColor(4, 120, 87); // emerald-700
      doc.setLineWidth(1);
      doc.rect(10, 10, 190, 277);

      // Header Banner
      doc.setFillColor(4, 120, 87);
      doc.rect(10, 10, 190, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text("DEVORA NATURALS - PARCEL SHIPPING LABEL", 105, 24, { align: "center" });

      // Order Info Bar
      doc.setFillColor(243, 244, 246); // slate-100
      doc.rect(12, 35, 186, 14, "F");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`ORDER ID: ${order.id}`, 16, 44);
      doc.text(`DATE: ${new Date(order.created_at).toLocaleDateString("en-IN")}`, 95, 44);
      doc.text(`STATUS: ${order.status || "Order Placed"}`, 150, 44);

      const startY = 53;
      const boxWidth = 90;
      const boxHeight = 65;

      // SENDER (FROM) BOX
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.5);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(12, startY, boxWidth, boxHeight, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(4, 120, 87);
      doc.text("FROM (SENDER):", 16, startY + 10);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Devora Naturals", 16, startY + 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const farmAddress = doc.splitTextToSize(storeContact.address || "Kerala Botanical Organic Farm, India", 82);
      doc.text(farmAddress, 16, startY + 28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Phone: 8608540400`, 16, startY + 42);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Email: ${storeContact.email}`, 16, startY + 50);
      doc.text("Pure Organic & Ayurvedic Care", 16, startY + 58);

      // RECIPIENT (TO) BOX
      doc.setFillColor(254, 252, 232); // amber-50
      doc.setDrawColor(253, 224, 71); // amber-300
      doc.roundedRect(108, startY, boxWidth, boxHeight, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text("TO (CUSTOMER DELIVERY):", 112, startY + 10);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(order.customer_name || "Customer", 112, startY + 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Phone: ${order.customer_phone}`, 112, startY + 28);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const toAddressLines = doc.splitTextToSize(
        `${order.address}, ${order.city}, ${order.state} - PIN: ${order.pincode}`,
        82
      );
      doc.text(toAddressLines, 112, startY + 36);

      // Items Ordered Table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("PARCEL ITEMS / INVOICE SUMMARY", 14, 126);

      const items = order.order_items || order.items || [];
      const tableRows = items.map((item, index) => [
        index + 1,
        item.product_name || item.name || "Ayurvedic Product",
        item.quantity || 1,
        `INR ${Number(item.price || 0).toLocaleString("en-IN")}`,
        `INR ${(Number(item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}`,
      ]);

      const tableConfig = {
        head: [["#", "Item Description", "Qty", "Price", "Subtotal"]],
        body: tableRows,
        startY: 130,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [4, 120, 87], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 90 },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 33, halign: "right" },
          4: { cellWidth: 33, halign: "right" },
        },
        margin: { left: 12, right: 12 },
      };

      if (typeof doc.autoTable === "function") {
        doc.autoTable(tableConfig);
      } else {
        autoTable(doc, tableConfig);
      }

      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 8 : 170;

      // Total Summary Box
      const orderDiscount = Number(order.discount_amount || 0);
      const itemsSubtotal = Number(order.subtotal || items.reduce((sum, it) => sum + (Number(it.price || 0) * (it.quantity || 1)), 0));
      const shipCharge = Number(order.shipping_charge || 0);
      const summaryBoxHeight = orderDiscount > 0 ? 32 : 24;

      doc.setFillColor(248, 250, 252);
      doc.rect(108, finalY, 88, summaryBoxHeight, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(108, finalY, 88, summaryBoxHeight, "D");

      let currentLineY = finalY + 6.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Items Subtotal:", 112, currentLineY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`INR ${itemsSubtotal.toLocaleString("en-IN")}`, 188, currentLineY, { align: "right" });

      if (orderDiscount > 0) {
        currentLineY += 6.5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(4, 120, 87);
        doc.text(`Coupon Discount on Total:`, 112, currentLineY);
        doc.setFont("helvetica", "bold");
        doc.text(`-INR ${orderDiscount.toLocaleString("en-IN")}`, 188, currentLineY, { align: "right" });
      }

      currentLineY += 6.5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Shipping Charge:", 112, currentLineY);
      doc.setFont("helvetica", "bold");
      if (shipCharge === 0) {
        doc.setTextColor(4, 120, 87);
        doc.text("FREE", 188, currentLineY, { align: "right" });
      } else {
        doc.setTextColor(15, 23, 42);
        doc.text(`INR ${shipCharge.toLocaleString("en-IN")}`, 188, currentLineY, { align: "right" });
      }

      currentLineY += 7.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("Total Payable Amount:", 112, currentLineY);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`INR ${Number(order.total_amount).toLocaleString("en-IN")}`, 188, currentLineY, { align: "right" });

      // Footer note
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Thank you for choosing Devora Naturals! All natural, chemical-free herbal formulations.",
        105,
        270,
        { align: "center" }
      );
      doc.setFont("helvetica", "bold");
      doc.text(
        "Devora Naturals | Customer Helpline: 8608540400 | support@devoranaturals.com",
        105,
        275,
        { align: "center" }
      );

      doc.save(`Devora_Shipping_Label_${order.id}.pdf`);
    } catch (err) {
      console.error("Shipping label PDF generation failed:", err);
      alert("Failed to download shipping label: " + err.message);
    }
  };

  const filteredOrders = filterDate 
    ? orders.filter(o => {
        if (!o.created_at) return false;
        // Compare YYYY-MM-DD
        const orderDate = new Date(o.created_at).toLocaleDateString("en-CA"); // "en-CA" returns YYYY-MM-DD format usually, or we can construct it safely
        const orderDateObj = new Date(o.created_at);
        const yyyy = orderDateObj.getFullYear();
        const mm = String(orderDateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(orderDateObj.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === filterDate;
      })
    : orders;

  const counts = {
    total: filteredOrders.length,
    placed: filteredOrders.filter(o => (o.status || "Order Placed") === "Order Placed").length,
    packing: filteredOrders.filter(o => o.status === "Packing").length,
    delivery: filteredOrders.filter(o => o.status === "Out for Delivery").length,
    delivered: filteredOrders.filter(o => o.status === "Delivered").length,
    cancelled: filteredOrders.filter(o => o.status === "Cancelled").length,
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Customer Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track checkouts, print parcel shipping labels, edit shipping destinations, and update dispatch status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">Date:</label>
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-700"
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate("")}
                className="text-xs text-slate-400 hover:text-red-500 underline"
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={loadOrders}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs text-slate-500 font-bold uppercase">Total</p>
          <p className="text-2xl font-black text-slate-800">{counts.total}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm text-center">
          <p className="text-xs text-amber-700 font-bold uppercase">Placed</p>
          <p className="text-2xl font-black text-amber-900">{counts.placed}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 shadow-sm text-center">
          <p className="text-xs text-orange-700 font-bold uppercase">Packing</p>
          <p className="text-2xl font-black text-orange-900">{counts.packing}</p>
        </div>
        <div className="bg-lime-50 p-4 rounded-2xl border border-lime-200 shadow-sm text-center">
          <p className="text-xs text-lime-700 font-bold uppercase">Out for Delivery</p>
          <p className="text-2xl font-black text-lime-900">{counts.delivery}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm text-center">
          <p className="text-xs text-emerald-700 font-bold uppercase">Delivered</p>
          <p className="text-2xl font-black text-emerald-900">{counts.delivered}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-2xl border border-red-200 shadow-sm text-center">
          <p className="text-xs text-red-700 font-bold uppercase">Cancelled</p>
          <p className="text-2xl font-black text-red-900">{counts.cancelled}</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center space-y-2">
          <RefreshCw className="w-6 h-6 text-brand-700 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Fetching orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No orders found.</p>
          <p className="text-xs text-slate-400">Try changing the date filter or refreshing the list.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const currentStatus = order.status || "Order Placed";
            return (
              <div
                key={order.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-900 text-base">{order.customer_name}</span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        ID: {order.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.created_at).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Print / Download Shipping Label PDF */}
                    <button
                      onClick={() => generateShippingLabelPDF(order)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      title="Download Shipping Label PDF with FROM and TO addresses"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Shipping Label (PDF)</span>
                    </button>

                    {/* Status Switcher with custom requested colors */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Status:</label>
                      <select
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`px-3.5 py-1.5 border rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm outline-none ${getStatusColorClass(
                          currentStatus
                        )}`}
                      >
                        <option value="Order Placed" className="bg-amber-50 text-amber-900">
                          Order Placed (Yellow)
                        </option>
                        <option value="Packing" className="bg-orange-50 text-orange-900">
                          Packing (Orange)
                        </option>
                        <option value="Out for Delivery" className="bg-lime-50 text-lime-900">
                          Out for Delivery (Light Green)
                        </option>
                        <option value="Delivered" className="bg-emerald-50 text-emerald-900">
                          Delivered (Green)
                        </option>
                        <option value="Cancelled" className="bg-red-50 text-red-900">
                          Cancelled (Red)
                        </option>
                      </select>
                    </div>

                    {/* Delete Order Button */}
                    <button
                      onClick={() => setOrderToDelete(order)}
                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      title="Permanently delete this order"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
                  {/* Delivery Address & Edit Shipping */}
                  <div className="md:col-span-5 space-y-2 bg-slate-50 p-4 rounded-2xl flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                          Shipping Details (TO)
                        </p>
                        <button
                          onClick={() => openEditShipping(order)}
                          className="flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-900 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Shipping</span>
                        </button>
                      </div>

                      <p className="flex items-center gap-2 text-slate-800 font-semibold">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{order.customer_phone}</span>
                      </p>
                      {order.customer_email && (
                        <p className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{order.customer_email}</span>
                        </p>
                      )}
                      <p className="flex items-start gap-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="leading-snug">
                          {order.address}, {order.city}, {order.state} - {order.pincode}
                        </span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Parcel Label:</span>
                      <button
                        onClick={() => generateShippingLabelPDF(order)}
                        className="text-brand-800 hover:text-brand-900 font-bold flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print / Export PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Items Ordered */}
                  <div className="md:col-span-7 space-y-2">
                    {(() => {
                      const orderItems = order.order_items || order.items || [];
                      const subtotal = Number(order.subtotal || orderItems.reduce((acc, it) => acc + (Number(it.price || 0) * (it.quantity || 1)), 0));
                      const discountAmt = Number(order.discount_amount || 0);

                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                              Items Ordered ({orderItems.length} {orderItems.length === 1 ? "Product" : "Products"})
                            </p>
                          </div>

                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {orderItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                                <span className="font-medium text-slate-800">
                                  {item.product_name || item.name} × {item.quantity}
                                </span>
                                <span className="font-bold text-slate-900">
                                  ₹{(Number(item.price) * item.quantity).toLocaleString("en-IN")}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Items Subtotal:</span>
                              <span className="font-semibold text-slate-800">
                                ₹{subtotal.toLocaleString("en-IN")}
                              </span>
                            </div>

                            {discountAmt > 0 && (
                              <div className="flex justify-between items-center text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg font-semibold">
                                <span>Coupon Discount on Total ({order.coupon_code || "Coupon"}):</span>
                                <span>-₹{discountAmt.toLocaleString("en-IN")}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-center text-slate-600">
                              <span>Shipping ({order.shipping_method || "Standard"}):</span>
                              <span className="font-semibold text-slate-800">
                                {order.shipping_charge ? `₹${Number(order.shipping_charge).toLocaleString("en-IN")}` : "FREE"}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-sm font-bold pt-1.5 border-t border-slate-100">
                              <span className="text-slate-800">Total Order Amount:</span>
                              <span className="text-earth-700 font-extrabold text-base">
                                ₹{Number(order.total_amount).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Shipping Details Modal */}
      {editOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Shipping Details</h3>
                <p className="text-[11px] text-slate-400 font-mono">Order ID: {editOrder.id}</p>
              </div>
              <button
                onClick={() => setEditOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShipping} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.customer_name}
                    onChange={(e) => setShippingForm({ ...shippingForm, customer_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.customer_phone}
                    onChange={(e) => setShippingForm({ ...shippingForm, customer_phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={shippingForm.customer_email}
                  onChange={(e) => setShippingForm({ ...shippingForm, customer_email: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Street / House Delivery Address *</label>
                <textarea
                  rows={2}
                  required
                  value={shippingForm.address}
                  onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.city}
                    onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.state}
                    onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.pincode}
                    onChange={(e) => setShippingForm({ ...shippingForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditOrder(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  {saving ? "Saving..." : "Save Shipping Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DELETE CONFIRMATION MODAL
          ========================================================================= */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Delete Order Record</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete order <strong className="text-slate-900">{orderToDelete.id}</strong> for <strong className="text-slate-900">{orderToDelete.customer_name}</strong>?
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDeleteOrder}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{saving ? "Deleting..." : "Yes, Delete Order"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
