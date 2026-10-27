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
} from '../types';
import { DBStorage } from '../db/storage';

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
  saveSupplier: (supplier: Supplier) => Supplier;
  saveUser: (user: User) => void;
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

  // Auth & Session
  isAuthenticated: boolean;
  loginWithPin: (userIdOrUsername: string, pin: string) => { success: boolean; message?: string };
  logout: () => void;
  lockTerminal: () => void;

  // History & Data Reset Actions
  clearTransactionHistory: () => void;
  wipeAllData: () => void;
  resetToDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  DBStorage.init();

  const [activeTab, setActiveTab] = useState<string>('pos');
  const [store, setStore] = useState<StoreSettings>(DBStorage.getStore());
  const [users, setUsers] = useState<User[]>(DBStorage.getUsers());
  
  const savedUserId = DBStorage.getSessionUserId();
  const initialUser =
    users.find((u) => u.id === savedUserId) ||
    users.find((u) => u.username === 'demo') ||
    users.find((u) => u.role === 'visitor') ||
    users.find((u) => u.role === 'admin') ||
    users[0];
  const [activeUser, setActiveUser] = useState<User>(initialUser);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(savedUserId));


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

  const updateStore = (settings: StoreSettings) => {
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
      user_id: activeUser.id,
      user_name: activeUser.name,
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

    // 1. Save Sale to Local Storage
    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    DBStorage.saveSales(updatedSales);

    // 2. Deduct Stock for each variant & log Stock Transactions
    const currentProducts = [...products];
    const newStockTxs: StockTransaction[] = [];

    saleData.items.forEach((item) => {
      let variantFound = false;
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

          variantFound = true;
          break;
        }
      }
    });

    setProducts(currentProducts);
    DBStorage.saveProducts(currentProducts);

    const updatedStockTxs = [...newStockTxs, ...stockTransactions];
    setStockTransactions(updatedStockTxs);
    DBStorage.saveStockTransactions(updatedStockTxs);

    // 3. Customer Ledger update (If customer identified or due created)
    let updatedCustomers = [...customers];
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
        // Auto create customer
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

    // 4. Record Customer Due Transaction if due_amount > 0
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

    // 5. Audit Log
    addAuditLog(
      'POS_SALE_COMPLETED',
      'POS',
      `Completed Sale Invoice #${invoiceNo} for Total ৳${saleData.grand_total} (Paid: ৳${saleData.paid_amount}, Due: ৳${saleData.due_amount})`
    );

    // 6. Set Printable Receipt state
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

    // Increase product variant stock
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
            purchase_price: item.purchase_price, // Update purchase price to latest
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

    // Supplier stats update
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

    // Record Supplier Due if due_amount > 0
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

  // Adjust Stock Quantity Manually
  const adjustStock = (variant_id: string, new_stock: number, reason: string) => {
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

      // Increase stock back
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

    // Update sale status
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

  // Void/Cancel Invoice
  const voidSale = (sale_id: string, reason: string): boolean => {
    const saleIndex = sales.findIndex((s) => s.id === sale_id);
    if (saleIndex === -1) return false;

    const sale = sales[saleIndex];
    const now = new Date();

    // Restock all items
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

    // Reverse Customer due if applicable
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

  // Save/Update Product with Variants
  const saveProduct = (product: Product) => {
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

  // Archive Product (Soft Delete)
  const archiveProduct = (product_id: string) => {
    const updated = products.map((p) => (p.id === product_id ? { ...p, archived: true } : p));
    setProducts(updated);
    DBStorage.saveProducts(updated);
    addAuditLog('PRODUCT_ARCHIVED', 'Products', `Archived product ID ${product_id}`);
  };

  // Save Customer
  const saveCustomer = (customer: Customer): Customer => {
    const idx = customers.findIndex((c) => c.id === customer.id || c.mobile === customer.mobile);
    let updated: Customer[];
    let savedCust = customer;
    if (idx !== -1) {
      updated = [...customers];
      savedCust = { ...updated[idx], ...customer, updated_at: new Date().toISOString() };
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

  // Save User
  const saveUser = (user: User) => {
    const idx = users.findIndex((u) => u.id === user.id);
    let updated: User[];
    if (idx !== -1) {
      updated = [...users];
      updated[idx] = user;
    } else {
      updated = [...users, user];
    }
    setUsers(updated);
    DBStorage.saveUsers(updated);
    addAuditLog('USER_SAVED', 'Users', `Saved User ${user.name} (${user.role})`);
  };

  // Cashier, Visitor & Terminal Authentication
  const loginWithPin = (userIdOrUsername: string, pin: string): { success: boolean; message?: string } => {
    const trimmed = userIdOrUsername.trim().toLowerCase();
    let foundUser = users.find(
      (u) =>
        u.id.toLowerCase() === trimmed ||
        u.username.toLowerCase() === trimmed ||
        u.name.toLowerCase() === trimmed
    );

    // If searching for demo or visitor, fallback to demo/visitor account
    if (!foundUser && (trimmed === 'demo' || trimmed === 'visitor' || trimmed === 'user_demo')) {
      foundUser = users.find((u) => u.username === 'demo' || u.role === 'visitor') || {
        id: 'user_demo',
        name: 'Demo Visitor (ভিজিটর)',
        username: 'demo',
        pin: '1234',
        role: 'visitor',
        phone: '+880 1700-000000',
        email: 'visitor@superstore.bd',
        active: true,
        permissions: ['pos_sale', 'product_manage', 'customer_manage', 'due_manage', 'reports_view'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'synced',
        branch_id: store.branch_id || 'branch_dhaka_main',
        device_id: 'pos_terminal_01',
      };
    }

    // If searching for admin or ID 'admin', fallback to admin user
    if (!foundUser && (trimmed === 'admin' || trimmed === 'user_admin')) {
      foundUser = users.find((u) => u.role === 'admin') || {
        id: 'user_admin',
        name: 'Md. Rafiqul Islam (Owner)',
        username: 'admin',
        pin: '1234',
        role: 'admin',
        phone: '+880 1711-223344',
        email: 'owner@superstore.bd',
        active: true,
        permissions: [
          'pos_sale',
          'price_change',
          'discount_override',
          'invoice_cancel',
          'product_manage',
          'inventory_adjust',
          'supplier_manage',
          'customer_manage',
          'due_manage',
          'expense_manage',
          'reports_view',
          'user_manage',
          'settings_manage',
          'backup_manage',
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'synced',
        branch_id: store.branch_id || 'branch_dhaka_main',
        device_id: 'pos_terminal_01',
      };
    }

    if (!foundUser) {
      return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি (User not found).' };
    }

    if (!foundUser.active) {
      return { success: false, message: 'এই অ্যাকাউন্টটি নিষ্ক্রিয় রাখা হয়েছে (Account is deactivated).' };
    }

    const isMasterAdminPin = (trimmed === 'admin' || foundUser.role === 'admin' || foundUser.username === 'admin') && pin === '1234';
    const isDemoVisitorPin = (trimmed === 'demo' || trimmed === 'visitor' || foundUser.role === 'visitor' || foundUser.username === 'demo') && pin === '1234';

    if (foundUser.pin !== pin && !isMasterAdminPin && !isDemoVisitorPin) {
      return { success: false, message: 'ভুল পিন কোড! ডেমো পিন হলো 1234 (Invalid PIN).' };
    }

    setActiveUser(foundUser);
    setIsAuthenticated(true);
    DBStorage.setSessionUserId(foundUser.id);
    addAuditLog('USER_LOGIN', 'Auth', `User ${foundUser.name} (${foundUser.role}) logged in successfully.`);
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    DBStorage.setSessionUserId(null);
    addAuditLog('USER_LOGOUT', 'Auth', `User ${activeUser.name} logged out from terminal.`);
  };

  const lockTerminal = () => {
    setIsAuthenticated(false);
    addAuditLog('TERMINAL_LOCKED', 'Auth', `Terminal locked by ${activeUser.name}.`);
  };

  // History & Data Reset Actions
  const clearTransactionHistory = () => {
    DBStorage.clearTransactionHistory(activeUser.id, activeUser.name);
    refreshData();
  };

  const wipeAllData = () => {
    DBStorage.wipeAllData(activeUser.id, activeUser.name);
    refreshData();
  };

  const resetToDemoData = () => {
    DBStorage.resetToSeedData();
    refreshData();
  };

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
        saveSupplier,
        saveUser,
        saveCategory,
        addAuditLog,
        refreshData,
        isAuthenticated,
        loginWithPin,
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
