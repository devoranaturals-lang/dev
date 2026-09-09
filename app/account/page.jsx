"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { updateCustomer, getCustomerOrders, getProducts, updateOrderStatus } from "../../lib/supabase";
import { User, Mail, Lock, Phone, Check, LogOut, Loader2, Settings, ListOrdered, Heart, MapPin, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import ProductCard from "../../components/ProductCard";

export default function AccountPage() {
  const { customerUser, loginCustomer, registerNewCustomer, logoutCustomer, setCustomerUser, updateCustomerSession, loading: authLoading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState("login"); // 'login' or 'register'
  const [activeTab, setActiveTab] = useState("profile"); // 'profile', 'orders', 'wishlist'
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  // Data State for tabs
  const [orders, setOrders] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If customer is not authenticated, redirect directly to dedicated /login page
  useEffect(() => {
    if (mounted && !authLoading && !customerUser) {
      router.replace("/login");
    }
  }, [mounted, authLoading, customerUser, router]);

  // Read URL query parameter for activeTab (e.g. /account?tab=orders)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["profile", "orders", "wishlist"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Pre-fill form if customerUser exists
  useEffect(() => {
    if (customerUser) {
      setName(customerUser.name || "");
      setPhone(customerUser.phone || "");
      setAddress(customerUser.address || "");
      setCity(customerUser.city || "");
      setState(customerUser.state || "");
      setPincode(customerUser.pincode || "");
    }
  }, [customerUser?.id]);

  const handleCancelOrder = async (orderId) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      await updateOrderStatus(orderId, "Cancelled");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "Cancelled" } : o));
      alert("Order cancelled successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to cancel order: " + (err.message || "Unknown error"));
    }
  };

  useEffect(() => {
    if (!customerUser?.email) return;
    
    let isMounted = true;
    const loadCustomerData = async () => {
      try {
        setDataLoaded(false);
        const fetchedOrders = await getCustomerOrders(customerUser.email);
        if (isMounted) {
          setOrders(fetchedOrders || []);
        }

        // Load wishlist from local storage
        const storedWishlist = localStorage.getItem("devora_wishlist");
        const wishlistIds = storedWishlist ? JSON.parse(storedWishlist) : [];
        
        if (wishlistIds.length > 0) {
          const allProducts = await getProducts();
          if (isMounted) {
            const wProducts = allProducts.filter(p => wishlistIds.includes(p.id));
            setWishlistProducts(wProducts);
          }
        } else {
          if (isMounted) setWishlistProducts([]);
        }
      } catch (err) {
        console.error("Failed to load customer data", err);
      } finally {
        if (isMounted) setDataLoaded(true);
      }
    };
    
    loadCustomerData();

    const handleStorageChange = (e) => {
      if (
        e.key === "devora_mock_orders_v1" || 
        e.key === "devora_wishlist" ||
        e.key === "devora_mock_products_v1"
      ) {
        loadCustomerData();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    return () => { 
      isMounted = false; 
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [customerUser?.email, activeTab]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (mode === "login") {
        await loginCustomer(email, password);
      } else {
        await registerNewCustomer({
          name,
          email,
          password,
          phone,
        });
      }
      setSuccessMsg("Welcome to Devora Naturals!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const updated = await updateCustomer(customerUser.id, {
        name: name || customerUser.name,
        phone: phone || customerUser.phone,
        address: address || customerUser.address,
        city: city || customerUser.city,
        state: state || customerUser.state,
        pincode: pincode || customerUser.pincode,
        email: customerUser.email,
      });
      updateCustomerSession(updated);
      
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutCustomer();
    router.push("/login");
  };

  const removeWishlistItem = (id) => {
    const storedWishlist = localStorage.getItem("devora_wishlist");
    let wishlistIds = storedWishlist ? JSON.parse(storedWishlist) : [];
    wishlistIds = wishlistIds.filter(wid => wid !== id);
    localStorage.setItem("devora_wishlist", JSON.stringify(wishlistIds));
    setWishlistProducts(prev => prev.filter(p => p.id !== id));
  };

  if (!mounted || authLoading || !customerUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
          <p className="text-xs font-semibold text-slate-500">
            {!customerUser ? "Redirecting to Login..." : "Loading your account..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Alerts */}
        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm">
            <p className="text-red-700 text-sm font-semibold">{errorMsg}</p>
          </div>
        )}
        
        {successMsg && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl shadow-sm flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" />
            <p className="text-emerald-700 text-sm font-semibold">{successMsg}</p>
          </div>
        )}

        {/* Customer Account Dashboard */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-between">
              <div>
                <div className="mb-8">
                  <div className="w-12 h-12 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    {customerUser.name?.charAt(0).toUpperCase() || <User />}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 truncate">{customerUser.name}</h2>
                  <p className="text-xs text-slate-500 truncate">{customerUser.email}</p>
                </div>
                
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors ${
                      activeTab === "profile" 
                        ? "bg-brand-800 text-white shadow-sm" 
                        : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Personal Details
                  </button>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors ${
                      activeTab === "orders" 
                        ? "bg-brand-800 text-white shadow-sm" 
                        : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <ListOrdered className="w-4 h-4" />
                    Order History
                  </button>
                  <button
                    onClick={() => setActiveTab("wishlist")}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors ${
                      activeTab === "wishlist" 
                        ? "bg-brand-800 text-white shadow-sm" 
                        : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    Wishlist
                  </button>
                </nav>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-xl transition-colors border border-red-100"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 sm:p-10">
              
              {/* Tab: Profile */}
              {activeTab === "profile" && (
                <div className="animate-fadeIn">
                  <div className="mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-extrabold text-slate-900">Personal Details</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage your account information and shipping address</p>
                  </div>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={customerUser.email}
                            disabled
                            className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Shipping Address</label>
                          <textarea
                            rows={2}
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 outline-none"
                            placeholder="Street, House/Apartment No."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                            <input
                              type="text"
                              value={city}
                              onChange={e => setCity(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                            <input
                              type="text"
                              value={state}
                              onChange={e => setState(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                          <input
                            type="text"
                            value={pincode}
                            onChange={e => setPincode(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-2.5 bg-earth-700 hover:bg-earth-800 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
                      >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Details
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab: Orders */}
              {activeTab === "orders" && (
                <div className="animate-fadeIn">
                  <div className="mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-extrabold text-slate-900">Order History</h2>
                    <p className="text-sm text-slate-500 mt-1">Track and view your past orders</p>
                  </div>
                  
                  {!dataLoaded ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-16 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-slate-700">No orders yet</h3>
                      <p className="text-slate-500 text-sm mt-1">When you place an order, it will appear here.</p>
                      <button 
                        onClick={() => router.push("/products")}
                        className="mt-6 px-6 py-2 bg-brand-800 text-white text-sm font-bold rounded-lg hover:bg-brand-900 transition-colors"
                      >
                        Start Shopping
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map(order => (
                        <div key={order.id} className="border border-slate-200 rounded-2xl p-5 bg-white hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 pb-4 mb-4 gap-4">
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className="font-bold text-slate-900">Order #{order.id.slice(-8)}</h3>
                                <span className="bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand-200">
                                  {order.status || "Processing"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1" suppressHydrationWarning>
                                Placed on {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-left sm:text-right flex flex-col sm:items-end gap-2">
                              <div>
                                <p className="text-xs text-slate-500">Total Amount</p>
                                <p className="font-extrabold text-earth-700 text-lg">₹{Number(order.total_amount).toLocaleString("en-IN")}</p>
                              </div>
                              {(order.status === "Order Placed" || order.status === "Processing" || !order.status) && (
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="text-xs font-bold text-red-600 hover:text-red-700 underline underline-offset-2 transition-colors cursor-pointer"
                                >
                                  Cancel Order
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(() => {
                              const orderItems = (order.order_items && order.order_items.length > 0) ? order.order_items : (order.items || []);
                              const subtotal = Number(order.subtotal || orderItems.reduce((sum, it) => sum + (Number(it.price || 0) * (it.quantity || 1)), 0));
                              const discountAmt = Number(order.discount_amount || 0);

                              return (
                                <>
                                  <div className="space-y-1.5">
                                    {orderItems.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-700 font-medium">
                                          {item.product_name || item.name} <span className="text-slate-400">x{item.quantity}</span>
                                        </span>
                                        <span className="text-slate-700 font-bold">
                                          ₹{Number(item.price * item.quantity).toLocaleString("en-IN")}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-500">
                                    <div className="flex justify-between">
                                      <span>Subtotal ({orderItems.length} {orderItems.length === 1 ? "Product" : "Products"}):</span>
                                      <span className="font-semibold text-slate-700">₹{subtotal.toLocaleString("en-IN")}</span>
                                    </div>
                                    {discountAmt > 0 && (
                                      <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg">
                                        <span>Coupon Discount on Total ({order.coupon_code || "Coupon"}):</span>
                                        <span>-₹{discountAmt.toLocaleString("en-IN")}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span>Shipping:</span>
                                      <span className="font-semibold text-slate-700">
                                        {order.shipping_charge ? `₹${Number(order.shipping_charge).toLocaleString("en-IN")}` : "FREE"}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Wishlist */}
              {activeTab === "wishlist" && (
                <div className="animate-fadeIn">
                  <div className="mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-extrabold text-slate-900">My Wishlist</h2>
                    <p className="text-sm text-slate-500 mt-1">Products you've saved for later</p>
                  </div>
                  
                  {!dataLoaded ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                  ) : wishlistProducts.length === 0 ? (
                    <div className="text-center py-16 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-slate-700">Your wishlist is empty</h3>
                      <p className="text-slate-500 text-sm mt-1">Save items you like by clicking the heart icon on products.</p>
                      <button 
                        onClick={() => router.push("/products")}
                        className="mt-6 px-6 py-2 bg-brand-800 text-white text-sm font-bold rounded-lg hover:bg-brand-900 transition-colors"
                      >
                        Explore Products
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {wishlistProducts.map(product => (
                        <div key={product.id} className="relative group">
                          <ProductCard product={product} />
                          <button
                            onClick={() => removeWishlistItem(product.id)}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full shadow-sm z-10 transition-colors"
                            title="Remove from wishlist"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
      </div>
    </div>
  );
}
