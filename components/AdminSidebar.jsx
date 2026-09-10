"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Store,
  LogOut,
  Leaf,
  Tag,
  FileText,
  Settings,
  Boxes,
  Users,
  LayoutTemplate,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAdminTheme } from "../context/AdminThemeContext";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logoutAdmin } = useAuth();
  const { isDark, toggleTheme } = useAdminTheme();

  const handleLogout = async () => {
    await logoutAdmin();
    router.push("/admin/login");
  };

  const navItems = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Coupons & Offers", href: "/admin/offers", icon: Tag },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Storefront", href: "/admin/storefront", icon: LayoutTemplate },
    { name: "Inventory", href: "/admin/inventory", icon: Boxes },
    { name: "Categories", href: "/admin/categories", icon: FolderTree },
    { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { name: "Customers", href: "/admin/customers", icon: Users },
    { name: "Reports", href: "/admin/reports", icon: FileText },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-brand-900 text-white min-h-screen flex flex-col border-r border-brand-800 shadow-xl">
      {/* Brand Header */}
      <div className="p-6 border-b border-brand-800 flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl shadow-inner">
          <Leaf className="w-6 h-6 text-brand-200" />
        </div>
        <div>
          <h2 className="font-bold text-lg leading-tight text-white">Devora Admin</h2>
          <p className="text-[11px] text-brand-300 font-medium">Management Hub</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-brand-700 text-earth-200 shadow-md border-l-4 border-earth-500"
                  : "text-brand-200 hover:bg-brand-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account Actions */}
      <div className="p-4 border-t border-brand-800 space-y-2.5">
        {/* Dark Mode Switch */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-brand-800/80 hover:bg-brand-800 text-brand-100 border border-brand-700/60 shadow-inner transition-all group"
          title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
        >
          <div className="flex items-center gap-2.5">
            {isDark ? (
              <Moon className="w-4 h-4 text-amber-300 transition-transform group-hover:scale-110" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400 transition-transform group-hover:scale-110" />
            )}
            <span>{isDark ? "Dark Theme" : "Light Theme"}</span>
          </div>
          <div
            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
              isDark ? "bg-emerald-600 justify-end" : "bg-brand-950 justify-start"
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm"></div>
          </div>
        </button>

        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-brand-200 hover:bg-brand-800 hover:text-white transition-colors"
        >
          <Store className="w-4 h-4 text-earth-400" />
          <span>View Customer Store</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-colors border border-red-800/30"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out Admin</span>
        </button>



      </div>
    </aside>
  );
}
