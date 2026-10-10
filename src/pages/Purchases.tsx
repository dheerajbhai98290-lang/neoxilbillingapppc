import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Truck,
  Trash2,
  AlertCircle,
  RefreshCw,
  Eye,
  IndianRupee
} from 'lucide-react';

export const Purchases: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);

  // New Purchase Bill Form State
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [freightCharges, setFreightCharges] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<any[]>([
    {
      item_type: 'RAW_MATERIAL',
      item_id: '',
      item_name: '',
      hsn_code: '',
      unit: 'Kg',
      quantity: 1,
      rate: 0,
      gst_rate: 18,
      batch_number: '',
      expiry_date: ''
    }
  ]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, matRes, prodRes] = await Promise.all([
        apiRequest('/purchases'),
        apiRequest('/suppliers'),
        apiRequest('/raw-materials'),
        apiRequest('/products')
      ]);
      setPurchases(purRes);
      setSuppliers(supRes);
      setRawMaterials(matRes);
      setProducts(prodRes);
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        item_type: 'RAW_MATERIAL',
        item_id: '',
        item_name: '',
        hsn_code: '',
        unit: 'Kg',
        quantity: 1,
        rate: 0,
        gst_rate: 18,
        batch_number: '',
        expiry_date: ''
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    if (field === 'item_id') {
      if (item.item_type === 'PRODUCT') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          item.item_name = prod.name;
          item.unit = prod.unit || 'Bottle';
          item.hsn_code = prod.hsn_code || '3402';
          item.rate = prod.purchase_cost || 0;
          item.gst_rate = prod.gst_rate || 18;
        }
      } else {
        const mat = rawMaterials.find(m => m.id === value);
        if (mat) {
          item.item_name = mat.name;
          item.unit = mat.unit || 'Kg';
          item.hsn_code = mat.hsn_code || '';
          item.rate = mat.purchase_cost || 0;
          item.gst_rate = mat.gst_rate || 18;
        }
      }
    }

    updated[index] = item;
    setItems(updated);
  };

  // Calculations
  let subtotal = 0;
  let taxable = 0;
  let taxTotal = 0;

  items.forEach(it => {
    const q = Number(it.quantity || 0);
    const r = Number(it.rate || 0);
    const lineGross = q * r;
    const gstRate = Number(it.gst_rate || 18);
    subtotal += lineGross;
    taxable += lineGross;
    taxTotal += (lineGross * gstRate) / 100;
  });

  const freight = Number(freightCharges || 0);
  const grandTotal = Math.round(taxable + taxTotal + freight);
  const balancePayable = grandTotal - Number(paidAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!supplierId) {
      setFormError('Please select a supplier.');
      return;
    }
    if (!supplierInvoiceNumber) {
      setFormError('Please enter Supplier Invoice Number.');
      return;
    }

    const invalid = items.filter(it => !it.item_id || Number(it.quantity) <= 0 || Number(it.rate) <= 0);
    if (invalid.length > 0) {
      setFormError('Ensure all item lines have an item selected, quantity > 0, and rate > 0.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: supplierId,
          supplier_invoice_number: supplierInvoiceNumber,
          purchase_date: purchaseDate,
          due_date: dueDate,
          freight_charges: freight,
          paid_amount: Number(paidAmount || 0),
          payment_mode: paymentMode,
          notes,
          items
        })
      });

      await fetchData();
      setIsCreating(false);
      // Reset form
      setSupplierInvoiceNumber('');
      setPaidAmount('0');
      setFreightCharges('0');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save purchase bill');
    } finally {
      setSaving(false);
    }
  };

  const filteredPurchases = purchases.filter(p =>
    p.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier_invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">Purchase Bill Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log inward purchases for raw chemicals, packaging materials, bottles, caps, and cartons.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreating(true);
            setFormError(null);
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Record Inward Purchase Bill</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Bill #, Supplier, or Supplier Invoice #..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <button
          onClick={fetchData}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* PURCHASES TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Purchase #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier Invoice #</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Freight</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Balance Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map(pb => (
                  <tr key={pb.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">{pb.purchase_number}</td>
                    <td className="py-3 px-4 text-slate-600">{pb.purchase_date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{pb.supplier_invoice_number}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{pb.supplier_name}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">{formatINR(pb.taxable_amount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{formatINR(pb.freight_charges)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatINR(pb.grand_total)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">{formatINR(pb.balance_payable)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {pb.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={async () => {
                          const bill = await apiRequest(`/purchases/${pb.id}`);
                          setSelectedBill(bill);
                        }}
                        className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                    No purchase bills recorded. Click "Record Inward Purchase Bill" to add incoming stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PURCHASE BILL MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative flex flex-col max-h-[96vh] w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h2 className="text-base font-black text-slate-900 font-sans">
                Record Supplier Purchase Bill
              </h2>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Master Bill Details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Supplier *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-900"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Invoice # *</label>
                  <input
                    type="text"
                    required
                    value={supplierInvoiceNumber}
                    onChange={e => setSupplierInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-99"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Purchase Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Purchased Materials &amp; Products
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-2 w-28">Type</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Item Name *</th>
                        <th className="py-2.5 px-2 w-20">Unit</th>
                        <th className="py-2.5 px-2 w-24">Batch #</th>
                        <th className="py-2.5 px-2 w-20">Qty *</th>
                        <th className="py-2.5 px-2 w-24">Rate (₹) *</th>
                        <th className="py-2.5 px-2 w-20">GST %</th>
                        <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {items.map((it, idx) => {
                        const q = Number(it.quantity || 0);
                        const r = Number(it.rate || 0);
                        const gross = q * r;
                        const lineTotal = gross + (gross * Number(it.gst_rate || 18)) / 100;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-500 font-bold">{idx + 1}</td>
                            <td className="py-2 px-2">
                              <select
                                value={it.item_type}
                                onChange={e => {
                                  handleItemChange(idx, 'item_type', e.target.value);
                                  handleItemChange(idx, 'item_id', '');
                                }}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1.5 text-xs bg-white font-medium"
                              >
                                <option value="RAW_MATERIAL">Raw Material</option>
                                <option value="PRODUCT">Finished Good</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={it.item_id}
                                onChange={e => handleItemChange(idx, 'item_id', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-2 text-xs font-bold text-slate-900 bg-white"
                              >
                                <option value="">-- Choose Item --</option>
                                {it.item_type === 'PRODUCT'
                                  ? products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                  : rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.category})</option>)}
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={it.unit}
                                onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1 text-xs text-center"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={it.batch_number}
                                onChange={e => handleItemChange(idx, 'batch_number', e.target.value)}
                                placeholder="Supplier Batch"
                                className="w-full rounded-lg border border-slate-300 py-1 px-1.5 text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={it.quantity}
                                onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1.5 text-xs text-right font-bold"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.rate}
                                onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1.5 text-xs text-right font-bold"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={it.gst_rate}
                                onChange={e => handleItemChange(idx, 'gst_rate', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1 text-xs text-center font-semibold"
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatINR(lineTotal)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Freight, Paid & Totals */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Freight / Transport Charges (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={freightCharges}
                      onChange={e => setFreightCharges(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Amount Paid to Supplier (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={paidAmount}
                        onChange={e => setPaidAmount(e.target.value)}
                        className="w-full rounded-xl border border-emerald-300 bg-white py-1.5 px-3 text-xs font-bold text-emerald-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={paymentMode}
                        onChange={e => setPaymentMode(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs font-semibold"
                      >
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-blue-900/10 bg-white p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-bold">{formatINR(taxable)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Applicable GST Total:</span>
                    <span className="font-mono font-bold text-blue-900">{formatINR(taxTotal)}</span>
                  </div>
                  {freight > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Freight &amp; Landing:</span>
                      <span className="font-mono">{formatINR(freight)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-blue-900 pt-2 text-base font-black text-blue-950">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono text-blue-900">{formatINR(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-800 pt-1">
                    <span>Paid Amount:</span>
                    <span className="font-mono">{formatINR(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-amber-700 border-t border-dashed border-slate-300 pt-1">
                    <span>BALANCE PAYABLE:</span>
                    <span className="font-mono">{formatINR(balancePayable)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? 'Posting Bill...' : 'Post Purchase Bill & Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PURCHASE BILL MODAL */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Purchase Bill</span>
                <h3 className="text-lg font-black text-slate-900">{selectedBill.purchase_number}</h3>
                <p className="text-xs text-slate-600">Supplier: <strong>{selectedBill.supplier_name}</strong> (Inv: {selectedBill.supplier_invoice_number})</p>
              </div>
              <button onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-2 text-right">GST</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBill.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3 font-semibold">{it.item_name}</td>
                      <td className="py-2 px-2 text-right">{it.quantity} {it.unit}</td>
                      <td className="py-2 px-2 text-right">{formatINR(it.rate)}</td>
                      <td className="py-2 px-2 text-right">{it.gst_rate}%</td>
                      <td className="py-2 px-3 text-right font-bold">{formatINR(it.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-3 flex justify-between font-black text-sm text-slate-900">
              <span>Grand Total:</span>
              <span>{formatINR(selectedBill.grand_total)}</span>
            </div>
            <div className="flex justify-between text-xs text-amber-700 font-bold mt-1">
              <span>Balance Payable:</span>
              <span>{formatINR(selectedBill.balance_payable)}</span>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setSelectedBill(null)}
                className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
