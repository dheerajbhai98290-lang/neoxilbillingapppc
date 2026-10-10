import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  TrendingUp,
  ShoppingBag,
  Wallet,
  Users,
  Building,
  Package,
  Layers,
  AlertTriangle,
  Calendar,
  Factory,
  Trash2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  PlusCircle,
  FileText
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/dashboard/stats');
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const handleRefetch = () => fetchStats();
    window.addEventListener('app-refetch-data', handleRefetch);
    return () => window.removeEventListener('app-refetch-data', handleRefetch);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-semibold text-blue-900">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Computing live business metrics...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-center border border-red-200">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-600 mb-2" />
        <p className="text-sm font-bold text-red-800">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const today = data?.today || {};
  const outstanding = data?.outstanding || {};
  const inventory = data?.inventory || {};
  const monthly = data?.monthly || {};
  const cashAndBank = data?.cashAndBank || {};

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 text-white shadow-md">
        <div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-cyan-300">
            BUSINESS EXECUTIVE COCKPIT
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-wide font-sans">
            NEOXILINDIA Overview
          </h1>
          <p className="text-xs text-blue-200 mt-0.5">
            Real-time financial status, production batches, and inventory positions.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('invoices')}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-blue-900 shadow-sm hover:bg-blue-50 transition"
          >
            <PlusCircle className="h-4 w-4 text-blue-700" />
            <span>New Tax Invoice (A5)</span>
          </button>
          <button
            onClick={() => onNavigate('manufacturing')}
            className="flex items-center gap-1.5 rounded-xl bg-blue-700/80 px-3 py-2 text-xs font-bold text-white hover:bg-blue-600 border border-blue-400/30 transition"
          >
            <Factory className="h-4 w-4 text-cyan-300" />
            <span>New Batch</span>
          </button>
          <button
            onClick={fetchStats}
            title="Refresh dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Row (Today's Transactions) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-sans">
              {formatINR(today.sales)}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {today.salesCount} Finalized Invoices Today
            </p>
          </div>
        </div>

        {/* Today's Purchases */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Purchases</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-sans">
              {formatINR(today.purchases)}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {today.purchasesCount} Purchase Bills Logged
            </p>
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Expenses</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-sans">
              {formatINR(today.expenses)}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {today.expensesCount} Operating Expenses
            </p>
          </div>
        </div>

        {/* Cash & Bank In-Hand */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash &amp; Bank Balance</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Building className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-sans">
              {formatINR(cashAndBank.total)}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {cashAndBank.accounts?.length || 1} Linked Accounts
            </p>
          </div>
        </div>
      </div>

      {/* Receivables, Payables & Monthly Profit Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Customer Receivables */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Customer Receivables</span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                To Collect
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-red-600 font-sans">
              {formatINR(outstanding.customerReceivable)}
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Total pending balance due from all customers across posted invoices.
            </p>
          </div>
          <button
            onClick={() => onNavigate('parties')}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-blue-900 hover:bg-slate-50"
          >
            <span>View Customer Ledgers</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Supplier Payables */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Supplier Payables</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                To Pay
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-amber-700 font-sans">
              {formatINR(outstanding.supplierPayable)}
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Total outstanding balance payable to raw material &amp; packaging suppliers.
            </p>
          </div>
          <button
            onClick={() => onNavigate('parties')}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-blue-900 hover:bg-slate-50"
          >
            <span>View Supplier Ledgers</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Monthly Profit & Loss Quick Snapshot */}
        <div className="rounded-2xl border border-blue-900/10 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 uppercase">Current Month Profit</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                P&amp;L Est.
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black font-sans ${
                monthly.estimatedNetProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {formatINR(monthly.estimatedNetProfit)}
              </span>
              <span className="text-xs font-semibold text-slate-500">Net</span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Net Sales (Excl. Tax):</span>
                <span className="font-semibold">{formatINR(monthly.netSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cost of Goods Sold:</span>
                <span className="font-semibold text-slate-600">{formatINR(monthly.cogs)}</span>
              </div>
              <div className="flex justify-between text-blue-950 font-bold border-t border-blue-200/60 pt-1">
                <span>Gross Profit:</span>
                <span>{formatINR(monthly.grossProfit)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-blue-800 py-2 text-xs font-bold text-white hover:bg-blue-900 shadow-xs"
          >
            <span>Open Comprehensive P&amp;L</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Inventory & Factory Operations Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Finished Goods & Raw Material Stock */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-700" />
              <h3 className="text-sm font-bold text-slate-900">Current Inventory Valuation</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">Live Stock Balance</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Package className="h-4 w-4 text-blue-600" />
                <span>Finished Cleaning Goods</span>
              </div>
              <div className="mt-2 text-xl font-black text-slate-900 font-sans">
                {inventory.finishedProducts?.units || 0} Units
              </div>
              <p className="mt-1 text-xs font-semibold text-blue-700">
                Valued at {formatINR(inventory.finishedProducts?.value)}
              </p>
              <button
                onClick={() => onNavigate('products')}
                className="mt-3 text-[11px] font-bold text-blue-700 hover:underline"
              >
                Manage Finished Products &rarr;
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Raw Chemicals &amp; Packs</span>
              </div>
              <div className="mt-2 text-xl font-black text-slate-900 font-sans">
                {inventory.rawMaterials?.units || 0} Units
              </div>
              <p className="mt-1 text-xs font-semibold text-indigo-700">
                Valued at {formatINR(inventory.rawMaterials?.value)}
              </p>
              <button
                onClick={() => onNavigate('raw_materials')}
                className="mt-3 text-[11px] font-bold text-indigo-700 hover:underline"
              >
                Manage Materials &amp; Packs &rarr;
              </button>
            </div>
          </div>

          {/* Monthly Production and Wastage stats */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs">
            <div>
              <span className="font-bold text-slate-700">Monthly Factory Production:</span>
              <span className="ml-2 font-black text-blue-900">{monthly.productionUnits} Units</span>
              <span className="ml-1 text-slate-500 font-medium">({formatINR(monthly.productionCost)})</span>
            </div>
            <div>
              <span className="font-bold text-slate-700">Wastage / Scrap:</span>
              <span className="ml-2 font-bold text-red-700">{formatINR(monthly.wastageCost)}</span>
            </div>
          </div>
        </div>

        {/* Low Stock & Expiry Critical Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Alerts &amp; Thresholds</h3>
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
              {inventory.lowStock?.totalAlerts || 0} Reorder Alerts
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {/* Low stock items table */}
            {inventory.lowStock?.products?.length > 0 || inventory.lowStock?.rawMaterials?.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {inventory.lowStock.products.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/40 p-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="ml-1.5 text-[10px] text-slate-500">({p.category})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-700">{p.current_stock} {p.unit}</span>
                      <span className="ml-1 text-[10px] text-slate-500">/ Reorder at {p.reorder_level}</span>
                    </div>
                  </div>
                ))}
                {inventory.lowStock.rawMaterials.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/40 p-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{m.name}</span>
                      <span className="ml-1.5 text-[10px] text-slate-500">({m.category})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-700">{m.current_stock} {m.unit}</span>
                      <span className="ml-1 text-[10px] text-slate-500">/ Reorder at {m.reorder_level}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 p-4 text-center text-xs font-semibold text-emerald-800">
                All finished products and raw materials are above their minimum reorder thresholds.
              </div>
            )}

            {/* Expiry alerts note */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-700" />
                <span className="text-slate-700 font-medium">Near-Expiry Batches (FEFO):</span>
              </div>
              <button
                onClick={() => onNavigate('expiry')}
                className="font-bold text-blue-700 hover:underline"
              >
                Check {inventory.expiry?.nearExpiry?.length || 0} batches &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
