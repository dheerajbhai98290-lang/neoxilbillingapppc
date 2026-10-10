import React from 'react';
import {
  LayoutDashboard,
  FileText,
  ShoppingBag,
  Package,
  Layers,
  Factory,
  Trash2,
  Calendar,
  Wallet,
  IndianRupee,
  Users,
  Undo2,
  BarChart3,
  Settings,
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Billing & Invoices (A5/A4)', icon: FileText, highlight: true },
    { id: 'purchases', label: 'Purchase Bills', icon: ShoppingBag },
    { id: 'products', label: 'Products Master', icon: Package },
    { id: 'raw_materials', label: 'Raw Materials & Packs', icon: Layers },
    { id: 'manufacturing', label: 'Manufacturing & BOM', icon: Factory },
    { id: 'wastage', label: 'Wastage Register', icon: Trash2 },
    { id: 'expiry', label: 'Expiry & Batches (FEFO)', icon: Calendar },
    { id: 'expenses', label: 'Expense Management', icon: Wallet },
    { id: 'finance', label: 'Receipts & Payments', icon: IndianRupee },
    { id: 'parties', label: 'Customers & Suppliers', icon: Users },
    { id: 'returns', label: 'Sales & Purchase Returns', icon: Undo2 },
    { id: 'reports', label: 'Reports & Profit/Loss', icon: BarChart3 },
    { id: 'settings', label: 'Company & Bank Settings', icon: Settings },
  ];

  const handleSelect = (id: string) => {
    onSelectTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 text-slate-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-0 lg:block hidden'
        }`}
      >
        <div className="flex h-full flex-col justify-between overflow-y-auto pt-16 lg:pt-0">
          {/* Top Brand Banner */}
          <div className="p-4 border-b border-slate-800">
            <div className="rounded-xl bg-blue-950/80 p-3 border border-blue-800/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                ACTIVE BUSINESS PROFILE
              </p>
              <h2 className="text-sm font-black text-white tracking-wide">NEOXILINDIA</h2>
              <p className="text-[11px] text-slate-400">Single Central Database</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1 p-3">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.highlight && !isActive && (
                    <span className="ml-auto rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-300">
                      Core
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer notice */}
          <div className="p-3 border-t border-slate-800">
            <div className="rounded-lg bg-slate-800/60 p-2.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 font-bold text-slate-300 mb-1">
                <ShieldAlert className="h-3.5 w-3.5 text-blue-400" />
                <span>Admin Mode</span>
              </div>
              <p className="text-[10px] leading-tight text-slate-400">
                Full access enabled for single owner administrator.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
