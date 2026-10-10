import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  Trash2,
  Plus,
  AlertOctagon,
  Calendar,
  Layers,
  Package,
  RefreshCw,
  TrendingDown
} from 'lucide-react';

export const Wastage: React.FC = () => {
  const [wastages, setWastages] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemType, setItemType] = useState<'PRODUCT' | 'RAW_MATERIAL'>('RAW_MATERIAL');
  const [itemId, setItemId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('Chemical Spillage');
  const [wastageDate, setWastageDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reasons = [
    'Chemical Spillage',
    'Leakage',
    'Damaged Bottles',
    'Broken Packaging',
    'Expired Materials',
    'Rejected Production',
    'Filling Loss',
    'Quality Test Scrap',
    'Other'
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wstRes, prodRes, matRes] = await Promise.all([
        apiRequest('/wastage'),
        apiRequest('/products'),
        apiRequest('/raw-materials')
      ]);
      setWastages(wstRes);
      setProducts(prodRes);
      setRawMaterials(matRes);
    } catch (err) {
      console.error('Failed to load wastage records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!itemId || Number(quantity) <= 0) {
      setFormError('Please choose an item and specify quantity > 0.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/wastage', {
        method: 'POST',
        body: JSON.stringify({
          item_type: itemType,
          item_id: itemId,
          batch_number: batchNumber,
          quantity: Number(quantity),
          reason,
          wastage_date: wastageDate,
          notes
        })
      });

      await fetchData();
      setIsModalOpen(false);
      setItemId('');
      setQuantity('1');
      setNotes('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to record wastage');
    } finally {
      setSaving(false);
    }
  };

  const totalCost = wastages.reduce((sum, w) => sum + Number(w.total_cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Wastage &amp; Scrap Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log raw chemical spills, bottle leakage, damaged packaging, filling losses, and expired stock.
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setFormError(null);
          }}
          className="flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-800 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Record New Wastage Entry</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Wastage Incidents</span>
          <div className="mt-2 text-2xl font-black text-slate-900">{wastages.length}</div>
          <p className="text-xs text-slate-500 mt-0.5">Recorded in audit log</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Cumulative Wastage Cost</span>
          <div className="mt-2 text-2xl font-black text-red-700">{formatINR(totalCost)}</div>
          <p className="text-xs text-slate-500 mt-0.5">Deducted from operating profit</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Stock Impact</span>
            <p className="text-xs font-semibold text-slate-700 mt-1">
              Atomic inventory deduction upon posting.
            </p>
          </div>
          <AlertOctagon className="h-8 w-8 text-red-500 shrink-0" />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Wastage #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Item Type</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Batch #</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Est. Cost (₹)</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {wastages.length > 0 ? (
                wastages.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-red-900">{w.wastage_number}</td>
                    <td className="py-3 px-4 text-slate-600">{w.wastage_date}</td>
                    <td className="py-3 px-4">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {w.item_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{w.item_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{w.batch_number || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-red-700">
                      {w.quantity} {w.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(w.total_cost)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-800 border border-red-200">
                        {w.reason}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{w.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                    No wastage entries recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD WASTAGE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Record Wastage / Scrap Entry</h3>
            <p className="mt-1 text-xs text-slate-500">
              Deducts quantity directly from stock and logs financial cost.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700 border border-red-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item Classification</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setItemType('RAW_MATERIAL');
                      setItemId('');
                    }}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold border transition ${
                      itemType === 'RAW_MATERIAL'
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    Raw Material / Pack
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setItemType('PRODUCT');
                      setItemId('');
                    }}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold border transition ${
                      itemType === 'PRODUCT'
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    Finished Good
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Item *</label>
                <select
                  required
                  value={itemId}
                  onChange={e => setItemId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900 bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {itemType === 'PRODUCT'
                    ? products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock} {p.unit})</option>
                      ))
                    : rawMaterials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} (Stock: {m.current_stock} {m.unit})</option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity Wasted *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-red-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={wastageDate}
                    onChange={e => setWastageDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot Number (Optional)</label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={e => setBatchNumber(e.target.value)}
                  placeholder="e.g. BAT-2026-101"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Wastage Reason</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold bg-white"
                >
                  {reasons.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Details of incident..."
                  className="w-full rounded-xl border border-slate-300 py-1.5 px-3 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 rounded-xl bg-red-700 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {saving ? 'Recording...' : 'Record Wastage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
