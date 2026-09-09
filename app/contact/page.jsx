"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
  Share2,
  Clock,
  Twitter,
  Linkedin,
  Globe,
} from "lucide-react";
import { getContactDetails } from "../../lib/supabase";

function getSocialIcon(iconName) {
  switch (iconName) {
    case "Instagram":
      return Instagram;
    case "Facebook":
      return Facebook;
    case "Youtube":
      return Youtube;
    case "MessageCircle":
      return MessageCircle;
    case "Twitter":
      return Twitter;
    case "Linkedin":
      return Linkedin;
    case "Send":
      return Send;
    case "Globe":
      return Globe;
    default:
      return Share2;
  }
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [contactDetails, setContactDetails] = useState({
    email: "support@devoranaturals.com",
    phone: "+91 8608540400",
    address: "Kerala Botanical Organic Farm, India",
    social_links_enabled: true,
    social_links: [],
    support_hours: "Mon - Sat: 9:00 AM - 7:00 PM IST",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getContactDetails();
        if (data) setContactDetails(data);
      } catch (e) {
        console.error("Contact details fetch error:", e);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const ownerEmail = contactDetails.email || "support@devoranaturals.com";
    const subject = encodeURIComponent(`New Contact Message from ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`);
    
    window.location.href = `mailto:${ownerEmail}?subject=${subject}&body=${body}`;
    
    setSubmitted(true);
  };

  const isSocialEnabled = contactDetails.social_links_enabled !== false;
  const activeLinks = isSocialEnabled
    ? (Array.isArray(contactDetails.social_links) && contactDetails.social_links.length > 0
        ? contactDetails.social_links.filter((l) => l.is_active !== false && Boolean(l.url))
        : [
            contactDetails.instagram_url ? { id: "ig", title: "Instagram", url: contactDetails.instagram_url, icon: "Instagram" } : null,
            contactDetails.facebook_url ? { id: "fb", title: "Facebook", url: contactDetails.facebook_url, icon: "Facebook" } : null,
            contactDetails.youtube_url ? { id: "yt", title: "YouTube", url: contactDetails.youtube_url, icon: "Youtube" } : null,
            contactDetails.whatsapp ? { id: "wa", title: "WhatsApp", url: `https://wa.me/91${contactDetails.whatsapp}`, icon: "MessageCircle" } : null,
          ].filter(Boolean))
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-4xl font-extrabold text-slate-900">Get in Touch</h1>
        <p className="text-slate-500 text-sm">
          Have questions about our botanical hair oils or sacred pooja items? We are here to assist you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Contact Info */}
        <div className="lg:col-span-5 bg-brand-900 text-white p-8 rounded-3xl space-y-8 shadow-xl">
          <h2 className="text-2xl font-bold">Contact Information</h2>

          <div className="space-y-6 text-sm">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-brand-800 rounded-xl text-brand-200">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-brand-300 uppercase">Email Support</p>
                <p className="font-bold text-white">{contactDetails.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-brand-800 rounded-xl text-brand-200">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-brand-300 uppercase">Customer Care</p>
                <p className="font-bold text-white">{contactDetails.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-brand-800 rounded-xl text-brand-200">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-brand-300 uppercase">Location</p>
                <p className="font-bold text-white">{contactDetails.address}</p>
              </div>
            </div>

            {contactDetails.support_hours && (
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-brand-800 rounded-xl text-brand-200">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-brand-300 uppercase">Support Timings</p>
                  <p className="font-bold text-white">{contactDetails.support_hours}</p>
                </div>
              </div>
            )}
          </div>

          {/* Social Media Channels & Links */}
          {activeLinks.length > 0 && (
            <div className="pt-6 border-t border-brand-800/80 space-y-3.5">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-brand-300" />
                <h3 className="font-bold text-xs text-brand-300 uppercase tracking-wider">
                  Official Social Channels &amp; Links
                </h3>
              </div>
              <p className="text-xs text-brand-200/80 leading-relaxed">
                Stay updated with our seasonal herbal harvests, wellness tips, and direct brand updates:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {activeLinks.map((link) => {
                  const IconComp = getSocialIcon(link.icon);
                  return (
                    <a
                      key={link.id || link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-3 bg-brand-800/80 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold transition-all border border-brand-700/60 shadow-sm hover:scale-[1.02]"
                    >
                      <IconComp className="w-4 h-4 text-brand-200 shrink-0" />
                      <span className="truncate">{link.title || link.platform}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          {submitted ? (
            <div className="py-16 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-2xl font-bold text-slate-800">Message Sent!</h3>
              <p className="text-slate-500 text-sm">Thank you for reaching out. Our customer care team will respond within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="How can we assist you?"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
