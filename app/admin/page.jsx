"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProducts, getCategories, getOrders } from "../../lib/supabase";
import {
  Package,
  FolderTree,
  ShoppingBag,
  IndianRupee,
  Plus,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  X,
  FileSpreadsheet,
  BarChart3,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Layers,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    productsCount: 0,
    categoriesCount: 0,
    ordersCount: 0,
    totalRevenue: 0,
    cancelledRevenue: 0,
  });

  const [allOrders, setAllOrders] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      const prods = localStorage.getItem("devora_mock_products_v1");
      const orders = localStorage.getItem("devora_mock_orders_v1");
      if (prods || orders) return false;
    }
    return false;
  });

  // Daily revenue state
  const [showDailyRevenueModal, setShowDailyRevenueModal] = useState(false);
  const [dateFilter, setDateFilter] = useState("all"); // "today" | "7days" | "14days" | "30days" | "thisMonth" | "all"
  const [expandedDayKey, setExpandedDayKey] = useState(null);

  useEffect(() => {
    async function loadMetrics(showLoading = false) {
      try {
        if (showLoading) setLoading(true);
        const [products, categories, orders] = await Promise.all([
          getProducts(),
          getCategories(),
          getOrders(),
        ]);

        const orderList = orders || [];
        setAllOrders(orderList);

        const totalRev = orderList.reduce(
          (sum, o) => {
            if (o.status !== "Delivered") return sum;
            return sum + Number(o.total_amount || 0);
          },
          0
        );

        const cancelledRev = orderList.reduce(
          (sum, o) => {
            if (o.status === "Cancelled") {
              return sum + Number(o.total_amount || 0);
            }
            return sum;
          },
          0
        );

        setStats({
          productsCount: (products || []).length,
          categoriesCount: (categories || []).length,
          ordersCount: orderList.length,
          totalRevenue: totalRev,
          cancelledRevenue: cancelledRev,
        });

        setRecentProducts((products || []).slice(0, 4));
        setRecentOrders(orderList.slice(0, 4));
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();

    const handleStorageChange = (e) => {
      if (e.key === "devora_mock_orders_v1" || e.key === "devora_mock_products_v1") {
        loadMetrics();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Compute Daily-Wise Revenue Data
  const getDailyRevenueStats = () => {
    const now = new Date();

    const filtered = (allOrders || []).filter((order) => {
      if (!order.created_at) return true;
      const orderDate = new Date(order.created_at);
      if (isNaN(orderDate.getTime())) return true;

      if (dateFilter === "today") {
        return orderDate.toDateString() === now.toDateString();
      }
      if (dateFilter === "7days") {
        const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 7 && diffDays >= 0;
      }
      if (dateFilter === "14days") {
        const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 14 && diffDays >= 0;
      }
      if (dateFilter === "30days") {
        const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 30 && diffDays >= 0;
      }
      if (dateFilter === "thisMonth") {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true; // "all"
    });

    const dayMap = {};
    filtered.forEach((order) => {
      let dateObj = new Date(order.created_at);
      if (isNaN(dateObj.getTime())) dateObj = new Date();

      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;

      if (!dayMap[dateKey]) {
        dayMap[dateKey] = {
          dateKey,
          dateObj,
          formattedDate: dateObj.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          revenue: 0,
          orders: [],
          statusCounts: {},
        };
      }

      const amount = Number(order.total_amount || 0);
      if (order.status !== "Cancelled") {
        dayMap[dateKey].revenue += amount;
      }
      dayMap[dateKey].orders.push(order);
      const st = order.status || "Order Placed";
      dayMap[dateKey].statusCounts[st] = (dayMap[dateKey].statusCounts[st] || 0) + 1;
    });

    const dailyList = Object.values(dayMap).sort(
      (a, b) => b.dateObj.getTime() - a.dateObj.getTime()
    );

    const totalPeriodRev = dailyList.reduce((sum, d) => sum + d.revenue, 0);
    const totalPeriodOrders = dailyList.reduce((sum, d) => sum + d.orders.length, 0);
    const avgDailyRev = dailyList.length > 0 ? Math.round(totalPeriodRev / dailyList.length) : 0;

    let peakDay = null;
    dailyList.forEach((d) => {
      if (!peakDay || d.revenue > peakDay.revenue) {
        peakDay = d;
      }
    });

    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayData = dayMap[todayYMD];
    const todayRevenue = todayData ? todayData.revenue : 0;
    const todayOrdersCount = todayData ? todayData.orders.length : 0;

    return {
      dailyList,
      totalPeriodRev,
      totalPeriodOrders,
      avgDailyRev,
      peakDay,
      todayRevenue,
      todayOrdersCount,
      filteredOrders: filtered,
    };
  };

  const dailyStats = getDailyRevenueStats();

  // Export Daily Breakdown to CSV
  const handleExportCSV = () => {
    if (!dailyStats.dailyList || dailyStats.dailyList.length === 0) {
      alert("No daily revenue records found to export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Formatted Date,Total Orders,Total Revenue (INR),Average Order Value (INR),Order IDs\r\n";

    dailyStats.dailyList.forEach((day) => {
      const aov = day.orders.length > 0 ? Math.round(day.revenue / day.orders.length) : 0;
      const orderIds = day.orders.map((o) => o.id).join("; ");
      const row = `"${day.dateKey}","${day.formattedDate}",${day.orders.length},${day.revenue},${aov},"${orderIds}"`;
      csvContent += row + "\r\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", blobUrl);
    link.setAttribute("download", `Devora_Daily_Revenue_${dateFilter}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const maxRevenue = Math.max(
    ...dailyStats.dailyList.map((d) => d.revenue),
    1
  );

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Dashboard Overview</span>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
              Live Data
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Click on any metric card below to open and view its details or manage records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDailyRevenueModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Daily Revenue Analytics</span>
          </button>

          <Link
            href="/admin/categories"
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-brand-800 font-bold text-xs rounded-xl border border-brand-200 flex items-center gap-1.5 transition-colors"
          >
            <FolderTree className="w-4 h-4" />
            <span>Manage Categories</span>
          </Link>

          <Link
            href="/admin/products"
            className="px-4 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards - All Clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {/* 1. Total Products Card -> Links to /admin/products */}
        <Link
          href="/admin/products"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          title="Click to view and manage Total Products"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Products</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.productsCount}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <span>View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 2. Categories Card -> Links to /admin/categories */}
        <Link
          href="/admin/categories"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          title="Click to view and manage Categories"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <FolderTree className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categories</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.categoriesCount}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <span>View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 3. Customer Orders Card -> Links to /admin/orders */}
        <Link
          href="/admin/orders"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-amber-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
          title="Click to view and manage Customer Orders"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Orders</p>
              <h3 className="text-2xl font-black text-slate-900">{stats.ordersCount}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all">
            <span>View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* 4. Total Revenue Card -> Opens Daily-Wise Revenue Modal */}
        <button
          type="button"
          onClick={() => setShowDailyRevenueModal(true)}
          className="bg-gradient-to-br from-emerald-50/70 via-white to-white p-6 rounded-3xl border-2 border-emerald-300 shadow-sm flex items-center justify-between group hover:border-emerald-600 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left relative overflow-hidden"
          title="Click to view Daily-Wise Revenue Breakdown"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-700 text-white rounded-2xl group-hover:bg-emerald-800 group-hover:scale-105 transition-all shadow-md shadow-emerald-200">
              <IndianRupee className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Delivered Revenue</p>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-200/80 text-emerald-900 animate-pulse">
                  Breakdown
                </span>
              </div>
              <h3 className="text-2xl font-black text-emerald-700">₹{stats.totalRevenue?.toLocaleString("en-IN") || 0}</h3>
            </div>
          </div>
        </button>

        {/* 5. Cancelled Revenue Card */}
        <div className="bg-white p-6 rounded-3xl border border-red-200 shadow-sm flex items-center justify-between group hover:border-red-400 hover:shadow-md transition-all duration-200 cursor-default text-left relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl group-hover:bg-red-100 transition-all shadow-sm">
              <TrendingDown className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lost Revenue</p>
              <h3 className="text-2xl font-black text-red-600">₹{stats.cancelledRevenue?.toLocaleString("en-IN") || 0}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Products */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">Recent Inventory Items</h3>
            <Link href="/admin/products" className="text-xs font-bold text-brand-700 hover:text-brand-900 flex items-center gap-1">
              <span>View All Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No products found.</p>
            ) : (
              recentProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-slate-100/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.image_url || "https://images.unsplash.com/photo-1608248597263-00079e96047c?auto=format&fit=crop&w=100&q=80"}
                      alt={p.name}
                      className="w-10 h-10 object-cover rounded-xl border border-slate-200"
                    />
                    <div>
                      <p className="font-bold text-xs text-slate-800 leading-tight">{p.name}</p>
                      <p className="text-[10px] text-brand-700 font-semibold">{p.category}</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-xs text-earth-700">
                    ₹{Number(p.price).toLocaleString("en-IN")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">Recent Customer Orders</h3>
            <Link href="/admin/orders" className="text-xs font-bold text-brand-700 hover:text-brand-900 flex items-center gap-1">
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No orders recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl text-xs hover:bg-slate-100/80 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800">{o.customer_name || "Customer"}</p>
                    <p className="text-[10px] text-slate-400">
                      {o.city ? `${o.city}, ` : ""}{o.state || "India"} • {o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN") : "Recent"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">₹{Number(o.total_amount).toLocaleString("en-IN")}</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {o.status || "Order Placed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DAILY-WISE REVENUE MODAL (Triggered by Total Revenue Card) */}
      {/* ========================================================================= */}
      {showDailyRevenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Top Header */}
            <div className="p-6 bg-gradient-to-r from-brand-900 via-brand-800 to-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black tracking-tight text-white">
                      Daily-Wise Revenue Breakdown
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-400 text-brand-950 rounded-full">
                      Day Analysis
                    </span>
                  </div>
                  <p className="text-xs text-brand-200 mt-0.5">
                    Real-time sales, order counts, and daily performance metrics
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition-colors"
                  title="Export daily records to CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                  <span>Export CSV</span>
                </button>

                <Link
                  href="/admin/reports"
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Full Reports</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowDailyRevenueModal(false)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body with Scroll */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Filter Period:
                  </span>
                  {[
                    { key: "all", label: "All Time" },
                    { key: "today", label: "Today" },
                    { key: "7days", label: "Last 7 Days" },
                    { key: "14days", label: "Last 14 Days" },
                    { key: "30days", label: "Last 30 Days" },
                    { key: "thisMonth", label: "This Month" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setDateFilter(tab.key)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        dateFilter === tab.key
                          ? "bg-brand-800 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-semibold text-slate-500">
                  Showing <strong className="text-slate-800">{dailyStats.dailyList.length}</strong> active sales days
                </div>
              </div>

              {/* 4 Summary Stat Mini-Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {dateFilter === "all" ? "All-Time Revenue" : "Period Revenue"}
                  </p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">
                    ₹{dailyStats.totalPeriodRev.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Across {dailyStats.totalPeriodOrders} orders
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Today's Revenue
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    ₹{dailyStats.todayRevenue.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold mt-1">
                    {dailyStats.todayOrdersCount} orders placed today
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Daily Average
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    ₹{dailyStats.avgDailyRev.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Per active selling day
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Peak Day Record
                  </p>
                  <p className="text-2xl font-black text-brand-800 mt-1">
                    {dailyStats.peakDay ? `₹${dailyStats.peakDay.revenue.toLocaleString("en-IN")}` : "₹0"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                    {dailyStats.peakDay ? dailyStats.peakDay.formattedDate : "No data"}
                  </p>
                </div>
              </div>

              {/* Visual Daily Revenue Chart (Responsive Bar Graph) */}
              {dailyStats.dailyList.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Daily Revenue Trajectory
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Hover on any bar to view day stats
                    </span>
                  </div>

                  <div className="h-44 flex items-end gap-2 sm:gap-4 pt-8 pb-2 px-2 overflow-x-auto border-b border-slate-100">
                    {[...dailyStats.dailyList].reverse().map((day) => {
                      const heightPercent = Math.max(
                        14,
                        Math.round((day.revenue / maxRevenue) * 100)
                      );

                      return (
                        <div
                          key={day.dateKey}
                          className="flex-1 min-w-[52px] max-w-[80px] flex flex-col items-center gap-1.5 group relative"
                        >
                          {/* Hover Tooltip */}
                          <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg whitespace-nowrap z-20 shadow-xl border border-slate-700 text-center">
                            <span className="font-bold block">{day.formattedDate}</span>
                            <span className="text-emerald-400 font-extrabold">
                              ₹{day.revenue.toLocaleString("en-IN")}
                            </span>{" "}
                            • {day.orders.length} orders
                          </div>

                          {/* Bar */}
                          <div className="w-full bg-slate-100 rounded-t-xl h-32 flex items-end p-1">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className="w-full bg-gradient-to-t from-emerald-700 to-emerald-500 rounded-t-lg transition-all group-hover:from-emerald-600 group-hover:to-emerald-400 shadow-sm"
                            />
                          </div>

                          {/* Date Label */}
                          <span className="text-[10px] font-bold text-slate-600 group-hover:text-emerald-700 truncate w-full text-center">
                            {day.dateObj.toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Daily Breakdown Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Day-by-Day Revenue Log</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-medium">
                    Click any day row to expand individual orders
                  </span>
                </div>

                {dailyStats.dailyList.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Info className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">No orders recorded for this period.</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Try selecting "All Time" to view previous customer orders, or place a test order on the storefront.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {dailyStats.dailyList.map((day) => {
                      const isExpanded = expandedDayKey === day.dateKey;
                      const aov = day.orders.length > 0 ? Math.round(day.revenue / day.orders.length) : 0;

                      return (
                        <div key={day.dateKey} className="transition-colors hover:bg-slate-50/70">
                          {/* Summary Row */}
                          <div
                            onClick={() => setExpandedDayKey(isExpanded ? null : day.dateKey)}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 font-black text-xs flex flex-col items-center justify-center border border-emerald-100">
                                <span>{day.dateObj.getDate()}</span>
                                <span className="text-[9px] font-bold uppercase text-emerald-600">
                                  {day.dateObj.toLocaleDateString("en-IN", { month: "short" })}
                                </span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-extrabold text-sm text-slate-900">
                                    {day.formattedDate}
                                  </p>
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                                    {day.orders.length} {day.orders.length === 1 ? "order" : "orders"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Average Order Value: <strong className="text-slate-700">₹{aov.toLocaleString("en-IN")}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <div className="text-right">
                                <span className="text-base font-black text-emerald-700 block">
                                  ₹{day.revenue.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Daily Total
                                </span>
                              </div>

                              <button
                                type="button"
                                className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                aria-label="Toggle details"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Order List for this specific Day */}
                          {isExpanded && (
                            <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-2.5 animate-fadeIn">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-slate-700">
                                  Orders placed on {day.formattedDate} ({day.orders.length})
                                </p>
                                <Link
                                  href="/admin/orders"
                                  className="text-xs font-bold text-brand-800 hover:underline flex items-center gap-1"
                                >
                                  <span>Manage all orders</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>

                              <div className="space-y-2">
                                {day.orders.map((o) => (
                                  <div
                                    key={o.id}
                                    className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-amber-50 text-amber-800 rounded-xl font-mono text-[10px] font-bold">
                                        #{String(o.id).slice(-6)}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-800">
                                          {o.customer_name || "Customer"}
                                          {o.customer_phone ? ` (${o.customer_phone})` : ""}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                          {o.city ? `${o.city}, ` : ""}{o.state || "India"} • {o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3">
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        {o.status || "Order Placed"}
                                      </span>
                                      <span className="font-extrabold text-slate-900 text-sm">
                                        ₹{Number(o.total_amount || 0).toLocaleString("en-IN")}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-700" />
                <span>Daily revenue calculations reflect all completed and pending store orders.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="sm:hidden px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => setShowDailyRevenueModal(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

