import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import { InvoicePrintModal } from '../components/InvoicePrintModal.js';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Printer,
  CheckCircle,
  Clock,
  Ban,
  ArrowRight,
  Trash2,
  AlertCircle,
  Eye,
  IndianRupee,
  RefreshCw,
  Building2,
  Calendar
} from 'lucide-react';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isCreating, setIsCreating] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('CASH');

  // New Invoice Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [saleType, setSaleType] = useState('WHOLESALE');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [placeOfSupply, setPlaceOfSupply] = useState('Rajasthan');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [freightCharges, setFreightCharges] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  // Line items state (supports up to 13 items comfortably)
  const [items, setItems] = useState<any[]>([
    {
      product_id: '',
      product_name: '',
      hsn_code: '3402',
      unit: 'Bottle',
      batch_number: '',
      quantity: 1,
      rate: 0,
      discount_pct: 0,
      gst_rate: 18,
    }
  ]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, custRes, prodRes, setRes] = await Promise.all([
        apiRequest('/invoices'),
        apiRequest('/customers'),
        apiRequest('/products'),
        apiRequest('/settings'),
      ]);
      setInvoices(invRes);
      setCustomers(custRes);
      setProducts(prodRes);
      setSettings(setRes);
      if (setRes.state) {
        setPlaceOfSupply(setRes.state);
      }
    } catch (err) {
      console.error('Failed to load invoice dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When customer changes, autofill place of supply and default sale type
  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const customer = customers.find(c => c.id === custId);
    if (customer) {
      setPlaceOfSupply(customer.billing_state || settings.state || 'Rajasthan');
    }
  };

  // Add line item
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_id: '',
        product_name: '',
        hsn_code: '3402',
        unit: 'Bottle',
        batch_number: '',
        quantity: 1,
        rate: 0,
        discount_pct: 0,
        gst_rate: 18,
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

    // If product selected, auto fill details
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        item.product_name = prod.name;
        item.hsn_code = prod.hsn_code || '3402';
        item.unit = prod.unit || 'Bottle';
        item.gst_rate = prod.gst_rate || 18;
        item.rate = saleType === 'RETAIL' ? prod.retail_rate : prod.wholesale_rate;
      }
    }

    updated[index] = item;
    setItems(updated);
  };

  // Compute live totals
  const isIntraState = (settings.state || 'Rajasthan').trim().toLowerCase() === placeOfSupply.trim().toLowerCase();

  let subtotal = 0;
  let itemDiscountsTotal = 0;
  let taxableAmount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  items.forEach(it => {
    const qty = Number(it.quantity || 0);
    const rate = Number(it.rate || 0);
    const gross = qty * rate;
    const discAmt = gross * (Number(it.discount_pct || 0) / 100);
    const taxable = gross - discAmt;
    const gstRate = Number(it.gst_rate || 18);

    subtotal += gross;
    itemDiscountsTotal += discAmt;
    taxableAmount += taxable;

    if (isIntraState) {
      cgstTotal += (taxable * (gstRate / 2)) / 100;
      sgstTotal += (taxable * (gstRate / 2)) / 100;
    } else {
      igstTotal += (taxable * gstRate) / 100;
    }
  });

  const invDiscount = Number(invoiceDiscount || 0);
  const freight = Number(freightCharges || 0);
  const totalTax = cgstTotal + sgstTotal + igstTotal;
  const rawGrandTotal = taxableAmount - invDiscount + totalTax + freight;
  const roundOff = Math.round(rawGrandTotal) - rawGrandTotal;
  const grandTotal = Math.round(rawGrandTotal);
  const balanceDue = grandTotal - Number(paidAmount || 0);

  // Submit invoice handler (Draft vs Finalize)
  const handleSubmitInvoice = async (isDraft: boolean) => {
    setFormError(null);
    if (!selectedCustomerId) {
      setFormError('Please select a customer.');
      return;
    }

    const invalidItems = items.filter(it => !it.product_id || Number(it.quantity) <= 0 || Number(it.rate) <= 0);
    if (invalidItems.length > 0) {
      setFormError('Please ensure all product lines have a product selected, valid quantity, and rate.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_id: selectedCustomerId,
        isDraft,
        sale_type: saleType,
        invoice_date: invoiceDate,
        due_date: dueDate,
        place_of_supply: placeOfSupply,
        vehicle_number: vehicleNumber,
        transporter_name: transporterName,
        invoice_discount_amount: invDiscount,
        freight_charges: freight,
        paid_amount: Number(paidAmount || 0),
        payment_mode: paymentMethod,
        notes,
        items
      };

      const res = await apiRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Reload invoices
      await fetchData();
      setIsCreating(false);

      // Open print preview immediately if finalized
      if (!isDraft) {
        const fullInv = await apiRequest(`/invoices/${res.invoiceId}`);
        setSelectedInvoice(fullInv);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeDraft = async (id: string) => {
    if (!confirm('Are you sure you want to finalize this draft invoice? This will deduct finished product stock and post to customer ledger.')) return;
    try {
      await apiRequest(`/invoices/${id}/finalize`, { method: 'POST' });
      await fetchData();
      const full = await apiRequest(`/invoices/${id}`);
      setSelectedInvoice(full);
    } catch (err: any) {
      alert(err.message || 'Finalization failed');
    }
  };

  const handleCancelInvoice = async (id: string) => {
    const reason = prompt('Please enter the reason for cancelling this invoice:');
    if (!reason) return;
    try {
      await apiRequest(`/invoices/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      await fetchData();
      alert('Invoice cancelled and inventory/ledger reversed successfully.');
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    }
  };

  const handleOpenPrint = async (id: string) => {
    try {
      const full = await apiRequest(`/invoices/${id}`);
      setSelectedInvoice(full);
    } catch (err) {
      alert('Failed to load invoice details for print');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    try {
      await apiRequest('/receipts', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: paymentModalInvoice.customer_id,
          amount: Number(paymentAmount),
          payment_mode: paymentMode,
          invoice_id: paymentModalInvoice.id,
          receipt_date: new Date().toISOString().slice(0, 10),
          notes: `Receipt against Invoice ${paymentModalInvoice.invoice_number}`
        })
      });
      setPaymentModalInvoice(null);
      setPaymentAmount('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    }
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 font-sans">
              Billing &amp; Tax Invoices
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-900">
              Default: Single A5 Landscape (13 Lines)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Create professional GST tax invoices, save drafts, manage customer payments and print on A5/A4 sheets.
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
          <span>New Tax Invoice</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice # or Customer name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-semibold">
            {['ALL', 'FINALIZED', 'DRAFT', 'CANCELLED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-3 py-1 transition ${
                  statusFilter === st ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            title="Refresh list"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* INVOICES TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">GST Total</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {inv.invoice_date}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {inv.customer_name || inv.billing_name}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatINR(inv.taxable_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatINR(inv.total_tax)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-950">
                      {formatINR(inv.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-red-700">
                      {formatINR(inv.balance_due)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          inv.status === 'FINALIZED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          inv.payment_status === 'PAID'
                            ? 'bg-blue-100 text-blue-800'
                            : inv.payment_status === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Print / View */}
                        <button
                          onClick={() => handleOpenPrint(inv.id)}
                          title="Print A5 Landscape / Download PDF"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>

                        {/* Finalize Draft */}
                        {inv.status === 'DRAFT' && (
                          <button
                            onClick={() => handleFinalizeDraft(inv.id)}
                            title="Finalize invoice"
                            className="flex h-7 px-2 items-center gap-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Finalize</span>
                          </button>
                        )}

                        {/* Receive Payment if balance due */}
                        {inv.status === 'FINALIZED' && Number(inv.balance_due) > 0 && (
                          <button
                            onClick={() => {
                              setPaymentModalInvoice(inv);
                              setPaymentAmount(String(inv.balance_due));
                            }}
                            title="Record payment received"
                            className="flex h-7 px-2 items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                          >
                            <IndianRupee className="h-3 w-3" />
                            <span>Pay</span>
                          </button>
                        )}

                        {/* Cancel Invoice */}
                        {inv.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelInvoice(inv.id)}
                            title="Cancel invoice (Rolls back stock and ledger)"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                    No tax invoices found. Click "New Tax Invoice" above to create your first invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW TAX INVOICE MODAL (Full screen form) */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative flex flex-col max-h-[96vh] w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-base font-black text-slate-900 font-sans">
                  Create Tax Invoice (A5 Landscape Standard)
                </h2>
                <p className="text-xs text-slate-500">
                  Fits up to 13 product lines cleanly on one single A5 sheet.
                </p>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Form Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Top Party & Billing Information */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                {/* Customer Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Customer *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={e => handleCustomerChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-900"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customer_code}) {c.current_balance > 0 ? `[Due: ₹${c.current_balance}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sale Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pricing Mode
                  </label>
                  <select
                    value={saleType}
                    onChange={e => setSaleType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-900"
                  >
                    <option value="WHOLESALE">Wholesale Rates</option>
                    <option value="RETAIL">Retail Rates</option>
                  </select>
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-900"
                  />
                </div>

                {/* Place of Supply */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Place of Supply (State)
                  </label>
                  <input
                    type="text"
                    value={placeOfSupply}
                    onChange={e => setPlaceOfSupply(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-900"
                    placeholder="e.g. Rajasthan"
                  />
                  <p className="mt-1 text-[10px] font-semibold text-blue-700">
                    {isIntraState ? 'Intra-State: CGST + SGST' : 'Inter-State: IGST'}
                  </p>
                </div>

                {/* Vehicle & Transporter info */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vehicle Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={e => setVehicleNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900 uppercase"
                    placeholder="e.g. RJ-14-EA-1234"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transporter Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={e => setTransporterName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900"
                    placeholder="e.g. Jaipur Golden Transport"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* PRODUCT LINE ITEMS TABLE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Product Line Items ({items.length}/13)
                    </span>
                    {items.length <= 13 ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Fits Single A5 Sheet
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Multi-Page Continuation
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 border border-blue-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item Line</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Product *</th>
                        <th className="py-2.5 px-2 w-20">HSN</th>
                        <th className="py-2.5 px-2 w-20">Unit</th>
                        <th className="py-2.5 px-2 w-24">Batch #</th>
                        <th className="py-2.5 px-2 w-20">Qty *</th>
                        <th className="py-2.5 px-2 w-24">Rate (₹) *</th>
                        <th className="py-2.5 px-2 w-16">Disc %</th>
                        <th className="py-2.5 px-2 w-16">GST %</th>
                        <th className="py-2.5 px-3 text-right w-28">Total (₹)</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {items.map((it, idx) => {
                        const qty = Number(it.quantity || 0);
                        const rate = Number(it.rate || 0);
                        const gross = qty * rate;
                        const disc = gross * (Number(it.discount_pct || 0) / 100);
                        const taxable = gross - disc;
                        const gstRate = Number(it.gst_rate || 18);
                        const lineTotal = taxable + (taxable * gstRate) / 100;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-500 font-bold">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <select
                                value={it.product_id}
                                onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-2 text-xs font-bold text-slate-900 bg-white"
                              >
                                <option value="">-- Select Product --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} [{p.size || p.unit}] (Stock: {p.current_stock})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={it.hsn_code}
                                onChange={e => handleItemChange(idx, 'hsn_code', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1.5 text-xs text-center font-mono"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={it.unit}
                                onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1.5 text-xs text-center"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={it.batch_number}
                                onChange={e => handleItemChange(idx, 'batch_number', e.target.value)}
                                placeholder="Auto"
                                className="w-full rounded-lg border border-slate-300 py-1 px-1.5 text-xs font-mono uppercase"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="1"
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
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={it.discount_pct}
                                onChange={e => handleItemChange(idx, 'discount_pct', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1 text-xs text-right"
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

              {/* Financial Calculation Summary & Payment Options */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {/* Left: Additional Charges & Payment Input */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Invoice Discount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={invoiceDiscount}
                        onChange={e => setInvoiceDiscount(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Freight / Delivery (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={freightCharges}
                        onChange={e => setFreightCharges(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Amount Paid Now (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={grandTotal}
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
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs font-semibold"
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                        <option value="UPI">UPI</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Terms &amp; Order Notes
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Special instructions, delivery location notes..."
                      className="w-full rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs"
                    />
                  </div>
                </div>

                {/* Right: Bill Breakdown Box */}
                <div className="rounded-xl border border-blue-900/10 bg-white p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-bold">{formatINR(taxableAmount)}</span>
                  </div>
                  {isIntraState ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST Total:</span>
                        <span className="font-mono font-bold text-blue-900">{formatINR(cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST Total:</span>
                        <span className="font-mono font-bold text-blue-900">{formatINR(sgstTotal)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST Total:</span>
                      <span className="font-mono font-bold text-blue-900">{formatINR(igstTotal)}</span>
                    </div>
                  )}
                  {Number(freightCharges) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Freight Charges:</span>
                      <span className="font-mono">{formatINR(freightCharges)}</span>
                    </div>
                  )}
                  {roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span className="font-mono">{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-blue-900 pt-2 text-base font-black text-blue-950">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono text-blue-900">{formatINR(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-800 pt-1">
                    <span>Amount Paid:</span>
                    <span className="font-mono">{formatINR(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-red-700 border-t border-dashed border-slate-300 pt-1">
                    <span>BALANCE DUE:</span>
                    <span className="font-mono">{formatINR(balanceDue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions: Save Draft vs Finalize */}
            <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmitInvoice(true)}
                  className="rounded-xl border border-blue-700 bg-white px-4 py-2.5 text-xs font-bold text-blue-800 hover:bg-blue-50 transition"
                >
                  Save as Draft (No Stock Change)
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmitInvoice(false)}
                  className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-800 transition"
                >
                  {saving ? 'Finalizing...' : 'Finalize & Post Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK PAYMENT RECORD MODAL */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Record Payment Received</h3>
            <p className="mt-1 text-xs text-slate-600">
              For Invoice <strong className="font-mono">{paymentModalInvoice.invoice_number}</strong> ({paymentModalInvoice.customer_name})
            </p>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={paymentModalInvoice.balance_due}
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs font-semibold text-slate-900"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Record Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A5 / A4 INVOICE PRINT PREVIEW MODAL */}
      {selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};
