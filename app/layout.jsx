import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AnnouncementBar from "../components/AnnouncementBar";
import { CartProvider } from "../context/CartContext";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "Devora Naturals - Pure Herbal Skin Care, Hair Care & Pooja Essentials",
  description:
    "Discover 100% organic botanical hair oils, glowing kumkumadi serums, and traditional sambrani dhoop cups handcrafted with Ayurvedic care.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        <AuthProvider>
          <CartProvider>
            <AnnouncementBar />
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
