import React, { useEffect, useMemo, useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Menu,
  Barcode,
  SlidersHorizontal,
  UserMinus,
  AlertOctagon,
} from 'lucide-react';
import { canAccessTab } from '../utils/security';
import {
  getBusinessMode,
  isGeneralProductModuleEnabled,
  isMedicineModuleEnabled,
  isProductEnabled,
} from '../utils/modules';

interface SidebarNavProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isDesktopCollapsed: boolean;
  setIsDesktopCollapsed: (collapsed: boolean) => void;
  isTabletExpanded: boolean;
  setIsTabletExpanded: (expanded: boolean) => void;
}

interface NavItem {
  id: string;
  labelEn: string;
  labelBn: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
}

interface NavGroup {
  id: string;
  groupLabelEn: string;
  groupLabelBn: string;
  groupIcon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  isMobileOpen,
  setIsMobileOpen,
  isDesktopCollapsed,
  setIsDesktopCollapsed,
  isTabletExpanded,
  setIsTabletExpanded,
}) => {
  const {
    activeTab,
    setActiveTab,
    products,
    customers,
    suppliers,
    heldCarts,
    activeUser,
    lockTerminal,
    logout,
    store,
  } = useApp();

  const isBn = store.language === 'bn';
  const medEnabled = isMedicineModuleEnabled(store);
  const genEnabled = isGeneralProductModuleEnabled(store);
  const businessMode = getBusinessMode(store);

  const lowStockCount = products
    .filter((p) => !p.archived && isProductEnabled(p, store))
    .flatMap((p) => p.variants)
    .filter((v) => v.stock_quantity <= v.min_stock_level).length;
  const dueCustomersCount = customers.filter((c) => (c.total_due_amount || 0) > 0).length;
  const dueSuppliersCount = suppliers.filter((s) => (s.total_due || 0) > 0).length;

  // Exactly 7 Structured Collapsible Main Menu Sections
  const navGroups: NavGroup[] = useMemo(() => {
    const raw: NavGroup[] = [
      {
        id: 'dashboard_group',
        groupLabelEn: 'Dashboard',
        groupLabelBn: 'ড্যাশবোর্ড',
        groupIcon: LayoutDashboard,
        items: [
          { id: 'dashboard', labelEn: 'Dashboard', labelBn: 'ড্যাশবোর্ড', icon: LayoutDashboard },
        ],
      },
      {
        id: 'sales_pos_group',
        groupLabelEn: 'Sales & POS',
        groupLabelBn: 'বিক্রয় ও POS',
        groupIcon: ShoppingCart,
        items: [
          {
            id: 'pos',
            labelEn: 'POS / New Sale',
            labelBn: 'POS / নতুন বিক্রয়',
            icon: ShoppingCart,
            badge: heldCarts.length > 0 ? `${heldCarts.length}` : null,
          },
          { id: 'sales', labelEn: 'Sales History', labelBn: 'বিক্রয় তালিকা', icon: ReceiptText },
          { id: 'receipts', labelEn: 'Invoices & Receipts', labelBn: 'ইনভয়েস ও রশিদ', icon: FileText },
          { id: 'returns', labelEn: 'Sales Return', labelBn: 'বিক্রয় রিটার্ন', icon: RotateCcw },
          { id: 'quotations', labelEn: 'Quotations', labelBn: 'কোটেশন', icon: FileText },
          { id: 'cash', labelEn: 'Cash Drawer / Shift', labelBn: 'ক্যাশ ড্রয়ার', icon: Wallet },
        ],
      },
      {
        id: 'products_inventory_group',
        groupLabelEn: 'Products & Inventory',
        groupLabelBn: 'পণ্য ও স্টক',
        groupIcon: Boxes,
        items: [
          ...(medEnabled || genEnabled
            ? [{ id: 'products', labelEn: 'All Products & Bulk', labelBn: 'সকল পণ্য ও বাল্ক', icon: Package }]
            : []),
          ...(medEnabled
            ? [{ id: 'medicine', labelEn: 'Medicine (Pharmacy)', labelBn: 'ওষুধ ব্যবস্থাপনা', icon: Pill }]
            : []),
          ...(genEnabled
            ? [{ id: 'general_products', labelEn: 'General Products', labelBn: 'সাধারণ পণ্য', icon: Package }]
            : []),
          {
            id: 'inventory',
            labelEn: 'Stock Overview',
            labelBn: 'স্টক ও ইনভেন্টরি',
            icon: Boxes,
            badge: lowStockCount > 0 ? `${lowStockCount}` : null,
          },
          {
            id: 'personal_use',
            labelEn: 'Personal Use',
            labelBn: 'ব্যক্তিগত ব্যবহার',
            icon: UserMinus,
          },
          {
            id: 'stock_adjustment',
            labelEn: 'Stock Adjustment',
            labelBn: 'স্টক অ্যাডজাস্টমেন্ট',
            icon: SlidersHorizontal,
          },
          {
            id: 'damaged_stock',
            labelEn: 'Damaged / Expired',
            labelBn: 'নষ্ট ও মেয়াদোত্তীর্ণ',
            icon: AlertOctagon,
          },
          { id: 'purchases', labelEn: 'Purchases', labelBn: 'ক্রয় হিসাব', icon: Truck },
          ...(medEnabled || genEnabled
            ? [{ id: 'barcode', labelEn: 'Barcode Center', labelBn: 'বারকোড প্রিন্ট', icon: Barcode }]
            : []),
        ],
      },
      {
        id: 'parties_group',
        groupLabelEn: 'Parties',
        groupLabelBn: 'কাস্টমার ও সাপ্লায়ার',
        groupIcon: Users,
        items: [
          { id: 'customers', labelEn: 'Customers', labelBn: 'কাস্টমার তালিকা', icon: Users },
          {
            id: 'customer_due',
            labelEn: 'Customer Due Ledger',
            labelBn: 'কাস্টমার বাকি',
            icon: CreditCard,
            badge: dueCustomersCount > 0 ? `${dueCustomersCount}` : null,
          },
          { id: 'suppliers', labelEn: 'Suppliers', labelBn: 'সাপ্লায়ার তালিকা', icon: UserCheck },
          {
            id: 'supplier_due',
            labelEn: 'Supplier Due & Pay',
            labelBn: 'সাপ্লায়ার বাকি',
            icon: CreditCard,
            badge: dueSuppliersCount > 0 ? `${dueSuppliersCount}` : null,
          },
        ],
      },
      {
        id: 'finance_group',
        groupLabelEn: 'Finance & Accounts',
        groupLabelBn: 'হিসাব ও রিপোর্ট',
        groupIcon: Landmark,
        items: [
          { id: 'accounts', labelEn: 'Accounts & Banking', labelBn: 'অ্যাকাউন্টস ও ব্যাংক', icon: Landmark },
          { id: 'expenses', labelEn: 'Expenses', labelBn: 'দোকানের খরচ', icon: Banknote },
          { id: 'reports', labelEn: 'Reports & P/L', labelBn: 'রিপোর্ট ও লাভ-ক্ষতি', icon: BarChart3 },
        ],
      },
      {
        id: 'staff_group',
        groupLabelEn: 'Staff & Users',
        groupLabelBn: 'কর্মচারী ও ইউজার',
        groupIcon: Briefcase,
        items: [
          { id: 'employees', labelEn: 'Employees & Salary', labelBn: 'কর্মচারী ও বেতন', icon: Briefcase },
          { id: 'users', labelEn: 'Users & Roles', labelBn: 'ইউজার ও রোল', icon: ShieldAlert },
        ],
      },
      {
        id: 'settings_group',
        groupLabelEn: 'Settings & System',
        groupLabelBn: 'সেটিংস ও সিস্টেম',
        groupIcon: Settings,
        items: [
          { id: 'settings', labelEn: 'Shop Settings & Mode', labelBn: 'দোকান সেটিংস', icon: Settings },
          { id: 'backup', labelEn: 'Backup & Cloud Sync', labelBn: 'ব্যাকআপ ও ক্লাউড', icon: DatabaseBackup },
          { id: 'drive', labelEn: 'Google Drive Sync', labelBn: 'গুগল ড্রাইভ', icon: Cloud },
          { id: 'audit', labelEn: 'Activity Logs', labelBn: 'অ্যাক্টিভিটি লগ', icon: History },
        ],
      },
    ];

    return raw
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccessTab(activeUser, item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [
    activeUser,
    medEnabled,
    genEnabled,
    heldCarts.length,
    lowStockCount,
    dueCustomersCount,
    dueSuppliersCount,
  ]);

  // Collapsible groups: keep active group expanded by default
  const activeGroupId =
    navGroups.find((g) => g.items.some((item) => item.id === activeTab))?.id || 'sales_pos_group';

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    dashboard_group: true,
    sales_pos_group: true,
    products_inventory_group: activeGroupId === 'products_inventory_group',
    parties_group: activeGroupId === 'parties_group',
    finance_group: activeGroupId === 'finance_group',
    staff_group: activeGroupId === 'staff_group',
    settings_group: activeGroupId === 'settings_group',
  });

  useEffect(() => {
    setExpandedGroups((prev) => (prev[activeGroupId] ? prev : { ...prev, [activeGroupId]: true }));
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
    setIsTabletExpanded(false);
  };

  const modeBadgeLabel =
    businessMode === 'general_shop'
      ? isBn
        ? 'জেনারেল শপ'
        : 'General Shop'
      : businessMode === 'pharmacy'
      ? isBn
        ? 'ফার্মেসি মোড'
        : 'Pharmacy Mode'
      : isBn
      ? 'সুপার শপ'
      : 'Super Shop';

  const renderNavContent = (isCompactRail: boolean) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#091f46] via-[#0c2b5c] to-[#081f47] text-white select-none">
      {/* Desktop Top Bar: 3-line Menu Toggle (No redundant shop/owner name) */}
      <div
        className={`h-14 border-b border-white/10 flex items-center shrink-0 ${
          isCompactRail ? 'justify-center px-2' : 'px-3'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
          title={
            isDesktopCollapsed
              ? isBn
                ? 'মেনু খুলুন'
                : 'Expand Menu'
              : isBn
              ? 'মেনু ছোট করুন'
              : 'Collapse Menu'
          }
          className={`hidden lg:flex h-10 rounded-xl border border-white/15 bg-white/8 hover:bg-white/15 text-white items-center cursor-pointer transition-colors ${
            isCompactRail ? 'w-10 justify-center' : 'w-full justify-between px-3 gap-2'
          }`}
          aria-label={isDesktopCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Menu className="w-5 h-5 text-emerald-300 shrink-0" />
            {!isCompactRail && (
              <span className="text-xs font-extrabold tracking-wide uppercase">
                {isBn ? 'মেনু' : 'Menu'}
              </span>
            )}
          </span>
          {!isCompactRail && <ChevronLeft className="w-4 h-4 text-blue-200 shrink-0" />}
        </button>
      </div>

      {/* Navigation Accordion List (7 Groups) */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navGroups.map((group) => {
          const GroupIcon = group.groupIcon;
          const isSingleItem = group.items.length === 1;
          const singleItem = group.items[0];
          const groupHasActive = group.items.some((item) => item.id === activeTab);
          const isExpanded = Boolean(expandedGroups[group.id]);

          // Single-item section (e.g., Dashboard): clean direct click button
          if (isSingleItem && singleItem) {
            const Icon = singleItem.icon;
            const isActive = activeTab === singleItem.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelectTab(singleItem.id)}
                title={isCompactRail ? (isBn ? singleItem.labelBn : singleItem.labelEn) : undefined}
                className={`w-full flex items-center ${
                  isCompactRail ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                } rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[42px] ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0e63d6] to-[#1b8cff] text-white shadow-xs'
                    : 'text-blue-100/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCompactRail && (
                    <span className="truncate">{isBn ? singleItem.labelBn : singleItem.labelEn}</span>
                  )}
                </div>
              </button>
            );
          }

          // Compact Rail View: show direct item icons cleanly without crowding
          if (isCompactRail) {
            return (
              <div key={group.id} className="py-1 border-t border-white/10 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      title={isBn ? item.labelBn : item.labelEn}
                      className={`w-full flex items-center justify-center p-2 rounded-xl transition-colors cursor-pointer min-h-[38px] ${
                        isActive
                          ? 'bg-gradient-to-r from-[#0e63d6] to-[#1b8cff] text-white'
                          : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                    </button>
                  );
                })}
              </div>
            );
          }

          // Expanded View: Collapsible Accordion Category
          return (
            <div key={group.id} className="rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[40px] ${
                  groupHasActive
                    ? 'bg-white/12 text-white border border-blue-400/25'
                    : 'text-blue-100/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <GroupIcon
                    className={`w-4 h-4 shrink-0 ${
                      groupHasActive ? 'text-emerald-300' : 'text-blue-200'
                    }`}
                  />
                  <span className="truncate">{isBn ? group.groupLabelBn : group.groupLabelEn}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-emerald-400/35 ml-4">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const showOnBadge =
                      (item.id === 'medicine' && medEnabled) ||
                      (item.id === 'general_products' && genEnabled);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
                          isActive
                            ? 'bg-gradient-to-r from-[#0e63d6] to-[#1b8cff] text-white shadow-xs'
                            : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              item.id === 'medicine'
                                ? 'text-emerald-300'
                                : item.id === 'general_products'
                                ? 'text-sky-300'
                                : ''
                            }`}
                          />
                          <span className="truncate">{isBn ? item.labelBn : item.labelEn}</span>
                        </div>
                        {showOnBadge ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#16a34a] text-white text-[9px] font-extrabold tracking-wide shrink-0">
                            ON
                          </span>
                        ) : item.badge ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              isActive
                                ? 'bg-white/25 text-white'
                                : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                            }`}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer: Lock & Sign Out */}
      <div className="p-2.5 border-t border-white/10 shrink-0">
        {isCompactRail ? (
          <div className="flex flex-col gap-1.5 items-center">
            <button
              type="button"
              onClick={lockTerminal}
              title="Lock Terminal"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-blue-100 flex items-center justify-center cursor-pointer"
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="w-10 h-10 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsMobileOpen(false);
                lockTerminal();
              }}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-blue-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isBn ? 'লক' : 'Lock'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileOpen(false);
                logout();
              }}
              className="flex-1 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/25 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isBn ? 'লগআউট' : 'Logout'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const isGridMenuOpen = isMobileOpen || isTabletExpanded;

  const closeGridMenu = () => {
    setIsMobileOpen(false);
    setIsTabletExpanded(false);
  };

  return (
    <>
      {/* 1. DESKTOP PERSISTENT SIDEBAR (lg: >=1024px) */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-[#173e7a] bg-[#0a224a] h-full z-30 no-print transition-[width] duration-200 ${
          isDesktopCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {renderNavContent(isDesktopCollapsed)}
      </aside>

      {/* 2. MOBILE & TABLET GRID MENU OVERLAY (<1024px) */}
      {isGridMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 lg:hidden no-print"
          role="dialog"
          aria-modal="true"
          aria-label={isBn ? 'নেভিগেশন গ্রিড মেনু' : 'Navigation Grid Menu'}
        >
          <div
            onClick={closeGridMenu}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs"
          />

          <div className="relative z-10 w-full md:max-w-3xl max-h-[88vh] md:max-h-[86vh] bg-gradient-to-b from-[#091f46] via-[#0c2b5c] to-[#081f47] text-white rounded-t-3xl md:rounded-2xl border border-[#1d4d99] shadow-2xl flex flex-col overflow-hidden">
            {/* Grid Menu Header with Shop Logo, Name, Mode & Close */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#16a34a] border border-white/25 text-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {store.store_logo ? (
                    <img
                      src={store.store_logo}
                      alt={store.store_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm sm:text-base text-white truncate">
                    {store.store_name}
                  </div>
                  <div className="text-[11px] text-blue-200 flex items-center gap-1.5 flex-wrap">
                    <span className="truncate max-w-[140px]">{activeUser.name}</span>
                    <span>·</span>
                    <span className="text-emerald-300 font-semibold">{modeBadgeLabel}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeGridMenu}
                className="w-9 h-9 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close grid menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid Menu Categories & Tiles */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-5">
              {navGroups.map((group) => {
                const GroupIcon = group.groupIcon;
                return (
                  <section key={group.id} className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-200">
                        <GroupIcon className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>{isBn ? group.groupLabelBn : group.groupLabelEn}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-blue-200">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const showOnBadge =
                          (item.id === 'medicine' && medEnabled) ||
                          (item.id === 'general_products' && genEnabled);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectTab(item.id)}
                            className={`relative min-h-[86px] sm:min-h-[92px] p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer ${
                              isActive
                                ? 'bg-gradient-to-br from-[#0e63d6] to-[#1b8cff] border-sky-300/70 text-white shadow-sm'
                                : 'bg-white/8 hover:bg-white/15 border-white/12 text-blue-50'
                            }`}
                          >
                            {showOnBadge ? (
                              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-[#16a34a] text-white text-[8px] font-extrabold tracking-wide">
                                ON
                              </span>
                            ) : item.badge ? (
                              <span
                                className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                  isActive
                                    ? 'bg-white/25 text-white'
                                    : 'bg-rose-500 text-white'
                                }`}
                              >
                                {item.badge}
                              </span>
                            ) : null}

                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : item.id === 'medicine'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : item.id === 'general_products'
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : 'bg-white/10 text-blue-100'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>

                            <span className="text-[11px] font-semibold leading-tight line-clamp-2">
                              {isBn ? item.labelBn : item.labelEn}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Grid Menu Footer: Lock & Logout */}
            <div className="p-3.5 sm:px-5 border-t border-white/10 bg-[#07193a]/70 flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  closeGridMenu();
                  lockTerminal();
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-blue-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{isBn ? 'টার্মিনাল লক' : 'Lock Terminal'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeGridMenu();
                  logout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isBn ? 'লগআউট' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*                     MOBILE FIXED BOTTOM NAVIGATION BAR                     */
/* -------------------------------------------------------------------------- */

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu }) => {
  const { activeTab, setActiveTab, activeUser, store } = useApp();
  const isBn = store.language === 'bn';
  const medEnabled = isMedicineModuleEnabled(store);
  const genEnabled = isGeneralProductModuleEnabled(store);

  const productTabId =
    medEnabled && !genEnabled
      ? 'medicine'
      : genEnabled && !medEnabled
      ? 'general_products'
      : medEnabled || genEnabled
      ? 'products'
      : canAccessTab(activeUser, 'inventory')
      ? 'inventory'
      : 'pos';

  const items = [
    { id: 'dashboard', labelEn: 'Home', labelBn: 'হোম', icon: LayoutDashboard },
    { id: 'pos', labelEn: 'POS', labelBn: 'বিক্রয়', icon: ShoppingCart },
    { id: productTabId, labelEn: 'Products', labelBn: 'পণ্য', icon: Package },
    { id: 'sales', labelEn: 'Sales', labelBn: 'হিসাব', icon: ReceiptText },
  ].filter((item) => canAccessTab(activeUser, item.id));

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 no-print pb-safe"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {items.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-[10px] font-semibold transition-colors cursor-pointer ${
                isActive ? 'text-[#0f6ae6]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : ''}`} />
              <span className="truncate max-w-[64px]">{isBn ? item.labelBn : item.labelEn}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-[10px] font-semibold text-slate-600 hover:text-emerald-600 cursor-pointer"
        >
          <LayoutGrid className="w-5 h-5" />
          <span>{isBn ? 'মেনু' : 'Menu'}</span>
        </button>
      </div>
    </nav>
  );
};
