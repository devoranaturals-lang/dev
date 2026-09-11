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
      // 1. Local admin session check first (instant, no network delay)
      const storedAdmin = typeof window !== "undefined" ? localStorage.getItem("devora_admin_session") : null;
      if (storedAdmin) {
        try {
          const parsed = JSON.parse(storedAdmin);
          const EIGHT_HOURS = 8 * 60 * 60 * 1000;
          if (parsed?.active && parsed?.ts && Date.now() - parsed.ts < EIGHT_HOURS) {
            setUser({ email: parsed.email || "admin@devoranaturals.com", role: "admin" });
            setIsAdmin(true);
          } else {
            // Expired — clean up
            localStorage.removeItem("devora_admin_session");
          }
        } catch (e) {
          localStorage.removeItem("devora_admin_session");
        }
      }

      // 2. Supabase Admin Session check
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
      
      // 3. Customer session check - ALWAYS executed, never blocked by admin session
      const storedCustomer = typeof window !== "undefined" ? localStorage.getItem("devora_customer_session") : null;
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

    // 1. Supabase auth check (primary login method)
    let supabaseError = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (!error && data?.user) {
          setUser(data.user);
          setIsAdmin(true);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "devora_admin_session",
              JSON.stringify({ active: true, email: normalizedEmail, ts: Date.now() })
            );
          }
          return data.user;
        }
        if (error) {
          supabaseError = error.message;
        }
      } catch (err) {
        supabaseError = err.message;
      }
    }

    // 3. Registered Admins store (Local & offline fallback)
    try {
      const rawAdmins = typeof window !== "undefined" ? localStorage.getItem("devora_registered_admins") : null;
      const adminsList = rawAdmins ? JSON.parse(rawAdmins) : [];
      const found = adminsList.find(
        (a) => a.email?.toLowerCase() === normalizedEmail && a.password === password
      );
      if (found) {
        const adminUser = { id: found.id, email: found.email, name: found.name, role: "admin" };
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "devora_admin_session",
            JSON.stringify({ active: true, email: found.email, name: found.name, ts: Date.now() })
          );
        }
        setUser(adminUser);
        setIsAdmin(true);
        return adminUser;
      }
    } catch (e) {
      console.error("Failed to check registered admins:", e);
    }

    if (supabaseError) {
      if (supabaseError.toLowerCase().includes("email not confirmed")) {
        throw new Error("Email not confirmed in Supabase. In Supabase Dashboard > Authentication > Users, check 'Auto Confirm User' or confirm via email.");
      }
      throw new Error(supabaseError);
    }

    throw new Error("Invalid admin email or password. Please check your credentials.");
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
        } else if (error?.message?.includes("already registered")) {
          // If already registered in Supabase, sign in directly
          return await loginAdmin(email, password);
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

  // ==========================================
  // OTP SIMULATION LOGIC
  // ==========================================

  const requestAdminOtp = async (email) => {
    const normalizedEmail = (email || "").trim().toLowerCase();
    
    // Check if the email belongs to an admin
    let isAdminEmail = normalizedEmail === "admin@devoranaturals.com";
    if (!isAdminEmail && typeof window !== "undefined") {
      const rawAdmins = localStorage.getItem("devora_registered_admins");
      if (rawAdmins) {
        const admins = JSON.parse(rawAdmins);
        if (admins.find(a => a.email === normalizedEmail)) {
          isAdminEmail = true;
        }
      }
    }

    if (!isAdminEmail) {
      throw new Error("This email is not registered as an Admin.");
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Simulate sending OTP
    window.alert(`[SIMULATED EMAIL]
To: ${normalizedEmail}
Subject: Your Admin Login OTP

Your One-Time Password is: ${otpCode}

(Do not share this code with anyone)`);
    
    return otpCode;
  };

  const verifyAdminOtp = async (email, otpInput, expectedOtp) => {
    if (!otpInput || otpInput !== expectedOtp) {
      throw new Error("Invalid or expired OTP code.");
    }
    
    // OTP matches, log them in
    const normalizedEmail = (email || "").trim().toLowerCase();
    const adminData = {
      email: normalizedEmail,
      role: "admin"
    };
    
    localStorage.setItem(
      "devora_admin_session",
      JSON.stringify({ active: true, email: normalizedEmail, ts: Date.now() })
    );
    setUser(adminData);
    setIsAdmin(true);
    return adminData;
  };

  const requestCustomerOtp = async (email) => {
    const normalizedEmail = (email || "").trim().toLowerCase();
    
    // Check if customer exists
    let customerExists = false;
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from("customers").select("id").ilike("email", normalizedEmail).maybeSingle();
      if (data) customerExists = true;
    }
    
    if (!customerExists && typeof window !== "undefined") {
      const rawCustomers = localStorage.getItem("devora_customers");
      if (rawCustomers) {
        const customers = JSON.parse(rawCustomers);
        if (customers.find(c => c.email && c.email.toLowerCase() === normalizedEmail)) {
          customerExists = true;
        }
      }
    }

    if (!customerExists) {
      throw new Error("No account found with this email. Please register first.");
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Simulate sending OTP
    window.alert(`[SIMULATED EMAIL]
To: ${normalizedEmail}
Subject: Your Devora Naturals Login OTP

Your One-Time Password is: ${otpCode}

(Do not share this code with anyone)`);
    
    return otpCode;
  };

  const verifyCustomerOtp = async (email, otpInput, expectedOtp) => {
    if (!otpInput || otpInput !== expectedOtp) {
      throw new Error("Invalid or expired OTP code.");
    }
    
    const normalizedEmail = (email || "").trim().toLowerCase();
    
    // Get full customer data
    let customerData = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from("customers").select("*").ilike("email", normalizedEmail).maybeSingle();
      if (data) customerData = data;
    }
    
    if (!customerData && typeof window !== "undefined") {
      const rawCustomers = localStorage.getItem("devora_customers");
      if (rawCustomers) {
        const customers = JSON.parse(rawCustomers);
        customerData = customers.find(c => c.email && c.email.toLowerCase() === normalizedEmail);
      }
    }
    
    if (customerData) {
      setCustomerUser(customerData);
      localStorage.setItem("devora_customer_session", JSON.stringify(customerData));
      return customerData;
    } else {
      throw new Error("Failed to load customer profile.");
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
        requestAdminOtp,
        verifyAdminOtp,
        requestCustomerOtp,
        verifyCustomerOtp,
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
