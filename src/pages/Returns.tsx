import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  Undo2,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

export const Returns: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SALES_RETURNS' | 'PURCHASE_RETURNS'>('SALES_RETURNS');
  const [salesReturns, setSalesReturns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Sales Return Modal
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [returnQty, setReturnQty] = useState('1');
  const [returnRate, setReturnRate] = useState('0');
  const [stockCondition, setStockCondition] = useState('SALEABLE');
  const [reason, setReason] = useState('Damaged Packaging');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [srRes, custRes, prodRes, invRes] = await Promise.all([
        apiRequest('/sales-returns'),
        apiRequest('/customers'),
        apiRequest('/products'),
        apiRequest('/invoices')
      ]);
      setSalesReturns(srRes);
      setCustomers(custRes);
      setProducts(prodRes);
      setInvoices(invRes);
    } catch (err) {
      console.error('Failed to load returns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setReturnRate(String(prod.wholesale_rate || prod.retail_rate || 0));
    }
  };

  const handleSaveSalesReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedProductId || Number(returnQty) <= 0) return;
    setSaving(true);
    try {
      await apiRequest('/sales-returns', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          invoice_id: selectedInvoiceId || null,
          product_id: selectedProductId,
          quantity: Number(returnQty),
          rate: Number(returnRate),
          stock_condition: stockCondition,
          reason,
          notes
        })
      });
      await fetchData();
      setIsSalesModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Sales return failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Sales Returns &amp; Credit Notes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Process customer returns with stock condition classification (Saleable vs Wastage) and automated customer ledger credit notes.
          </p>
        </div>

        <button
          onClick={() => setIsSalesModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Record Customer Return</span>
        </button>
      </div>

      {/* SALES RETURNS TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Return #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Returned Product</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Credit Amount (₹)</th>
                <th className="py-3 px-4 text-center">Stock Condition</th>
                <th className="py-3 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {salesReturns.length > 0 ? (
                salesReturns.map(sr => (
                  <tr key={sr.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">{sr.return_number}</td>
                    <td className="py-3 px-4 text-slate-600">{sr.return_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{sr.customer_name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{sr.product_name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {sr.quantity} {sr.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatINR(sr.total_credit_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        sr.stock_condition === 'SALEABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sr.stock_condition}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{sr.reason}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                    No sales returns logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD RETURN MODAL */}
      {isSalesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Record Sales Return &amp; Credit Note</h3>
            <form onSubmit={handleSaveSalesReturn} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900 bg-white"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Original Invoice (Optional)</label>
                <select
                  value={selectedInvoiceId}
                  onChange={e => setSelectedInvoiceId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs bg-white font-mono"
                >
                  <option value="">-- None / Direct Return --</option>
                  {invoices.map(i => (
                    <option key={i.id} value={i.id}>{i.invoice_number} ({i.invoice_date})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Returned *</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={e => handleProductChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900 bg-white"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity Returned *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={returnQty}
                    onChange={e => setReturnQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={returnRate}
                    onChange={e => setReturnRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Goods Condition</label>
                <select
                  value={stockCondition}
                  onChange={e => setStockCondition(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold bg-white"
                >
                  <option value="SALEABLE">Saleable (Restock to Saleable Inventory)</option>
                  <option value="DAMAGED">Damaged (Move to Wastage / Quarantine)</option>
                  <option value="WASTAGE">Wastage / Scrap</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Return Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSalesModalOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 rounded-xl bg-blue-700 py-2 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Post Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
