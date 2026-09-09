"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase, isSupabaseConfigured, registerCustomer, loginCustomerUser, getCustomerByIdOrEmail } from "../lib/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [customerUser, setCustomerUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      // 1. Supabase Admin Session check
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            setUser(data.session.user);
            setIsAdmin(true);
          }
        } catch (e) {
          console.warn("Supabase auth session check failed:", e);
        }
      }
      
      // 2. Local admin session check with expiry (8-hour timeout)
      const storedAdmin = localStorage.getItem("devora_admin_session");
      if (storedAdmin) {
        try {
          const parsed = JSON.parse(storedAdmin);
          const EIGHT_HOURS = 8 * 60 * 60 * 1000;
          if (parsed?.active && parsed?.ts && Date.now() - parsed.ts < EIGHT_HOURS) {
            setUser({ email: parsed.email || "admin@devoranaturals.com" });
            setIsAdmin(true);
          } else {
            // Expired — clean up
            localStorage.removeItem("devora_admin_session");
          }
        } catch (e) {
          // Legacy string value or corrupt — remove it
          localStorage.removeItem("devora_admin_session");
        }
      }
      
      // 3. Customer session check - ALWAYS executed, never blocked by admin session
      const storedCustomer = localStorage.getItem("devora_customer_session");
      if (storedCustomer) {
        try {
          const parsed = JSON.parse(storedCustomer);
          setCustomerUser(parsed);

          // Always fetch latest authoritative customer data from Supabase
          if (parsed?.id || parsed?.email) {
            getCustomerByIdOrEmail(parsed.id, parsed.email).then((fresh) => {
              if (fresh) {
                setCustomerUser(fresh);
                try {
                  localStorage.setItem("devora_customer_session", JSON.stringify(fresh));
                } catch (err) {}
              }
            }).catch(() => {});
          }
        } catch (e) {
          console.error("Failed to parse customer session:", e);
        }
      }
      setLoading(false);
    }
    checkAuth();

    const handleStorageChange = (e) => {
      if (e.key === "devora_customer_session") {
        if (e.newValue) {
          try {
            setCustomerUser(JSON.parse(e.newValue));
          } catch (err) {
            console.error("Failed to parse synced customer session:", err);
          }
        } else {
          setCustomerUser(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const loginAdmin = async (email, password) => {
    const normalizedEmail = (email || "").trim().toLowerCase();

    // 1. Supabase auth check
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (!error && data?.user) {
          setUser(data.user);
          setIsAdmin(true);
          localStorage.setItem(
            "devora_admin_session",
            JSON.stringify({ active: true, email: normalizedEmail, ts: Date.now() })
          );
          return data.user;
        }
      } catch (err) {
        console.warn("Supabase auth failed, checking demo admin credentials:", err);
      }
    }

    // 2. Demo root admin credentials
    if (normalizedEmail === "admin@devoranaturals.com" && password === "admin123") {
      const mockUser = { email: "admin@devoranaturals.com", role: "admin" };
      localStorage.setItem(
        "devora_admin_session",
        JSON.stringify({ active: true, email: normalizedEmail, ts: Date.now() })
      );
      setUser(mockUser);
      setIsAdmin(true);
      return mockUser;
    }

    // 3. Registered Admins store
    try {
      const rawAdmins = localStorage.getItem("devora_registered_admins");
      const adminsList = rawAdmins ? JSON.parse(rawAdmins) : [];
      const found = adminsList.find(
        (a) => a.email?.toLowerCase() === normalizedEmail && a.password === password
      );
      if (found) {
        const adminUser = { id: found.id, email: found.email, name: found.name, role: "admin" };
        localStorage.setItem(
          "devora_admin_session",
          JSON.stringify({ active: true, email: found.email, name: found.name, ts: Date.now() })
        );
        setUser(adminUser);
        setIsAdmin(true);
        return adminUser;
      }
    } catch (e) {
      console.error("Failed to check registered admins:", e);
    }

    throw new Error("Invalid admin credentials");
  };

  const registerAdmin = async (name, email, password) => {
    const normalizedEmail = (email || "").trim().toLowerCase();
    let createdUser = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { name: name || "Admin", role: "admin" },
          },
        });
        if (!error && data?.user) {
          createdUser = data.user;
        }
      } catch (err) {
        console.warn("Supabase auth admin registration fallback to local:", err);
      }
    }

    // Always record locally in registered admins store so this admin can log in anytime
    let adminsList = [];
    try {
      const rawAdmins = localStorage.getItem("devora_registered_admins");
      adminsList = rawAdmins ? JSON.parse(rawAdmins) : [];
    } catch (e) {
      adminsList = [];
    }

    const exists = adminsList.find((a) => a.email?.toLowerCase() === normalizedEmail);
    if (exists) {
      exists.name = name || exists.name;
      exists.password = password;
    } else {
      adminsList.push({
        id: `admin-${Date.now()}`,
        name: name || "Administrator",
        email: normalizedEmail,
        password: password,
        role: "admin",
        created_at: new Date().toISOString(),
      });
    }
    localStorage.setItem("devora_registered_admins", JSON.stringify(adminsList));

    const mockAdmin = createdUser || {
      id: `admin-${Date.now()}`,
      email: normalizedEmail,
      name: name || "Admin",
      role: "admin",
    };

    localStorage.setItem(
      "devora_admin_session",
      JSON.stringify({ active: true, email: normalizedEmail, name: name || "Admin", ts: Date.now() })
    );
    setUser(mockAdmin);
    setIsAdmin(true);
    return mockAdmin;
  };

  const logoutAdmin = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("devora_admin_session");
    setUser(null);
    setIsAdmin(false);
  };

  const loginCustomer = async (email, password) => {
    const customer = await loginCustomerUser(email, password);
    setCustomerUser(customer);
    localStorage.setItem("devora_customer_session", JSON.stringify(customer));
    return customer;
  };

  const registerNewCustomer = async (data) => {
    const customer = await registerCustomer(data);
    setCustomerUser(customer);
    localStorage.setItem("devora_customer_session", JSON.stringify(customer));
    return customer;
  };

  const logoutCustomer = () => {
    setCustomerUser(null);
    localStorage.removeItem("devora_customer_session");
  };

  const updateCustomerSession = (updated) => {
    setCustomerUser(updated);
    if (updated) {
      localStorage.setItem("devora_customer_session", JSON.stringify(updated));
    } else {
      localStorage.removeItem("devora_customer_session");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        customerUser,
        isAdmin,
        loading,
        loginAdmin,
        registerAdmin,
        logoutAdmin,
        loginCustomer,
        registerNewCustomer,
        logoutCustomer,
        setCustomerUser,
        updateCustomerSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
