import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  BarChart3,
  FileSpreadsheet,
  PieChart,
  Calendar,
  Layers,
  Printer,
  Download,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'PROFIT_LOSS' | 'GST' | 'STOCK_LEDGER'>('PROFIT_LOSS');
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-12-31');

  const [pnlData, setPnlData] = useState<any | null>(null);
  const [gstData, setGstData] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [pnlRes, gstRes, movRes] = await Promise.all([
        apiRequest(`/reports/profit-loss?from=${fromDate}&to=${toDate}`),
        apiRequest(`/reports/gst-summary?from=${fromDate}&to=${toDate}`),
        apiRequest('/reports/stock-ledger')
      ]);
      setPnlData(pnlRes);
      setGstData(gstRes);
      setMovements(movRes);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Business Reports &amp; Financial Statements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Profit &amp; Loss, GSTR summaries, HSN tables, and physical inventory audit movements.
          </p>
        </div>

        {/* Date Filter & Print */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-1 text-xs font-semibold">
            <span className="text-slate-400 pl-1.5">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="text-xs font-bold text-slate-900 focus:outline-hidden"
            />
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="text-xs font-bold text-slate-900 focus:outline-hidden"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 text-blue-700" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveReport('PROFIT_LOSS')}
          className={`flex items-center gap-2 border-b-2 py-2 px-4 transition ${
            activeReport === 'PROFIT_LOSS'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="h-4 w-4" />
          <span>Profit &amp; Loss Statement</span>
        </button>
        <button
          onClick={() => setActiveReport('GST')}
          className={`flex items-center gap-2 border-b-2 py-2 px-4 transition ${
            activeReport === 'GST'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>GST Summary &amp; HSN Report</span>
        </button>
        <button
          onClick={() => setActiveReport('STOCK_LEDGER')}
          className={`flex items-center gap-2 border-b-2 py-2 px-4 transition ${
            activeReport === 'STOCK_LEDGER'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Stock Movement Audit Ledger</span>
        </button>
      </div>

      {/* REPORT 1: PROFIT & LOSS */}
      {activeReport === 'PROFIT_LOSS' && pnlData && (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Net Sales (Excl. Tax)</span>
              <div className="mt-2 text-2xl font-black text-slate-900 font-sans">
                {formatINR(pnlData.revenue?.netSales)}
              </div>
              <p className="mt-1 text-xs text-slate-500">Gross: {formatINR(pnlData.revenue?.grossSales)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Cost of Goods Sold</span>
              <div className="mt-2 text-2xl font-black text-slate-700 font-sans">
                {formatINR(pnlData.cogs)}
              </div>
              <p className="mt-1 text-xs text-slate-500">Direct Inventory Cost</p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-xs">
              <span className="text-xs font-bold text-blue-900 uppercase">Gross Profit</span>
              <div className="mt-2 text-2xl font-black text-blue-950 font-sans">
                {formatINR(pnlData.grossProfit)}
              </div>
              <p className="mt-1 text-xs font-bold text-blue-700">Margin: {pnlData.grossProfitMargin}%</p>
            </div>

            <div className={`rounded-2xl border p-5 shadow-xs ${
              pnlData.estimatedNetProfit >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'
            }`}>
              <span className="text-xs font-bold uppercase text-slate-700">Estimated Net Profit</span>
              <div className={`mt-2 text-2xl font-black font-sans ${
                pnlData.estimatedNetProfit >= 0 ? 'text-emerald-800' : 'text-red-700'
              }`}>
                {formatINR(pnlData.estimatedNetProfit)}
              </div>
              <p className="mt-1 text-xs font-bold text-slate-600">Net Margin: {pnlData.netProfitMargin}%</p>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Income Statement Breakdown ({fromDate} to {toDate})
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                <span>1. Revenue from Sales (Net of discounts and tax)</span>
                <span className="font-mono text-sm">{formatINR(pnlData.revenue?.netSales)}</span>
              </div>

              <div className="flex justify-between text-slate-700 pl-4">
                <span>Less: Cost of Goods Sold (COGS)</span>
                <span className="font-mono">{formatINR(pnlData.cogs)}</span>
              </div>

              <div className="flex justify-between font-black text-blue-950 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                <span>GROSS PROFIT</span>
                <span className="font-mono text-sm">{formatINR(pnlData.grossProfit)}</span>
              </div>

              <div className="pt-2">
                <span className="font-bold text-slate-900 block mb-2">2. Operating Expenses Breakdown:</span>
                <div className="space-y-1.5 pl-4">
                  {pnlData.operatingExpenses?.breakdown?.map((cat: any) => (
                    <div key={cat.category_name} className="flex justify-between text-slate-600">
                      <span>{cat.category_name}</span>
                      <span className="font-mono">{formatINR(cat.total_amount)}</span>
                    </div>
                  ))}
                  {pnlData.operatingExpenses?.breakdown?.length === 0 && (
                    <p className="text-slate-400 italic">No operating expenses in this period.</p>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1">
                    <span>Total Operating Expenses</span>
                    <span className="font-mono">{formatINR(pnlData.operatingExpenses?.total)}</span>
                  </div>
                </div>
              </div>

              {Number(pnlData.wastageCost) > 0 && (
                <div className="flex justify-between text-red-700 pl-4 border-t border-slate-100 pt-2">
                  <span>Less: Manufacturing Wastage / Scrap Loss</span>
                  <span className="font-mono">{formatINR(pnlData.wastageCost)}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-base text-slate-900 border-t-2 border-slate-900 pt-3">
                <span>ESTIMATED NET PROFIT / (LOSS)</span>
                <span className={`font-mono ${pnlData.estimatedNetProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatINR(pnlData.estimatedNetProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: GST & HSN SUMMARY */}
      {activeReport === 'GST' && gstData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Outward Supplies (GSTR-1) */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-blue-900 uppercase">Outward Supplies (Sales)</span>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Taxable Outward Supplies:</span>
                  <span className="font-mono font-bold">{formatINR(gstData.outward?.total_taxable)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Central Tax (CGST):</span>
                  <span className="font-mono font-bold text-blue-900">{formatINR(gstData.outward?.total_cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">State Tax (SGST):</span>
                  <span className="font-mono font-bold text-blue-900">{formatINR(gstData.outward?.total_sgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Integrated Tax (IGST):</span>
                  <span className="font-mono font-bold text-blue-900">{formatINR(gstData.outward?.total_igst)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-sm text-slate-900">
                  <span>Total Tax Liability:</span>
                  <span className="font-mono text-blue-900">{formatINR(gstData.outward?.total_tax)}</span>
                </div>
              </div>
            </div>

            {/* Inward Supplies (Input Tax Credit) */}
            <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-indigo-900 uppercase">Inward Supplies (Purchases / ITC)</span>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Taxable Inward Purchases:</span>
                  <span className="font-mono font-bold">{formatINR(gstData.inward?.total_taxable)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">CGST Input Credit:</span>
                  <span className="font-mono font-bold text-indigo-900">{formatINR(gstData.inward?.total_cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">SGST Input Credit:</span>
                  <span className="font-mono font-bold text-indigo-900">{formatINR(gstData.inward?.total_sgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">IGST Input Credit:</span>
                  <span className="font-mono font-bold text-indigo-900">{formatINR(gstData.inward?.total_igst)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-sm text-slate-900">
                  <span>Eligible Input Tax Credit:</span>
                  <span className="font-mono text-indigo-900">{formatINR(gstData.inward?.total_tax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* HSN Summary Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                HSN-wise Summary of Outward Supplies
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-4">HSN Code</th>
                    <th className="py-2.5 px-4 text-center">GST Rate</th>
                    <th className="py-2.5 px-4 text-right">Total Qty</th>
                    <th className="py-2.5 px-4 text-right">Taxable Value</th>
                    <th className="py-2.5 px-4 text-right">CGST</th>
                    <th className="py-2.5 px-4 text-right">SGST</th>
                    <th className="py-2.5 px-4 text-right">IGST</th>
                    <th className="py-2.5 px-4 text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {gstData.hsnSummary?.map((h: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{h.hsn_code}</td>
                      <td className="py-2.5 px-4 text-center">{h.gst_rate}%</td>
                      <td className="py-2.5 px-4 text-right font-bold">{h.total_qty} {h.unit}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatINR(h.taxable_amount)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatINR(h.cgst_amount)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatINR(h.sgst_amount)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatINR(h.igst_amount)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(h.total_amount)}
                      </td>
                    </tr>
                  ))}
                  {gstData.hsnSummary?.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                        No outward supplies recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: STOCK AUDIT LEDGER */}
      {activeReport === 'STOCK_LEDGER' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Physical Stock Audit Trail (Every Inward &amp; Outward Movement)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-4">Movement Source</th>
                  <th className="py-2.5 px-4">Reference #</th>
                  <th className="py-2.5 px-4 text-right">Quantity</th>
                  <th className="py-2.5 px-4 text-right">Balance After</th>
                  <th className="py-2.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {movements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2 px-4 text-slate-600">{m.movement_date}</td>
                    <td className="py-2 px-4">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {m.item_type}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-bold text-slate-900">{m.item_name}</td>
                    <td className="py-2 px-4 font-semibold text-blue-900">{m.movement_type}</td>
                    <td className="py-2 px-4 font-mono font-bold text-slate-700">{m.reference_number || '-'}</td>
                    <td className="py-2 px-4 text-right font-mono font-bold">
                      <span className={m.quantity > 0 ? 'text-emerald-700' : 'text-red-700'}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                      {m.balance_after}
                    </td>
                    <td className="py-2 px-4 text-slate-500 max-w-xs truncate">{m.notes}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                      No stock movements recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
