import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  Users,
  Plus,
  Search,
  BookOpen,
  Building,
  Phone,
  Mail,
  FileSpreadsheet,
  Printer,
  X,
  CreditCard
} from 'lucide-react';

export const Parties: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'SUPPLIERS'>('CUSTOMERS');
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [ledgerData, setLedgerData] = useState<any | null>(null);

  // Customer Form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custCity, setCustCity] = useState('');
  const [custState, setCustState] = useState('Rajasthan');
  const [custPincode, setCustPincode] = useState('');
  const [custGstin, setCustGstin] = useState('');
  const [custOpening, setCustOpening] = useState('0');
  const [custLimit, setCustLimit] = useState('0');

  // Supplier Form
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supCity, setSupCity] = useState('');
  const [supState, setSupState] = useState('Rajasthan');
  const [supPincode, setSupPincode] = useState('');
  const [supGstin, setSupGstin] = useState('');
  const [supOpening, setSupOpening] = useState('0');

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        apiRequest('/customers'),
        apiRequest('/suppliers')
      ]);
      setCustomers(cRes);
      setSuppliers(sRes);
    } catch (err) {
      console.error('Failed to load parties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;
    setSaving(true);
    try {
      await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: custName.trim(),
          phone: custPhone.trim(),
          email: custEmail.trim(),
          billing_address: custAddress.trim(),
          billing_city: custCity.trim(),
          billing_state: custState.trim(),
          billing_pincode: custPincode.trim(),
          gstin: custGstin.trim(),
          opening_balance: Number(custOpening || 0),
          credit_limit: Number(custLimit || 0)
        })
      });
      await fetchData();
      setIsCustomerModalOpen(false);
      setCustName('');
    } catch (err: any) {
      alert(err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    setSaving(true);
    try {
      await apiRequest('/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: supName.trim(),
          phone: supPhone.trim(),
          email: supEmail.trim(),
          address: supAddress.trim(),
          city: supCity.trim(),
          state: supState.trim(),
          pincode: supPincode.trim(),
          gstin: supGstin.trim(),
          opening_balance: Number(supOpening || 0)
        })
      });
      await fetchData();
      setIsSupplierModalOpen(false);
      setSupName('');
    } catch (err: any) {
      alert(err.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const openCustomerLedger = async (customerId: string) => {
    try {
      const res = await apiRequest(`/customers/${customerId}/ledger`);
      setLedgerData({ type: 'CUSTOMER', ...res });
    } catch (err) {
      alert('Failed to load customer ledger');
    }
  };

  const openSupplierLedger = async (supplierId: string) => {
    try {
      const res = await apiRequest(`/suppliers/${supplierId}/ledger`);
      setLedgerData({ type: 'SUPPLIER', ...res });
    } catch (err) {
      alert('Failed to load supplier ledger');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.supplier_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Customers &amp; Suppliers Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your wholesale buyers, retail clients, suppliers, credit limits, and running account ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'CUSTOMERS' ? (
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Customer</span>
            </button>
          ) : (
            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`border-b-2 py-2 px-4 transition ${
              activeTab === 'CUSTOMERS'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`border-b-2 py-2 px-4 transition ${
              activeTab === 'SUPPLIERS'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Suppliers ({suppliers.length})
          </button>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search party by name or contact..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs focus:border-blue-600 focus:outline-hidden"
          />
        </div>
      </div>

      {/* CUSTOMERS TABLE */}
      {activeTab === 'CUSTOMERS' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Customer Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">City / State</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-right">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{c.customer_code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 text-slate-600">{c.phone || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{c.billing_city ? `${c.billing_city}, ` : ''}{c.billing_state}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.gstin || 'URP'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={Number(c.current_balance) > 0 ? 'text-red-700' : 'text-emerald-700'}>
                          {formatINR(c.current_balance)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openCustomerLedger(c.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Ledger</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                      No customers found. Click "Add Customer" to add your wholesale or retail customers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPPLIERS TABLE */}
      {activeTab === 'SUPPLIERS' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Supplier Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">City / State</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4 text-right">Outstanding Payable</th>
                  <th className="py-3 px-4 text-right">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{s.supplier_code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3 px-4 text-slate-600">{s.phone || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{s.city ? `${s.city}, ` : ''}{s.state}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{s.gstin || 'URP'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        {formatINR(s.current_balance)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openSupplierLedger(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Ledger</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                      No suppliers registered yet. Click "Add Supplier" to add raw material suppliers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEDGER STATEMENT MODAL */}
      {ledgerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative flex flex-col max-h-[92vh] w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            {/* Ledger Top Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Statement of Account</span>
                <h3 className="text-base font-black text-slate-900">
                  {ledgerData.customer?.name || ledgerData.supplier?.name}
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  Current Balance:{' '}
                  <span className="font-mono font-bold text-blue-900">
                    {formatINR(ledgerData.currentBalance)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Printer className="h-3.5 w-3.5 text-blue-700" />
                  <span>Print Statement</span>
                </button>
                <button onClick={() => setLedgerData(null)} className="rounded-lg p-1 text-slate-400 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Reference #</th>
                    <th className="py-2.5 px-3">Transaction Type</th>
                    <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                    <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                    <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerData.transactions?.map((t: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-600">{t.date}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{t.reference}</td>
                      <td className="py-2 px-3 font-medium text-slate-700">{t.type}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {t.debit > 0 ? formatINR(t.debit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {t.credit > 0 ? formatINR(t.credit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-950">
                        {formatINR(t.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>
            <form onSubmit={handleSaveCustomer} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Business Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  placeholder="e.g. Sharma Traders &amp; Wholesalers"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                    placeholder="Mobile number"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={custGstin}
                    onChange={e => setCustGstin(e.target.value)}
                    placeholder="GSTIN number"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={custAddress}
                  onChange={e => setCustAddress(e.target.value)}
                  placeholder="Shop / office address"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={custCity}
                    onChange={e => setCustCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={custState}
                    onChange={e => setCustState(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIN</label>
                  <input
                    type="text"
                    value={custPincode}
                    onChange={e => setCustPincode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={custOpening}
                    onChange={e => setCustOpening(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={custLimit}
                    onChange={e => setCustLimit(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 rounded-xl bg-blue-700 py-2 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Add New Supplier</h3>
            <form onSubmit={handleSaveSupplier} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={e => setSupName(e.target.value)}
                  placeholder="e.g. ChemTech Packaging Industries"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={e => setSupPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={supGstin}
                    onChange={e => setSupGstin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={e => setSupAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Opening Payable (₹)</label>
                  <input
                    type="number"
                    value={supOpening}
                    onChange={e => setSupOpening(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 rounded-xl bg-blue-700 py-2 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
