"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { Leaf, Lock, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
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
      await loginAdmin(email, password);
      window.location.href = "/admin";
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Invalid admin credentials. Please check your email and password.");
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
          <div className="p-3.5 bg-red-900/70 border border-red-700 text-red-200 text-xs font-semibold rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {/* Admin Sign In Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-200 mb-1">Admin Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-brand-400" />
              <input
                type="email"
                required
                placeholder="admin@devoranaturals.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                className="w-full pl-10 pr-4 py-2.5 bg-brand-900/90 border border-brand-700 rounded-xl text-sm text-white placeholder:text-brand-400/60 focus:outline-none focus:ring-2 focus:ring-earth-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-earth-600 hover:bg-earth-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer mt-2"
          >
            <span>{loading ? "Authenticating..." : "Sign In to Dashboard"}</span>
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
