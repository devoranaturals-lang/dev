"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const AdminThemeContext = createContext({
  theme: "dark",
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function AdminThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("devora_admin_theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
      } else {
        // Default to dark mode for modern executive admin aesthetic
        setThemeState("dark");
        localStorage.setItem("devora_admin_theme", "dark");
      }
    } catch (e) {
      console.warn("Could not load admin theme from localStorage:", e);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme) => {
    const targetTheme = newTheme === "light" ? "light" : "dark";
    setThemeState(targetTheme);
    try {
      localStorage.setItem("devora_admin_theme", targetTheme);
    } catch (e) {
      console.warn("Could not save admin theme:", e);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const isDark = theme === "dark";

  return (
    <AdminThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme, mounted }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within an AdminThemeProvider");
  }
  return context;
}
