import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';

export const Batches: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertDays, setAlertDays] = useState<number>(60); // 7, 30, 60, 90
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/dashboard/stats');
      // Also fetch inventory movements and batches
      const movements = await apiRequest('/reports/stock-ledger');
      // Derive batch cards
      const invBatches = [
        ...(res.inventory?.expiry?.nearExpiry || []),
        ...(res.inventory?.expiry?.expired || [])
      ];
      setBatches(invBatches);
    } catch (err) {
      console.error('Failed to load batch tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const getDaysToExpiry = (expiryDate: string) => {
    if (!expiryDate) return null;
    const diffTime = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Expiry &amp; Batch Tracking (FEFO Management)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor product and chemical shelf lives, FEFO consumption priorities, and proactive expiry alerts.
          </p>
        </div>

        {/* Days Alert Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Threshold:</span>
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-bold">
            {[7, 30, 60, 90].map(days => (
              <button
                key={days}
                onClick={() => setAlertDays(days)}
                className={`rounded-md px-2.5 py-1 transition ${
                  alertDays === days ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800 uppercase">Expired Batches</span>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-red-700">
            {batches.filter(b => b.expiry_date && b.expiry_date < today).length}
          </div>
          <p className="text-[11px] font-semibold text-red-700 mt-0.5">
            Quarantine immediately to prevent sale
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase">Near Expiry (&le; {alertDays} Days)</span>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-800">
            {batches.filter(b => {
              const d = getDaysToExpiry(b.expiry_date);
              return d !== null && d >= 0 && d <= alertDays;
            }).length}
          </div>
          <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
            Prioritize first under FEFO order
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase">FEFO Discipline</span>
            <CheckCircle2 className="h-5 w-5 text-blue-700" />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-700">
            First Expired, First Out is enforced during batch manufacturing and sales dispatch.
          </p>
        </div>
      </div>

      {/* BATCHES TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Item Type</th>
                <th className="py-3 px-4">Mfg Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Days Remaining</th>
                <th className="py-3 px-4 text-right">Remaining Qty</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {batches.length > 0 ? (
                batches.map(b => {
                  const days = getDaysToExpiry(b.expiry_date);
                  const isExpired = days !== null && days < 0;
                  const isNear = days !== null && days >= 0 && days <= alertDays;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{b.batch_number}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {b.item_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{b.mfg_date || '-'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{b.expiry_date || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {days !== null ? (
                          <span className={`inline-block font-mono font-bold rounded-md px-2 py-0.5 text-[10px] ${
                            isExpired
                              ? 'bg-red-100 text-red-800'
                              : isNear
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isExpired ? `Expired (${Math.abs(days)}d ago)` : `${days} days`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {b.quantity_remaining}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">{formatINR(b.cost_per_unit)}</td>
                      <td className="py-3 px-4 text-slate-600">{b.storage_location || 'Warehouse'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          isExpired
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isExpired ? 'EXPIRED' : b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                    No active batches near expiry date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
