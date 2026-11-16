import {
  StoreSettings,
  User,
  Category,
  Product,
  Customer,
  CustomerDueTransaction,
  Supplier,
  SupplierDueTransaction,
  Purchase,
  PurchaseReturn,
  Sale,
  Expense,
  RecurringExpense,
  CashSession,
  AuditLog,
  StockTransaction,
  StockAdjustmentRecord,
  StockTransfer,
  SaleReturn,
  Quotation,
  DatabaseBackup,
  Brand,
  GenericItem,
  PharmaCompany,
  UnitDefinition,
  AccountIncome,
  CashFlowEntry,
  FinancialAccount,
  FinancialAccountTx,
  Employee,
  AttendanceRecord,
  SalaryPayment,
} from '../types';

import {
  INITIAL_STORE,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_CUSTOMER_DUES,
  INITIAL_SUPPLIERS,
  INITIAL_SUPPLIER_DUES,
  INITIAL_PURCHASES,
  INITIAL_SALES,
  INITIAL_EXPENSES,
  INITIAL_RECURRING_EXPENSES,
  INITIAL_CASH_SESSION,
  INITIAL_AUDIT_LOGS,
  INITIAL_STOCK_TRANSACTIONS,
  INITIAL_BRANDS,
  INITIAL_GENERICS,
  INITIAL_PHARMA_COMPANIES,
  INITIAL_UNITS,
  INITIAL_FINANCIAL_ACCOUNTS,
  INITIAL_EMPLOYEES,
} from './initialData';

import {
  decryptStringAesGcm,
  encryptStringAesGcm,
  getOrCreateAesKey,
  getOrCreateHmacKey,
  getPermissionsForRole,
  hashPin,
  isEncryptedBlob,
  isHashedPin,
  signUsersDirectory,
} from '../utils/security';

const KEYS = {
  STORE: 'pos_store_settings',
  USERS: 'pos_users',
  CATEGORIES: 'pos_categories',
  BRANDS: 'pos_brands',
  GENERICS: 'pos_generics',
  PHARMA_COMPANIES: 'pos_pharma_companies',
  UNITS: 'pos_units',
  PRODUCTS: 'pos_products',
  CUSTOMERS: 'pos_customers',
  CUSTOMER_DUES: 'pos_customer_dues',
  SUPPLIERS: 'pos_suppliers',
  SUPPLIER_DUES: 'pos_supplier_dues',
  PURCHASES: 'pos_purchases',
  PURCHASE_RETURNS: 'pos_purchase_returns',
  SALES: 'pos_sales',
  EXPENSES: 'pos_expenses',
  RECURRING_EXPENSES: 'pos_recurring_expenses',
  INCOMES: 'pos_incomes',
  CASH_FLOWS: 'pos_cash_flows',
  FINANCIAL_ACCOUNTS: 'pos_financial_accounts',
  FINANCIAL_ACCOUNT_TXS: 'pos_financial_account_txs',
  EMPLOYEES: 'pos_employees',
  ATTENDANCE: 'pos_attendance',
  SALARIES: 'pos_salaries',
  CASH_SESSIONS: 'pos_cash_sessions',
  AUDIT_LOGS: 'pos_audit_logs',
  STOCK_TRANSACTIONS: 'pos_stock_transactions',
  STOCK_ADJUSTMENTS: 'pos_stock_adjustments',
  STOCK_TRANSFERS: 'pos_stock_transfers',
  RETURNS: 'pos_returns',
  QUOTATIONS: 'pos_quotations',
  BACKUP_HISTORY: 'pos_backup_snapshots',
};

const memoryCache = new Map<string, unknown>();
const writeQueues = new Map<string, Promise<void>>();
let storageInitialized = false;

async function persistEncryptedKey(key: string, value: unknown): Promise<void> {
  const prev = writeQueues.get(key) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(async () => {
      try {
        const serialized = JSON.stringify(value);
        const encrypted = await encryptStringAesGcm(serialized);
        localStorage.setItem(key, encrypted);
      } catch (err) {
        console.error(`Failed to encrypt/save ${key}:`, err);
      }
    });
  writeQueues.set(key, next);
  return next;
}

async function hydrateKey<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      memoryCache.set(key, defaultValue);
      await persistEncryptedKey(key, defaultValue);
      return defaultValue;
    }

    if (isEncryptedBlob(raw)) {
      const decrypted = await decryptStringAesGcm(raw);
      if (decrypted) {
        const parsed = JSON.parse(decrypted) as T;
        memoryCache.set(key, parsed);
        return parsed;
      }
      console.warn(`Could not decrypt ${key}; resetting to safe default.`);
      memoryCache.set(key, defaultValue);
      await persistEncryptedKey(key, defaultValue);
      return defaultValue;
    }

    // Migrate legacy plaintext JSON to AES-256-GCM ciphertext
    const parsed = JSON.parse(raw) as T;
    memoryCache.set(key, parsed);
    await persistEncryptedKey(key, parsed);
    return parsed;
  } catch (err) {
    console.error(`Error hydrating ${key}:`, err);
    memoryCache.set(key, defaultValue);
    return defaultValue;
  }
}

function getItem<T>(key: string, defaultValue: T): T {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      memoryCache.set(key, defaultValue);
      void persistEncryptedKey(key, defaultValue);
      return defaultValue;
    }
    if (!isEncryptedBlob(raw)) {
      const parsed = JSON.parse(raw) as T;
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch {
    // ignore
  }
  return defaultValue;
}

function setItem<T>(key: string, value: T): void {
  memoryCache.set(key, value);
  void persistEncryptedKey(key, value);
}

async function normalizeAndHashUsers(rawUsers: User[]): Promise<{ users: User[]; changed: boolean }> {
  let changed = false;
  const migrated: User[] = [];

  for (const u of rawUsers) {
    let next = { ...u };

    if (next.id === 'user_demo' || next.username === 'demo') {
      next = {
        ...next,
        role: 'visitor',
        permissions: getPermissionsForRole('visitor'),
      };
    } else if (next.id === 'user_admin' || next.username === 'admin' || (next.name && next.name.includes('Rafiqul'))) {
      next = {
        ...next,
        name: 'Md. Raihan (Owner)',
        role: 'admin',
        permissions: getPermissionsForRole('admin'),
      };
    }

    if (!Array.isArray(next.permissions) || next.permissions.length === 0) {
      next.permissions = getPermissionsForRole(next.role);
      changed = true;
    }

    if (!isHashedPin(next.pin)) {
      const rawPin = String(next.pin || '1234');
      if (next.id === 'user_admin' && rawPin === '1234') {
        next.must_change_pin = true;
      }
      next.pin = await hashPin(rawPin);
      changed = true;
    }

    migrated.push(next);
  }

  return { users: migrated, changed };
}

export class DBStorage {
  static isInitialized(): boolean {
    return storageInitialized;
  }

  // Asynchronous secure boot: initializes Web Crypto keys, decrypts vault, and hashes any plaintext PINs
  static async initAsync(): Promise<void> {
    // Remove legacy insecure localStorage session ID if present
    try {
      localStorage.removeItem('pos_active_session_user_id');
    } catch {
      // ignore
    }

    await getOrCreateAesKey();
    await getOrCreateHmacKey();

    await Promise.all([
      hydrateKey(KEYS.STORE, INITIAL_STORE),
      hydrateKey(KEYS.USERS, INITIAL_USERS),
      hydrateKey(KEYS.CATEGORIES, INITIAL_CATEGORIES),
      hydrateKey(KEYS.BRANDS, INITIAL_BRANDS),
      hydrateKey(KEYS.GENERICS, INITIAL_GENERICS),
      hydrateKey(KEYS.PHARMA_COMPANIES, INITIAL_PHARMA_COMPANIES),
      hydrateKey(KEYS.UNITS, INITIAL_UNITS),
      hydrateKey(KEYS.PRODUCTS, INITIAL_PRODUCTS),
      hydrateKey(KEYS.CUSTOMERS, INITIAL_CUSTOMERS),
      hydrateKey(KEYS.CUSTOMER_DUES, INITIAL_CUSTOMER_DUES),
      hydrateKey(KEYS.SUPPLIERS, INITIAL_SUPPLIERS),
      hydrateKey(KEYS.SUPPLIER_DUES, INITIAL_SUPPLIER_DUES),
      hydrateKey(KEYS.PURCHASES, INITIAL_PURCHASES),
      hydrateKey(KEYS.PURCHASE_RETURNS, [] as PurchaseReturn[]),
      hydrateKey(KEYS.SALES, INITIAL_SALES),
      hydrateKey(KEYS.EXPENSES, INITIAL_EXPENSES),
      hydrateKey(KEYS.RECURRING_EXPENSES, INITIAL_RECURRING_EXPENSES),
      hydrateKey(KEYS.INCOMES, [] as AccountIncome[]),
      hydrateKey(KEYS.CASH_FLOWS, [] as CashFlowEntry[]),
      hydrateKey(KEYS.FINANCIAL_ACCOUNTS, INITIAL_FINANCIAL_ACCOUNTS),
      hydrateKey(KEYS.FINANCIAL_ACCOUNT_TXS, [] as FinancialAccountTx[]),
      hydrateKey(KEYS.EMPLOYEES, INITIAL_EMPLOYEES),
      hydrateKey(KEYS.ATTENDANCE, [] as AttendanceRecord[]),
      hydrateKey(KEYS.SALARIES, [] as SalaryPayment[]),
      hydrateKey(KEYS.CASH_SESSIONS, [INITIAL_CASH_SESSION]),
      hydrateKey(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS),
      hydrateKey(KEYS.STOCK_TRANSACTIONS, INITIAL_STOCK_TRANSACTIONS),
      hydrateKey(KEYS.STOCK_ADJUSTMENTS, [] as StockAdjustmentRecord[]),
      hydrateKey(KEYS.STOCK_TRANSFERS, [] as StockTransfer[]),
      hydrateKey(KEYS.RETURNS, [] as SaleReturn[]),
      hydrateKey(KEYS.QUOTATIONS, [] as Quotation[]),
      hydrateKey(KEYS.BACKUP_HISTORY, [] as { id: string; timestamp: string; trigger: string; data: DatabaseBackup }[]),
    ]);

    // Ensure all stored users have PBKDF2-SHA256 PIN hashes & valid directory MAC
    const currentUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    const { users: normalizedUsers, changed } = await normalizeAndHashUsers(currentUsers);
    memoryCache.set(KEYS.USERS, normalizedUsers);
    if (changed) {
      await persistEncryptedKey(KEYS.USERS, normalizedUsers);
    }
    await signUsersDirectory(normalizedUsers);

    storageInitialized = true;
  }

  // Sync fallback init
  static init(): void {
    if (!storageInitialized) {
      void this.initAsync();
    }
  }

  // Store Settings
  static getStore(): StoreSettings {
    const s = getItem(KEYS.STORE, INITIAL_STORE);
    let updated = false;
    const next: StoreSettings = {
      ...INITIAL_STORE,
      ...s,
      enabled_payment_methods: {
        ...INITIAL_STORE.enabled_payment_methods!,
        ...(s.enabled_payment_methods || {}),
      },
    };
    if (next.seller_name && next.seller_name.includes('Rafiqul')) {
      next.seller_name = 'Md. Raihan (Owner)';
      updated = true;
    }
    if (next.demo_mode_enabled === undefined) {
      next.demo_mode_enabled = true;
      updated = true;
    }
    if (next.module_medicine_enabled === undefined) {
      next.module_medicine_enabled = true;
      updated = true;
    }
    if (next.module_general_product_enabled === undefined) {
      next.module_general_product_enabled = true;
      updated = true;
    }
    if (next.business_mode === undefined) {
      if (next.module_medicine_enabled === false && next.module_general_product_enabled !== false) {
        next.business_mode = 'general_shop';
      } else if (next.module_medicine_enabled !== false && next.module_general_product_enabled === false) {
        next.business_mode = 'pharmacy';
      } else {
        next.business_mode = 'super_shop';
      }
      updated = true;
    }
    if (next.auto_backup_enabled === undefined) {
      next.auto_backup_enabled = true;
      updated = true;
    }
    if (next.auto_backup_interval_hours === undefined) {
      next.auto_backup_interval_hours = 24;
      updated = true;
    }
    if (!next.store_mobile && next.store_phone) {
      next.store_mobile = next.store_phone;
    }
    if (!next.receipt_footer_note && next.receipt_footer) {
      next.receipt_footer_note = next.receipt_footer;
    }
    if (updated) {
      this.saveStore(next);
    }
    return next;
  }

  static saveStore(store: StoreSettings): void {
    setItem(KEYS.STORE, store);
  }

  // Users
  static getUsers(): User[] {
    return getItem(KEYS.USERS, INITIAL_USERS);
  }

  static saveUsers(users: User[]): void {
    setItem(KEYS.USERS, users);
    void signUsersDirectory(users);
  }

  // Categories
  static getCategories(): Category[] {
    const list = getItem<Category[]>(KEYS.CATEGORIES, INITIAL_CATEGORIES);
    if (!list.some((c) => c.id === 'cat_general' || c.name.toLowerCase().includes('general'))) {
      const generalCat: Category = {
        id: 'cat_general',
        name: 'General Goods (সাধারণ)',
        code: 'GEN',
        active: true,
      };
      const updatedList = [generalCat, ...list];
      setItem(KEYS.CATEGORIES, updatedList);
      return updatedList;
    }
    return list;
  }

  static saveCategories(categories: Category[]): void {
    setItem(KEYS.CATEGORIES, categories);
  }

  // Products
  static getProducts(): Product[] {
    const list = getItem<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    let updated = false;
    const result = list.map((p) => {
      if (!p.image) {
        const init = INITIAL_PRODUCTS.find((ip) => ip.id === p.id);
        if (init?.image) {
          updated = true;
          return { ...p, image: init.image };
        }
      }
      return p;
    });
    if (updated) {
      setItem(KEYS.PRODUCTS, result);
    }
    return result;
  }

  static saveProducts(products: Product[]): void {
    setItem(KEYS.PRODUCTS, products);
  }

  // Customers
  static getCustomers(): Customer[] {
    return getItem(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  static saveCustomers(customers: Customer[]): void {
    setItem(KEYS.CUSTOMERS, customers);
  }

  // Customer Dues
  static getCustomerDues(): CustomerDueTransaction[] {
    return getItem(KEYS.CUSTOMER_DUES, INITIAL_CUSTOMER_DUES);
  }

  static saveCustomerDues(dues: CustomerDueTransaction[]): void {
    setItem(KEYS.CUSTOMER_DUES, dues);
  }

  // Suppliers
  static getSuppliers(): Supplier[] {
    return getItem(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }

  static saveSuppliers(suppliers: Supplier[]): void {
    setItem(KEYS.SUPPLIERS, suppliers);
  }

  // Supplier Dues
  static getSupplierDues(): SupplierDueTransaction[] {
    return getItem(KEYS.SUPPLIER_DUES, INITIAL_SUPPLIER_DUES);
  }

  static saveSupplierDues(dues: SupplierDueTransaction[]): void {
    setItem(KEYS.SUPPLIER_DUES, dues);
  }

  // Purchases
  static getPurchases(): Purchase[] {
    return getItem(KEYS.PURCHASES, INITIAL_PURCHASES);
  }

  static savePurchases(purchases: Purchase[]): void {
    setItem(KEYS.PURCHASES, purchases);
  }

  // Sales
  static getSales(): Sale[] {
    const sList = getItem(KEYS.SALES, INITIAL_SALES);
    return sList.map((s) => {
      if (s.seller_name && s.seller_name.includes('Rafiqul')) {
        return { ...s, seller_name: 'Md. Raihan (Owner)' };
      }
      return s;
    });
  }

  static saveSales(sales: Sale[]): void {
    setItem(KEYS.SALES, sales);
  }

  // Stock Transactions
  static getStockTransactions(): StockTransaction[] {
    return getItem(KEYS.STOCK_TRANSACTIONS, INITIAL_STOCK_TRANSACTIONS);
  }

  static saveStockTransactions(txs: StockTransaction[]): void {
    setItem(KEYS.STOCK_TRANSACTIONS, txs);
  }

  // Returns
  static getReturns(): SaleReturn[] {
    return getItem(KEYS.RETURNS, []);
  }

  static saveReturns(returns: SaleReturn[]): void {
    setItem(KEYS.RETURNS, returns);
  }

  // Expenses
  static getExpenses(): Expense[] {
    return getItem(KEYS.EXPENSES, INITIAL_EXPENSES);
  }

  static saveExpenses(expenses: Expense[]): void {
    setItem(KEYS.EXPENSES, expenses);
  }

  // Recurring Expenses
  static getRecurringExpenses(): RecurringExpense[] {
    return getItem(KEYS.RECURRING_EXPENSES, INITIAL_RECURRING_EXPENSES);
  }

  static saveRecurringExpenses(exp: RecurringExpense[]): void {
    setItem(KEYS.RECURRING_EXPENSES, exp);
  }

  // Cash Sessions
  static getCashSessions(): CashSession[] {
    const sessions = getItem(KEYS.CASH_SESSIONS, [INITIAL_CASH_SESSION]);
    return sessions.map((cs) => {
      const updated = { ...cs };
      if (updated.cashier_name && updated.cashier_name.includes('Rafiqul')) {
        updated.cashier_name = 'Md. Raihan (Owner)';
      }
      if (updated.id === 'cs_today' && updated.opening_cash === 5000) {
        updated.opening_cash = 0;
        updated.expected_closing_cash = 0;
      }
      return updated;
    });
  }

  static saveCashSessions(sessions: CashSession[]): void {
    setItem(KEYS.CASH_SESSIONS, sessions);
  }

  // Quotations
  static getQuotations(): Quotation[] {
    return getItem(KEYS.QUOTATIONS, []);
  }

  static saveQuotations(q: Quotation[]): void {
    setItem(KEYS.QUOTATIONS, q);
  }

  // Audit Logs
  static getAuditLogs(): AuditLog[] {
    const logs = getItem(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    return logs.map((l) => {
      if (l.user_name && l.user_name.includes('Rafiqul')) {
        return { ...l, user_name: 'Md. Raihan (Owner)' };
      }
      return l;
    });
  }

  static saveAuditLogs(logs: AuditLog[]): void {
    setItem(KEYS.AUDIT_LOGS, logs);
  }

  // Brands
  static getBrands(): Brand[] {
    return getItem(KEYS.BRANDS, INITIAL_BRANDS);
  }
  static saveBrands(brands: Brand[]): void {
    setItem(KEYS.BRANDS, brands);
  }

  // Medicine Generics
  static getGenerics(): GenericItem[] {
    return getItem(KEYS.GENERICS, INITIAL_GENERICS);
  }
  static saveGenerics(generics: GenericItem[]): void {
    setItem(KEYS.GENERICS, generics);
  }

  // Pharma Companies
  static getPharmaCompanies(): PharmaCompany[] {
    return getItem(KEYS.PHARMA_COMPANIES, INITIAL_PHARMA_COMPANIES);
  }
  static savePharmaCompanies(companies: PharmaCompany[]): void {
    setItem(KEYS.PHARMA_COMPANIES, companies);
  }

  // Units
  static getUnits(): UnitDefinition[] {
    return getItem(KEYS.UNITS, INITIAL_UNITS);
  }
  static saveUnits(units: UnitDefinition[]): void {
    setItem(KEYS.UNITS, units);
  }

  // Purchase Returns
  static getPurchaseReturns(): PurchaseReturn[] {
    return getItem(KEYS.PURCHASE_RETURNS, []);
  }
  static savePurchaseReturns(returnsList: PurchaseReturn[]): void {
    setItem(KEYS.PURCHASE_RETURNS, returnsList);
  }

  // Stock Adjustments & Personal Use
  static getStockAdjustments(): StockAdjustmentRecord[] {
    return getItem(KEYS.STOCK_ADJUSTMENTS, []);
  }
  static saveStockAdjustments(adjustments: StockAdjustmentRecord[]): void {
    setItem(KEYS.STOCK_ADJUSTMENTS, adjustments);
  }

  // Stock Transfers
  static getStockTransfers(): StockTransfer[] {
    return getItem(KEYS.STOCK_TRANSFERS, []);
  }
  static saveStockTransfers(transfers: StockTransfer[]): void {
    setItem(KEYS.STOCK_TRANSFERS, transfers);
  }

  // Account Incomes
  static getIncomes(): AccountIncome[] {
    return getItem(KEYS.INCOMES, []);
  }
  static saveIncomes(incomes: AccountIncome[]): void {
    setItem(KEYS.INCOMES, incomes);
  }

  // Cash In / Out Entries
  static getCashFlows(): CashFlowEntry[] {
    return getItem(KEYS.CASH_FLOWS, []);
  }
  static saveCashFlows(flows: CashFlowEntry[]): void {
    setItem(KEYS.CASH_FLOWS, flows);
  }

  // Bank & Mobile Banking Accounts
  static getFinancialAccounts(): FinancialAccount[] {
    return getItem(KEYS.FINANCIAL_ACCOUNTS, INITIAL_FINANCIAL_ACCOUNTS);
  }
  static saveFinancialAccounts(accounts: FinancialAccount[]): void {
    setItem(KEYS.FINANCIAL_ACCOUNTS, accounts);
  }

  static getFinancialAccountTxs(): FinancialAccountTx[] {
    return getItem(KEYS.FINANCIAL_ACCOUNT_TXS, []);
  }
  static saveFinancialAccountTxs(txs: FinancialAccountTx[]): void {
    setItem(KEYS.FINANCIAL_ACCOUNT_TXS, txs);
  }

  // Employees, Attendance & Salaries
  static getEmployees(): Employee[] {
    return getItem(KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
  }
  static saveEmployees(employees: Employee[]): void {
    setItem(KEYS.EMPLOYEES, employees);
  }

  static getAttendance(): AttendanceRecord[] {
    return getItem(KEYS.ATTENDANCE, []);
  }
  static saveAttendance(records: AttendanceRecord[]): void {
    setItem(KEYS.ATTENDANCE, records);
  }

  static getSalaries(): SalaryPayment[] {
    return getItem(KEYS.SALARIES, []);
  }
  static saveSalaries(salaries: SalaryPayment[]): void {
    setItem(KEYS.SALARIES, salaries);
  }

  // Export Complete Backup JSON Snapshot (PINs are PBKDF2-hashed; never plaintext)
  static exportFullBackup(): DatabaseBackup {
    return {
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      store: this.getStore(),
      users: this.getUsers(),
      categories: this.getCategories(),
      brands: this.getBrands(),
      generics: this.getGenerics(),
      pharma_companies: this.getPharmaCompanies(),
      units: this.getUnits(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      customer_dues: this.getCustomerDues(),
      suppliers: this.getSuppliers(),
      supplier_dues: this.getSupplierDues(),
      purchases: this.getPurchases(),
      purchase_returns: this.getPurchaseReturns(),
      sales: this.getSales(),
      stock_transactions: this.getStockTransactions(),
      stock_adjustments: this.getStockAdjustments(),
      stock_transfers: this.getStockTransfers(),
      returns: this.getReturns(),
      expenses: this.getExpenses(),
      recurring_expenses: this.getRecurringExpenses(),
      incomes: this.getIncomes(),
      cash_flows: this.getCashFlows(),
      financial_accounts: this.getFinancialAccounts(),
      financial_account_txs: this.getFinancialAccountTxs(),
      employees: this.getEmployees(),
      attendance: this.getAttendance(),
      salaries: this.getSalaries(),
      cash_sessions: this.getCashSessions(),
      quotations: this.getQuotations(),
      audit_logs: this.getAuditLogs(),
    };
  }

  // Automatic Local Backup Snapshots (keeps up to 5 latest encrypted snapshots)
  static getAutoBackupSnapshots(): {
    id: string;
    timestamp: string;
    trigger: string;
    data: DatabaseBackup;
  }[] {
    return getItem(KEYS.BACKUP_HISTORY, []);
  }

  static saveAutoBackupSnapshot(trigger: string = 'scheduled'): {
    id: string;
    timestamp: string;
    trigger: string;
    data: DatabaseBackup;
  } {
    const snapshotData = this.exportFullBackup();
    const entry = {
      id: `autobak_${Date.now()}`,
      timestamp: snapshotData.timestamp,
      trigger,
      data: snapshotData,
    };
    const existing = this.getAutoBackupSnapshots();
    const nextList = [entry, ...existing].slice(0, 5);
    setItem(KEYS.BACKUP_HISTORY, nextList);

    const currentStore = this.getStore();
    if (currentStore.last_auto_backup_at !== entry.timestamp) {
      this.saveStore({
        ...currentStore,
        last_auto_backup_at: entry.timestamp,
      });
    }
    return entry;
  }

  // Restore Complete Backup JSON Snapshot (automatically hashes any legacy plaintext PINs)
  static restoreFullBackup(backup: DatabaseBackup): boolean {
    try {
      if (!backup || !backup.store || !backup.products) {
        throw new Error('Invalid backup schema');
      }
      this.saveStore(backup.store);
      if (backup.users) {
        void normalizeAndHashUsers(backup.users).then(({ users }) => {
          this.saveUsers(users);
        });
      }
      if (backup.categories) this.saveCategories(backup.categories);
      if (backup.brands) this.saveBrands(backup.brands);
      if (backup.generics) this.saveGenerics(backup.generics);
      if (backup.pharma_companies) this.savePharmaCompanies(backup.pharma_companies);
      if (backup.units) this.saveUnits(backup.units);
      if (backup.products) this.saveProducts(backup.products);
      if (backup.customers) this.saveCustomers(backup.customers);
      if (backup.customer_dues) this.saveCustomerDues(backup.customer_dues);
      if (backup.suppliers) this.saveSuppliers(backup.suppliers);
      if (backup.supplier_dues) this.saveSupplierDues(backup.supplier_dues);
      if (backup.purchases) this.savePurchases(backup.purchases);
      if (backup.purchase_returns) this.savePurchaseReturns(backup.purchase_returns);
      if (backup.sales) this.saveSales(backup.sales);
      if (backup.stock_transactions) this.saveStockTransactions(backup.stock_transactions);
      if (backup.stock_adjustments) this.saveStockAdjustments(backup.stock_adjustments);
      if (backup.stock_transfers) this.saveStockTransfers(backup.stock_transfers);
      if (backup.returns) this.saveReturns(backup.returns);
      if (backup.expenses) this.saveExpenses(backup.expenses);
      if (backup.recurring_expenses) this.saveRecurringExpenses(backup.recurring_expenses);
      if (backup.incomes) this.saveIncomes(backup.incomes);
      if (backup.cash_flows) this.saveCashFlows(backup.cash_flows);
      if (backup.financial_accounts) this.saveFinancialAccounts(backup.financial_accounts);
      if (backup.financial_account_txs) this.saveFinancialAccountTxs(backup.financial_account_txs);
      if (backup.employees) this.saveEmployees(backup.employees);
      if (backup.attendance) this.saveAttendance(backup.attendance);
      if (backup.salaries) this.saveSalaries(backup.salaries);
      if (backup.cash_sessions) this.saveCashSessions(backup.cash_sessions);
      if (backup.quotations) this.saveQuotations(backup.quotations);
      if (backup.audit_logs) this.saveAuditLogs(backup.audit_logs);
      return true;
    } catch (err) {
      console.error('Failed to restore backup:', err);
      return false;
    }
  }

  // Reset to Factory Demo Seeds (preserves brute-force lockout counters)
  static async resetToSeedData(): Promise<void> {
    Object.values(KEYS).forEach((k) => {
      localStorage.removeItem(k);
      memoryCache.delete(k);
    });
    storageInitialized = false;
    await this.initAsync();
  }

  // Clear Transaction & Sales History
  static clearTransactionHistory(userId: string = 'admin', userName: string = 'Admin'): void {
    setItem(KEYS.SALES, []);
    setItem(KEYS.CUSTOMER_DUES, []);
    setItem(KEYS.SUPPLIER_DUES, []);
    setItem(KEYS.PURCHASES, []);
    setItem(KEYS.PURCHASE_RETURNS, []);
    setItem(KEYS.STOCK_TRANSACTIONS, []);
    setItem(KEYS.STOCK_ADJUSTMENTS, []);
    setItem(KEYS.STOCK_TRANSFERS, []);
    setItem(KEYS.RETURNS, []);
    setItem(KEYS.EXPENSES, []);
    setItem(KEYS.INCOMES, []);
    setItem(KEYS.CASH_FLOWS, []);
    setItem(KEYS.FINANCIAL_ACCOUNT_TXS, []);
    setItem(KEYS.ATTENDANCE, []);
    setItem(KEYS.SALARIES, []);
    setItem(KEYS.QUOTATIONS, []);
    setItem(KEYS.CASH_SESSIONS, [INITIAL_CASH_SESSION]);

    const customers = this.getCustomers().map((c) => ({
      ...c,
      total_due_amount: 0,
      total_purchase_amount: 0,
      updated_at: new Date().toISOString(),
    }));
    this.saveCustomers(customers);

    const suppliers = this.getSuppliers().map((s) => ({
      ...s,
      total_due: 0,
      total_purchases: 0,
      updated_at: new Date().toISOString(),
    }));
    this.saveSuppliers(suppliers);

    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `audit_clear_${Date.now()}`,
      user_id: userId,
      user_name: userName,
      action: 'CLEAR_TRANSACTION_HISTORY',
      module: 'System / Database',
      description: 'All sales history, purchases, customer dues, supplier dues, expenses, returns, accounts transactions, and cash sessions cleared.',
      created_at: new Date().toISOString(),
      branch_id: this.getStore().branch_id || 'main',
    };
    setItem(KEYS.AUDIT_LOGS, [newLog, ...logs.slice(0, 50)]);
  }

  // Wipe All Data (Fresh Empty Store Start)
  static wipeAllData(userId: string = 'admin', userName: string = 'Admin'): void {
    const adminUser = this.getUsers().find((u) => u.role === 'admin') || INITIAL_USERS[1];
    const store = this.getStore();

    setItem(KEYS.PRODUCTS, []);
    setItem(KEYS.CATEGORIES, []);
    setItem(KEYS.BRANDS, []);
    setItem(KEYS.GENERICS, []);
    setItem(KEYS.PHARMA_COMPANIES, []);
    setItem(KEYS.CUSTOMERS, []);
    setItem(KEYS.CUSTOMER_DUES, []);
    setItem(KEYS.SUPPLIERS, []);
    setItem(KEYS.SUPPLIER_DUES, []);
    setItem(KEYS.PURCHASES, []);
    setItem(KEYS.PURCHASE_RETURNS, []);
    setItem(KEYS.SALES, []);
    setItem(KEYS.STOCK_TRANSACTIONS, []);
    setItem(KEYS.STOCK_ADJUSTMENTS, []);
    setItem(KEYS.STOCK_TRANSFERS, []);
    setItem(KEYS.RETURNS, []);
    setItem(KEYS.EXPENSES, []);
    setItem(KEYS.RECURRING_EXPENSES, []);
    setItem(KEYS.INCOMES, []);
    setItem(KEYS.CASH_FLOWS, []);
    setItem(KEYS.FINANCIAL_ACCOUNTS, []);
    setItem(KEYS.FINANCIAL_ACCOUNT_TXS, []);
    setItem(KEYS.EMPLOYEES, []);
    setItem(KEYS.ATTENDANCE, []);
    setItem(KEYS.SALARIES, []);
    setItem(KEYS.QUOTATIONS, []);
    setItem(KEYS.CASH_SESSIONS, [INITIAL_CASH_SESSION]);
    this.saveUsers([adminUser]);

    const newLog: AuditLog = {
      id: `audit_wipe_${Date.now()}`,
      user_id: userId,
      user_name: userName,
      action: 'FULL_STORE_WIPE',
      module: 'System / Database',
      description: 'Store completely wiped to fresh state. Catalog, transactions, accounts, employees, and customers reset for clean production launch.',
      created_at: new Date().toISOString(),
      branch_id: store?.branch_id || 'main',
    };
    setItem(KEYS.AUDIT_LOGS, [newLog]);
  }
}
