import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Tag,
  FolderPlus,
  RefreshCw,
  Building,
  CreditCard
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isNewCatOpen, setIsNewCatOpen] = useState(false);

  // Form states
  const [categoryId, setCategoryId] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [accountId, setAccountId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [allocatedToType, setAllocatedToType] = useState('GENERAL');
  const [allocatedToId, setAllocatedToId] = useState('');
  const [notes, setNotes] = useState('');

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes, accRes, batRes] = await Promise.all([
        apiRequest('/expenses'),
        apiRequest('/expense-categories'),
        apiRequest('/accounts'),
        apiRequest('/production')
      ]);
      setExpenses(expRes);
      setCategories(catRes);
      setAccounts(accRes);
      setBatches(batRes);
      if (catRes.length > 0 && !categoryId) {
        setCategoryId(catRes[0].id);
      }
      if (accRes.length > 0 && !accountId) {
        setAccountId(accRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load expenses data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!categoryId || Number(amount) <= 0) {
      setFormError('Please select a category and enter amount > 0.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category_id: categoryId,
          expense_date: expenseDate,
          description: description.trim(),
          payee: payee.trim(),
          amount: Number(amount),
          tax_amount: Number(taxAmount || 0),
          payment_mode: paymentMode,
          account_id: accountId,
          reference_no: referenceNo,
          allocated_to_type: allocatedToType,
          allocated_to_id: allocatedToId || null,
          notes
        })
      });

      await fetchData();
      setIsNewExpenseOpen(false);
      setDescription('');
      setPayee('');
      setAmount('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await apiRequest('/expense-categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName.trim(), description: newCatDesc.trim() })
      });
      await fetchData();
      setIsNewCatOpen(false);
      setNewCatName('');
      setNewCatDesc('');
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  const filtered = expenses.filter(e => {
    const matchSearch =
      e.expense_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.payee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || e.category_id === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Expense Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log factory overheads, transport freight, fuel, premises rent, salaries, packaging, and repairs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewCatOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <FolderPlus className="h-4 w-4 text-blue-700" />
            <span>Add Category</span>
          </button>
          <button
            onClick={() => {
              setIsNewExpenseOpen(true);
              setFormError(null);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses by payee, description, category..."
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
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={fetchData}
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
                <th className="py-3 px-4">Expense #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Payee</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Allocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filtered.length > 0 ? (
                filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">{e.expense_number}</td>
                    <td className="py-3 px-4 text-slate-600">{e.expense_date}</td>
                    <td className="py-3 px-4">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                        {e.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{e.description}</td>
                    <td className="py-3 px-4 text-slate-700">{e.payee || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(e.total_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {e.payment_mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-medium">
                      {e.allocated_to_type !== 'GENERAL' ? e.allocated_to_type : 'General Overhead'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                    No operating expenses recorded. Click "Record Expense" to log business expenditure.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {isNewExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Record Business Expense</h3>
            <p className="mt-1 text-xs text-slate-500">
              Deducts directly from selected cash or bank account.
            </p>

            <form onSubmit={handleCreateExpense} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700 border border-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900 bg-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Delivery truck diesel fuel, factory electricity bill, worker daily wages"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payee / Recipient</label>
                  <input
                    type="text"
                    value={payee}
                    onChange={e => setPayee(e.target.value)}
                    placeholder="e.g. Petrol pump, Landlord"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank / Cash Account</label>
                  <select
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs bg-white"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.account_name} ({formatINR(a.current_balance)})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cost Allocation (Optional)</label>
                <select
                  value={allocatedToType}
                  onChange={e => setAllocatedToType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs bg-white"
                >
                  <option value="GENERAL">General Factory / Overhead</option>
                  <option value="PRODUCTION_BATCH">Specific Production Batch</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewExpenseOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 rounded-xl bg-blue-700 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {isNewCatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Create Custom Expense Category</h3>
            <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="e.g. Laboratory Testing, Boiler Fuel"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCatOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-blue-700 py-2 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
