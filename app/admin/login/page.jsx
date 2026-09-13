"use client";

import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Leaf, Lock, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const { loginAdmin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      setLoading(true);
      
      // Standard Password Login
      await loginAdmin(email, password);
      window.location.href = "/admin";
    } catch (err) {
      console.error("Admin login error:", err);
      setErrorMsg(err.message || "Invalid credentials. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-900 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Graphics */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-earth-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }}></div>
      <div className="absolute top-[20%] right-[10%] w-32 h-32 bg-brand-400/10 rounded-full blur-2xl animate-bounce" style={{ animationDuration: '6s' }}></div>

      <div className="w-full max-w-md bg-brand-800/80 border border-brand-700/80 p-8 rounded-3xl shadow-2xl backdrop-blur-xl space-y-6 relative z-10 animate-in fade-in zoom-in duration-500">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="p-3 bg-gradient-to-br from-brand-600 to-brand-700 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg relative group overflow-hidden">
            <div className="absolute inset-0 bg-brand-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <Leaf className="w-9 h-9 text-brand-100 group-hover:scale-110 transition-transform duration-300 animate-[spin_10s_linear_infinite]" />
          </div>
          <h1 className="text-2xl font-black text-white pt-2">Admin Portal</h1>
          <p className="text-xs text-brand-200">Devora Naturals Management Console</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-red-900/80 border border-red-600 text-red-100 text-xs font-semibold rounded-xl text-center shadow-inner leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Quick Demo Credentials Helper */}
        <div className="bg-brand-900/70 border border-brand-700/70 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between text-brand-200">
            <span className="font-semibold text-white">Default Admin Access:</span>
            <button
              type="button"
              onClick={() => {
                setEmail("admin@devoranaturals.com");
                setPassword("admin123");
              }}
              className="text-earth-400 hover:text-earth-300 font-bold underline cursor-pointer hover:scale-105 transition-transform"
            >
              ⚡ Quick Fill
            </button>
          </div>
          <div className="text-[11px] text-brand-300 font-mono space-y-0.5 bg-brand-950/60 p-2.5 rounded-xl border border-brand-800">
            <div><span className="text-brand-400">Email:</span> admin@devoranaturals.com</div>
            <div><span className="text-brand-400">Password:</span> admin123</div>
          </div>
        </div>

        {/* Admin Sign In Form */}
        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          
          <div>
            <label className="block text-xs font-bold text-brand-200 mb-1">Admin Email or Username</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-brand-400" />
              <input
                type="text"
                required
                placeholder="admin@devoranaturals.com or admin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-2.5 bg-brand-900/90 border border-brand-700 rounded-xl text-sm text-white placeholder:text-brand-400/60 focus:outline-none focus:ring-2 focus:ring-earth-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-200 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-brand-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-2.5 bg-brand-900/90 border border-brand-700 rounded-xl text-sm text-white placeholder:text-brand-400/60 focus:outline-none focus:ring-2 focus:ring-earth-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-earth-600 hover:bg-earth-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer mt-2"
          >
            <span>
              {loading ? "Processing..." : "Sign In to Dashboard"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Back Link to Customer Storefront */}
        <div className="text-center pt-3 border-t border-brand-700/50">
          <Link
            href="/"
            className="text-xs font-medium text-brand-300 hover:text-white transition-colors underline"
          >
            ← Back to Customer Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
