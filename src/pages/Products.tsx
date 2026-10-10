import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Floor Cleaner');
  const [sku, setSku] = useState('');
  const [size, setSize] = useState('1 Ltr');
  const [unit, setUnit] = useState('Bottle');
  const [hsnCode, setHsnCode] = useState('3402');
  const [gstRate, setGstRate] = useState('18');
  const [purchaseCost, setPurchaseCost] = useState('0');
  const [retailRate, setRetailRate] = useState('0');
  const [wholesaleRate, setWholesaleRate] = useState('0');
  const [openingStock, setOpeningStock] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = [
    'Floor Cleaner',
    'Toilet Cleaner',
    'Hand Wash',
    'White Phenyl',
    'Black Phenyl',
    'Glass Cleaner',
    'Dishwash Gel',
    'Bathroom Cleaner',
    'Tile Cleaner',
    'Detergent Liquid',
    'Other Cleaners'
  ];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/products');
      setProducts(res);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Floor Cleaner');
    setSku('');
    setSize('1 Ltr');
    setUnit('Bottle');
    setHsnCode('3402');
    setGstRate('18');
    setPurchaseCost('0');
    setRetailRate('0');
    setWholesaleRate('0');
    setOpeningStock('0');
    setReorderLevel('10');
    setNotes('');
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setSku(p.sku || '');
    setSize(p.size || '1 Ltr');
    setUnit(p.unit || 'Bottle');
    setHsnCode(p.hsn_code || '3402');
    setGstRate(String(p.gst_rate || 18));
    setPurchaseCost(String(p.purchase_cost || 0));
    setRetailRate(String(p.retail_rate || 0));
    setWholesaleRate(String(p.wholesale_rate || 0));
    setOpeningStock(String(p.opening_stock || 0));
    setReorderLevel(String(p.reorder_level || 10));
    setNotes(p.notes || '');
    setIsActive(Boolean(p.is_active));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        sku: sku.trim(),
        size,
        unit,
        hsn_code: hsnCode.trim(),
        gst_rate: Number(gstRate),
        purchase_cost: Number(purchaseCost),
        retail_rate: Number(retailRate),
        wholesale_rate: Number(wholesaleRate),
        opening_stock: Number(openingStock),
        reorder_level: Number(reorderLevel),
        is_active: isActive ? 1 : 0,
        notes
      };

      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      await fetchProducts();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Products Master (Finished Cleaning Products)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your cleaning catalogue, retail and wholesale prices, units, HSN codes, and reorder levels.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, code, SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-700"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button
            onClick={fetchProducts}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Product Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Size / Unit</th>
                <th className="py-3 px-4 text-center">HSN</th>
                <th className="py-3 px-4 text-center">GST %</th>
                <th className="py-3 px-4 text-right">Cost (₹)</th>
                <th className="py-3 px-4 text-right">Wholesale (₹)</th>
                <th className="py-3 px-4 text-right">Retail (₹)</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filtered.length > 0 ? (
                filtered.map(p => {
                  const isLowStock = Number(p.current_stock) <= Number(p.reorder_level);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{p.product_code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.name}
                        {p.sku && <span className="ml-1 text-[10px] text-slate-400 font-mono">({p.sku})</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.size} &bull; {p.unit}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{p.hsn_code || '3402'}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">{p.gst_rate}%</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatINR(p.purchase_cost)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">{formatINR(p.wholesale_rate)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatINR(p.retail_rate)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isLowStock && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                          <span className={`font-mono font-bold ${isLowStock ? 'text-red-700' : 'text-emerald-700'}`}>
                            {p.current_stock} {p.unit}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(p)}
                          className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 font-medium">
                    No products found. Click "Add New Product" to populate your product master.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h2 className="text-base font-black text-slate-900 font-sans">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create Finished Cleaning Product'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. NEOXIL Super Shine Floor Cleaner (Pine)"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900 bg-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU / Barcode</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="e.g. FC-PINE-1L"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Size</label>
                  <input
                    type="text"
                    value={size}
                    onChange={e => setSize(e.target.value)}
                    placeholder="e.g. 500 ml, 1 Ltr, 5 Ltr, 50 Ltr"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="Bottle, Can, Pcs, Box"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={e => setHsnCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST Tax Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={e => setGstRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold bg-white"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cost / Purchase Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchaseCost}
                    onChange={e => setPurchaseCost(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">Wholesale Selling Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={wholesaleRate}
                    onChange={e => setWholesaleRate(e.target.value)}
                    className="w-full rounded-xl border border-blue-400 py-2 px-3 text-xs font-bold font-mono text-blue-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Retail Selling Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={retailRate}
                    onChange={e => setRetailRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reorder Level Alert</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderLevel}
                    onChange={e => setReorderLevel(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Opening Stock (Units)</label>
                    <input
                      type="number"
                      min="0"
                      value={openingStock}
                      onChange={e => setOpeningStock(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-slate-700">
                  Active (Available for sales billing and production)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
