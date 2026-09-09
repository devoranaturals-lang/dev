"use client";

import { useEffect, useState } from "react";
import { getProducts, updateProduct } from "../../../lib/supabase";
import { Boxes, Search, Check, RefreshCw } from "lucide-react";

export default function AdminInventoryPage() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [stockInputs, setStockInputs] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    const prods = await getProducts();
    setProducts(prods || []);
    
    // Initialize stock inputs
    const initialStocks = {};
    (prods || []).forEach(p => {
      initialStocks[p.id] = p.stock || 0;
    });
    setStockInputs(initialStocks);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStockChange = (id, value) => {
    setStockInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleUpdateStock = async (id, name) => {
    try {
      setUpdatingId(id);
      const newStock = Number(stockInputs[id]);
      
      await updateProduct(id, { stock: newStock });
      
      setSuccessMsg(`Updated stock for "${name}" to ${newStock}`);
      setTimeout(() => setSuccessMsg(""), 3000);
      
      // Update local state without full reload
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
    } catch (err) {
      console.error(err);
      alert("Failed to update stock: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Inventory Management</h1>
          <p className="text-xs text-slate-500 mt-1">Quickly update stock levels across your catalog</p>
        </div>
        
        {successMsg && (
          <div className="px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2 animate-in fade-in zoom-in">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Search & Stats */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        <span className="text-xs font-bold text-slate-500">
          Showing {filteredProducts.length} of {products.length} Products
        </span>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center space-y-2">
            <RefreshCw className="w-6 h-6 text-brand-700 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading inventory...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            No products match your search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Current Stock</th>
                  <th className="p-4 text-right">Update Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLowStock = p.stock < 10;
                  const isOutOfStock = p.stock === 0;
                  
                  return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={p.image_url || "https://images.unsplash.com/photo-1608248597263-00079e96047c?auto=format&fit=crop&w=100&q=80"}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                      />
                      <span className="font-bold text-slate-900 text-xs leading-snug">{p.name}</span>
                    </td>

                    <td className="p-4 font-semibold text-brand-700">
                      {p.category}
                    </td>
                    
                    <td className="p-4">
                      {isOutOfStock ? (
                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded-full font-bold text-[10px] border border-red-200">Out of Stock</span>
                      ) : isLowStock ? (
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full font-bold text-[10px] border border-amber-200">Low Stock</span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-200">In Stock</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <span className={`font-black text-sm ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-slate-700'}`}>
                        {p.stock || 0}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min="0"
                          value={stockInputs[p.id] !== undefined ? stockInputs[p.id] : ''}
                          onChange={(e) => handleStockChange(p.id, e.target.value)}
                          className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          onClick={() => handleUpdateStock(p.id, p.name)}
                          disabled={updatingId === p.id}
                          className="px-3 py-1.5 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {updatingId === p.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Update</span>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
