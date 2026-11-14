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
} from '../types';
import { DBStorage } from '../db/storage';
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

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  returns: SaleReturn[];
  quotations: Quotation[];
  heldCarts: HeldCart[];
  setHeldCarts: React.Dispatch<React.SetStateAction<HeldCart[]>>;

  // Print state
  printableReceipt: { type: 'sale' | 'due' | 'quotation'; data: any } | null;
  setPrintableReceipt: (receipt: { type: 'sale' | 'due' | 'quotation'; data: any } | null) => void;

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
  archiveProduct: (product_id: string) => void;

  saveCustomer: (customer: Customer) => Customer;
  logDueAlert: (customerId: string, channel: DueAlertChannel, notes?: string) => void;
  saveSupplier: (supplier: Supplier) => Supplier;
  saveUser: (user: User, plainPinToSet?: string) => Promise<void>;
  deleteUser: (userId: string) => void;
  saveCategory: (category: Category) => void;

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
  const [store, setStore] = useState<StoreSettings>(DBStorage.getStore());
  const [users, setUsers] = useState<User[]>(DBStorage.getUsers());
  const [activeUser, setActiveUser] = useState<User>(DEFAULT_BOOT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const setActiveTab = (tab: string) => {
    if (isAuthenticated && !canAccessTab(activeUser, tab)) {
      setActiveTabState('pos');
      return;
    }
    setActiveTabState(tab);
  };

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
  const [returns, setReturns] = useState<SaleReturn[]>(DBStorage.getReturns());
  const [quotations, setQuotations] = useState<Quotation[]>(DBStorage.getQuotations());
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

  const [printableReceipt, setPrintableReceipt] = useState<{
    type: 'sale' | 'due' | 'quotation';
    data: any;
  } | null>(null);

  const refreshData = () => {
    setStore(DBStorage.getStore());
    setUsers(DBStorage.getUsers());
    setProducts(DBStorage.getProducts());
    setCategories(DBStorage.getCategories());
    setCustomers(DBStorage.getCustomers());
    setSuppliers(DBStorage.getSuppliers());
    setSales(DBStorage.getSales());
    setCustomerDues(DBStorage.getCustomerDues());
    setSupplierDues(DBStorage.getSupplierDues());
    setPurchases(DBStorage.getPurchases());
    setExpenses(DBStorage.getExpenses());
    setRecurringExpenses(DBStorage.getRecurringExpenses());
    setCashSessions(DBStorage.getCashSessions());
    setAuditLogs(DBStorage.getAuditLogs());
    setStockTransactions(DBStorage.getStockTransactions());
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
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const todaysSales = sales.filter((s) => s.date === new Date().toISOString().slice(0, 10));
    const nextSeq = (todaysSales.length + 1).toString().padStart(4, '0');
    return `INV-${todayStr}-${nextSeq}`;
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
          const newStock = Math.max(0, oldStock - item.quantity);
          prod.variants[vIndex] = {
            ...variant,
            stock_quantity: newStock,
            updated_at: now.toISOString(),
          };

          newStockTxs.push({
            id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            product_name: prod.name,
            variant_id: variant.id,
            variant_name: variant.variant_name,
            transaction_type: 'sale',
            quantity_change: -item.quantity,
            previous_stock: oldStock,
            new_stock: newStock,
            reference_no: invoiceNo,
            user_id: activeUser.id,
            user_name: activeUser.name,
            reason: `POS Sale #${invoiceNo}`,
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
    const newDue = Math.max(0, oldDue - paid_amount);

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
    const newDue = Math.max(0, oldDue - paid_amount);

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
          const newStock = oldStock + item.quantity;

          prod.variants[vIndex] = {
            ...variant,
            stock_quantity: newStock,
            purchase_price: item.purchase_price,
            updated_at: now.toISOString(),
          };

          newStockTxs.push({
            id: `st_pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            product_name: prod.name,
            variant_id: variant.id,
            variant_name: variant.variant_name,
            transaction_type: 'purchase',
            quantity_change: item.quantity,
            previous_stock: oldStock,
            new_stock: newStock,
            reference_no: purNo,
            user_id: activeUser.id,
            user_name: activeUser.name,
            reason: `Purchase Entry #${purNo} from ${purchaseData.supplier_name}`,
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
          const newStock = oldStock + rItem.quantity;

          prod.variants[vIndex] = {
            ...variant,
            stock_quantity: newStock,
            updated_at: now.toISOString(),
          };

          newStockTxs.push({
            id: `st_ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            product_name: prod.name,
            variant_id: variant.id,
            variant_name: variant.variant_name,
            transaction_type: 'customer_return',
            quantity_change: rItem.quantity,
            previous_stock: oldStock,
            new_stock: newStock,
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
          const newStock = oldStock + item.quantity;

          prod.variants[vIndex] = {
            ...variant,
            stock_quantity: newStock,
            updated_at: now.toISOString(),
          };

          newStockTxs.push({
            id: `st_void_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            product_id: prod.id,
            product_name: prod.name,
            variant_id: variant.id,
            variant_name: variant.variant_name,
            transaction_type: 'customer_return',
            quantity_change: item.quantity,
            previous_stock: oldStock,
            new_stock: newStock,
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
        returns,
        quotations,
        heldCarts,
        setHeldCarts,
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
        archiveProduct,
        saveCustomer,
        logDueAlert,
        saveSupplier,
        saveUser,
        deleteUser,
        saveCategory,
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
