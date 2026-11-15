import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  UserCheck,
  CreditCard,
  ReceiptText,
  RotateCcw,
  Banknote,
  Wallet,
  FileText,
  BarChart3,
  ShieldAlert,
  Settings,
  DatabaseBackup,
  History,
  Lock,
  LogOut,
  Cloud,
  X,
  ShoppingBag,
  Pill,
  Landmark,
  Briefcase,
} from 'lucide-react';

import { canAccessTab } from '../utils/security';
import {
  isGeneralProductModuleEnabled,
  isMedicineModuleEnabled,
  isProductEnabled,
} from '../utils/modules';

interface SidebarNavProps {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ isMobileOpen = false, setIsMobileOpen }) => {
  const {
    activeTab,
    setActiveTab,
    products,
    customers,
    heldCarts,
    activeUser,
    lockTerminal,
    logout,
    store,
  } = useApp();

  const medEnabled = isMedicineModuleEnabled(store);
  const genEnabled = isGeneralProductModuleEnabled(store);

  const lowStockCount = products
    .filter((p) => !p.archived && isProductEnabled(p, store))
    .flatMap((p) => p.variants)
    .filter((v) => v.stock_quantity <= v.min_stock_level).length;
  const dueCustomersCount = customers.filter((c) => c.total_due_amount > 0).length;

  const allNavItems = [
    { id: 'dashboard', label: 'Home / Overview', icon: LayoutDashboard },
    {
      id: 'pos',
      label: 'POS Terminal',
      icon: ShoppingCart,
      badge: heldCarts.length > 0 ? `${heldCarts.length}` : null,
    },
    ...(medEnabled || genEnabled
      ? [{ id: 'products', label: 'Products & Catalog', icon: Package }]
      : []),
    ...(medEnabled ? [{ id: 'medicine', label: 'Medicine Management', icon: Pill }] : []),
    ...(genEnabled ? [{ id: 'general_products', label: 'General Product Mgmt', icon: Package }] : []),
    {
      id: 'inventory',
      label: 'Stock & Inventory',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount}` : null,
    },
    { id: 'cash', label: 'Cash Drawer & Shift', icon: Wallet },
    { id: 'accounts', label: 'Accounts Management', icon: Landmark },
    {
      id: 'customers',
      label: 'Customers & Dues',
      icon: Users,
      badge: dueCustomersCount > 0 ? `${dueCustomersCount}` : null,
    },
    { id: 'receipts', label: 'All Payment Receipts', icon: ReceiptText },
    { id: 'sales', label: 'Sales & Invoices', icon: ReceiptText },
    { id: 'purchases', label: 'Purchases', icon: Truck },
    { id: 'suppliers', label: 'Suppliers', icon: UserCheck },
    { id: 'customer_due', label: 'Customer Due Ledger', icon: CreditCard },
    { id: 'returns', label: 'Returns & Exchange', icon: RotateCcw },
    { id: 'expenses', label: 'Shop Expenses', icon: Banknote },
    { id: 'employees', label: 'Employee Management', icon: Briefcase },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'reports', label: 'Reports & P/L', icon: BarChart3 },
    { id: 'users', label: 'Salesman & Users', icon: ShieldAlert },
    { id: 'settings', label: 'Store Settings', icon: Settings },
    { id: 'backup', label: 'Backup & Restore', icon: DatabaseBackup },
    { id: 'drive', label: 'Google Drive Sync', icon: Cloud },
    { id: 'audit', label: 'Audit Logs', icon: History },
  ].filter((item) => canAccessTab(activeUser, item.id));

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  if (!isMobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex no-print">
      <div
        onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />
      <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Top Brand Header */}
        <div className="px-5 py-4 bg-[#5b46b5] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#ec1f73] text-white flex items-center justify-center shadow-sm overflow-hidden">
              {store.store_logo ? (
                <img src={store.store_logo} alt={store.store_name} className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm leading-tight break-words">{store.store_name}</div>
              <div className="text-[10px] text-white/80 capitalize">
                {activeUser.name} ({activeUser.role})
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#ec1f73] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-pink-50 hover:text-[#ec1f73]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-[#ec1f73]' : 'bg-pink-100 text-[#ec1f73]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={() => {
              if (setIsMobileOpen) setIsMobileOpen(false);
              lockTerminal();
            }}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
          <button
            onClick={() => {
              if (setIsMobileOpen) setIsMobileOpen(false);
              logout();
            }}
            className="flex-1 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
