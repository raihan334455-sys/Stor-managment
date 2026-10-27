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
  AlertCircle,
  Lock,
  LogOut,
} from 'lucide-react';

export const SidebarNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    products,
    customers,
    suppliers,
    heldCarts,
    store,
    activeUser,
    lockTerminal,
    logout,
  } = useApp();

  // Calculate live badge counts
  const lowStockCount = products.flatMap((p) => p.variants).filter(
    (v) => v.stock_quantity <= v.min_stock_level
  ).length;

  const dueCustomersCount = customers.filter((c) => c.total_due_amount > 0).length;
  const dueSuppliersCount = suppliers.filter((s) => s.total_due > 0).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'pos',
      label: 'POS / New Sale',
      icon: ShoppingCart,
      badge: heldCarts.length > 0 ? `${heldCarts.length} Held` : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    { id: 'products', label: 'Products & Variants', icon: Package },
    {
      id: 'inventory',
      label: 'Inventory & Stock',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount} Alert` : null,
      badgeColor: 'bg-rose-500 text-white font-bold',
    },
    { id: 'purchases', label: 'Purchases', icon: Truck },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: Users,
      badge: dueSuppliersCount > 0 ? `৳${dueSuppliersCount}` : null,
      badgeColor: 'bg-orange-500 text-white',
    },
    { id: 'customers', label: 'Customers', icon: UserCheck },
    {
      id: 'customer_due',
      label: 'Customer Due Ledger',
      icon: CreditCard,
      badge: dueCustomersCount > 0 ? `${dueCustomersCount} Due` : null,
      badgeColor: 'bg-rose-600 text-white font-bold',
    },
    { id: 'sales', label: 'Sales History', icon: ReceiptText },
    { id: 'returns', label: 'Returns & Exchange', icon: RotateCcw },
    { id: 'expenses', label: 'Shop Expenses', icon: Banknote },
    { id: 'cash', label: 'Cash & Shift', icon: Wallet },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'reports', label: 'Reports & Profit/Loss', icon: BarChart3 },
    { id: 'users', label: 'Users & Security', icon: ShieldAlert },
    { id: 'settings', label: 'Store Settings', icon: Settings },
    { id: 'backup', label: 'Backup & Restore', icon: DatabaseBackup },
    { id: 'audit', label: 'Audit Logs', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 no-print select-none">
      {/* Sidebar Header Brand / App Title */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md">
          POS
        </div>
        <div>
          <div className="text-xs font-bold text-white uppercase tracking-wider">POS Terminal</div>
          <div className="text-[10px] text-slate-400 font-medium">Enterprise Offline v2.4</div>
        </div>
      </div>

      <div className="p-3 overflow-y-auto flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium text-xs transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide shrink-0 ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Cashier Status & Lock */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
            {activeUser.name.charAt(0)}
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">{activeUser.name}</div>
            <div className="text-[10px] text-slate-400 capitalize">{activeUser.role}</div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={lockTerminal}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
            title="Lock Terminal / টার্মিনাল লক"
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
            title="Logout / লগআউট"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/40 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="text-slate-500">POS v2.4 Offline</span>
        <span className="text-emerald-400 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Ready
        </span>
      </div>
    </aside>
  );
};
