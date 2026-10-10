import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { apiRequest } from '../api/client.js';
import {
  Settings as SettingsIcon,
  Building2,
  Landmark,
  ShieldCheck,
  Database,
  Download,
  Upload,
  KeyRound,
  QrCode,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'BANK' | 'SECURITY' | 'BACKUP' | 'AUDIT'>('COMPANY');
  const [settings, setSettings] = useState<any>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Company profile form
  const [companyName, setCompanyName] = useState('NEOXILINDIA');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [factoryAddress, setFactoryAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Rajasthan');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [invoicePrefix, setInvoicePrefix] = useState('NXL-');
  const [defaultTerms, setDefaultTerms] = useState('');

  // Bank & UPI details form
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branch, setBranch] = useState('');
  const [upiId, setUpiId] = useState('');
  const [previewQr, setPreviewQr] = useState<string>('');

  // Security form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Restore file
  const [restoreJson, setRestoreJson] = useState<string>('');
  const [restoring, setRestoring] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [setRes, logsRes] = await Promise.all([
        apiRequest('/settings'),
        apiRequest('/audit-logs')
      ]);
      setSettings(setRes);
      setAuditLogs(logsRes);

      // Populate company fields
      setCompanyName(setRes.company_name || 'NEOXILINDIA');
      setTagline(setRes.tagline || '');
      setDescription(setRes.description || '');
      setRegisteredAddress(setRes.registered_address || '');
      setFactoryAddress(setRes.factory_address || '');
      setCity(setRes.city || '');
      setState(setRes.state || 'Rajasthan');
      setPincode(setRes.pincode || '');
      setPhone(setRes.phone || '');
      setEmail(setRes.email || '');
      setWebsite(setRes.website || '');
      setGstin(setRes.gstin || '');
      setPan(setRes.pan || '');
      setFinancialYear(setRes.financial_year || '2026-2027');
      setInvoicePrefix(setRes.invoice_prefix || 'NXL-');
      setDefaultTerms(setRes.default_terms || '');

      // Populate bank fields
      setBankName(setRes.bank_name || '');
      setAccountHolder(setRes.account_holder || '');
      setAccountNumber(setRes.account_number || '');
      setIfscCode(setRes.ifsc_code || '');
      setBranch(setRes.branch || '');
      setUpiId(setRes.upi_id || '');
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update live preview QR when upiId changes
  useEffect(() => {
    if (upiId && upiId.trim().length > 0) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(companyName || 'NEOXILINDIA')}&cu=INR`;
      QRCode.toDataURL(upiUrl, { width: 140, margin: 1 })
        .then(url => setPreviewQr(url))
        .catch(() => setPreviewQr(''));
    } else {
      setPreviewQr('');
    }
  }, [upiId, companyName]);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          company_name: companyName,
          tagline,
          description,
          registered_address: registeredAddress,
          factory_address: factoryAddress,
          city,
          state,
          pincode,
          phone,
          email,
          website,
          gstin,
          pan,
          financial_year: financialYear,
          invoice_prefix: invoicePrefix,
          default_terms: defaultTerms
        })
      });
      setSaveSuccess('Company profile saved successfully!');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save company profile');
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await apiRequest('/settings/bank', {
        method: 'PUT',
        body: JSON.stringify({
          bank_name: bankName,
          account_holder: accountHolder,
          account_number: accountNumber,
          ifsc_code: ifscCode,
          branch,
          upi_id: upiId,
          qr_code_image: previewQr
        })
      });
      setSaveSuccess('Bank details and UPI payment QR updated!');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update bank details');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    if (newPassword !== confirmPassword) {
      setSaveError('New password and confirmation do not match.');
      return;
    }

    try {
      await apiRequest('/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setSaveSuccess('Administrator password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update password');
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup/export';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setRestoreJson(content);
    };
    reader.readAsText(file);
  };

  const handleRestoreDatabase = async () => {
    if (!restoreJson) return;
    if (!confirm('WARNING: Restoring will overwrite the current database tables with the backup data. Ensure you have exported a current backup first. Continue?')) return;

    setRestoring(true);
    setSaveError(null);
    try {
      const parsed = JSON.parse(restoreJson);
      const dataPayload = parsed.data || parsed;
      await apiRequest('/backup/restore', {
        method: 'POST',
        body: JSON.stringify({ data: dataPayload })
      });
      alert('Database restored successfully! Reloading data...');
      window.location.reload();
    } catch (err: any) {
      setSaveError(err.message || 'Database restore failed');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-black text-slate-900 font-sans">
          Company Settings &amp; Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure NEOXILINDIA company branding, bank details, UPI QR code, invoice settings, security, and full database backup.
        </p>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('COMPANY')}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 px-4 transition ${
            activeTab === 'COMPANY'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Company Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('BANK')}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 px-4 transition ${
            activeTab === 'BANK'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="h-4 w-4" />
          <span>Bank Details &amp; UPI QR</span>
        </button>
        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 px-4 transition ${
            activeTab === 'SECURITY'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Master Security</span>
        </button>
        <button
          onClick={() => setActiveTab('BACKUP')}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 px-4 transition ${
            activeTab === 'BACKUP'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Backup &amp; Restore</span>
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-1.5 border-b-2 py-2.5 px-4 transition ${
            activeTab === 'AUDIT'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Audit Log Trail</span>
        </button>
      </div>

      {/* TAB 1: COMPANY PROFILE */}
      {activeTab === 'COMPANY' && (
        <form onSubmit={handleSaveCompany} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-black text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="e.g. Leading Cleaning Chemicals & Hygiene Solutions"
                className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Factory / Plant Address</label>
              <input
                type="text"
                value={factoryAddress}
                onChange={e => setFactoryAddress(e.target.value)}
                placeholder="Industrial area factory address"
                className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Registered City &amp; State</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                />
                <input
                  type="text"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  placeholder="State (e.g. Rajasthan)"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company GSTIN</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                placeholder="15-digit GSTIN (blank until registered)"
                className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone / Mobile</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Business contact number"
                className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="billing@neoxilindia.com"
                className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Prefix Sequence</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={e => setInvoicePrefix(e.target.value)}
                placeholder="NXL-"
                className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Financial Year</label>
              <input
                type="text"
                value={financialYear}
                onChange={e => setFinancialYear(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Default Terms &amp; Conditions on Invoices</label>
              <textarea
                rows={3}
                value={defaultTerms}
                onChange={e => setDefaultTerms(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 shadow-md"
            >
              <Save className="h-4 w-4" />
              <span>Save Company Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: BANK DETAILS & PAYMENT QR */}
      {activeTab === 'BANK' && (
        <form onSubmit={handleSaveBank} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="rounded-xl bg-blue-50/70 p-4 border border-blue-200 text-xs text-blue-900 leading-relaxed">
            <strong>Important Bank &amp; QR Policy:</strong> Bank information and QR codes are initially kept blank as required. When entered by the Administrator, they appear at the bottom of printed invoices. Updating bank settings does <em>not</em> alter historical invoice amounts.
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="e.g. State Bank of India, HDFC Bank, ICICI Bank"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={e => setAccountHolder(e.target.value)}
                  placeholder="NEOXILINDIA or Proprietor Name"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="Bank account number"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={e => setIfscCode(e.target.value)}
                  placeholder="e.g. SBIN0001234"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  placeholder="e.g. Industrial Area Branch"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Verified UPI ID (for QR Code generation)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  placeholder="e.g. neoxilindia@okhdfcbank"
                  className="w-full rounded-xl border border-blue-400 py-2 px-3 text-xs font-mono font-bold text-blue-900"
                />
              </div>
            </div>

            {/* QR Code Live Preview */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/70 p-5 text-center">
              <span className="text-xs font-bold text-slate-700 mb-2">Live Invoice QR Preview</span>
              {previewQr ? (
                <div className="rounded-xl bg-white p-2 border border-slate-200 shadow-xs">
                  <img src={previewQr} alt="UPI QR" className="h-32 w-32 object-contain" />
                  <p className="mt-1 text-[10px] font-mono font-bold text-blue-900">{upiId}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-36 w-36 rounded-xl border-2 border-dashed border-slate-300 bg-white p-3 text-slate-400">
                  <QrCode className="h-8 w-8 mb-1" />
                  <span className="text-[10px] font-semibold">Enter UPI ID to render QR</span>
                </div>
              )}
              <p className="mt-2 text-[10px] text-slate-500">
                Printed on bottom section of single A5 invoice.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 shadow-md"
            >
              <Save className="h-4 w-4" />
              <span>Save Bank &amp; Payment Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: MASTER SECURITY */}
      {activeTab === 'SECURITY' && (
        <form onSubmit={handleChangePassword} className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Change Master Administrator Password</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Updates the login password for owner account (admin).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Current Password *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Password (Min 6 chars) *</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
            <strong>Master Recovery PIN:</strong> <code>98290</code>
            <p className="text-[10px] text-slate-400 mt-0.5">Keep this recovery PIN safe to reset password anytime.</p>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white hover:bg-blue-800 shadow-md"
          >
            Update Password
          </button>
        </form>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Export card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-900 font-bold">
                <Download className="h-5 w-5" />
                <h3 className="text-sm font-bold text-slate-900">Download Central Database Backup</h3>
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Export an exact snapshot of all business data: sales invoices, purchases, recipe formulations, stock movements, customer ledgers, and company profiles into an encrypted JSON backup file.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white hover:bg-blue-800 shadow-md transition"
            >
              <Download className="h-4 w-4" />
              <span>Export Full JSON Database Backup</span>
            </button>
          </div>

          {/* Restore card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Upload className="h-5 w-5 text-indigo-700" />
                <h3 className="text-sm font-bold text-slate-900">Restore Central Database</h3>
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Upload a verified backup JSON file to recover complete business data across Windows 10 and Android mobile devices.
              </p>
              <div className="mt-4">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
            <button
              onClick={handleRestoreDatabase}
              disabled={!restoreJson || restoring}
              className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-indigo-700 py-2.5 text-xs font-bold text-white hover:bg-indigo-800 shadow-md transition disabled:opacity-40"
            >
              <Upload className="h-4 w-4" />
              <span>{restoring ? 'Restoring Database...' : 'Restore from Selected File'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOG TRAIL */}
      {activeTab === 'AUDIT' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              System Financial &amp; Administrative Audit Trail
            </h3>
          </div>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">{log.timestamp}</td>
                    <td className="py-2 px-4">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-mono text-slate-600">{log.entity_type}</td>
                    <td className="py-2 px-4 text-slate-900">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
