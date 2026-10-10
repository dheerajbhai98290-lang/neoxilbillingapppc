import React, { useState, useEffect } from 'react';
import { apiRequest, removeAuthToken, getAuthToken } from './api/client.js';
import { useOnlineStatus } from './hooks/useOnlineStatus.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { AuthModal } from './components/AuthModal.js';

// Pages
import { Dashboard } from './pages/Dashboard.js';
import { Invoices } from './pages/Invoices.js';
import { Purchases } from './pages/Purchases.js';
import { Products } from './pages/Products.js';
import { RawMaterials } from './pages/RawMaterials.js';
import { Manufacturing } from './pages/Manufacturing.js';
import { Wastage } from './pages/Wastage.js';
import { Batches } from './pages/Batches.js';
import { Expenses } from './pages/Expenses.js';
import { Finance } from './pages/Finance.js';
import { Parties } from './pages/Parties.js';
import { Returns } from './pages/Returns.js';
import { Reports } from './pages/Reports.js';
import { Settings } from './pages/Settings.js';

import { WifiOff, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isOnline = useOnlineStatus();

  // Check existing session on boot
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoadingAuth(false);
        return;
      }

      try {
        const user = await apiRequest('/auth/me');
        setCurrentUser(user);
      } catch (err) {
        removeAuthToken();
        setCurrentUser(null);
      } finally {
        setLoadingAuth(false);
      }
    };

    checkAuth();

    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (_) {}
    removeAuthToken();
    setCurrentUser(null);
  };

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg animate-pulse">
            <span className="font-black text-xl">N</span>
          </div>
          <p className="text-xs font-bold tracking-wider text-slate-400">
            LOADING NEOXILINDIA BUSINESS ERP...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, require Administrator Login
  if (!currentUser) {
    return <AuthModal onSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        activeTab={activeTab}
      />

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content Body Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl">
            {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
            {activeTab === 'invoices' && <Invoices />}
            {activeTab === 'purchases' && <Purchases />}
            {activeTab === 'products' && <Products />}
            {activeTab === 'raw_materials' && <RawMaterials />}
            {activeTab === 'manufacturing' && <Manufacturing />}
            {activeTab === 'wastage' && <Wastage />}
            {activeTab === 'expiry' && <Batches />}
            {activeTab === 'expenses' && <Expenses />}
            {activeTab === 'finance' && <Finance />}
            {activeTab === 'parties' && <Parties />}
            {activeTab === 'returns' && <Returns />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'settings' && <Settings />}
          </div>
        </main>
      </div>

      {/* Offline Toast Banner if device disconnects */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-bounce">
          <WifiOff className="h-4 w-4" />
          <span>Offline Mode &bull; Pending operations will sync upon reconnecting</span>
        </div>
      )}
    </div>
  );
}
