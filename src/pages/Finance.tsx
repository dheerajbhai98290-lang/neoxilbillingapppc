import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  Plus,
  RefreshCw,
  Wallet,
  Calendar
} from 'lucide-react';

export const Finance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'RECEIPTS' | 'PAYMENTS' | 'ACCOUNTS'>('RECEIPTS');
  const [receipts, setReceipts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Receipt form
  const [recCustomerId, setRecCustomerId] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recDate, setRecDate] = useState(new Date().toISOString().slice(0, 10));
  const [recMode, setRecMode] = useState('CASH');
  const [recAccountId, setRecAccountId] = useState('');
  const [recNotes, setRecNotes] = useState('');

  // Payment form
  const [paySupplierId, setPaySupplierId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMode, setPayMode] = useState('BANK_TRANSFER');
  const [payAccountId, setPayAccountId] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // New Account form
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('BANK');
  const [accBankName, setAccBankName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [accIfsc, setAccIfsc] = useState('');
  const [accOpening, setAccOpening] = useState('0');

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, payRes, accRes, custRes, supRes] = await Promise.all([
        apiRequest('/receipts'),
        apiRequest('/payments'),
        apiRequest('/accounts'),
        apiRequest('/customers'),
        apiRequest('/suppliers')
      ]);
      setReceipts(recRes);
      setPayments(payRes);
      setAccounts(accRes);
      setCustomers(custRes);
      setSuppliers(supRes);
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recCustomerId || Number(recAmount) <= 0) return;
    setSaving(true);
    try {
      await apiRequest('/receipts', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: recCustomerId,
          amount: Number(recAmount),
          receipt_date: recDate,
          payment_mode: recMode,
          account_id: recAccountId || accounts[0]?.id,
          notes: recNotes
        })
      });
      await fetchData();
      setIsReceiptModalOpen(false);
      setRecAmount('');
    } catch (err: any) {
      alert(err.message || 'Receipt recording failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplierId || Number(payAmount) <= 0) return;
    setSaving(true);
    try {
      await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: paySupplierId,
          amount: Number(payAmount),
          payment_date: payDate,
          payment_mode: payMode,
          account_id: payAccountId || accounts[0]?.id,
          notes: payNotes
        })
      });
      await fetchData();
      setIsPaymentModalOpen(false);
      setPayAmount('');
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    setSaving(true);
    try {
      await apiRequest('/accounts', {
        method: 'POST',
        body: JSON.stringify({
          account_name: accName.trim(),
          account_type: accType,
          bank_name: accBankName.trim(),
          account_number: accNumber.trim(),
          ifsc_code: accIfsc.trim(),
          opening_balance: Number(accOpening || 0)
        })
      });
      await fetchData();
      setIsAccountModalOpen(false);
      setAccName('');
    } catch (err: any) {
      alert(err.message || 'Account creation failed');
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
            Finance, Cashbook &amp; Bankbook
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log incoming customer collections, outgoing supplier remittances, and track live account balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>Customer Receipt (Money In)</span>
          </button>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-red-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-800 transition"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Supplier Payment (Money Out)</span>
          </button>
        </div>
      </div>

      {/* Account Balances Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {accounts.map(acc => (
          <div key={acc.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">{acc.account_name}</span>
              <Building className="h-4 w-4 text-blue-700" />
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 font-sans">
              {formatINR(acc.current_balance)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">
              {acc.account_type} {acc.bank_name ? `&bull; ${acc.bank_name}` : ''}
            </p>
          </div>
        ))}
        <button
          onClick={() => setIsAccountModalOpen(true)}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-4 hover:border-blue-500 hover:bg-blue-50/50 transition text-slate-600 hover:text-blue-700"
        >
          <Plus className="h-5 w-5 mb-1" />
          <span className="text-xs font-bold">Add Bank Account</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('RECEIPTS')}
          className={`flex items-center gap-2 border-b-2 py-2.5 px-4 transition ${
            activeTab === 'RECEIPTS'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          <span>Customer Receipts ({receipts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`flex items-center gap-2 border-b-2 py-2.5 px-4 transition ${
            activeTab === 'PAYMENTS'
              ? 'border-red-600 text-red-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Supplier Payments ({payments.length})</span>
        </button>
      </div>

      {/* RECEIPTS TABLE */}
      {activeTab === 'RECEIPTS' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {receipts.length > 0 ? (
                  receipts.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-900">{r.receipt_number}</td>
                      <td className="py-3 px-4 text-slate-600">{r.receipt_date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.customer_name}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatINR(r.amount)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{r.payment_mode}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{r.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                      No customer receipts logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYMENTS TABLE */}
      {activeTab === 'PAYMENTS' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Payment #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {payments.length > 0 ? (
                  payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-red-900">{p.payment_number}</td>
                      <td className="py-3 px-4 text-slate-600">{p.payment_date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.supplier_name}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-700">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{p.payment_mode}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{p.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                      No supplier payments logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD RECEIPT MODAL */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Record Customer Receipt (Money In)</h3>
            <form onSubmit={handleCreateReceipt} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer *</label>
                <select
                  required
                  value={recCustomerId}
                  onChange={e => setRecCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900 bg-white"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.current_balance > 0 ? `[Due: ₹${c.current_balance}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={recAmount}
                    onChange={e => setRecAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={recDate}
                    onChange={e => setRecDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={recMode}
                  onChange={e => setRecMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold bg-white"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={recNotes}
                  onChange={e => setRecNotes(e.target.value)}
                  placeholder="e.g. Cleared payment via UPI"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  Save Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Record Supplier Payment (Money Out)</h3>
            <form onSubmit={handleCreatePayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier *</label>
                <select
                  required
                  value={paySupplierId}
                  onChange={e => setPaySupplierId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900 bg-white"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.current_balance > 0 ? `[Payable: ₹${s.current_balance}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={e => setPayMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold bg-white"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 rounded-xl bg-red-700 py-2 text-xs font-bold text-white hover:bg-red-800"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ACCOUNT MODAL */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Add Bank Account</h3>
            <form onSubmit={handleCreateAccount} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={e => setAccName(e.target.value)}
                  placeholder="e.g. State Bank of India Current A/c"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={accNumber}
                  onChange={e => setAccNumber(e.target.value)}
                  placeholder="Account number"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={accIfsc}
                  onChange={e => setAccIfsc(e.target.value)}
                  placeholder="e.g. SBIN0001234"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  value={accOpening}
                  onChange={e => setAccOpening(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 rounded-xl bg-blue-700 py-2 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
