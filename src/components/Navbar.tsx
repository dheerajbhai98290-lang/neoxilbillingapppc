import React, { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  Download, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X, 
  RefreshCw,
  Smartphone
} from 'lucide-react';

interface NavbarProps {
  user: any;
  onLogout: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onToggleSidebar,
  sidebarOpen,
}) => {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      window.dispatchEvent(new CustomEvent('app-refetch-data'));
    }, 600);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-blue-900/10 bg-white px-4 shadow-xs md:px-6">
      {/* Left: Mobile hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-900 to-blue-600 text-white shadow-sm ring-1 ring-blue-700/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider text-blue-950 font-sans">NEOXILINDIA</span>
              <span className="hidden rounded-sm bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 uppercase tracking-widest sm:inline">
                ERP v1.0
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-none">
              Cleaning Chemicals &amp; Billing Management
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions, Sync, Install, Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sync status indicator */}
        <button
          onClick={handleManualSync}
          title={isOnline ? "Shared Central DB Connected (Click to re-sync)" : "Offline - changes will sync on reconnect"}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
              : 'bg-amber-50 text-amber-800 border border-amber-300'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className={`h-3.5 w-3.5 text-emerald-600 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{syncing ? 'Syncing...' : 'Live Synced'}</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-600" />
              <span className="hidden md:inline">Offline Mode</span>
            </>
          )}
        </button>

        {/* PWA Install Button */}
        {!isInstalled && isInstallable && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Install PWA</span>
          </button>
        )}

        {!isInstalled && isIOS && (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Smartphone className="h-3.5 w-3.5 text-blue-700" />
            <span className="hidden sm:inline">Add to Mobile</span>
          </button>
        )}

        {/* User Account Info */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
          <div className="hidden text-right lg:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {user?.fullName || 'Business Owner'}
            </p>
            <p className="text-[10px] font-semibold text-blue-700 flex items-center justify-end gap-1">
              <ShieldCheck className="h-3 w-3" /> Administrator
            </p>
          </div>

          <button
            onClick={onLogout}
            title="Log out of Administrator account"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* iOS Install Instruction Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Install NEOXILINDIA App on iOS</h3>
            <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
              1. Tap the <strong className="text-blue-700">Share</strong> icon at the bottom of Safari browser.<br />
              2. Scroll down and tap <strong className="text-blue-700">Add to Home Screen</strong>.<br />
              3. Tap <strong className="text-blue-700">Add</strong> in the top-right corner.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white hover:bg-blue-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
