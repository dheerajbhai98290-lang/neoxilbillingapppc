import React, { useState } from 'react';
import { apiRequest, setAuthToken } from '../api/client.js';
import { ShieldCheck, Lock, User, KeyRound, AlertTriangle, Building2, HelpCircle } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isRecovery, setIsRecovery] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      setAuthToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/auth/recover-password', {
        method: 'POST',
        body: JSON.stringify({ username, recoveryPin, newPassword })
      });
      setSuccessMessage(res.message);
      setIsRecovery(false);
      setPassword(newPassword);
    } catch (err: any) {
      setError(err.message || 'Recovery failed. Invalid recovery PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-white text-center relative">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-4 ring-white/20 backdrop-blur-xs mb-3">
            <Building2 className="h-8 w-8 text-cyan-300" />
          </div>
          <h1 className="text-xl font-black tracking-wider font-sans">NEOXILINDIA</h1>
          <p className="text-xs text-blue-200 font-medium">Billing &amp; Business Management System</p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-950/60 px-3 py-1 text-[11px] font-semibold text-blue-300">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span>Version 1.0 — Single Administrator Access</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
              {successMessage}
            </div>
          )}

          {!isRecovery ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Administrator Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                    placeholder="admin"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Master Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecovery(true);
                      setError(null);
                    }}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                    placeholder="Enter owner password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-800 transition disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In as Administrator'}
              </button>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-center border border-slate-200">
                <p className="text-[11px] font-medium text-slate-600">
                  Default credentials for first launch:
                </p>
                <p className="text-xs font-mono font-bold text-blue-900 mt-0.5">
                  admin &bull; neoxil@admin2026
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  (You can update this anytime under Settings &gt; Security)
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRecover} className="space-y-4">
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900 border border-blue-200 flex items-start gap-2">
                <HelpCircle className="h-4 w-4 shrink-0 text-blue-700 mt-0.5" />
                <p>
                  Enter the owner Recovery PIN to reset the administrator password. (Default PIN: <strong>98290</strong>).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Administrator Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Master Recovery PIN
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={recoveryPin}
                    onChange={e => setRecoveryPin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-900"
                    placeholder="Enter 5-digit recovery PIN"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Master Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm font-semibold text-slate-900"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecovery(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white hover:bg-blue-800"
                >
                  {loading ? 'Verifying...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
