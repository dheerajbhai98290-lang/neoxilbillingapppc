import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Edit,
  AlertTriangle,
  RefreshCw,
  Boxes,
  PackageCheck
} from 'lucide-react';

export const RawMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Chemical');
  const [unit, setUnit] = useState('Kg');
  const [hsnCode, setHsnCode] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [purchaseCost, setPurchaseCost] = useState('0');
  const [openingStock, setOpeningStock] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [supplierId, setSupplierId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = [
    'Chemical',
    'Fragrance / Perfume',
    'Colour / Dye',
    'Packaging Bottle',
    'Bottle Cap / Flip-top',
    'Product Label',
    'Corrugated Carton / Box',
    'Shrink Wrap & Tape',
    'Cleaning Additive'
  ];

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const [matRes, supRes] = await Promise.all([
        apiRequest('/raw-materials'),
        apiRequest('/suppliers')
      ]);
      setMaterials(matRes);
      setSuppliers(supRes);
    } catch (err) {
      console.error('Failed to load raw materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const openCreateModal = () => {
    setEditingMaterial(null);
    setName('');
    setCategory('Chemical');
    setUnit('Kg');
    setHsnCode('');
    setGstRate('18');
    setPurchaseCost('0');
    setOpeningStock('0');
    setReorderLevel('10');
    setSupplierId('');
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: any) => {
    setEditingMaterial(m);
    setName(m.name);
    setCategory(m.category);
    setUnit(m.unit);
    setHsnCode(m.hsn_code || '');
    setGstRate(String(m.gst_rate || 18));
    setPurchaseCost(String(m.purchase_cost || 0));
    setOpeningStock(String(m.opening_stock || 0));
    setReorderLevel(String(m.reorder_level || 10));
    setSupplierId(m.supplier_id || '');
    setIsActive(Boolean(m.is_active));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Material name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        unit,
        hsn_code: hsnCode.trim(),
        gst_rate: Number(gstRate),
        purchase_cost: Number(purchaseCost),
        opening_stock: Number(openingStock),
        reorder_level: Number(reorderLevel),
        supplier_id: supplierId || null,
        is_active: isActive ? 1 : 0
      };

      if (editingMaterial) {
        await apiRequest(`/raw-materials/${editingMaterial.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/raw-materials', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      await fetchMaterials();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  const filtered = materials.filter(m => {
    const matchSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.material_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || m.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Raw Materials &amp; Packaging Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chemicals, fragrances, colorants, bottles, caps, labels, and packaging supplies consumed in manufacturing.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Raw Material / Pack</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search chemicals, bottles, cartons..."
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
            onClick={fetchMaterials}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Material / Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4 text-center">GST %</th>
                <th className="py-3 px-4 text-right">Avg Unit Cost</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Total Valuation</th>
                <th className="py-3 px-4 text-center">Reorder Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filtered.length > 0 ? (
                filtered.map(m => {
                  const isLow = Number(m.current_stock) <= Number(m.reorder_level);
                  const totalVal = Number(m.current_stock) * Number(m.purchase_cost);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{m.material_code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {m.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 font-bold">{m.unit}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{m.gst_rate}%</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">{formatINR(m.purchase_cost)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono font-bold ${isLow ? 'text-red-700' : 'text-slate-900'}`}>
                          {m.current_stock} {m.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(totalVal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Low (&le; {m.reorder_level})</span>
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Adequate
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(m)}
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
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                    No raw materials or packaging registered yet. Click "Add Raw Material / Pack" above.
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
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h2 className="text-base font-black text-slate-900 font-sans">
                {editingMaterial ? `Edit: ${editingMaterial.name}` : 'Create Raw Material / Packaging Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. LABSA 90%, Pine Oil, 1L HDPE Bottle, Flip Cap, Label"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="Kg, Ltr, Pcs, Roll, Box"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchaseCost}
                    onChange={e => setPurchaseCost(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono font-bold"
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

                {!editingMaterial && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Opening Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={openingStock}
                      onChange={e => setOpeningStock(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Supplier (Optional)</label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs bg-white"
                  >
                    <option value="">-- None --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
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
                  {saving ? 'Saving...' : editingMaterial ? 'Update Material' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
