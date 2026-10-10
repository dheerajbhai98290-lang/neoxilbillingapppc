import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatINR, numberToIndianWords } from '../utils/indianCurrency.js';
import { 
  Printer, 
  Download, 
  Share2, 
  X, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Maximize2
} from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: any;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoice, onClose }) => {
  const [printSize, setPrintSize] = useState<'A5' | 'A4'>('A5');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const settings = invoice.settings || {};
  const items = invoice.items || [];

  // Generate real UPI payment QR code if UPI ID is configured by Admin
  useEffect(() => {
    if (settings.upi_id && settings.upi_id.trim().length > 0) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(settings.company_name || 'NEOXILINDIA')}&am=${encodeURIComponent(invoice.balance_due || invoice.grand_total)}&cu=INR&tn=Invoice-${encodeURIComponent(invoice.invoice_number)}`;
      QRCode.toDataURL(upiUrl, { width: 140, margin: 1 })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate QR:', err));
    } else {
      setQrDataUrl('');
    }
  }, [settings.upi_id, invoice.invoice_number, invoice.balance_due, invoice.grand_total]);

  // Native window.print with custom stylesheet injection
  const handlePrint = () => {
    window.print();
  };

  // High quality PDF download
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setGeneratingPdf(true);
    try {
      const element = printAreaRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const isA5 = printSize === 'A5';
      
      // A5 Landscape is 210mm x 148mm; A4 Portrait is 210mm x 297mm
      const pdf = new jsPDF({
        orientation: isA5 ? 'landscape' : 'portrait',
        unit: 'mm',
        format: isA5 ? 'a5' : 'a4'
      });

      const pdfWidth = isA5 ? 210 : 210;
      const pdfHeight = isA5 ? 148 : 297;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoice.invoice_number}_NEOXILINDIA_${printSize}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate PDF. Please try Native Print -> Save as PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Android Web Share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tax Invoice ${invoice.invoice_number} - NEOXILINDIA`,
          text: `Invoice #${invoice.invoice_number} for ₹${invoice.grand_total} from NEOXILINDIA.`,
          url: window.location.href
        });
      } catch (_) {}
    } else {
      handleDownloadPdf();
    }
  };

  const hasConfiguredBank = Boolean(
    settings.bank_name || settings.account_number || settings.ifsc_code || settings.upi_id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      {/* Container Dialog */}
      <div className="relative flex flex-col max-h-[96vh] w-full max-w-5xl rounded-2xl bg-white shadow-2xl print:max-h-none print:w-full print:shadow-none print:rounded-none">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">Tax Invoice: {invoice.invoice_number}</span>
            <span className={`rounded-sm px-2 py-0.5 text-[11px] font-bold ${
              invoice.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Size Selector */}
            <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-bold text-slate-700">
              <button
                onClick={() => setPrintSize('A5')}
                className={`rounded-md px-2.5 py-1 transition ${
                  printSize === 'A5' ? 'bg-blue-700 text-white shadow-xs' : 'hover:bg-slate-100'
                }`}
              >
                A5 Landscape (Single Sheet)
              </button>
              <button
                onClick={() => setPrintSize('A4')}
                className={`rounded-md px-2.5 py-1 transition ${
                  printSize === 'A4' ? 'bg-blue-700 text-white shadow-xs' : 'hover:bg-slate-100'
                }`}
              >
                A4 Sheet
              </button>
            </div>

            {/* Print Action */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 shadow-xs transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print {printSize}</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-blue-700" />
              <span>{generatingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>

            {/* Share PDF on Android */}
            <button
              onClick={handleShare}
              title="Share invoice on Android"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <Share2 className="h-3.5 w-3.5 text-blue-700" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Viewport Wrapper */}
        <div className="overflow-y-auto p-2 sm:p-6 bg-slate-100 print:p-0 print:bg-white print:overflow-visible">
          {/* Print Stylesheet injected into DOM */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-invoice-sheet, #printable-invoice-sheet * {
                visibility: visible;
              }
              #printable-invoice-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                margin: 0 !important;
                padding: 4mm !important;
                border: none !important;
                box-shadow: none !important;
              }
              @page {
                size: ${printSize === 'A5' ? 'A5 landscape' : 'A4 portrait'};
                margin: 4mm;
              }
            }
          `}</style>

          {/* THE PRINTABLE SHEET (Fits 13 items tightly and cleanly on A5 Landscape) */}
          <div
            id="printable-invoice-sheet"
            ref={printAreaRef}
            className={`mx-auto bg-white text-slate-900 border border-blue-900/20 shadow-md transition-all font-sans ${
              printSize === 'A5'
                ? 'w-[210mm] min-h-[148mm] max-h-[148mm] p-3 text-[10px] leading-tight overflow-hidden'
                : 'w-[210mm] min-h-[297mm] p-6 text-xs'
            }`}
          >
            {/* Header: Blue Banner & Branding */}
            <div className="border-b-2 border-blue-800 pb-2">
              <div className="flex items-start justify-between">
                {/* Logo & Company Profile */}
                <div className="flex items-start gap-2.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-900 text-white font-black text-xl shadow-xs">
                    N
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-wider text-blue-900 leading-none">
                      {settings.company_name || 'NEOXILINDIA'}
                    </h1>
                    <p className="text-[9px] font-bold text-blue-700 tracking-wide mt-0.5">
                      {settings.tagline || 'Leading Cleaning Chemicals & Hygiene Solutions'}
                    </p>
                    <p className="text-[9px] text-slate-600 max-w-sm mt-0.5 leading-snug">
                      {settings.factory_address || settings.registered_address || 'Industrial Area, Rajasthan'}
                      {settings.phone && ` | Ph: ${settings.phone}`}
                      {settings.email && ` | Email: ${settings.email}`}
                    </p>
                  </div>
                </div>

                {/* TAX INVOICE Title & GSTIN */}
                <div className="text-right">
                  <div className="inline-block rounded-md bg-blue-900 px-3 py-1 text-white">
                    <span className="text-xs font-black tracking-widest uppercase">TAX INVOICE</span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-[9px]">
                    <p className="font-bold text-slate-900">
                      GSTIN:{' '}
                      <span className="font-mono text-blue-900">{settings.gstin || 'UNCONFIGURED'}</span>
                    </p>
                    <p className="text-slate-600">State: <span className="font-semibold">{settings.state || 'Rajasthan'}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta Grid: Bill To, Ship To, Invoice Details */}
            <div className="mt-2 grid grid-cols-12 gap-2 border-b border-blue-900/20 pb-2 text-[9px]">
              {/* BILL TO (Col 5) */}
              <div className="col-span-5 rounded-md border border-slate-200 bg-slate-50/60 p-1.5">
                <span className="block font-black text-blue-900 text-[8.5px] uppercase tracking-wider mb-0.5">
                  BILL TO / BUYER:
                </span>
                <p className="font-bold text-slate-900 text-[10px] leading-tight">{invoice.billing_name}</p>
                <p className="text-slate-600 line-clamp-2 mt-0.5">{invoice.billing_address || 'Address on file'}</p>
                <div className="mt-1 flex flex-wrap gap-x-2 font-medium text-slate-700">
                  <span>GSTIN: <strong className="font-mono text-blue-900">{invoice.billing_gstin || 'URP'}</strong></span>
                  {invoice.customer_phone && <span>Ph: {invoice.customer_phone}</span>}
                </div>
              </div>

              {/* SHIP TO (Col 4) */}
              <div className="col-span-3 rounded-md border border-slate-200 bg-slate-50/60 p-1.5">
                <span className="block font-black text-blue-900 text-[8.5px] uppercase tracking-wider mb-0.5">
                  SHIP TO / DISPATCH:
                </span>
                <p className="font-bold text-slate-900 text-[10px] leading-tight">
                  {invoice.shipping_name || invoice.billing_name}
                </p>
                <p className="text-slate-600 line-clamp-2 mt-0.5">
                  {invoice.shipping_address || invoice.billing_address || 'Same as Billing'}
                </p>
                <p className="text-slate-600 mt-1">
                  Place of Supply: <strong>{invoice.place_of_supply}</strong>
                </p>
              </div>

              {/* INVOICE DETAILS (Col 4) */}
              <div className="col-span-4 rounded-md border border-blue-100 bg-blue-50/40 p-1.5 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Invoice No:</span>
                  <span className="font-mono font-black text-blue-900">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Invoice Date:</span>
                  <span className="font-bold text-slate-900">{invoice.invoice_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Mode:</span>
                  <span className="font-bold text-slate-900">{invoice.sale_type || 'CREDIT'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Due Date:</span>
                  <span className="font-medium text-slate-900">{invoice.due_date || invoice.invoice_date}</span>
                </div>
                {invoice.vehicle_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vehicle / Transporter:</span>
                    <span className="font-medium text-slate-900">{invoice.vehicle_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* PRODUCT TABLE - Optimized to fit up to 13 lines cleanly on 1 A5 sheet */}
            <div className="mt-1.5 overflow-x-auto">
              <table className="w-full border-collapse text-[8.5px] leading-tight">
                <thead>
                  <tr className="bg-blue-900 text-white font-bold">
                    <th className="py-1 px-1 text-center w-6">#</th>
                    <th className="py-1 px-1.5 text-left">Description of Goods</th>
                    <th className="py-1 px-1 text-center w-12">HSN</th>
                    <th className="py-1 px-1 text-center w-10">Unit</th>
                    <th className="py-1 px-1 text-right w-10">Qty</th>
                    <th className="py-1 px-1 text-right w-12">Rate</th>
                    <th className="py-1 px-1 text-right w-10">Disc</th>
                    <th className="py-1 px-1 text-right w-14">Taxable</th>
                    <th className="py-1 px-1 text-center w-10">GST%</th>
                    <th className="py-1 px-1 text-right w-12">CGST</th>
                    <th className="py-1 px-1 text-right w-12">SGST</th>
                    <th className="py-1 px-1 text-right w-12">IGST</th>
                    <th className="py-1 px-1.5 text-right w-16">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="hover:bg-blue-50/20">
                      <td className="py-0.5 px-1 text-center font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-0.5 px-1.5 font-bold text-slate-900 truncate max-w-[140px]">
                        {item.product_name}
                        {item.batch_number && (
                          <span className="ml-1 font-normal text-slate-500 text-[7.5px]">
                            ({item.batch_number})
                          </span>
                        )}
                      </td>
                      <td className="py-0.5 px-1 text-center font-mono text-slate-600">{item.hsn_code || '3402'}</td>
                      <td className="py-0.5 px-1 text-center text-slate-600">{item.unit}</td>
                      <td className="py-0.5 px-1 text-right font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-0.5 px-1 text-right text-slate-700">{Number(item.rate).toFixed(2)}</td>
                      <td className="py-0.5 px-1 text-right text-slate-600">
                        {Number(item.discount_amount || 0) > 0 ? Number(item.discount_amount).toFixed(2) : '-'}
                      </td>
                      <td className="py-0.5 px-1 text-right font-medium text-slate-900">
                        {Number(item.taxable_amount).toFixed(2)}
                      </td>
                      <td className="py-0.5 px-1 text-center text-slate-600">{item.gst_rate}%</td>
                      <td className="py-0.5 px-1 text-right text-slate-700">
                        {Number(item.cgst_amount || 0) > 0 ? Number(item.cgst_amount).toFixed(2) : '-'}
                      </td>
                      <td className="py-0.5 px-1 text-right text-slate-700">
                        {Number(item.sgst_amount || 0) > 0 ? Number(item.sgst_amount).toFixed(2) : '-'}
                      </td>
                      <td className="py-0.5 px-1 text-right text-slate-700">
                        {Number(item.igst_amount || 0) > 0 ? Number(item.igst_amount).toFixed(2) : '-'}
                      </td>
                      <td className="py-0.5 px-1.5 text-right font-bold text-slate-900">
                        {Number(item.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {/* Empty filler rows if items < 6 to maintain structure */}
                  {items.length < 6 &&
                    Array.from({ length: 6 - items.length }).map((_, i) => (
                      <tr key={`filler-${i}`} className="h-4">
                        <td colSpan={13} className="py-0.5">&nbsp;</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Calculation & Totals Section */}
            <div className="mt-1.5 grid grid-cols-12 gap-2 border-t border-blue-900/20 pt-1.5 text-[8.5px]">
              {/* Left Column (Col 7): Words, Bank Details, QR Code */}
              <div className="col-span-7 flex flex-col justify-between space-y-1">
                {/* Words */}
                <div className="rounded-sm bg-slate-50 p-1 border border-slate-200">
                  <span className="text-[7.5px] font-bold text-slate-500 uppercase block">Amount in Words:</span>
                  <p className="font-bold text-blue-950 text-[8.5px] leading-tight">
                    {numberToIndianWords(invoice.grand_total)}
                  </p>
                </div>

                {/* Bank Details & QR */}
                <div className="flex items-center gap-2 rounded-sm border border-blue-100 bg-blue-50/40 p-1">
                  {/* Verified QR or Notice */}
                  <div className="h-14 w-14 shrink-0 flex items-center justify-center bg-white rounded border border-blue-200 p-0.5">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="UPI QR" className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-center text-[7px] text-slate-400 font-semibold px-0.5">
                        Scan &amp; Pay<br />UPI
                      </div>
                    )}
                  </div>

                  {/* Bank info */}
                  <div className="flex-1 text-[8px] leading-tight">
                    <span className="font-black text-blue-900 block uppercase">BANK &amp; PAYMENT DETAILS:</span>
                    {hasConfiguredBank ? (
                      <div className="space-y-0.5 text-slate-700">
                        {settings.bank_name && <p>Bank: <strong>{settings.bank_name}</strong> {settings.branch && `(${settings.branch})`}</p>}
                        {settings.account_number && <p>A/c No: <strong className="font-mono">{settings.account_number}</strong></p>}
                        {settings.ifsc_code && <p>IFSC: <strong className="font-mono">{settings.ifsc_code}</strong></p>}
                        {settings.account_holder && <p>Holder: <strong>{settings.account_holder}</strong></p>}
                        {settings.upi_id && <p>UPI ID: <strong className="font-mono text-blue-800">{settings.upi_id}</strong></p>}
                      </div>
                    ) : (
                      <p className="text-amber-800 font-medium italic mt-0.5">
                        Payment details not configured yet. Set in Company Settings.
                      </p>
                    )}
                  </div>
                </div>

                {/* Terms and conditions */}
                <div className="text-[7.5px] text-slate-500 leading-tight">
                  <strong className="text-slate-700">Terms &amp; Conditions:</strong> Goods once sold will not be accepted back without inspection. Delayed payments subject to interest @ 18% p.a.
                </div>
              </div>

              {/* Right Column (Col 5): Financial Totals Breakdown & Signature */}
              <div className="col-span-5 flex flex-col justify-between">
                <div className="space-y-0.5 border border-slate-200 rounded-sm p-1.5 bg-slate-50/50">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value:</span>
                    <span className="font-mono">{formatINR(invoice.taxable_amount)}</span>
                  </div>
                  {Number(invoice.cgst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>CGST Total:</span>
                      <span className="font-mono">{formatINR(invoice.cgst_amount)}</span>
                    </div>
                  )}
                  {Number(invoice.sgst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>SGST Total:</span>
                      <span className="font-mono">{formatINR(invoice.sgst_amount)}</span>
                    </div>
                  )}
                  {Number(invoice.igst_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST Total:</span>
                      <span className="font-mono">{formatINR(invoice.igst_amount)}</span>
                    </div>
                  )}
                  {Number(invoice.freight_charges) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Freight &amp; Delivery:</span>
                      <span className="font-mono">{formatINR(invoice.freight_charges)}</span>
                    </div>
                  )}
                  {Number(invoice.round_off) !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[7.5px]">
                      <span>Round Off:</span>
                      <span className="font-mono">{invoice.round_off > 0 ? '+' : ''}{Number(invoice.round_off).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-blue-900 pt-1 text-[11px] font-black text-blue-950">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono text-blue-900">{formatINR(invoice.grand_total)}</span>
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-emerald-800 pt-0.5">
                    <span>Amount Paid:</span>
                    <span className="font-mono">{formatINR(invoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-[8.5px] font-black text-red-800 border-t border-dashed border-slate-300 pt-0.5">
                    <span>BALANCE DUE:</span>
                    <span className="font-mono">{formatINR(invoice.balance_due)}</span>
                  </div>
                </div>

                {/* Signature Box */}
                <div className="mt-1 text-right">
                  <p className="text-[7.5px] font-bold text-slate-600 uppercase">
                    For {settings.company_name || 'NEOXILINDIA'}
                  </p>
                  <div className="h-6"></div>
                  <p className="text-[8px] font-black text-slate-800 border-t border-slate-300 inline-block pt-0.5 px-4">
                    Authorized Signatory
                  </p>
                </div>
              </div>
            </div>

            {/* Single Sheet Guaranteed Footnote */}
            <div className="mt-1 flex justify-between items-center text-[7px] text-slate-400 border-t border-slate-200 pt-0.5">
              <span>This is a computer generated invoice. Single A5 Sheet guaranteed.</span>
              <span>Thank you for your business!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
