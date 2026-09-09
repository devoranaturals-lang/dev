"use client";

import { useState, useEffect } from "react";
import { getOrders } from "../../../lib/supabase";
import { FileDown, Calendar, Filter } from "lucide-react";
import jsPDF from "jspdf";
import autoTable, { applyPlugin } from "jspdf-autotable";

try {
  applyPlugin(jsPDF);
} catch (e) {}

export default function AdminReportsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const data = await getOrders();
        setOrders(data || []);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();

    const handleStorageChange = (e) => {
      if (e.key === "devora_mock_orders_v1") {
        fetchOrders();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    const orderMonth = orderDate.getMonth() + 1; // 1-12
    const orderYear = orderDate.getFullYear().toString();

    const matchesYear = selectedYear === "All" || orderYear === selectedYear;
    const matchesMonth = selectedMonth === "All" || orderMonth.toString() === selectedMonth;

    return matchesYear && matchesMonth;
  });

  const totalRevenue = filteredOrders.reduce((sum, order) => {
    if (order.status !== "Delivered") return sum;
    return sum + (Number(order.total_amount) || 0);
  }, 0);

  const cancelledRevenue = filteredOrders.reduce((sum, order) => {
    if (order.status === "Cancelled") {
      return sum + (Number(order.total_amount) || 0);
    }
    return sum;
  }, 0);

  const totalOrders = filteredOrders.length;
  const cancelledOrdersCount = filteredOrders.filter(order => order.status === "Cancelled").length;

  const generatePDF = () => {
    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("Devora Naturals - Sales Report", 14, 22);

      // Subtitle
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const periodStr = `Period: ${selectedMonth === "All" ? "All Months" : `Month ${selectedMonth}`} / ${selectedYear === "All" ? "All Years" : selectedYear}`;
      doc.text(periodStr, 14, 30);
      doc.text(`Total Orders: ${totalOrders}`, 14, 42);
      doc.text(`Cancelled Orders: ${cancelledOrdersCount} (INR ${cancelledRevenue.toLocaleString("en-IN")})`, 14, 48);
      doc.text(`Delivered Revenue: INR ${totalRevenue.toLocaleString("en-IN")}`, 14, 54);

      // Table
      const tableColumn = ["Order ID", "Date", "Customer", "Status", "Amount (INR)"];
      const tableRows = [];

      filteredOrders.forEach(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString();
        const orderData = [
          order.id,
          orderDate,
          order.customer_name || "Customer",
          order.status || "Order Placed",
          `${(Number(order.total_amount) || 0).toLocaleString("en-IN")}`
        ];
        tableRows.push(orderData);
      });

      const tableOptions = {
        head: [tableColumn],
        body: tableRows,
        startY: 62,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255], fontStyle: "bold" },
      };

      if (typeof doc.autoTable === "function") {
        doc.autoTable(tableOptions);
      } else {
        autoTable(doc, tableOptions);
      }

      doc.save(`Devora_Sales_Report_${selectedMonth}_${selectedYear}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF: " + err.message);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Generate and download monthly or yearly order reports.</p>
        </div>
        
        <button
          onClick={generatePDF}
          disabled={filteredOrders.length === 0}
          className="flex items-center justify-center gap-2 bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
        >
          <FileDown className="w-5 h-5" />
          Download PDF
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end border-b border-slate-100 pb-6">
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" /> Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              <option value="All">All Years</option>
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
          
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-600" /> Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              <option value="All">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Orders</p>
            <p className="text-3xl font-black text-slate-800">{totalOrders}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Cancelled Orders</p>
            <p className="text-3xl font-black text-red-600">{cancelledOrdersCount}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Lost Revenue</p>
            <p className="text-3xl font-black text-red-600">₹{cancelledRevenue.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Delivered Revenue</p>
            <p className="text-3xl font-black text-emerald-700">₹{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
