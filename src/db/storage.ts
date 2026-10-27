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
  Sale,
  Expense,
  RecurringExpense,
  CashSession,
  AuditLog,
  StockTransaction,
  SaleReturn,
  Quotation,
  DatabaseBackup,
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
} from './initialData';

const KEYS = {
  STORE: 'pos_store_settings',
  USERS: 'pos_users',
  CATEGORIES: 'pos_categories',
  PRODUCTS: 'pos_products',
  CUSTOMERS: 'pos_customers',
  CUSTOMER_DUES: 'pos_customer_dues',
  SUPPLIERS: 'pos_suppliers',
  SUPPLIER_DUES: 'pos_supplier_dues',
  PURCHASES: 'pos_purchases',
  SALES: 'pos_sales',
  EXPENSES: 'pos_expenses',
  RECURRING_EXPENSES: 'pos_recurring_expenses',
  CASH_SESSIONS: 'pos_cash_sessions',
  AUDIT_LOGS: 'pos_audit_logs',
  STOCK_TRANSACTIONS: 'pos_stock_transactions',
  RETURNS: 'pos_returns',
  QUOTATIONS: 'pos_quotations',
  BACKUP_HISTORY: 'pos_backup_snapshots',
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

export class DBStorage {
  // Initialize storage with seeds if empty
  static init(): void {
    if (!localStorage.getItem(KEYS.STORE)) {
      setItem(KEYS.STORE, INITIAL_STORE);
      setItem(KEYS.USERS, INITIAL_USERS);
      setItem(KEYS.CATEGORIES, INITIAL_CATEGORIES);
      setItem(KEYS.PRODUCTS, INITIAL_PRODUCTS);
      setItem(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
      setItem(KEYS.CUSTOMER_DUES, INITIAL_CUSTOMER_DUES);
      setItem(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
      setItem(KEYS.SUPPLIER_DUES, INITIAL_SUPPLIER_DUES);
      setItem(KEYS.PURCHASES, INITIAL_PURCHASES);
      setItem(KEYS.SALES, INITIAL_SALES);
      setItem(KEYS.EXPENSES, INITIAL_EXPENSES);
      setItem(KEYS.RECURRING_EXPENSES, INITIAL_RECURRING_EXPENSES);
      setItem(KEYS.CASH_SESSIONS, [INITIAL_CASH_SESSION]);
      setItem(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
      setItem(KEYS.STOCK_TRANSACTIONS, INITIAL_STOCK_TRANSACTIONS);
      setItem(KEYS.RETURNS, []);
      setItem(KEYS.QUOTATIONS, []);
    }
  }

  // Store Settings
  static getStore(): StoreSettings {
    return getItem(KEYS.STORE, INITIAL_STORE);
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
  }

  // Categories
  static getCategories(): Category[] {
    return getItem(KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }
  static saveCategories(categories: Category[]): void {
    setItem(KEYS.CATEGORIES, categories);
  }

  // Products
  static getProducts(): Product[] {
    return getItem(KEYS.PRODUCTS, INITIAL_PRODUCTS);
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
    return getItem(KEYS.SALES, INITIAL_SALES);
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
    return getItem(KEYS.CASH_SESSIONS, [INITIAL_CASH_SESSION]);
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
    return getItem(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }
  static saveAuditLogs(logs: AuditLog[]): void {
    setItem(KEYS.AUDIT_LOGS, logs);
  }

  // Export Complete Backup JSON Snapshot
  static exportFullBackup(): DatabaseBackup {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      store: this.getStore(),
      users: this.getUsers(),
      categories: this.getCategories(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      customer_dues: this.getCustomerDues(),
      suppliers: this.getSuppliers(),
      supplier_dues: this.getSupplierDues(),
      purchases: this.getPurchases(),
      sales: this.getSales(),
      stock_transactions: this.getStockTransactions(),
      returns: this.getReturns(),
      expenses: this.getExpenses(),
      recurring_expenses: this.getRecurringExpenses(),
      cash_sessions: this.getCashSessions(),
      quotations: this.getQuotations(),
      audit_logs: this.getAuditLogs(),
    };
  }

  // Restore Complete Backup JSON Snapshot
  static restoreFullBackup(backup: DatabaseBackup): boolean {
    try {
      if (!backup || !backup.store || !backup.products) {
        throw new Error('Invalid backup schema');
      }
      this.saveStore(backup.store);
      if (backup.users) this.saveUsers(backup.users);
      if (backup.categories) this.saveCategories(backup.categories);
      if (backup.products) this.saveProducts(backup.products);
      if (backup.customers) this.saveCustomers(backup.customers);
      if (backup.customer_dues) this.saveCustomerDues(backup.customer_dues);
      if (backup.suppliers) this.saveSuppliers(backup.suppliers);
      if (backup.supplier_dues) this.saveSupplierDues(backup.supplier_dues);
      if (backup.purchases) this.savePurchases(backup.purchases);
      if (backup.sales) this.saveSales(backup.sales);
      if (backup.stock_transactions) this.saveStockTransactions(backup.stock_transactions);
      if (backup.returns) this.saveReturns(backup.returns);
      if (backup.expenses) this.saveExpenses(backup.expenses);
      if (backup.recurring_expenses) this.saveRecurringExpenses(backup.recurring_expenses);
      if (backup.cash_sessions) this.saveCashSessions(backup.cash_sessions);
      if (backup.quotations) this.saveQuotations(backup.quotations);
      if (backup.audit_logs) this.saveAuditLogs(backup.audit_logs);
      return true;
    } catch (err) {
      console.error('Failed to restore backup:', err);
      return false;
    }
  }

  // Reset to Factory Demo Seeds
  static resetToSeedData(): void {
    localStorage.clear();
    this.init();
  }

  // Clear Transaction & Sales History (Keeps Products, Categories, Users, Store Settings)
  static clearTransactionHistory(userId: string = 'admin', userName: string = 'Admin'): void {
    setItem(KEYS.SALES, []);
    setItem(KEYS.CUSTOMER_DUES, []);
    setItem(KEYS.SUPPLIER_DUES, []);
    setItem(KEYS.PURCHASES, []);
    setItem(KEYS.STOCK_TRANSACTIONS, []);
    setItem(KEYS.RETURNS, []);
    setItem(KEYS.EXPENSES, []);
    setItem(KEYS.QUOTATIONS, []);
    setItem(KEYS.CASH_SESSIONS, [INITIAL_CASH_SESSION]);

    // Reset customer balances to 0
    const customers = this.getCustomers().map((c) => ({
      ...c,
      total_due_amount: 0,
      total_spent: 0,
      updated_at: new Date().toISOString(),
    }));
    this.saveCustomers(customers);

    // Reset supplier balances to 0
    const suppliers = this.getSuppliers().map((s) => ({
      ...s,
      total_due: 0,
      total_purchased: 0,
      updated_at: new Date().toISOString(),
    }));
    this.saveSuppliers(suppliers);

    // Add Audit Log
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `audit_clear_${Date.now()}`,
      user_id: userId,
      user_name: userName,
      action: 'CLEAR_TRANSACTION_HISTORY',
      module: 'System / Database',
      description: 'All sales history, purchases, customer dues, supplier dues, expenses, returns, and cash sessions cleared.',
      created_at: new Date().toISOString(),
      branch_id: this.getStore().branch_id || 'main',
    };
    setItem(KEYS.AUDIT_LOGS, [newLog, ...logs.slice(0, 50)]);
  }

  // Wipe All Data (Fresh Empty Store Start)
  static wipeAllData(userId: string = 'admin', userName: string = 'Admin'): void {
    const adminUser = this.getUsers().find((u) => u.role === 'admin') || INITIAL_USERS[0];
    const store = this.getStore();

    setItem(KEYS.PRODUCTS, []);
    setItem(KEYS.CATEGORIES, []);
    setItem(KEYS.CUSTOMERS, []);
    setItem(KEYS.CUSTOMER_DUES, []);
    setItem(KEYS.SUPPLIERS, []);
    setItem(KEYS.SUPPLIER_DUES, []);
    setItem(KEYS.PURCHASES, []);
    setItem(KEYS.SALES, []);
    setItem(KEYS.STOCK_TRANSACTIONS, []);
    setItem(KEYS.RETURNS, []);
    setItem(KEYS.EXPENSES, []);
    setItem(KEYS.RECURRING_EXPENSES, []);
    setItem(KEYS.QUOTATIONS, []);
    setItem(KEYS.CASH_SESSIONS, [INITIAL_CASH_SESSION]);
    setItem(KEYS.USERS, [adminUser]);

    const newLog: AuditLog = {
      id: `audit_wipe_${Date.now()}`,
      user_id: userId,
      user_name: userName,
      action: 'FULL_STORE_WIPE',
      module: 'System / Database',
      description: 'Store completely wiped to fresh state. Catalog, transactions, and customers reset for clean production launch.',
      created_at: new Date().toISOString(),
      branch_id: store?.branch_id || 'main',
    };
    setItem(KEYS.AUDIT_LOGS, [newLog]);
  }

  // User Auth Session Helpers
  static getSessionUserId(): string | null {
    return localStorage.getItem('pos_active_session_user_id');
  }

  static setSessionUserId(userId: string | null): void {
    if (userId) {
      localStorage.setItem('pos_active_session_user_id', userId);
    } else {
      localStorage.removeItem('pos_active_session_user_id');
    }
  }
}

