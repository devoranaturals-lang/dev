"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { Leaf, Lock, Mail, User, Phone, ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, LogOut } from "lucide-react";

export default function CustomerLoginPage() {
  const router = useRouter();
  const { customerUser, loginCustomer, registerNewCustomer, logoutCustomer, requestCustomerOtp, verifyCustomerOtp } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [isOtpFlow, setIsOtpFlow] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [expectedOtp, setExpectedOtp] = useState("");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isOtpFlow) {
        if (!otpSent) {
          await requestCustomerOtp(email);
          setOtpSent(true);
          setSuccessMsg(`OTP code sent to ${email}`);
        } else {
          await verifyCustomerOtp(email, otpCode);
          setSuccessMsg("Signed in successfully via OTP! Welcome back.");
          setTimeout(() => {
            router.push("/account");
          }, 700);
        }
      } else {
        await loginCustomer(email, password);
        setSuccessMsg("Signed in successfully! Welcome back.");
        setTimeout(() => {
          router.push("/account");
        }, 700);
      }
    } catch (err) {
      console.error("Customer login error:", err);
      setErrorMsg(err.message || "Invalid credentials. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      await registerNewCustomer({
        name,
        email,
        password,
        phone,
      });
      setSuccessMsg("Account created successfully! Welcome to Devora Naturals.");
      setTimeout(() => {
        router.push("/account");
      }, 700);
    } catch (err) {
      console.error("Customer registration error:", err);
      setErrorMsg(err.message || "Registration failed. Please check your information and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutActiveUser = () => {
    logoutCustomer();
    setSuccessMsg("Signed out. You can now log into another account.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative subtle ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-100/50 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "6s" }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "7s" }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-100/40 rounded-full blur-2xl pointer-events-none"></div>

      {/* Top Bar: Return to Store link */}
      <header className="w-full max-w-md mx-auto relative z-10 pt-2 sm:pt-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors bg-white hover:bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-brand-700" />
          <span>Return to Store</span>
        </Link>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Devora Naturals</span>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto my-auto py-6 relative z-10">
        <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 space-y-6">
          
          {/* Brand & Page Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center mx-auto shadow-inner border border-brand-200/60 relative group overflow-hidden">
              <div className="absolute inset-0 bg-brand-200 opacity-0 group-hover:opacity-30 transition-opacity"></div>
              <Leaf className="w-8 h-8 text-brand-700 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 pt-2">
              {mode === "login" ? "Login" : "Create Account"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xs mx-auto">
              {mode === "login"
                ? "Sign in to access your orders, addresses and saved wishlist"
                : "Join Devora Naturals for pure Ayurvedic wellness & faster checkouts"}
            </p>
          </div>

          {/* Active Session Notification (if already logged in) */}
          {mounted && customerUser && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Currently Signed In
                </span>
                <button
                  type="button"
                  onClick={handleSignOutActiveUser}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 underline flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  Sign Out
                </button>
              </div>
              <p className="text-slate-600 truncate">
                <span className="font-bold text-slate-900">{customerUser.name || "Customer"}</span> ({customerUser.email})
              </p>
              <div className="pt-1 flex gap-2">
                <Link
                  href="/account"
                  className="flex-1 py-1.5 text-center text-xs font-bold bg-brand-800 hover:bg-brand-900 text-white rounded-lg transition-colors shadow-sm"
                >
                  Go to Account
                </Link>
                <Link
                  href="/"
                  className="flex-1 py-1.5 text-center text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors border border-slate-200"
                >
                  Shop Now
                </Link>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode Switch Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-brand-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg("");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-brand-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* LOGIN FORM */}
          {mode === "login" ? (
            <div className="space-y-4">
              {/* OTP vs Password Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpFlow(false);
                    setOtpSent(false);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !isOtpFlow ? "bg-white text-brand-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Password Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpFlow(true);
                    setOtpSent(false);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isOtpFlow ? "bg-white text-brand-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  OTP Login
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                
                {(!isOtpFlow || !otpSent) && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="customer@example.com"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 transition-all font-medium"
                      />
                    </div>
                  </div>
                )}

                {!isOtpFlow && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-11 py-3 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {isOtpFlow && otpSent && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Enter 6-Digit OTP
                    </label>
                    <p className="text-[10px] text-slate-500 mb-2">We sent a verification code to {email}</p>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-3 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 transition-all font-medium text-center tracking-[0.5em]"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-900/20 flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{isOtpFlow && !otpSent ? "Send OTP Code" : "Sign In"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-11 py-2.5 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-900/20 flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-3 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Toggle link below form */}
          <div className="text-center pt-2 border-t border-slate-100">
            {mode === "login" ? (
              <p className="text-xs text-slate-600">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setErrorMsg("");
                  }}
                  className="font-bold text-brand-800 hover:text-brand-900 underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg("");
                  }}
                  className="font-bold text-brand-800 hover:text-brand-900 underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>

        </div>
      </main>

      {/* Clean Footer */}
      <footer className="w-full max-w-md mx-auto text-center py-2 relative z-10">
        <p className="text-xs text-slate-400 font-medium">
          Devora Naturals &bull; 100% Authentic Organic Herbal Wellness
        </p>
      </footer>
    </div>
  );
}
