"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { AdminThemeProvider, useAdminTheme } from "../../context/AdminThemeContext";
import AdminSidebar from "../../components/AdminSidebar";
import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";

function AdminLayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const { isDark, toggleTheme } = useAdminTheme();

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!loading && !isAdmin && !isLoginPage) {
      router.push("/admin/login");
    }
  }, [isAdmin, loading, isLoginPage, router]);

  if (isLoginPage) {
    return <main className="min-h-screen bg-slate-900">{children}</main>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-sm font-semibold">Authenticating Admin Session...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div
      className={`min-h-screen flex transition-colors duration-200 ${
        isDark ? "dark admin-dark bg-[#0c1417] text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar with Mode Switch */}
        <header className="sticky top-0 z-20 px-8 py-3.5 border-b flex items-center justify-between backdrop-blur-md transition-colors duration-200 border-slate-200/60 bg-white/80 dark:border-slate-800/80 dark:bg-[#0c1417]/85 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Admin Console</span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-500/20">
              {isDark ? "Dark Theme Active" : "Light Theme"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              type="button"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border shadow-sm cursor-pointer select-none bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-amber-300 dark:border-slate-700"
              title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 overflow-y-auto w-full">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AdminThemeProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminThemeProvider>
  );
}
