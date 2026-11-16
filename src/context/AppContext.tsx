import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  StoreSettings,
  User,
  Category,
  Product,
  ProductVariant,
  Customer,
  CustomerDueTransaction,
  Supplier,
  SupplierDueTransaction,
  Purchase,
  Sale,
  SaleItem,
  Expense,
  RecurringExpense,
  CashSession,
  AuditLog,
  StockTransaction,
  SaleReturn,
  Quotation,
  HeldCart,
  PaymentMethodType,
  SplitPaymentDetail,
  PermissionKey,
  DueAlertChannel,
  Brand,
  GenericItem,
  PharmaCompany,
  UnitDefinition,
  PurchaseReturn,
  PurchaseReturnItem,
  StockTransfer,
  AccountIncome,
  CashFlowEntry,
  FinancialAccount,
  FinancialAccountTx,
  Employee,
  AttendanceRecord,
  AttendanceStatus,
  SalaryPayment,
  BatchLot,
  StockAdjustmentType,
  StockAdjustmentRecord,
} from '../types';
import { DBStorage } from '../db/storage';
import { getVariantBaseUnit } from '../utils/packaging';
import { setCachedToken } from '../services/googleDriveAuth';
import {
  canAccessTab,
  checkLoginThrottle,
  clearLoginAttempts,
  clearSignedSession,
  createSignedSession,
  getPermissionsForRole,
  hashPin,
  hasPermission,
  isHashedPin,
  recordFailedLoginAttempt,
  touchSignedSession,
  verifyPin,
  verifySignedSession,
  verifyUsersDirectoryIntegrity,
} from '../utils/security';

import { testFirestoreConnection } from '../services/firebaseFirestoreSync';

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabHistory: string[];
  canGoBack: boolean;
  goBack: () => void;
  activeUser: User;
  setActiveUser: (user: User) => void;
  users: User[];
  store: StoreSettings;
  updateStore: (settings: StoreSettings) => void;
  products: Product[];
  categories: Category[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  customerDues: CustomerDueTransaction[];
  supplierDues: SupplierDueTransaction[];
  purchases: Purchase[];
  expenses: Expense[];
  recurringExpenses: RecurringExpense[];
  cashSessions: CashSession[];
  auditLogs: AuditLog[];
  stockTransactions: StockTransaction[];
  stockAdjustments: StockAdjustmentRecord[];
  returns: SaleReturn[];
  quotations: Quotation[];
  heldCarts: HeldCart[];
  setHeldCarts: React.Dispatch<React.SetStateAction<HeldCart[]>>;
  brands: Brand[];
  generics: GenericItem[];
  pharmaCompanies: PharmaCompany[];
  units: UnitDefinition[];
  purchaseReturns: PurchaseReturn[];
  stockTransfers: StockTransfer[];
  incomes: AccountIncome[];
  cashFlows: CashFlowEntry[];
  financialAccounts: FinancialAccount[];
  financialAccountTxs: FinancialAccountTx[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  salaries: SalaryPayment[];

  // Print state
  printableReceipt: { type: 'sale' | 'due' | 'supplier_due' | 'quotation'; data: any } | null;
  setPrintableReceipt: (receipt: { type: 'sale' | 'due' | 'supplier_due' | 'quotation'; data: any } | null) => void;

  // Actions
  completeSale: (saleData: {
    customer_id?: string;
    customer_name: string;
    customer_mobile: string;
    items: SaleItem[];
    subtotal: number;
    discount_amount: number;
    discount_percentage: number;
    grand_total: number;
    paid_amount: number;
    due_amount: number;
    payment_method: PaymentMethodType;
    split_details?: SplitPaymentDetail;
    notes?: string;
  }) => Sale;

  payCustomerDue: (
    customer_id: string,
    paid_amount: number,
    payment_method: PaymentMethodType,
    notes?: string
  ) => CustomerDueTransaction;

  paySupplierDue: (
    supplier_id: string,
    paid_amount: number,
    payment_method: PaymentMethodType,
    notes?: string
  ) => SupplierDueTransaction;

  addPurchase: (purchaseData: Omit<Purchase, 'id' | 'created_at' | 'updated_at' | 'purchase_number'>) => Purchase;

  addExpense: (expenseData: Omit<Expense, 'id' | 'created_at' | 'expense_number'>) => Expense;

  adjustStock: (variant_id: string, new_stock: number, reason: string) => void;

  processReturn: (
    invoice_number: string,
    return_items: { variant_id: string; quantity: number; reason: string }[],
    refund_method: PaymentMethodType
  ) => SaleReturn | null;

  voidSale: (sale_id: string, reason: string) => boolean;

  saveProduct: (product: Product) => void;
  saveProductsBulk: (items: Product[]) => void;
  archiveProduct: (product_id: string) => void;

  saveCustomer: (customer: Customer) => Customer;
  logDueAlert: (customerId: string, channel: DueAlertChannel, notes?: string) => void;
  saveSupplier: (supplier: Supplier) => Supplier;
  saveUser: (user: User, plainPinToSet?: string) => Promise<void>;
  deleteUser: (userId: string) => void;
  saveCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;

  // Catalog Master Management (Brands, Generics, Companies, Units)
  saveBrand: (brand: Brand) => void;
  deleteBrand: (id: string) => void;
  saveGeneric: (item: GenericItem) => void;
  deleteGeneric: (id: string) => void;
  savePharmaCompany: (company: PharmaCompany) => void;
  deletePharmaCompany: (id: string) => void;
  saveUnit: (unit: UnitDefinition) => void;
  deleteUnit: (id: string) => void;

  // Purchase Return & Inventory Movements
  processPurchaseReturn: (data: {
    purchase_number?: string;
    supplier_id: string;
    items: PurchaseReturnItem[];
    refund_mode: 'cash' | 'bank' | 'adjust_due';
    reason?: string;
  }) => PurchaseReturn | null;

  recordStockIn: (variant_id: string, qty: number, reason: string, reference_no?: string) => void;
  recordStockOut: (variant_id: string, qty: number, reason: string, reference_no?: string) => void;
  recordDamageStock: (variant_id: string, qty: number, reason: string) => void;
  recordStockTransfer: (data: {
    variant_id: string;
    quantity: number;
    from_location: string;
    to_location: string;
    notes?: string;
  }) => StockTransfer | null;
  recordStockAdjustment: (input: {
    variant_id: string;
    adjustment_type: StockAdjustmentType;
    direction?: 'deduct' | 'add';
    quantity: number;
    date?: string;
    reason: string;
    note?: string;
    taken_by?: string;
  }) => { success: boolean; record?: StockAdjustmentRecord; message?: string };

  // Accounts Management
  addIncome: (data: Omit<AccountIncome, 'id' | 'income_number' | 'created_at' | 'created_by' | 'branch_id'>) => AccountIncome;
  deleteIncome: (id: string) => void;
  addCashFlow: (data: Omit<CashFlowEntry, 'id' | 'entry_number' | 'created_at' | 'created_by' | 'branch_id'>) => CashFlowEntry;
  saveFinancialAccount: (account: FinancialAccount) => void;
  recordFinancialAccountTx: (data: {
    account_id: string;
    tx_type: 'deposit' | 'withdraw';
    amount: number;
    reference?: string;
    notes?: string;
    date: string;
    time: string;
  }) => FinancialAccountTx | null;

  // Employee Management
  saveEmployee: (employee: Employee) => void;
  markAttendance: (data: {
    employee_id: string;
    date: string;
    status: AttendanceStatus;
    check_in?: string;
    check_out?: string;
    notes?: string;
  }) => void;
  payEmployeeSalary: (data: {
    employee_id: string;
    month_year: string;
    basic_salary: number;
    bonus: number;
    deduction: number;
    advance_adjusted: number;
    payment_method: PaymentMethodType;
    payment_date: string;
    notes?: string;
    log_as_expense?: boolean;
  }) => SalaryPayment | null;

  addAuditLog: (
    action: string,
    module: string,
    description: string,
    old_value?: string,
    new_value?: string,
    reason?: string
  ) => void;

  refreshData: () => void;

  // Auth, Session & RBAC
  isAuthenticated: boolean;
  isStorageReady: boolean;
  requiresPinChange: boolean;
  loginWithPin: (
    userIdOrUsername: string,
    pin: string
  ) => Promise<{ success: boolean; message?: string; lockedSeconds?: number }>;
  changeOwnPin: (
    currentPin: string,
    newPin: string
  ) => Promise<{ success: boolean; message?: string }>;
  checkPermission: (perm: PermissionKey) => boolean;
  logout: () => void;
  lockTerminal: () => void;

  // History & Data Reset Actions
  clearTransactionHistory: () => void;
  wipeAllData: () => void;
  resetToDemoData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_BOOT_USER: User = {
  id: 'user_boot_locked',
  name: 'Locked Terminal',
  username: 'locked',
  pin: '',
  role: 'visitor',
  active: false,
  permissions: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  sync_status: 'synced',
  branch_id: 'branch_dhaka_main',
  device_id: 'pos_terminal_01',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isStorageReady, setIsStorageReady] = useState<boolean>(false);
  const [activeTab, setActiveTabState] = useState<string>('pos');
  const [tabHistory, setTabHistory] = useState<string[]>([]);
  const [store, setStore] = useState<StoreSettings>(DBStorage.getStore());
  const [users, setUsers] = useState<User[]>(DBStorage.getUsers());
  const [activeUser, setActiveUser] = useState<User>(DEFAULT_BOOT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const setActiveTab = (tab: string) => {
    const resolvedTab =
      isAuthenticated && !canAccessTab(activeUser, tab) ? 'pos' : tab;
    if (resolvedTab === activeTab) return;

    setTabHistory((prev) => [...prev.slice(-29), activeTab]);
    setActiveTabState(resolvedTab);
    try {
      window.history.pushState({ posTab: resolvedTab }, '', `#${resolvedTab}`);
    } catch {
      // ignore sandboxed history errors
    }
  };

  const canGoBack = tabHistory.length > 0 || activeTab !== 'dashboard';

  const goBack = () => {
    if (tabHistory.length > 0) {
      const nextHistory = [...tabHistory];
      let target = nextHistory.pop() || 'dashboard';
      while (
        nextHistory.length > 0 &&
        (target === activeTab || (isAuthenticated && !canAccessTab(activeUser, target)))
      ) {
        target = nextHistory.pop() || 'dashboard';
      }
      if (isAuthenticated && !canAccessTab(activeUser, target)) {
        target = 'pos';
      }
      setTabHistory(nextHistory);
      setActiveTabState(target);
      return;
    }

    if (activeTab !== 'dashboard') {
      const fallback =
        isAuthenticated && canAccessTab(activeUser, 'dashboard') ? 'dashboard' : 'pos';
      setActiveTabState(fallback);
    }
  };

  // Sync browser/mobile hardware Back button with in-app navigation history
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const stateTab = event.state?.posTab;
      if (typeof stateTab === 'string') {
        if (isAuthenticated && !canAccessTab(activeUser, stateTab)) {
          setActiveTabState('pos');
        } else {
          setTabHistory((prev) => prev.slice(0, -1));
          setActiveTabState(stateTab);
        }
      } else {
        setTabHistory((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const prevTab = next.pop();
          if (prevTab && (!isAuthenticated || canAccessTab(activeUser, prevTab))) {
            setActiveTabState(prevTab);
          }
          return next;
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeUser, isAuthenticated]);

  // Verify Firestore connectivity on boot cleanly without blocking offline operations
  useEffect(() => {
    void testFirestoreConnection();
  }, []);

  // Enforce RBAC tab protection whenever activeUser or activeTab changes
  useEffect(() => {
    if (isAuthenticated && activeUser && !canAccessTab(activeUser, activeTab)) {
      setActiveTabState('pos');
    }
  }, [activeUser, activeTab, isAuthenticated]);


  const [products, setProducts] = useState<Product[]>(DBStorage.getProducts());
  const [categories, setCategories] = useState<Category[]>(DBStorage.getCategories());
  const [customers, setCustomers] = useState<Customer[]>(DBStorage.getCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(DBStorage.getSuppliers());
  const [sales, setSales] = useState<Sale[]>(DBStorage.getSales());
  const [customerDues, setCustomerDues] = useState<CustomerDueTransaction[]>(
    DBStorage.getCustomerDues()
  );
  const [supplierDues, setSupplierDues] = useState<SupplierDueTransaction[]>(
    DBStorage.getSupplierDues()
  );
  const [purchases, setPurchases] = useState<Purchase[]>(DBStorage.getPurchases());
  const [expenses, setExpenses] = useState<Expense[]>(DBStorage.getExpenses());
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(
    DBStorage.getRecurringExpenses()
  );
  const [cashSessions, setCashSessions] = useState<CashSession[]>(DBStorage.getCashSessions());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(DBStorage.getAuditLogs());
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>(
    DBStorage.getStockTransactions()
  );
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustmentRecord[]>(
    DBStorage.getStockAdjustments()
  );
  const [returns, setReturns] = useState<SaleReturn[]>(DBStorage.getReturns());
  const [quotations, setQuotations] = useState<Quotation[]>(DBStorage.getQuotations());
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [brands, setBrands] = useState<Brand[]>(DBStorage.getBrands());
  const [generics, setGenerics] = useState<GenericItem[]>(DBStorage.getGenerics());
  const [pharmaCompanies, setPharmaCompanies] = useState<PharmaCompany[]>(DBStorage.getPharmaCompanies());
  const [units, setUnits] = useState<UnitDefinition[]>(DBStorage.getUnits());
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(DBStorage.getPurchaseReturns());
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>(DBStorage.getStockTransfers());
  const [incomes, setIncomes] = useState<AccountIncome[]>(DBStorage.getIncomes());
  const [cashFlows, setCashFlows] = useState<CashFlowEntry[]>(DBStorage.getCashFlows());
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>(DBStorage.getFinancialAccounts());
  const [financialAccountTxs, setFinancialAccountTxs] = useState<FinancialAccountTx[]>(DBStorage.getFinancialAccountTxs());
  const [employees, setEmployees] = useState<Employee[]>(DBStorage.getEmployees());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(DBStorage.getAttendance());
  const [salaries, setSalaries] = useState<SalaryPayment[]>(DBStorage.getSalaries());

  const [printableReceipt, setPrintableReceipt] = useState<{
    type: 'sale' | 'due' | 'supplier_due' | 'quotation';
    data: any;
  } | null>(null);

  const refreshData = () => {
    setStore(DBStorage.getStore());
    setUsers(DBStorage.getUsers());
    setProducts(DBStorage.getProducts());
    setCategories(DBStorage.getCategories());
    setBrands(DBStorage.getBrands());
    setGenerics(DBStorage.getGenerics());
    setPharmaCompanies(DBStorage.getPharmaCompanies());
    setUnits(DBStorage.getUnits());
    setCustomers(DBStorage.getCustomers());
    setSuppliers(DBStorage.getSuppliers());
    setSales(DBStorage.getSales());
    setCustomerDues(DBStorage.getCustomerDues());
    setSupplierDues(DBStorage.getSupplierDues());
    setPurchases(DBStorage.getPurchases());
    setPurchaseReturns(DBStorage.getPurchaseReturns());
    setExpenses(DBStorage.getExpenses());
    setRecurringExpenses(DBStorage.getRecurringExpenses());
    setIncomes(DBStorage.getIncomes());
    setCashFlows(DBStorage.getCashFlows());
    setFinancialAccounts(DBStorage.getFinancialAccounts());
    setFinancialAccountTxs(DBStorage.getFinancialAccountTxs());
    setEmployees(DBStorage.getEmployees());
    setAttendance(DBStorage.getAttendance());
    setSalaries(DBStorage.getSalaries());
    setCashSessions(DBStorage.getCashSessions());
    setAuditLogs(DBStorage.getAuditLogs());
    setStockTransactions(DBStorage.getStockTransactions());
    setStockAdjustments(DBStorage.getStockAdjustments());
    setStockTransfers(DBStorage.getStockTransfers());
    setReturns(DBStorage.getReturns());
    setQuotations(DBStorage.getQuotations());
  };

  // Secure Boot: decrypt AES-GCM local storage, migrate PBKDF2 PINs, and validate signed session
  useEffect(() => {
    let mounted = true;
    (async () => {
      await DBStorage.initAsync();
      if (!mounted) return;
      refreshData();

      const loadedUsers = DBStorage.getUsers();
      const loadedStore = DBStorage.getStore();
      const integrityValid = await verifyUsersDirectoryIntegrity(loadedUsers);
      const sessionCheck = await verifySignedSession();

      if (integrityValid && sessionCheck.valid && sessionCheck.session) {
        const matched = loadedUsers.find(
          (u) =>
            u.id === sessionCheck.session?.userId &&
            u.role === sessionCheck.session?.role &&
            u.active
        );
        const demoBlocked = matched?.role === 'visitor' && loadedStore.demo_mode_enabled === false;
        if (matched && !demoBlocked) {
          setActiveUser(matched);
          setIsAuthenticated(true);
        } else {
          await clearSignedSession();
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }

      if (mounted) {
        setIsStorageReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Idle auto-lock & periodic session verification
  useEffect(() => {
    if (!isAuthenticated) return;

    let lastTouch = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastTouch > 30000) {
        lastTouch = now;
        void touchSignedSession();
      }
    };

    const validateSession = async () => {
      const check = await verifySignedSession();
      if (!check.valid) {
        setIsAuthenticated(false);
        setActiveUser(DEFAULT_BOOT_USER);
      }
    };

    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('visibilitychange', validateSession);
    const interval = setInterval(validateSession, 30000);

    return () => {
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('visibilitychange', validateSession);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Automatic Scheduled Backup Snapshot
  useEffect(() => {
    if (!isStorageReady || !isAuthenticated) return;
    if (store.auto_backup_enabled === false) return;

    const intervalHours = Math.max(1, Number(store.auto_backup_interval_hours || 24));
    const intervalMs = intervalHours * 60 * 60 * 1000;

    const checkAndRunBackup = () => {
      const currentStore = DBStorage.getStore();
      if (currentStore.auto_backup_enabled === false) return;
      const lastTs = currentStore.last_auto_backup_at
        ? new Date(currentStore.last_auto_backup_at).getTime()
        : 0;
      const existingSnapshots = DBStorage.getAutoBackupSnapshots();
      if (!lastTs || Number.isNaN(lastTs) || Date.now() - lastTs >= intervalMs || existingSnapshots.length === 0) {
        DBStorage.saveAutoBackupSnapshot('scheduled');
        setStore(DBStorage.getStore());
      }
    };

    checkAndRunBackup();
    const timer = setInterval(checkAndRunBackup, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [isStorageReady, isAuthenticated, store.auto_backup_enabled, store.auto_backup_interval_hours]);

  const updateStore = (settings: StoreSettings) => {
    if (!hasPermission(activeUser, 'settings_manage')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked settings update by ${activeUser.name}`);
      return;
    }
    setStore(settings);
    DBStorage.saveStore(settings);
    addAuditLog('UPDATE_STORE', 'Settings', 'Store settings and header/footer customized');
  };

  const addAuditLog = (
    action: string,
    module: string,
    description: string,
    old_value?: string,
    new_value?: string,
    reason?: string
  ) => {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: activeUser?.id || 'system',
      user_name: activeUser?.name || 'System',
      action,
      module,
      description,
      old_value,
      new_value,
      reason,
      created_at: new Date().toISOString(),
      branch_id: store.branch_id,
    };
    const updated = [log, ...auditLogs];
    setAuditLogs(updated);
    DBStorage.saveAuditLogs(updated);
  };

  // Generate unique invoice number
  const generateInvoiceNumber = (): string => {
    const prefix = (store.invoice_prefix || 'INV').trim().toUpperCase() || 'INV';
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const todaysSales = sales.filter((s) => s.date === new Date().toISOString().slice(0, 10));
    const nextSeq = (todaysSales.length + 1).toString().padStart(4, '0');
    return `${prefix}-${todayStr}-${nextSeq}`;
  };

  // Complete a Sale Transaction
  const completeSale = (saleData: {
    customer_id?: string;
    customer_name: string;
    customer_mobile: string;
    items: SaleItem[];
    subtotal: number;
    discount_amount: number;
    discount_percentage: number;
    grand_total: number;
    paid_amount: number;
    due_amount: number;
    payment_method: PaymentMethodType;
    split_details?: SplitPaymentDetail;
    notes?: string;
  }): Sale => {
    const invoiceNo = generateInvoiceNumber();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);

    const newSale: Sale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoice_number: invoiceNo,
      customer_id: saleData.customer_id,
      customer_name: saleData.customer_name || 'Walk-in Customer',
      customer_mobile: saleData.customer_mobile || '',
      seller_id: activeUser.id,
      seller_name: activeUser.name,
      items: saleData.items,
      subtotal: saleData.subtotal,
      discount_amount: saleData.discount_amount,
      discount_percentage: saleData.discount_percentage,
      tax_amount: 0,
      grand_total: saleData.grand_total,
      paid_amount: saleData.paid_amount,
      due_amount: saleData.due_amount,
      payment_method: saleData.payment_method,
      split_details: saleData.split_details,
      status: 'completed',
      notes: saleData.notes,
      date: dateStr,
      time: timeStr,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      sync_status: 'pending',
      branch_id: store.branch_id,
      device_id: store.device_id,
      user_id: activeUser.id,
    };

    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    DBStorage.saveSales(updatedSales);

    const currentProducts = [...products];
    const newStockTxs: StockTransaction[] = [];

    saleData.items.forEach((item) => {
      for (const prod of currentProducts) {
        const vIndex = prod.variants.findIndex((v) => v.id === item.variant_id);
        if (vIndex !== -1) {
          const variant = prod.variants[vIndex];
          const oldStock = variant.stock_quantity;
          const factor = item.conversion_factor && item.conversion_factor > 0 ? item.conversion_factor : 1;
          const deductBaseQty = Math.round((item.base_quantity ?? item.quantity * factor) * 1000) / 1000;
          const baseUnit = item.base_unit || getVariantBaseUnit(variant);
          const newStock = Math.max(0, Math.round((oldStock - deductBaseQty) * 1000) / 1000);

          let updatedBatches = variant.batches ? variant.batches.map((b) => ({ ...b })) : undefined;
          let resolvedBatchNo = item.batch_number;

          if (updatedBatches && updatedBatches.length > 0) {
            let remainingToDeduct = deductBaseQty;
            // 1. Try matching explicit batch first
            if (resolvedBatchNo) {
              const bIdx = updatedBatches.findIndex(
                (b) => b.batch_number.toLowerCase() === resolvedBatchNo!.toLowerCase() && b.stock_quantity > 0
              );
              if (bIdx !== -1) {
                const take = Math.min(updatedBatches[bIdx].stock_quantity, remainingToDeduct);
                updatedBatches[bIdx] = {
                  ...updatedBatches[bIdx],
                  stock_quantity: Math.max(0, Math.round((updatedBatches[bIdx].stock_quantity - take) * 1000) / 1000),
                };
                remainingToDeduct = Math.round((remainingToDeduct - take) * 1000) / 1000;
              }
            }
            // 2. If any remainder, deduct FEFO (earliest expiry first) across non-empty batches
            if (remainingToDeduct > 0.0001) {
              const sortedIndexes = updatedBatches
                .map((b, i) => ({ b, i }))
                .filter(({ b }) => b.stock_quantity > 0)
                .sort((a, b) => (a.b.expiry_date || '9999-12-31').localeCompare(b.b.expiry_date || '9999-12-31'))
                .map(({ i }) => i);

              for (const idx of sortedIndexes) {
                if (remainingToDeduct <= 0.0001) break;
                const take = Math.min(updatedBatches[idx].stock_quantity, remainingToDeduct);
                if (!resolvedBatchNo) resolvedBatchNo = updatedBatches[idx].batch_number;
                updatedBatches[idx] = {
                  ...updatedBatches[idx],
                  stock_quantity: Math.max(0, Math.round((updatedBatches[idx].stock_quantity - take) * 1000) / 1000),
                };
                remainingToDeduct = Math.round((remainingToDeduct - take) * 1000) / 1000;
              }
            }
          }

          const nextActiveBatch =
            updatedBatches
              ?.filter((b) => b.stock_quantity > 0)
              .sort((a, b) => (a.expiry_date || '9999-12-31').localeCompare(b.expiry_date || '9999-12-31'))[0] ||
            updatedBatches?.[0];

          prod.variants[vIndex] = {
            ...variant,
            stock_quantity: newStock,
            batches: updatedBatches,
            batch_number: nextActiveBatch?.batch_number ?? variant.batch_number,
            expiry_date: nextActiveBatch?.expiry_date ?? variant.expiry_date,
            updated_at: now.toISOString(),
          };

          newStockTxs.push({
            id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            product_name: prod.name,
            variant_id: variant.id,
            variant_name: variant.variant_name,
            transaction_type: 'sale',
            quantity_change: -deductBaseQty,
            previous_stock: oldStock,
            new_stock: newStock,
            batch_number: resolvedBatchNo || variant.batch_number,
            base_unit: baseUnit,
            reference_no: invoiceNo,
            user_id: activeUser.id,
            user_name: activeUser.name,
            reason: `POS Sale #${invoiceNo} (${item.quantity} ${item.unit}${
              factor !== 1 ? ` = ${deductBaseQty} ${baseUnit}` : ''
            }${resolvedBatchNo ? ` · Batch ${resolvedBatchNo}` : ''})`,
            created_at: now.toISOString(),
            branch_id: store.branch_id,
          });
          break;
        }
      }
    });

    setProducts(currentProducts);
    DBStorage.saveProducts(currentProducts);

    const updatedStockTxs = [...newStockTxs, ...stockTransactions];
    setStockTransactions(updatedStockTxs);
    DBStorage.saveStockTransactions(updatedStockTxs);

    const updatedCustomers = [...customers];
    let customerObj: Customer | undefined;

    if (saleData.customer_mobile) {
      const existingIdx = updatedCustomers.findIndex(
        (c) => c.mobile === saleData.customer_mobile
      );
      if (existingIdx !== -1) {
        customerObj = updatedCustomers[existingIdx];
        customerObj = {
          ...customerObj,
          total_orders: customerObj.total_orders + 1,
          total_purchase_amount: customerObj.total_purchase_amount + saleData.grand_total,
          total_paid_amount: customerObj.total_paid_amount + saleData.paid_amount,
          total_due_amount: customerObj.total_due_amount + saleData.due_amount,
          loyalty_points: customerObj.loyalty_points + Math.floor(saleData.grand_total / 100),
          last_purchase_date: dateStr,
          updated_at: now.toISOString(),
        };
        updatedCustomers[existingIdx] = customerObj;
      } else {
        customerObj = {
          id: `cust_${Date.now()}`,
          name: saleData.customer_name || 'Customer',
          mobile: saleData.customer_mobile,
          customer_type: 'regular',
          total_orders: 1,
          total_purchase_amount: saleData.grand_total,
          total_paid_amount: saleData.paid_amount,
          total_due_amount: saleData.due_amount,
          loyalty_points: Math.floor(saleData.grand_total / 100),
          last_purchase_date: dateStr,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          sync_status: 'pending',
          branch_id: store.branch_id,
        };
        updatedCustomers.push(customerObj);
      }
      setCustomers(updatedCustomers);
      DBStorage.saveCustomers(updatedCustomers);
    }

    if (saleData.due_amount > 0 && customerObj) {
      const dueTx: CustomerDueTransaction = {
        id: `cdt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        customer_id: customerObj.id,
        customer_name: customerObj.name,
        mobile: customerObj.mobile,
        invoice_number: invoiceNo,
        type: 'due_added',
        date: dateStr,
        time: timeStr,
        description: `Credit Sale on Invoice #${invoiceNo}`,
        total_amount: saleData.grand_total,
        paid_amount: saleData.paid_amount,
        due_amount: saleData.due_amount,
        balance_after: customerObj.total_due_amount,
        payment_method: saleData.payment_method,
        created_by: activeUser.name,
        notes: saleData.notes,
        sync_status: 'pending',
        branch_id: store.branch_id,
      };
      const updatedCustomerDues = [dueTx, ...customerDues];
      setCustomerDues(updatedCustomerDues);
      DBStorage.saveCustomerDues(updatedCustomerDues);
    }

    addAuditLog(
      'POS_SALE_COMPLETED',
      'POS',
      `Completed Sale Invoice #${invoiceNo} for Total ৳${saleData.grand_total} (Paid: ৳${saleData.paid_amount}, Due: ৳${saleData.due_amount})`
    );

    setPrintableReceipt({ type: 'sale', data: newSale });
    return newSale;
  };

  // Pay Customer Due Only
  const payCustomerDue = (
    customer_id: string,
    paid_amount: number,
    payment_method: PaymentMethodType,
    notes?: string
  ): CustomerDueTransaction => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);

    const updatedCusts = [...customers];
    const cIndex = updatedCusts.findIndex((c) => c.id === customer_id);
    if (cIndex === -1) throw new Error('Customer not found');

    const customer = updatedCusts[cIndex];
    const oldDue = customer.total_due_amount;
    const rawNewDue = Math.max(0, Math.round((oldDue - paid_amount) * 100) / 100);
    const newDue = rawNewDue <= 0.01 ? 0 : rawNewDue;

    updatedCusts[cIndex] = {
      ...customer,
      total_paid_amount: customer.total_paid_amount + paid_amount,
      total_due_amount: newDue,
      updated_at: now.toISOString(),
    };
    setCustomers(updatedCusts);
    DBStorage.saveCustomers(updatedCusts);

    const dueTx: CustomerDueTransaction = {
      id: `cdt_pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customer_id: customer.id,
      customer_name: customer.name,
      mobile: customer.mobile,
      type: 'due_payment',
      date: dateStr,
      time: timeStr,
      description: `Due Payment received via ${payment_method.toUpperCase()}`,
      total_amount: oldDue,
      paid_amount: paid_amount,
      due_amount: 0,
      balance_after: newDue,
      payment_method,
      created_by: activeUser.name,
      notes,
      sync_status: 'pending',
      branch_id: store.branch_id,
    };

    const updatedCustomerDues = [dueTx, ...customerDues];
    setCustomerDues(updatedCustomerDues);
    DBStorage.saveCustomerDues(updatedCustomerDues);

    addAuditLog(
      'CUSTOMER_DUE_PAID',
      'Customer Due',
      `Received Due Payment of ৳${paid_amount} from ${customer.name} (${customer.mobile}). Remaining Due: ৳${newDue}`
    );

    setPrintableReceipt({ type: 'due', data: dueTx });
    return dueTx;
  };

  // Pay Supplier Due
  const paySupplierDue = (
    supplier_id: string,
    paid_amount: number,
    payment_method: PaymentMethodType,
    notes?: string
  ): SupplierDueTransaction => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);

    const updatedSups = [...suppliers];
    const sIdx = updatedSups.findIndex((s) => s.id === supplier_id);
    if (sIdx === -1) throw new Error('Supplier not found');

    const supplier = updatedSups[sIdx];
    const oldDue = supplier.total_due;
    const rawNewDue = Math.max(0, Math.round((oldDue - paid_amount) * 100) / 100);
    const newDue = rawNewDue <= 0.01 ? 0 : rawNewDue;

    updatedSups[sIdx] = {
      ...supplier,
      total_paid: supplier.total_paid + paid_amount,
      total_due: newDue,
      updated_at: now.toISOString(),
    };
    setSuppliers(updatedSups);
    DBStorage.saveSuppliers(updatedSups);

    const dueTx: SupplierDueTransaction = {
      id: `sdt_pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      type: 'due_payment',
      date: dateStr,
      time: timeStr,
      description: `Supplier Due Payment made via ${payment_method.toUpperCase()}`,
      total_amount: oldDue,
      paid_amount: paid_amount,
      due_amount: 0,
      balance_after: newDue,
      payment_method,
      created_by: activeUser.name,
      notes,
      sync_status: 'pending',
      branch_id: store.branch_id,
    };

    const updatedSupplierDues = [dueTx, ...supplierDues];
    setSupplierDues(updatedSupplierDues);
    DBStorage.saveSupplierDues(updatedSupplierDues);

    addAuditLog(
      'SUPPLIER_DUE_PAID',
      'Supplier Due',
      `Paid ৳${paid_amount} to Supplier ${supplier.name}. Remaining Due: ৳${newDue}`
    );

    setPrintableReceipt({ type: 'supplier_due', data: dueTx });
    return dueTx;
  };

  // Add Purchase Record (increases stock)
  const addPurchase = (
    purchaseData: Omit<Purchase, 'id' | 'created_at' | 'updated_at' | 'purchase_number'>
  ): Purchase => {
    const now = new Date();
    const purNo = `PUR-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${(purchases.length + 1).toString().padStart(3, '0')}`;

    const newPurchase: Purchase = {
      ...purchaseData,
      id: `pur_${Date.now()}`,
      purchase_number: purNo,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const updatedPurchases = [newPurchase, ...purchases];
    setPurchases(updatedPurchases);
    DBStorage.savePurchases(updatedPurchases);

    const currentProds = [...products];
    const newStockTxs: StockTransaction[] = [];

    purchaseData.items.forEach((item) => {
      for (const prod of currentProds) {
        const vIndex = prod.variants.findIndex((v) => v.id === item.variant_id);
        if (vIndex !== -1) {
          const variant = prod.variants[vIndex];
          const oldStock = variant.stock_quantity;
          const factor = item.conversion_factor && item.conversion_factor > 0 ? item.conversion_factor : 1;
          const inwardBaseQty = Math.round((item.base_quantity ?? item.quantity * factor) * 1000) / 1000;
          const baseUnit = item.base_unit || getVariantBaseUnit(variant);
          const newStock = Math.round((oldStock + inwardBaseQty) * 1000) / 1000;

          let nextBatches: BatchLot[] | undefined = variant.batches ? variant.batches.map((b) => ({ ...b })) : undefined;
          if (item.batch_number) {
            if (!nextBatches) {
              nextBatches =
                variant.batch_number && variant.stock_quantity > 0
                  ? [
                      {
                        id: `batch_init_${variant.id}`,
                        batch_number: variant.batch_number,
                        mfg_date: variant.mfg_date,
                        expiry_date: variant.expiry_date,
                        stock_quantity: variant.stock_quantity,
                        purchase_price: variant.purchase_price,
                        supplier_id: variant.supplier_id,
                      },
                    ]
                  : [];
            }
            const existingBIdx = nextBatches.findIndex(
              (b) => b.batch_number.toLowerCase() === item.batch_number!.toLowerCase()
            );
            if (existingBIdx !== -1) {
              nextBatches[existingBIdx] = {
                ...nextBatches[existingBIdx],
                stock_quantity: Math.round((nextBatches[existingBIdx].stock_quantity + inwardBaseQty) * 1000) / 1000,
                expiry_date: item.expiry_date || nextBatches[existingBIdx].expiry_date,
                mfg_date: item.mfg_date || nextBatches[existingBIdx].mfg_date,
                purchase_price: item.purchase_price / factor,
              };
            } else {
              nextBatches.push({
                id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                batch_number: item.batch_number,
                mfg_date: item.mfg_date,
                expiry_date: item.expiry_date,
                stock_quantity: inwardBaseQty,
                purchase_price: item.purchase_price / factor,
                supplier_id: purchaseData.supplier_id,
                created_at: now.toISOString(),
              });
            }
          }

          prod.variants[vIndex] = {
            ...variant,
            stock_quantity: newStock,
            purchase_price: factor === 1 ? item.purchase_price : variant.purchase_price,
            batches: nextBatches,
            batch_number: variant.batch_number || item.batch_number,
            expiry_date: variant.expiry_date || item.expiry_date,
            updated_at: now.toISOString(),
          };

          newStockTxs.push({
            id: `st_pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            product_name: prod.name,
            variant_id: variant.id,
            variant_name: variant.variant_name,
            transaction_type: 'purchase',
            quantity_change: inwardBaseQty,
            previous_stock: oldStock,
            new_stock: newStock,
            batch_number: item.batch_number,
            base_unit: baseUnit,
            reference_no: purNo,
            user_id: activeUser.id,
            user_name: activeUser.name,
            reason: `Purchase Entry #${purNo} from ${purchaseData.supplier_name}${
              item.batch_number ? ` (Batch ${item.batch_number})` : ''
            }`,
            created_at: now.toISOString(),
            branch_id: store.branch_id,
          });
          break;
        }
      }
    });

    setProducts(currentProds);
    DBStorage.saveProducts(currentProds);

    const updatedStockTxs = [...newStockTxs, ...stockTransactions];
    setStockTransactions(updatedStockTxs);
    DBStorage.saveStockTransactions(updatedStockTxs);

    const updatedSups = [...suppliers];
    const sIndex = updatedSups.findIndex((s) => s.id === purchaseData.supplier_id);
    if (sIndex !== -1) {
      const sup = updatedSups[sIndex];
      updatedSups[sIndex] = {
        ...sup,
        total_purchases: sup.total_purchases + purchaseData.grand_total,
        total_paid: sup.total_paid + purchaseData.paid_amount,
        total_due: sup.total_due + purchaseData.due_amount,
        updated_at: now.toISOString(),
      };
      setSuppliers(updatedSups);
      DBStorage.saveSuppliers(updatedSups);
    }

    if (purchaseData.due_amount > 0) {
      const dueTx: SupplierDueTransaction = {
        id: `sdt_${Date.now()}`,
        supplier_id: purchaseData.supplier_id,
        supplier_name: purchaseData.supplier_name,
        purchase_invoice: purNo,
        type: 'due_added',
        date: purchaseData.purchase_date,
        time: now.toTimeString().slice(0, 8),
        description: `Credit Purchase #${purNo}`,
        total_amount: purchaseData.grand_total,
        paid_amount: purchaseData.paid_amount,
        due_amount: purchaseData.due_amount,
        balance_after:
          (suppliers.find((s) => s.id === purchaseData.supplier_id)?.total_due || 0) +
          purchaseData.due_amount,
        created_by: activeUser.name,
        sync_status: 'pending',
        branch_id: store.branch_id,
      };
      const updatedSupplierDues = [dueTx, ...supplierDues];
      setSupplierDues(updatedSupplierDues);
      DBStorage.saveSupplierDues(updatedSupplierDues);
    }

    addAuditLog(
      'PURCHASE_ADDED',
      'Purchase',
      `Recorded Purchase Entry #${purNo} from ${purchaseData.supplier_name} for ৳${purchaseData.grand_total}`
    );

    return newPurchase;
  };

  // Add Shop Operating Expense
  const addExpense = (
    expenseData: Omit<Expense, 'id' | 'created_at' | 'expense_number'>
  ): Expense => {
    const now = new Date();
    const expNo = `EXP-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${(expenses.length + 1).toString().padStart(2, '0')}`;

    const newExpense: Expense = {
      ...expenseData,
      id: `exp_${Date.now()}`,
      expense_number: expNo,
      created_at: now.toISOString(),
    };

    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);
    DBStorage.saveExpenses(updatedExpenses);

    addAuditLog(
      'EXPENSE_ADDED',
      'Expense',
      `Added Operating Expense '${expenseData.title}' of ৳${expenseData.amount} (${expenseData.category_name})`
    );

    return newExpense;
  };

  // Adjust Stock Quantity Manually (RBAC protected)
  const adjustStock = (variant_id: string, new_stock: number, reason: string) => {
    if (!hasPermission(activeUser, 'inventory_adjust')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked stock adjustment by ${activeUser.name}`);
      return;
    }

    const now = new Date();
    const currentProds = [...products];
    let foundProdName = '';
    let foundVarName = '';
    let oldStock = 0;

    for (const prod of currentProds) {
      const vIdx = prod.variants.findIndex((v) => v.id === variant_id);
      if (vIdx !== -1) {
        const v = prod.variants[vIdx];
        oldStock = v.stock_quantity;
        foundProdName = prod.name;
        foundVarName = v.variant_name;

        prod.variants[vIdx] = {
          ...v,
          stock_quantity: new_stock,
          updated_at: now.toISOString(),
        };
        break;
      }
    }

    setProducts(currentProds);
    DBStorage.saveProducts(currentProds);

    const change = new_stock - oldStock;
    const stockTx: StockTransaction = {
      id: `st_adj_${Date.now()}`,
      product_id: variant_id,
      product_name: foundProdName,
      variant_id,
      variant_name: foundVarName,
      transaction_type: 'adjustment',
      quantity_change: change,
      previous_stock: oldStock,
      new_stock,
      user_id: activeUser.id,
      user_name: activeUser.name,
      reason: reason || 'Manual Stock Adjustment',
      created_at: now.toISOString(),
      branch_id: store.branch_id,
    };

    const updatedStockTxs = [stockTx, ...stockTransactions];
    setStockTransactions(updatedStockTxs);
    DBStorage.saveStockTransactions(updatedStockTxs);

    addAuditLog(
      'STOCK_ADJUSTMENT',
      'Inventory',
      `Adjusted stock for ${foundVarName}: ${oldStock} → ${new_stock} (${change > 0 ? '+' : ''}${change}). Reason: ${reason}`
    );
  };

  // Process Item Return
  const processReturn = (
    invoice_number: string,
    return_items: { variant_id: string; quantity: number; reason: string }[],
    refund_method: PaymentMethodType
  ): SaleReturn | null => {
    const sale = sales.find((s) => s.invoice_number === invoice_number);
    if (!sale) return null;

    const now = new Date();
    let totalRefund = 0;

    const currentProds = [...products];
    const newStockTxs: StockTransaction[] = [];
    const returnItemDetails = [];

    for (const rItem of return_items) {
      const saleItem = sale.items.find((i) => i.variant_id === rItem.variant_id);
      if (!saleItem) continue;

      const refundForThis = saleItem.unit_selling_price * rItem.quantity;
      totalRefund += refundForThis;

      returnItemDetails.push({
        product_id: saleItem.product_id,
        product_name: saleItem.product_name,
        variant_id: saleItem.variant_id,
        variant_name: saleItem.variant_name,
        quantity: rItem.quantity,
        unit_price: saleItem.unit_selling_price,
        refund_amount: refundForThis,
        reason: rItem.reason,
      });

      for (const prod of currentProds) {
        const vIndex = prod.variants.findIndex((v) => v.id === rItem.variant_id);
        if (vIndex !== -1) {
          const variant = prod.variants[vIndex];
          const oldStock = variant.stock_quantity;
          const factor = saleItem.conversion_factor && saleItem.conversion_factor > 0 ? saleItem.conversion_factor : 1;
          const restoreBaseQty = Math.round(rItem.quantity * factor * 1000) / 1000;
          const newStock = Math.round((oldStock + restoreBaseQty) * 1000) / 1000;

          let nextBatches = variant.batches ? variant.batches.map((b) => ({ ...b })) : undefined;
          if (nextBatches && nextBatches.length > 0 && saleItem.batch_number) {
            const bIdx = nextBatches.findIndex(
              (b) => b.batch_number.toLowerCase() === saleItem.batch_number!.toLowerCase()
            );
            if (bIdx !== -1) {
              nextBatches[bIdx] = {
                ...nextBatches[bIdx],
                stock_quantity: Math.round((nextBatches[bIdx].stock_quantity + restoreBaseQty) * 1000) / 1000,
              };
            }
          }

          prod.variants[vIndex] = {
            ...variant,
            stock_quantity: newStock,
            batches: nextBatches,
            updated_at: now.toISOString(),
          };

          newStockTxs.push({
            id: `st_ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            product_name: prod.name,
            variant_id: variant.id,
            variant_name: variant.variant_name,
            transaction_type: 'customer_return',
            quantity_change: restoreBaseQty,
            previous_stock: oldStock,
            new_stock: newStock,
            batch_number: saleItem.batch_number,
            base_unit: saleItem.base_unit || getVariantBaseUnit(variant),
            reference_no: invoice_number,
            user_id: activeUser.id,
            user_name: activeUser.name,
            reason: `Customer Return against Invoice #${invoice_number}: ${rItem.reason}`,
            created_at: now.toISOString(),
            branch_id: store.branch_id,
          });
          break;
        }
      }
    }

    setProducts(currentProds);
    DBStorage.saveProducts(currentProds);

    const updatedStockTxs = [...newStockTxs, ...stockTransactions];
    setStockTransactions(updatedStockTxs);
    DBStorage.saveStockTransactions(updatedStockTxs);

    const retNo = `RET-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${(returns.length + 1).toString().padStart(3, '0')}`;
    const newReturn: SaleReturn = {
      id: `ret_${Date.now()}`,
      return_number: retNo,
      invoice_number,
      customer_id: sale.customer_id,
      customer_name: sale.customer_name,
      items: returnItemDetails,
      total_refund: totalRefund,
      refund_method,
      processed_by: activeUser.name,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      created_at: now.toISOString(),
      branch_id: store.branch_id,
    };

    const updatedReturns = [newReturn, ...returns];
    setReturns(updatedReturns);
    DBStorage.saveReturns(updatedReturns);

    const updatedSales = sales.map((s) =>
      s.invoice_number === invoice_number ? { ...s, status: 'returned' as const } : s
    );
    setSales(updatedSales);
    DBStorage.saveSales(updatedSales);

    addAuditLog(
      'SALE_RETURN_PROCESSED',
      'Returns',
      `Processed Return #${retNo} for Invoice #${invoice_number}. Refunded ৳${totalRefund} via ${refund_method.toUpperCase()}`
    );

    return newReturn;
  };

  // Void/Cancel Invoice (RBAC protected: invoice_cancel)
  const voidSale = (sale_id: string, reason: string): boolean => {
    if (!hasPermission(activeUser, 'invoice_cancel')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked void invoice attempt by ${activeUser.name}`);
      return false;
    }

    const saleIndex = sales.findIndex((s) => s.id === sale_id);
    if (saleIndex === -1) return false;

    const sale = sales[saleIndex];
    const now = new Date();

    const currentProds = [...products];
    const newStockTxs: StockTransaction[] = [];

    sale.items.forEach((item) => {
      for (const prod of currentProds) {
        const vIndex = prod.variants.findIndex((v) => v.id === item.variant_id);
        if (vIndex !== -1) {
          const variant = prod.variants[vIndex];
          const oldStock = variant.stock_quantity;
          const factor = item.conversion_factor && item.conversion_factor > 0 ? item.conversion_factor : 1;
          const restoreBaseQty = Math.round((item.base_quantity ?? item.quantity * factor) * 1000) / 1000;
          const newStock = Math.round((oldStock + restoreBaseQty) * 1000) / 1000;

          let nextBatches = variant.batches ? variant.batches.map((b) => ({ ...b })) : undefined;
          if (nextBatches && nextBatches.length > 0 && item.batch_number) {
            const bIdx = nextBatches.findIndex(
              (b) => b.batch_number.toLowerCase() === item.batch_number!.toLowerCase()
            );
            if (bIdx !== -1) {
              nextBatches[bIdx] = {
                ...nextBatches[bIdx],
                stock_quantity: Math.round((nextBatches[bIdx].stock_quantity + restoreBaseQty) * 1000) / 1000,
              };
            }
          }

          prod.variants[vIndex] = {
            ...variant,
            stock_quantity: newStock,
            batches: nextBatches,
            updated_at: now.toISOString(),
          };

          newStockTxs.push({
            id: `st_void_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            product_name: prod.name,
            variant_id: variant.id,
            variant_name: variant.variant_name,
            transaction_type: 'customer_return',
            quantity_change: restoreBaseQty,
            previous_stock: oldStock,
            new_stock: newStock,
            batch_number: item.batch_number,
            base_unit: item.base_unit || getVariantBaseUnit(variant),
            reference_no: sale.invoice_number,
            user_id: activeUser.id,
            user_name: activeUser.name,
            reason: `Voided Invoice #${sale.invoice_number}: ${reason}`,
            created_at: now.toISOString(),
            branch_id: store.branch_id,
          });
          break;
        }
      }
    });

    setProducts(currentProds);
    DBStorage.saveProducts(currentProds);

    const updatedStockTxs = [...newStockTxs, ...stockTransactions];
    setStockTransactions(updatedStockTxs);
    DBStorage.saveStockTransactions(updatedStockTxs);

    if (sale.due_amount > 0 && sale.customer_id) {
      const updatedCusts = [...customers];
      const cIdx = updatedCusts.findIndex((c) => c.id === sale.customer_id);
      if (cIdx !== -1) {
        const cust = updatedCusts[cIdx];
        updatedCusts[cIdx] = {
          ...cust,
          total_due_amount: Math.max(0, cust.total_due_amount - sale.due_amount),
          updated_at: now.toISOString(),
        };
        setCustomers(updatedCusts);
        DBStorage.saveCustomers(updatedCusts);
      }
    }

    const updatedSales = [...sales];
    updatedSales[saleIndex] = {
      ...sale,
      status: 'voided',
      void_reason: reason,
      void_by: activeUser.name,
      void_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    setSales(updatedSales);
    DBStorage.saveSales(updatedSales);

    addAuditLog(
      'INVOICE_VOIDED',
      'Sales History',
      `Voided Invoice #${sale.invoice_number} (Amount: ৳${sale.grand_total}). Reason: ${reason}`,
      'completed',
      'voided',
      reason
    );

    return true;
  };

  // Save/Update Product with Variants (RBAC protected)
  const saveProduct = (product: Product) => {
    if (!hasPermission(activeUser, 'product_manage')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked product save by ${activeUser.name}`);
      return;
    }
    const existingIdx = products.findIndex((p) => p.id === product.id);
    let updated: Product[];
    if (existingIdx !== -1) {
      updated = [...products];
      updated[existingIdx] = product;
    } else {
      updated = [product, ...products];
    }
    setProducts(updated);
    DBStorage.saveProducts(updated);
    addAuditLog('PRODUCT_SAVED', 'Products', `Saved Product '${product.name}' with ${product.variants.length} variant(s)`);
  };

  // Atomic Bulk Save Products / Medicines (RBAC protected)
  const saveProductsBulk = (items: Product[]) => {
    if (items.length === 0) return;
    if (!hasPermission(activeUser, 'product_manage')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked bulk product save by ${activeUser.name}`);
      return;
    }
    setProducts((prev) => {
      const next = [...prev];
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const existingIdx = next.findIndex((p) => p.id === item.id);
        if (existingIdx !== -1) {
          next[existingIdx] = item;
        } else {
          next.unshift(item);
        }
      }
      DBStorage.saveProducts(next);
      return next;
    });
    addAuditLog(
      'PRODUCT_BULK_SAVED',
      'Products',
      `Bulk saved ${items.length} product/medicine record(s)`
    );
  };

  // Archive Product (RBAC protected)
  const archiveProduct = (product_id: string) => {
    if (!hasPermission(activeUser, 'product_manage')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked product archive by ${activeUser.name}`);
      return;
    }
    const updated = products.map((p) => (p.id === product_id ? { ...p, archived: true } : p));
    setProducts(updated);
    DBStorage.saveProducts(updated);
    addAuditLog('PRODUCT_ARCHIVED', 'Products', `Archived product ID ${product_id}`);
  };

  // Save Customer (preserves existing ledger balances if matched by ID or mobile)
  const saveCustomer = (customer: Customer): Customer => {
    const idx = customers.findIndex(
      (c) => c.id === customer.id || (customer.mobile && c.mobile.trim() === customer.mobile.trim())
    );
    let updated: Customer[];
    let savedCust: Customer;
    if (idx !== -1) {
      const existing = customers[idx];
      updated = [...customers];
      savedCust = {
        ...existing,
        name: customer.name || existing.name,
        mobile: customer.mobile || existing.mobile,
        email: customer.email !== undefined ? customer.email : existing.email,
        address: customer.address !== undefined ? customer.address : existing.address,
        customer_type: customer.customer_type || existing.customer_type,
        due_promise_date:
          customer.due_promise_date !== undefined
            ? customer.due_promise_date
            : existing.due_promise_date,
        updated_at: new Date().toISOString(),
      };
      updated[idx] = savedCust;
    } else {
      savedCust = { ...customer, id: customer.id || `cust_${Date.now()}` };
      updated = [savedCust, ...customers];
    }
    setCustomers(updated);
    DBStorage.saveCustomers(updated);
    addAuditLog('CUSTOMER_SAVED', 'Customers', `Saved Customer ${savedCust.name} (${savedCust.mobile})`);
    return savedCust;
  };

  // Record Multi-Channel Customer Due Alert (SMS, WhatsApp, Call, Email, Share, Manual)
  const logDueAlert = (customerId: string, channel: DueAlertChannel, notes?: string) => {
    const idx = customers.findIndex((c) => c.id === customerId);
    if (idx === -1) return;
    const nowIso = new Date().toISOString();
    const target = customers[idx];
    const updated = [...customers];
    updated[idx] = {
      ...target,
      last_alert_sent_at: nowIso,
      last_alert_channel: channel,
      alert_count: (target.alert_count || 0) + 1,
      updated_at: nowIso,
    };
    setCustomers(updated);
    DBStorage.saveCustomers(updated);
    addAuditLog(
      'DUE_ALERT_SENT',
      'Customer Due',
      `Sent ${channel.toUpperCase()} due reminder to ${target.name} (${target.mobile}) for Due ৳${target.total_due_amount}${notes ? ` • ${notes}` : ''}`
    );
  };

  // Save Supplier
  const saveSupplier = (supplier: Supplier): Supplier => {
    const idx = suppliers.findIndex((s) => s.id === supplier.id);
    let updated: Supplier[];
    let savedSup = supplier;
    if (idx !== -1) {
      updated = [...suppliers];
      savedSup = { ...supplier, updated_at: new Date().toISOString() };
      updated[idx] = savedSup;
    } else {
      savedSup = { ...supplier, id: supplier.id || `sup_${Date.now()}` };
      updated = [savedSup, ...suppliers];
    }
    setSuppliers(updated);
    DBStorage.saveSuppliers(updated);
    addAuditLog('SUPPLIER_SAVED', 'Suppliers', `Saved Supplier ${savedSup.name}`);
    return savedSup;
  };

  // Save Category
  const saveCategory = (category: Category) => {
    if (!hasPermission(activeUser, 'product_manage')) return;
    const idx = categories.findIndex((c) => c.id === category.id);
    let updated: Category[];
    if (idx !== -1) {
      updated = [...categories];
      updated[idx] = category;
    } else {
      updated = [...categories, category];
    }
    setCategories(updated);
    DBStorage.saveCategories(updated);
  };

  const deleteCategory = (categoryId: string) => {
    if (!hasPermission(activeUser, 'product_manage')) return;
    const updated = categories.filter((c) => c.id !== categoryId);
    setCategories(updated);
    DBStorage.saveCategories(updated);
  };

  // Catalog Master Management
  const saveBrand = (brand: Brand) => {
    if (!hasPermission(activeUser, 'product_manage')) return;
    const idx = brands.findIndex((b) => b.id === brand.id);
    const updated = idx !== -1 ? brands.map((b, i) => (i === idx ? brand : b)) : [brand, ...brands];
    setBrands(updated);
    DBStorage.saveBrands(updated);
    addAuditLog('BRAND_SAVED', 'Products', `Saved brand '${brand.name}'`);
  };

  const deleteBrand = (id: string) => {
    if (!hasPermission(activeUser, 'product_manage')) return;
    const updated = brands.filter((b) => b.id !== id);
    setBrands(updated);
    DBStorage.saveBrands(updated);
  };

  const saveGeneric = (item: GenericItem) => {
    if (!hasPermission(activeUser, 'product_manage')) return;
    const idx = generics.findIndex((g) => g.id === item.id);
    const updated = idx !== -1 ? generics.map((g, i) => (i === idx ? item : g)) : [item, ...generics];
    setGenerics(updated);
    DBStorage.saveGenerics(updated);
    addAuditLog('GENERIC_SAVED', 'Products', `Saved medicine generic '${item.name}'`);
  };

  const deleteGeneric = (id: string) => {
    if (!hasPermission(activeUser, 'product_manage')) return;
    const updated = generics.filter((g) => g.id !== id);
    setGenerics(updated);
    DBStorage.saveGenerics(updated);
  };

  const savePharmaCompany = (company: PharmaCompany) => {
    if (!hasPermission(activeUser, 'product_manage')) return;
    const idx = pharmaCompanies.findIndex((c) => c.id === company.id);
    const updated =
      idx !== -1 ? pharmaCompanies.map((c, i) => (i === idx ? company : c)) : [company, ...pharmaCompanies];
    setPharmaCompanies(updated);
    DBStorage.savePharmaCompanies(updated);
    addAuditLog('COMPANY_SAVED', 'Products', `Saved pharma company '${company.name}'`);
  };

  const deletePharmaCompany = (id: string) => {
    if (!hasPermission(activeUser, 'product_manage')) return;
    const updated = pharmaCompanies.filter((c) => c.id !== id);
    setPharmaCompanies(updated);
    DBStorage.savePharmaCompanies(updated);
  };

  const saveUnit = (unit: UnitDefinition) => {
    if (!hasPermission(activeUser, 'product_manage')) return;
    const idx = units.findIndex((u) => u.id === unit.id);
    const updated = idx !== -1 ? units.map((u, i) => (i === idx ? unit : u)) : [...units, unit];
    setUnits(updated);
    DBStorage.saveUnits(updated);
  };

  const deleteUnit = (id: string) => {
    if (!hasPermission(activeUser, 'product_manage')) return;
    const updated = units.filter((u) => u.id !== id);
    setUnits(updated);
    DBStorage.saveUnits(updated);
  };

  // Purchase Return (deducts stock & adjusts supplier ledger)
  const processPurchaseReturn = (data: {
    purchase_number?: string;
    supplier_id: string;
    items: PurchaseReturnItem[];
    refund_mode: 'cash' | 'bank' | 'adjust_due';
    reason?: string;
  }): PurchaseReturn | null => {
    const supplier = suppliers.find((s) => s.id === data.supplier_id);
    if (!supplier || data.items.length === 0) return null;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);
    const retNo = `PRET-${dateStr.replace(/-/g, '')}-${(purchaseReturns.length + 1).toString().padStart(3, '0')}`;
    const totalRefund = data.items.reduce((sum, i) => sum + i.refund_amount, 0);

    const currentProds = [...products];
    const newStockTxs: StockTransaction[] = [];

    data.items.forEach((rItem) => {
      for (const prod of currentProds) {
        const vIdx = prod.variants.findIndex((v) => v.id === rItem.variant_id);
        if (vIdx !== -1) {
          const variant = prod.variants[vIdx];
          const oldStock = variant.stock_quantity;
          const newStock = Math.max(0, oldStock - rItem.quantity);
          prod.variants[vIdx] = {
            ...variant,
            stock_quantity: newStock,
            updated_at: now.toISOString(),
          };
          newStockTxs.push({
            id: `st_pret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            product_name: prod.name,
            variant_id: variant.id,
            variant_name: variant.variant_name,
            transaction_type: 'supplier_return',
            quantity_change: -rItem.quantity,
            previous_stock: oldStock,
            new_stock: newStock,
            reference_no: retNo,
            user_id: activeUser.id,
            user_name: activeUser.name,
            reason: `Purchase Return #${retNo} to ${supplier.name}: ${rItem.reason}`,
            created_at: now.toISOString(),
            branch_id: store.branch_id,
          });
          break;
        }
      }
    });

    setProducts(currentProds);
    DBStorage.saveProducts(currentProds);

    const updatedStockTxs = [...newStockTxs, ...stockTransactions];
    setStockTransactions(updatedStockTxs);
    DBStorage.saveStockTransactions(updatedStockTxs);

    if (data.refund_mode === 'adjust_due' && supplier.total_due > 0) {
      const dueReduction = Math.min(supplier.total_due, totalRefund);
      const newDue = Math.max(0, supplier.total_due - dueReduction);
      const updatedSups = suppliers.map((s) =>
        s.id === supplier.id ? { ...s, total_due: newDue, updated_at: now.toISOString() } : s
      );
      setSuppliers(updatedSups);
      DBStorage.saveSuppliers(updatedSups);

      const dueTx: SupplierDueTransaction = {
        id: `sdt_ret_${Date.now()}`,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        purchase_invoice: data.purchase_number || retNo,
        type: 'due_payment',
        date: dateStr,
        time: timeStr,
        description: `Purchase Return Adjustment #${retNo}`,
        total_amount: supplier.total_due,
        paid_amount: dueReduction,
        due_amount: 0,
        balance_after: newDue,
        created_by: activeUser.name,
        notes: data.reason,
        sync_status: 'pending',
        branch_id: store.branch_id,
      };
      const updatedSDues = [dueTx, ...supplierDues];
      setSupplierDues(updatedSDues);
      DBStorage.saveSupplierDues(updatedSDues);
    }

    const newRet: PurchaseReturn = {
      id: `pret_${Date.now()}`,
      return_number: retNo,
      purchase_number: data.purchase_number,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      items: data.items,
      total_refund: totalRefund,
      refund_mode: data.refund_mode,
      reason: data.reason,
      processed_by: activeUser.name,
      date: dateStr,
      time: timeStr,
      created_at: now.toISOString(),
      branch_id: store.branch_id,
    };

    const updatedPRets = [newRet, ...purchaseReturns];
    setPurchaseReturns(updatedPRets);
    DBStorage.savePurchaseReturns(updatedPRets);

    addAuditLog(
      'PURCHASE_RETURN',
      'Purchase',
      `Processed Purchase Return #${retNo} to ${supplier.name} for ৳${totalRefund}`
    );
    return newRet;
  };

  // Explicit Stock In / Stock Out / Damage / Transfer
  const applyStockMovement = (
    variant_id: string,
    delta: number,
    txType: StockTransaction['transaction_type'],
    reason: string,
    reference_no?: string
  ) => {
    if (!hasPermission(activeUser, 'inventory_adjust')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked stock movement (${txType}) by ${activeUser.name}`);
      return;
    }
    const now = new Date();
    const currentProds = [...products];
    let foundProdId = '';
    let foundProdName = '';
    let foundVarName = '';
    let oldStock = 0;
    let newStock = 0;

    for (const prod of currentProds) {
      const vIdx = prod.variants.findIndex((v) => v.id === variant_id);
      if (vIdx !== -1) {
        const v = prod.variants[vIdx];
        oldStock = v.stock_quantity;
        newStock = Math.max(0, Math.round((oldStock + delta) * 1000) / 1000);
        foundProdId = prod.id;
        foundProdName = prod.name;
        foundVarName = v.variant_name;
        prod.variants[vIdx] = {
          ...v,
          stock_quantity: newStock,
          updated_at: now.toISOString(),
        };
        break;
      }
    }
    if (!foundProdId) return;

    setProducts(currentProds);
    DBStorage.saveProducts(currentProds);

    const stockTx: StockTransaction = {
      id: `st_${txType}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      product_id: foundProdId,
      product_name: foundProdName,
      variant_id,
      variant_name: foundVarName,
      transaction_type: txType,
      quantity_change: newStock - oldStock,
      previous_stock: oldStock,
      new_stock: newStock,
      reference_no,
      user_id: activeUser.id,
      user_name: activeUser.name,
      reason,
      created_at: now.toISOString(),
      branch_id: store.branch_id,
    };

    const updatedStockTxs = [stockTx, ...stockTransactions];
    setStockTransactions(updatedStockTxs);
    DBStorage.saveStockTransactions(updatedStockTxs);

    addAuditLog(
      `STOCK_${txType.toUpperCase()}`,
      'Inventory',
      `${txType.toUpperCase()} for ${foundVarName}: ${oldStock} → ${newStock}. ${reason}`
    );
  };

  const recordStockIn = (variant_id: string, qty: number, reason: string, reference_no?: string) => {
    if (qty <= 0) return;
    applyStockMovement(variant_id, Math.abs(qty), 'stock_in', reason || 'Manual Stock In', reference_no);
  };

  const recordStockOut = (variant_id: string, qty: number, reason: string, reference_no?: string) => {
    if (qty <= 0) return;
    applyStockMovement(variant_id, -Math.abs(qty), 'stock_out', reason || 'Manual Stock Out', reference_no);
  };

  const recordDamageStock = (variant_id: string, qty: number, reason: string) => {
    if (qty <= 0) return;
    applyStockMovement(variant_id, -Math.abs(qty), 'damage', reason || 'Damaged / Expired Write-off');
  };

  // Comprehensive Personal Use & 9-Type Stock Adjustment (never creates a Sale or adds to Sales Income)
  const recordStockAdjustment = (input: {
    variant_id: string;
    adjustment_type: StockAdjustmentType;
    direction?: 'deduct' | 'add';
    quantity: number;
    date?: string;
    reason: string;
    note?: string;
    taken_by?: string;
  }): { success: boolean; record?: StockAdjustmentRecord; message?: string } => {
    if (!hasPermission(activeUser, 'inventory_adjust')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked stock adjustment (${input.adjustment_type}) by ${activeUser.name}`);
      return { success: false, message: 'Permission denied for stock adjustment.' };
    }

    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { success: false, message: 'Quantity must be greater than zero.' };
    }

    const direction: 'deduct' | 'add' =
      input.adjustment_type === 'stock_correction' && input.direction === 'add' ? 'add' : 'deduct';

    let targetProd: Product | undefined;
    let targetVar: ProductVariant | undefined;
    let targetProdIdx = -1;
    let targetVarIdx = -1;

    products.forEach((p, pIdx) => {
      if (targetProd) return;
      const vIdx = p.variants.findIndex((v) => v.id === input.variant_id);
      if (vIdx !== -1) {
        targetProd = p;
        targetVar = p.variants[vIdx];
        targetProdIdx = pIdx;
        targetVarIdx = vIdx;
      }
    });

    if (!targetProd || !targetVar || targetProdIdx === -1 || targetVarIdx === -1) {
      return { success: false, message: 'Selected product or variant could not be found.' };
    }

    const availableBefore = targetVar.stock_quantity;
    if (direction === 'deduct' && qty > availableBefore + 0.0001) {
      return {
        success: false,
        message: `Insufficient stock (${availableBefore} available, requested ${qty}).`,
      };
    }

    const now = new Date();
    const dateStr = input.date || now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);
    const newStock =
      direction === 'add'
        ? Math.round((availableBefore + qty) * 1000) / 1000
        : Math.max(0, Math.round((availableBefore - qty) * 1000) / 1000);

    // Update FEFO batches when deducting, if batch records exist
    let updatedBatches: BatchLot[] | undefined = targetVar.batches
      ? targetVar.batches.map((b) => ({ ...b }))
      : undefined;
    let resolvedBatchNo = targetVar.batch_number;

    if (direction === 'deduct' && updatedBatches && updatedBatches.length > 0) {
      let remaining = qty;
      const sortedIndexes = updatedBatches
        .map((b, idx) => ({ b, idx }))
        .filter(({ b }) => b.stock_quantity > 0)
        .sort((a, b) => (a.b.expiry_date || '9999-12-31').localeCompare(b.b.expiry_date || '9999-12-31'))
        .map(({ idx }) => idx);

      for (const idx of sortedIndexes) {
        if (remaining <= 0.0001) break;
        const take = Math.min(updatedBatches[idx].stock_quantity, remaining);
        if (!resolvedBatchNo) resolvedBatchNo = updatedBatches[idx].batch_number;
        updatedBatches[idx] = {
          ...updatedBatches[idx],
          stock_quantity: Math.max(0, Math.round((updatedBatches[idx].stock_quantity - take) * 1000) / 1000),
        };
        remaining = Math.round((remaining - take) * 1000) / 1000;
      }
    }

    const nextActiveBatch =
      updatedBatches
        ?.filter((b) => b.stock_quantity > 0)
        .sort((a, b) => (a.expiry_date || '9999-12-31').localeCompare(b.expiry_date || '9999-12-31'))[0] ||
      updatedBatches?.[0];

    const updatedProds = [...products];
    const prodCopy = { ...targetProd, variants: [...targetProd.variants] };
    prodCopy.variants[targetVarIdx] = {
      ...targetVar,
      stock_quantity: newStock,
      batches: updatedBatches,
      batch_number: nextActiveBatch?.batch_number ?? targetVar.batch_number,
      expiry_date: nextActiveBatch?.expiry_date ?? targetVar.expiry_date,
      updated_at: now.toISOString(),
    };
    updatedProds[targetProdIdx] = prodCopy;

    setProducts(updatedProds);
    DBStorage.saveProducts(updatedProds);

    const isPersonalUse =
      input.adjustment_type === 'owner_personal_use' ||
      input.adjustment_type === 'staff_personal_use';
    const prefix = isPersonalUse ? 'PU' : 'ADJ';
    const refNo = `${prefix}-${dateStr.replace(/-/g, '')}-${(stockAdjustments.length + 1).toString().padStart(3, '0')}`;

    const totalPurchaseValue = Math.round(qty * targetVar.purchase_price * 100) / 100;
    const baseUnit = getVariantBaseUnit(targetVar);

    const record: StockAdjustmentRecord = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reference_no: refNo,
      product_id: targetProd.id,
      product_name: targetProd.name,
      variant_id: targetVar.id,
      variant_name: targetVar.variant_name,
      is_medicine: Boolean(targetProd.is_medicine),
      adjustment_type: input.adjustment_type,
      direction,
      available_stock_before: availableBefore,
      quantity: qty,
      unit: baseUnit,
      purchase_price: targetVar.purchase_price,
      selling_price: targetVar.selling_price,
      total_purchase_value: totalPurchaseValue,
      date: dateStr,
      time: timeStr,
      reason: input.reason.trim() || input.adjustment_type.replace(/_/g, ' '),
      note: input.note?.trim() || undefined,
      taken_by: input.taken_by?.trim() || activeUser.name,
      recorded_by: activeUser.name,
      user_id: activeUser.id,
      created_at: now.toISOString(),
      branch_id: store.branch_id,
    };

    const nextAdjustments = [record, ...stockAdjustments];
    setStockAdjustments(nextAdjustments);
    DBStorage.saveStockAdjustments(nextAdjustments);

    const txTypeMap: Record<StockAdjustmentType, StockTransaction['transaction_type']> = {
      owner_personal_use: 'personal_use',
      staff_personal_use: 'personal_use',
      damaged_stock: 'damage',
      expired_stock: 'expired',
      wastage: 'wastage',
      free_sample: 'stock_out',
      promotional_use: 'stock_out',
      stock_correction: 'adjustment',
      missing_lost: 'damage',
    };

    const stockTx: StockTransaction = {
      id: `st_${prefix.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      product_id: targetProd.id,
      product_name: targetProd.name,
      variant_id: targetVar.id,
      variant_name: targetVar.variant_name,
      transaction_type: txTypeMap[input.adjustment_type],
      quantity_change: direction === 'add' ? qty : -qty,
      previous_stock: availableBefore,
      new_stock: newStock,
      batch_number: resolvedBatchNo,
      base_unit: baseUnit,
      reference_no: refNo,
      user_id: activeUser.id,
      user_name: activeUser.name,
      reason: `${input.adjustment_type.replace(/_/g, ' ').toUpperCase()} · ${record.reason} (Taken by: ${record.taken_by})`,
      created_at: now.toISOString(),
      branch_id: store.branch_id,
    };

    const updatedStockTxs = [stockTx, ...stockTransactions];
    setStockTransactions(updatedStockTxs);
    DBStorage.saveStockTransactions(updatedStockTxs);

    addAuditLog(
      isPersonalUse ? 'PERSONAL_USE_RECORDED' : 'STOCK_ADJUSTMENT_RECORDED',
      'Inventory',
      `${refNo}: ${targetProd.name} (${targetVar.variant_name}) ${direction === 'add' ? '+' : '-'}${qty} ${baseUnit} | Cost ৳${totalPurchaseValue} | By: ${record.taken_by} | Reason: ${record.reason}`
    );

    return { success: true, record };
  };

  const recordStockTransfer = (data: {
    variant_id: string;
    quantity: number;
    from_location: string;
    to_location: string;
    notes?: string;
  }): StockTransfer | null => {
    if (!hasPermission(activeUser, 'inventory_adjust') || data.quantity <= 0) return null;
    let matchedProd: Product | undefined;
    let matchedVar: ProductVariant | undefined;
    for (const p of products) {
      const v = p.variants.find((vr) => vr.id === data.variant_id);
      if (v) {
        matchedProd = p;
        matchedVar = v;
        break;
      }
    }
    if (!matchedProd || !matchedVar) return null;

    const now = new Date();
    const trNo = `TRF-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${(stockTransfers.length + 1).toString().padStart(3, '0')}`;

    const isExternalBranchOut =
      data.to_location.toLowerCase().includes('branch') &&
      !data.to_location.toLowerCase().includes('shelf') &&
      !data.to_location.toLowerCase().includes('rack');

    if (isExternalBranchOut) {
      applyStockMovement(
        matchedVar.id,
        -Math.abs(data.quantity),
        'transfer',
        `Transferred ${data.quantity} ${matchedVar.unit} from ${data.from_location} → ${data.to_location}`,
        trNo
      );
    } else {
      const stockTx: StockTransaction = {
        id: `st_trf_${Date.now()}`,
        product_id: matchedProd.id,
        product_name: matchedProd.name,
        variant_id: matchedVar.id,
        variant_name: matchedVar.variant_name,
        transaction_type: 'transfer',
        quantity_change: 0,
        previous_stock: matchedVar.stock_quantity,
        new_stock: matchedVar.stock_quantity,
        reference_no: trNo,
        user_id: activeUser.id,
        user_name: activeUser.name,
        reason: `Internal Transfer (${data.quantity} ${matchedVar.unit}): ${data.from_location} → ${data.to_location}`,
        created_at: now.toISOString(),
        branch_id: store.branch_id,
      };
      const updatedTxs = [stockTx, ...stockTransactions];
      setStockTransactions(updatedTxs);
      DBStorage.saveStockTransactions(updatedTxs);
    }

    const newTransfer: StockTransfer = {
      id: `trf_${Date.now()}`,
      transfer_number: trNo,
      product_id: matchedProd.id,
      product_name: matchedProd.name,
      variant_id: matchedVar.id,
      variant_name: matchedVar.variant_name,
      quantity: data.quantity,
      unit: matchedVar.unit,
      from_location: data.from_location,
      to_location: data.to_location,
      notes: data.notes,
      transferred_by: activeUser.name,
      date: now.toISOString().slice(0, 10),
      created_at: now.toISOString(),
      branch_id: store.branch_id,
    };

    const updatedTransfers = [newTransfer, ...stockTransfers];
    setStockTransfers(updatedTransfers);
    DBStorage.saveStockTransfers(updatedTransfers);

    addAuditLog(
      'STOCK_TRANSFER',
      'Inventory',
      `Stock Transfer #${trNo}: ${data.quantity} ${matchedVar.unit} of ${matchedVar.variant_name} (${data.from_location} → ${data.to_location})`
    );
    return newTransfer;
  };

  // Accounts Management
  const addIncome = (
    data: Omit<AccountIncome, 'id' | 'income_number' | 'created_at' | 'created_by' | 'branch_id'>
  ): AccountIncome => {
    const now = new Date();
    const incNo = `INC-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${(incomes.length + 1).toString().padStart(3, '0')}`;
    const newInc: AccountIncome = {
      ...data,
      id: `inc_${Date.now()}`,
      income_number: incNo,
      created_by: activeUser.name,
      created_at: now.toISOString(),
      branch_id: store.branch_id,
    };
    const updated = [newInc, ...incomes];
    setIncomes(updated);
    DBStorage.saveIncomes(updated);
    addAuditLog('INCOME_ADDED', 'Accounts', `Recorded Other Income #${incNo}: ${data.title} (৳${data.amount})`);
    return newInc;
  };

  const deleteIncome = (id: string) => {
    const updated = incomes.filter((i) => i.id !== id);
    setIncomes(updated);
    DBStorage.saveIncomes(updated);
  };

  const addCashFlow = (
    data: Omit<CashFlowEntry, 'id' | 'entry_number' | 'created_at' | 'created_by' | 'branch_id'>
  ): CashFlowEntry => {
    const now = new Date();
    const prefix = data.type === 'cash_in' ? 'CIN' : 'COUT';
    const entryNo = `${prefix}-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${(cashFlows.length + 1).toString().padStart(3, '0')}`;
    const entry: CashFlowEntry = {
      ...data,
      id: `cf_${Date.now()}`,
      entry_number: entryNo,
      created_by: activeUser.name,
      created_at: now.toISOString(),
      branch_id: store.branch_id,
    };
    const updated = [entry, ...cashFlows];
    setCashFlows(updated);
    DBStorage.saveCashFlows(updated);
    addAuditLog(
      data.type === 'cash_in' ? 'CASH_IN' : 'CASH_OUT',
      'Accounts',
      `${data.type === 'cash_in' ? 'Cash In' : 'Cash Out'} #${entryNo}: ${data.title} (৳${data.amount})`
    );
    return entry;
  };

  const saveFinancialAccount = (account: FinancialAccount) => {
    const idx = financialAccounts.findIndex((a) => a.id === account.id);
    const updated =
      idx !== -1
        ? financialAccounts.map((a, i) => (i === idx ? account : a))
        : [account, ...financialAccounts];
    setFinancialAccounts(updated);
    DBStorage.saveFinancialAccounts(updated);
    addAuditLog('ACCOUNT_SAVED', 'Accounts', `Saved ${account.account_type} account '${account.account_name}'`);
  };

  const recordFinancialAccountTx = (data: {
    account_id: string;
    tx_type: 'deposit' | 'withdraw';
    amount: number;
    reference?: string;
    notes?: string;
    date: string;
    time: string;
  }): FinancialAccountTx | null => {
    const accIdx = financialAccounts.findIndex((a) => a.id === data.account_id);
    if (accIdx === -1 || data.amount <= 0) return null;
    const acc = financialAccounts[accIdx];
    const now = new Date();
    const nextBalance =
      data.tx_type === 'deposit' ? acc.balance + data.amount : Math.max(0, acc.balance - data.amount);

    const updatedAccounts = [...financialAccounts];
    updatedAccounts[accIdx] = { ...acc, balance: nextBalance, updated_at: now.toISOString() };
    setFinancialAccounts(updatedAccounts);
    DBStorage.saveFinancialAccounts(updatedAccounts);

    const tx: FinancialAccountTx = {
      id: `fatx_${Date.now()}`,
      account_id: acc.id,
      account_name: `${acc.provider_name} — ${acc.account_name}`,
      tx_type: data.tx_type,
      amount: data.amount,
      reference: data.reference,
      notes: data.notes,
      date: data.date,
      time: data.time,
      created_by: activeUser.name,
      created_at: now.toISOString(),
    };
    const updatedTxs = [tx, ...financialAccountTxs];
    setFinancialAccountTxs(updatedTxs);
    DBStorage.saveFinancialAccountTxs(updatedTxs);
    addAuditLog(
      data.tx_type === 'deposit' ? 'ACCOUNT_DEPOSIT' : 'ACCOUNT_WITHDRAW',
      'Accounts',
      `${data.tx_type === 'deposit' ? 'Deposited' : 'Withdrew'} ৳${data.amount} (${acc.account_name})`
    );
    return tx;
  };

  // Employee Management
  const saveEmployee = (employee: Employee) => {
    const idx = employees.findIndex((e) => e.id === employee.id);
    const updated =
      idx !== -1 ? employees.map((e, i) => (i === idx ? employee : e)) : [employee, ...employees];
    setEmployees(updated);
    DBStorage.saveEmployees(updated);
    addAuditLog('EMPLOYEE_SAVED', 'Employees', `Saved employee profile ${employee.name} (${employee.designation})`);
  };

  const markAttendance = (data: {
    employee_id: string;
    date: string;
    status: AttendanceStatus;
    check_in?: string;
    check_out?: string;
    notes?: string;
  }) => {
    const emp = employees.find((e) => e.id === data.employee_id);
    if (!emp) return;
    const now = new Date().toISOString();
    const existingIdx = attendance.findIndex(
      (a) => a.employee_id === data.employee_id && a.date === data.date
    );
    let updated: AttendanceRecord[];
    const shiftText = emp.shift_label || emp.shift || 'Full Day';
    if (existingIdx !== -1) {
      updated = [...attendance];
      updated[existingIdx] = {
        ...updated[existingIdx],
        employee_code: emp.employee_code,
        shift: shiftText,
        status: data.status,
        check_in: data.check_in ?? updated[existingIdx].check_in,
        check_out: data.check_out ?? updated[existingIdx].check_out,
        notes: data.notes ?? updated[existingIdx].notes,
        marked_by: activeUser.name,
        updated_at: now,
      };
    } else {
      const rec: AttendanceRecord = {
        id: `att_${data.employee_id}_${data.date}`,
        employee_id: emp.id,
        employee_code: emp.employee_code,
        employee_name: emp.name,
        shift: shiftText,
        date: data.date,
        status: data.status,
        check_in: data.check_in,
        check_out: data.check_out,
        notes: data.notes,
        marked_by: activeUser.name,
        updated_at: now,
      };
      updated = [rec, ...attendance];
    }
    setAttendance(updated);
    DBStorage.saveAttendance(updated);
  };

  const payEmployeeSalary = (data: {
    employee_id: string;
    month_year: string;
    basic_salary: number;
    bonus: number;
    deduction: number;
    advance_adjusted: number;
    payment_method: PaymentMethodType;
    payment_date: string;
    notes?: string;
    log_as_expense?: boolean;
  }): SalaryPayment | null => {
    const emp = employees.find((e) => e.id === data.employee_id);
    if (!emp) return null;
    const now = new Date();
    const netPaid = Math.max(0, data.basic_salary + data.bonus - data.deduction - data.advance_adjusted);
    const vNo = `SAL-${data.month_year.replace('-', '')}-${(salaries.length + 1).toString().padStart(3, '0')}`;
    const payment: SalaryPayment = {
      id: `sal_${Date.now()}`,
      voucher_number: vNo,
      employee_id: emp.id,
      employee_name: emp.name,
      month_year: data.month_year,
      basic_salary: data.basic_salary,
      bonus: data.bonus,
      deduction: data.deduction,
      advance_adjusted: data.advance_adjusted,
      net_paid: netPaid,
      payment_method: data.payment_method,
      payment_date: data.payment_date,
      notes: data.notes,
      paid_by: activeUser.name,
      created_at: now.toISOString(),
    };
    const updated = [payment, ...salaries];
    setSalaries(updated);
    DBStorage.saveSalaries(updated);

    if (data.log_as_expense && netPaid > 0) {
      addExpense({
        title: `Salary Payment - ${emp.name} (${data.month_year})`,
        category_id: 'cat_salary',
        category_name: 'Employee Salary',
        amount: netPaid,
        date: data.payment_date,
        time: now.toTimeString().slice(0, 8),
        payment_method: data.payment_method,
        status: 'paid',
        voucher_number: vNo,
        service_provider: emp.name,
        notes: data.notes,
        created_by: activeUser.name,
        branch_id: store.branch_id,
      });
    }

    addAuditLog(
      'SALARY_PAID',
      'Employees',
      `Paid Salary #${vNo} to ${emp.name} (${data.month_year}): Net ৳${netPaid}`
    );
    return payment;
  };

  // Save User (RBAC protected + PBKDF2 hash enforcement)
  const saveUser = async (user: User, plainPinToSet?: string): Promise<void> => {
    if (!hasPermission(activeUser, 'user_manage')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked user modification attempt by ${activeUser.name}`);
      return;
    }

    const existing = users.find((u) => u.id === user.id);
    let hashedPin = existing?.pin || user.pin;

    if (plainPinToSet && plainPinToSet.trim().length >= 4) {
      hashedPin = await hashPin(plainPinToSet.trim());
    } else if (!isHashedPin(hashedPin)) {
      hashedPin = await hashPin(hashedPin || '1234');
    }

    const userToSave: User = {
      ...user,
      pin: hashedPin,
      must_change_pin:
        plainPinToSet && plainPinToSet.trim() !== '1234'
          ? false
          : plainPinToSet?.trim() === '1234' && user.role === 'admin'
          ? true
          : user.must_change_pin,
      permissions: user.permissions?.length ? user.permissions : getPermissionsForRole(user.role),
    };

    const idx = users.findIndex((u) => u.id === userToSave.id);
    let updated: User[];
    if (idx !== -1) {
      updated = [...users];
      updated[idx] = userToSave;
    } else {
      updated = [...users, userToSave];
    }

    setUsers(updated);
    DBStorage.saveUsers(updated);

    if (activeUser.id === userToSave.id) {
      setActiveUser(userToSave);
      await createSignedSession(userToSave.id, userToSave.role);
    }

    addAuditLog('USER_SAVED', 'Users', `Saved User ${userToSave.name} (@${userToSave.username}, ${userToSave.role})`);
  };

  // Delete User / Salesman (RBAC protected)
  const deleteUser = (userId: string) => {
    if (!hasPermission(activeUser, 'user_manage')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked user deletion attempt by ${activeUser.name}`);
      return;
    }
    const target = users.find((u) => u.id === userId);
    if (!target || target.id === 'user_admin' || target.id === activeUser.id) return;
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    DBStorage.saveUsers(updated);
    addAuditLog('USER_DELETED', 'Users', `Removed staff/salesman ${target.name} (@${target.username})`);
  };

  // Authenticated User Self-Service PIN Update
  const changeOwnPin = async (
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!isAuthenticated || !activeUser?.id) {
      return { success: false, message: 'Session is not active.' };
    }
    const cleanNew = newPin.trim();
    if (cleanNew.length < 4) {
      return { success: false, message: 'নতুন পাসওয়ার্ড বা পিন কমপক্ষে ৪ অক্ষরের হতে হবে (Minimum 4 characters).' };
    }
    if (activeUser.role === 'admin' && cleanNew === '1234') {
      return { success: false, message: 'নিরাপত্তার জন্য অ্যাডমিন পিন হিসেবে 1234 ব্যবহার করা যাবে না।' };
    }

    const currentValid = await verifyPin(currentPin, activeUser.pin);
    if (!currentValid) {
      return { success: false, message: 'বর্তমান পাসওয়ার্ড বা পিন সঠিক নয় (Current PIN is incorrect).' };
    }

    const nextHash = await hashPin(cleanNew);
    const updatedUser: User = {
      ...activeUser,
      pin: nextHash,
      must_change_pin: false,
      updated_at: new Date().toISOString(),
    };
    const updatedUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(updatedUsers);
    DBStorage.saveUsers(updatedUsers);
    setActiveUser(updatedUser);
    addAuditLog('PIN_CHANGED', 'Security', `${updatedUser.name} updated their Password/PIN.`);
    return { success: true };
  };

  // Cashier, Salesman, Visitor & Terminal Authentication (PBKDF2 + Brute-Force Rate Limit + Signed Session)
  const loginWithPin = async (
    userIdOrUsername: string,
    pin: string
  ): Promise<{ success: boolean; message?: string; lockedSeconds?: number }> => {
    const trimmed = userIdOrUsername.trim().toLowerCase();
    if (!trimmed || !pin) {
      return { success: false, message: 'আইডি এবং পাসওয়ার্ড/পিন দিন (ID and Password/PIN required).' };
    }

    // 1. Check Brute-Force Rate Limiter
    const throttle = await checkLoginThrottle(trimmed);
    if (!throttle.allowed) {
      return {
        success: false,
        lockedSeconds: throttle.remainingSeconds,
        message: `অতিরিক্ত ভুল চেষ্টার কারণে লগইন সাময়িকভাবে বন্ধ (${throttle.remainingSeconds} সেকেন্ড অপেক্ষা করুন)।`,
      };
    }

    // 2. Verify Users Directory Integrity MAC
    const directoryIntact = await verifyUsersDirectoryIntegrity(users);
    if (!directoryIntact) {
      addAuditLog('SECURITY_TAMPER_DETECTED', 'Security', 'User role/permission directory MAC mismatch detected.');
      return {
        success: false,
        message: 'সিস্টেম ইউজার ডিরেক্টরি পরিবর্তন শনাক্ত হয়েছে (Directory integrity check failed).',
      };
    }

    // 3. Lookup active user strictly in stored directory (NO hardcoded fallback user creation!)
    const normalizedPhone = trimmed.replace(/[\s\-+]/g, '');
    const foundUser = users.find(
      (u) =>
        u.id.toLowerCase() === trimmed ||
        u.username.toLowerCase() === trimmed ||
        u.name.toLowerCase() === trimmed ||
        (u.phone && normalizedPhone.length >= 6 && u.phone.replace(/[\s\-+]/g, '') === normalizedPhone)
    );

    if (!foundUser) {
      const failRes = await recordFailedLoginAttempt(trimmed);
      return {
        success: false,
        lockedSeconds: failRes.lockedSeconds || undefined,
        message: failRes.lockedSeconds
          ? `অতিরিক্ত ভুল চেষ্টা! ${failRes.lockedSeconds} সেকেন্ড পর আবার চেষ্টা করুন।`
          : 'ভুল ইউজার আইডি বা পাসওয়ার্ড! (Invalid User ID or Password/PIN)',
      };
    }

    if (foundUser.role === 'visitor' && store.demo_mode_enabled === false) {
      return {
        success: false,
        message: 'ডেমো ভিজিটর অ্যাকাউন্টটি অ্যাডমিন দ্বারা বন্ধ করা হয়েছে (Demo account is disabled).',
      };
    }

    if (!foundUser.active) {
      return {
        success: false,
        message: 'এই অ্যাকাউন্টটি নিষ্ক্রিয় রাখা হয়েছে (Account is deactivated).',
      };
    }

    // 4. Verify Password/PIN strictly via PBKDF2-SHA256 (NO master/demo plaintext PIN backdoor!)
    const isPinValid = await verifyPin(pin, foundUser.pin);
    if (!isPinValid) {
      const failRes = await recordFailedLoginAttempt(trimmed);
      addAuditLog(
        'LOGIN_FAILED',
        'Auth',
        `Failed login attempt #${failRes.attempts} for @${foundUser.username}`
      );
      return {
        success: false,
        lockedSeconds: failRes.lockedSeconds || undefined,
        message: failRes.lockedSeconds
          ? `অতিরিক্ত ভুল পাসওয়ার্ড! নিরাপত্তার জন্য ${failRes.lockedSeconds} সেকেন্ড লক করা হয়েছে।`
          : 'ভুল পাসওয়ার্ড বা পিন কোড! আবার চেষ্টা করুন (Invalid Password/PIN).',
      };
    }

    // 5. Issue HMAC-Signed Session Token with Expiration & Idle Timeout
    await clearLoginAttempts(trimmed);
    await createSignedSession(foundUser.id, foundUser.role);

    setActiveUser(foundUser);
    setIsAuthenticated(true);
    if (!canAccessTab(foundUser, activeTab)) {
      setActiveTabState('pos');
    }
    addAuditLog('USER_LOGIN', 'Auth', `User ${foundUser.name} (${foundUser.role}) authenticated securely.`);
    return { success: true };
  };

  const logout = () => {
    const actorName = activeUser?.name || 'User';
    setIsAuthenticated(false);
    setActiveUser(DEFAULT_BOOT_USER);
    setCachedToken(null);
    void clearSignedSession();
    addAuditLog('USER_LOGOUT', 'Auth', `User ${actorName} signed out and cleared active session.`);
  };

  const lockTerminal = () => {
    const actorName = activeUser?.name || 'User';
    setIsAuthenticated(false);
    void clearSignedSession();
    addAuditLog('TERMINAL_LOCKED', 'Auth', `Terminal locked by ${actorName}.`);
  };

  // History & Data Reset Actions (Admin Only RBAC enforced)
  const clearTransactionHistory = () => {
    if (activeUser.role !== 'admin' || !hasPermission(activeUser, 'backup_manage')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked clearTransactionHistory by ${activeUser.name}`);
      return;
    }
    DBStorage.clearTransactionHistory(activeUser.id, activeUser.name);
    refreshData();
  };

  const wipeAllData = () => {
    if (activeUser.role !== 'admin' || !hasPermission(activeUser, 'backup_manage')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked wipeAllData by ${activeUser.name}`);
      return;
    }
    DBStorage.wipeAllData(activeUser.id, activeUser.name);
    refreshData();
  };

  const resetToDemoData = async () => {
    if (activeUser.role !== 'admin' || !hasPermission(activeUser, 'backup_manage')) {
      addAuditLog('UNAUTHORIZED_ACTION', 'Security', `Blocked resetToDemoData by ${activeUser.name}`);
      return;
    }
    await DBStorage.resetToSeedData();
    refreshData();
  };

  const checkPermission = (perm: PermissionKey) => hasPermission(activeUser, perm);
  const requiresPinChange = Boolean(
    isAuthenticated && activeUser?.role === 'admin' && activeUser?.must_change_pin
  );

  if (!isStorageReady) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 shadow-sm flex items-center gap-3 text-slate-700 text-xs font-semibold">
          <div className="w-4 h-4 rounded-full border-2 border-[#6666f1] border-t-transparent animate-spin" />
          <span>Unlocking encrypted store vault...</span>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        tabHistory,
        canGoBack,
        goBack,
        activeUser,
        setActiveUser,
        users,
        store,
        updateStore,
        products,
        categories,
        customers,
        suppliers,
        sales,
        customerDues,
        supplierDues,
        purchases,
        expenses,
        recurringExpenses,
        cashSessions,
        auditLogs,
        stockTransactions,
        stockAdjustments,
        returns,
        quotations,
        heldCarts,
        setHeldCarts,
        brands,
        generics,
        pharmaCompanies,
        units,
        purchaseReturns,
        stockTransfers,
        incomes,
        cashFlows,
        financialAccounts,
        financialAccountTxs,
        employees,
        attendance,
        salaries,
        printableReceipt,
        setPrintableReceipt,
        completeSale,
        payCustomerDue,
        paySupplierDue,
        addPurchase,
        addExpense,
        adjustStock,
        processReturn,
        voidSale,
        saveProduct,
        saveProductsBulk,
        archiveProduct,
        saveCustomer,
        logDueAlert,
        saveSupplier,
        saveUser,
        deleteUser,
        saveCategory,
        deleteCategory,
        saveBrand,
        deleteBrand,
        saveGeneric,
        deleteGeneric,
        savePharmaCompany,
        deletePharmaCompany,
        saveUnit,
        deleteUnit,
        processPurchaseReturn,
        recordStockIn,
        recordStockOut,
        recordDamageStock,
        recordStockTransfer,
        recordStockAdjustment,
        addIncome,
        deleteIncome,
        addCashFlow,
        saveFinancialAccount,
        recordFinancialAccountTx,
        saveEmployee,
        markAttendance,
        payEmployeeSalary,
        addAuditLog,
        refreshData,
        isAuthenticated,
        isStorageReady,
        requiresPinChange,
        loginWithPin,
        changeOwnPin,
        checkPermission,
        logout,
        lockTerminal,
        clearTransactionHistory,
        wipeAllData,
        resetToDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
