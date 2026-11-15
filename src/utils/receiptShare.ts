import {
  getMobilePurchaseStats,
} from './customerPurchaseStats';
import {
  DownloadContextData,
  isReceiptDueCleared,
  resolveCustomerForSale,
  UnifiedReceiptPayload,
} from './receiptDownload';

export interface ReceiptShareMeta {
  receiptNo: string;
  title: string;
  partyName: string;
  partyMobile: string;
  partyEmail: string;
  isCleared: boolean;
}

export function getReceiptShareMeta(
  receipt: UnifiedReceiptPayload,
  data: DownloadContextData
): ReceiptShareMeta {
  const isCleared = isReceiptDueCleared(receipt, {
    customers: data.customers,
    suppliers: data.suppliers,
  });

  if (receipt.type === 'sale') {
    const sale = receipt.data;
    const cust = resolveCustomerForSale(sale, data.customers);
    return {
      receiptNo: sale.invoice_number,
      title: `Receipt ${sale.invoice_number} - ${data.store.store_name}`,
      partyName: sale.customer_name || cust?.name || 'Walk-in Customer',
      partyMobile: sale.customer_mobile || cust?.mobile || '',
      partyEmail: cust?.email || '',
      isCleared,
    };
  }

  if (receipt.type === 'due') {
    const dueTx = receipt.data;
    const cust =
      data.customers.find((c) => c.id === dueTx.customer_id) ||
      data.customers.find((c) => (c.mobile || '').trim() === (dueTx.mobile || '').trim());
    const receiptNo = `DUE-${dueTx.id.slice(-8).toUpperCase()}`;
    return {
      receiptNo,
      title: `${isCleared ? 'Due Cleared ' : 'Due Payment '}Receipt ${receiptNo} - ${data.store.store_name}`,
      partyName: dueTx.customer_name || cust?.name || 'Customer',
      partyMobile: dueTx.mobile || cust?.mobile || '',
      partyEmail: cust?.email || '',
      isCleared,
    };
  }

  const supTx = receipt.data;
  const sup = data.suppliers.find((s) => s.id === supTx.supplier_id);
  const receiptNo = `SUP-${supTx.id.slice(-8).toUpperCase()}`;
  return {
    receiptNo,
    title: `Supplier Receipt ${receiptNo} - ${data.store.store_name}`,
    partyName: supTx.supplier_name || sup?.name || sup?.company_name || 'Supplier',
    partyMobile: sup?.mobile || '',
    partyEmail: sup?.email || '',
    isCleared,
  };
}

export function buildReceiptShareText(
  receipt: UnifiedReceiptPayload,
  data: DownloadContextData,
  lang: 'bn' | 'en' | 'both' = 'both'
): string {
  const { store, customers, customerDues, suppliers, supplierDues, sales } = data;
  const sym = store.currency_symbol || '৳';
  const shopName = store.store_name || 'Our Shop';
  const shopPhone = store.store_phone || store.seller_phone || '';
  const shopAddress = store.store_address || '';

  const lines: string[] = [];
  lines.push(`*${shopName}*`);
  if (shopAddress) lines.push(shopAddress);
  if (shopPhone) lines.push(lang === 'bn' ? `ফোন: ${shopPhone}` : `Phone: ${shopPhone}`);
  lines.push('------------------------------');

  if (receipt.type === 'sale') {
    const sale = receipt.data;
    const liveCust = resolveCustomerForSale(sale, customers);
    const isDueClearedLater =
      sale.due_amount > 0 && liveCust !== undefined && (liveCust.total_due_amount || 0) <= 0.01;
    const latestClear = isDueClearedLater
      ? customerDues.find(
          (d) =>
            d.customer_id === liveCust.id &&
            d.type === 'due_payment' &&
            d.balance_after <= 0.01
        )
      : undefined;

    if (lang === 'bn') {
      lines.push(
        isDueClearedLater
          ? 'পেমেন্ট রিসিপ্ট (বকেয়া পরিশোধিত / DUE CLEARED)'
          : sale.due_amount > 0
          ? 'বিক্রয় রিসিপ্ট (বকেয়া সহ)'
          : 'বিক্রয় ও পেমেন্ট রিসিপ্ট'
      );
      lines.push(`ইনভয়েস নং: ${sale.invoice_number}`);
      lines.push(`তারিখ: ${sale.date} ${sale.time}`);
      lines.push(`ক্রেতা: ${sale.customer_name}`);
      if (sale.customer_mobile) {
        lines.push(`মোবাইল: ${sale.customer_mobile}`);
      }
    } else if (lang === 'en') {
      lines.push(
        isDueClearedLater
          ? 'SALES RECEIPT (DUE CLEARED)'
          : sale.due_amount > 0
          ? 'SALES INVOICE (WITH DUE)'
          : 'SALES PAYMENT RECEIPT'
      );
      lines.push(`Invoice #: ${sale.invoice_number}`);
      lines.push(`Date/Time: ${sale.date} ${sale.time}`);
      lines.push(`Customer: ${sale.customer_name}`);
      if (sale.customer_mobile) {
        lines.push(`Mobile: ${sale.customer_mobile}`);
      }
    } else {
      lines.push(
        isDueClearedLater
          ? 'SALES RECEIPT • DUE CLEARED (পরিশোধিত)'
          : sale.due_amount > 0
          ? 'SALES INVOICE / বিক্রয় রিসিপ্ট (DUE)'
          : 'PAYMENT RECEIPT / পেমেন্ট রিসিপ্ট'
      );
      lines.push(`Invoice #: ${sale.invoice_number}`);
      lines.push(`Date: ${sale.date} ${sale.time}`);
      lines.push(`Customer: ${sale.customer_name}${sale.customer_mobile ? ` (${sale.customer_mobile})` : ''}`);
    }

    if (sale.customer_mobile && sales) {
      const mStats = getMobilePurchaseStats(sale.customer_mobile, sales, sale.customer_id);
      if (mStats.totalOrders > 0) {
        lines.push(
          lang === 'en'
            ? `Total Purchased on Mobile: ${mStats.totalProductQuantity} pcs (${mStats.totalOrders} orders)`
            : `এই নম্বরে মোট কেনা পণ্য: ${mStats.totalProductQuantity} টি (${mStats.totalOrders} অর্ডার)`
        );
      }
    }

    lines.push('------------------------------');
    lines.push(lang === 'bn' ? 'পণ্যের বিবরণ:' : 'Items:');
    sale.items.forEach((it, idx) => {
      lines.push(
        `${idx + 1}. ${it.product_name} (${it.variant_name}) — ${it.quantity} ${it.unit} x ${sym}${it.unit_selling_price} = ${sym}${it.total_price}`
      );
    });
    lines.push('------------------------------');

    if (lang === 'bn') {
      lines.push(`উপমোট (Subtotal): ${sym}${sale.subtotal}`);
      if (sale.discount_amount > 0) {
        lines.push(`ছাড় (Discount): -${sym}${sale.discount_amount}`);
      }
      lines.push(`সর্বমোট (Grand Total): ${sym}${sale.grand_total}`);
      lines.push(`পরিশোধ (${sale.payment_method.toUpperCase()}): ${sym}${sale.paid_amount}`);
      if (sale.due_amount > 0 && isDueClearedLater) {
        lines.push(`পূর্বের বাকি ছিল: ${sym}${sale.due_amount}`);
        lines.push(
          `স্ট্যাটাস: *** বকেয়া সম্পূর্ণ পরিশোধিত (DUE CLEARED: ${sym}0) ***${
            latestClear ? ` [${latestClear.date}]` : ''
          }`
        );
      } else if (sale.due_amount > 0) {
        lines.push(`বকেয়া (Due): ${sym}${sale.due_amount}`);
      } else {
        lines.push(`স্ট্যাটাস: পরিশোধিত (PAID / CLEAR)`);
      }
    } else if (lang === 'en') {
      lines.push(`Subtotal: ${sym}${sale.subtotal}`);
      if (sale.discount_amount > 0) {
        lines.push(`Discount (${sale.discount_percentage}%): -${sym}${sale.discount_amount}`);
      }
      lines.push(`Grand Total: ${sym}${sale.grand_total}`);
      lines.push(`Paid (${sale.payment_method.toUpperCase()}): ${sym}${sale.paid_amount}`);
      if (sale.due_amount > 0 && isDueClearedLater) {
        lines.push(`Previous Due: ${sym}${sale.due_amount} (Settled)`);
        lines.push(
          `STATUS: *** DUE CLEARED (${sym}0 Balance) ***${
            latestClear ? ` on ${latestClear.date}` : ''
          }`
        );
      } else if (sale.due_amount > 0) {
        lines.push(`Due Balance: ${sym}${sale.due_amount}`);
      } else {
        lines.push(`Status: PAID / CLEAR`);
      }
    } else {
      lines.push(`Subtotal: ${sym}${sale.subtotal}`);
      if (sale.discount_amount > 0) {
        lines.push(`Discount: -${sym}${sale.discount_amount}`);
      }
      lines.push(`Grand Total (মোট): ${sym}${sale.grand_total}`);
      lines.push(`Paid (${sale.payment_method.toUpperCase()}): ${sym}${sale.paid_amount}`);
      if (sale.due_amount > 0 && isDueClearedLater) {
        lines.push(
          `STATUS: *** DUE CLEARED / সম্পূর্ণ পরিশোধিত (Due: ${sym}0) ***${
            latestClear ? ` (${latestClear.date})` : ''
          }`
        );
      } else if (sale.due_amount > 0) {
        lines.push(`Due / বকেয়া: ${sym}${sale.due_amount}`);
      } else {
        lines.push(`Status: PAID / পরিশোধিত`);
      }
    }
  } else if (receipt.type === 'due') {
    const dueTx = receipt.data;
    const liveCust =
      customers.find((c) => c.id === dueTx.customer_id) ||
      customers.find((c) => (c.mobile || '').trim() === (dueTx.mobile || '').trim());
    const isCleared =
      dueTx.balance_after <= 0.01 ||
      (liveCust !== undefined && (liveCust.total_due_amount || 0) <= 0.01);
    const receiptNo = `DUE-${dueTx.id.slice(-8).toUpperCase()}`;

    if (lang === 'bn') {
      lines.push(
        isCleared ? 'বকেয়া পরিশোধ রিসিপ্ট (DUE CLEARED)' : 'কাস্টমার বকেয়া পেমেন্ট রিসিপ্ট'
      );
      lines.push(`রিসিপ্ট নং: ${receiptNo}`);
      lines.push(`তারিখ: ${dueTx.date} ${dueTx.time}`);
      lines.push(`ক্রেতা: ${dueTx.customer_name}`);
      if (dueTx.mobile) lines.push(`মোবাইল: ${dueTx.mobile}`);
      lines.push('------------------------------');
      lines.push(`পূর্বের বকেয়া: ${sym}${dueTx.total_amount}`);
      lines.push(`জমা দিয়েছেন (${(dueTx.payment_method || 'cash').toUpperCase()}): ${sym}${dueTx.paid_amount}`);
      lines.push(
        `বর্তমান বকেয়া: ${sym}${isCleared ? 0 : dueTx.balance_after}${
          isCleared ? ' (সম্পূর্ণ পরিশোধিত / CLEAR)' : ''
        }`
      );
    } else if (lang === 'en') {
      lines.push(isCleared ? 'DUE CLEARED RECEIPT' : 'CUSTOMER DUE PAYMENT RECEIPT');
      lines.push(`Receipt #: ${receiptNo}`);
      lines.push(`Date/Time: ${dueTx.date} ${dueTx.time}`);
      lines.push(`Customer: ${dueTx.customer_name}`);
      if (dueTx.mobile) lines.push(`Mobile: ${dueTx.mobile}`);
      lines.push('------------------------------');
      lines.push(`Previous Due: ${sym}${dueTx.total_amount}`);
      lines.push(`Payment Received (${(dueTx.payment_method || 'cash').toUpperCase()}): ${sym}${dueTx.paid_amount}`);
      lines.push(
        `Remaining Due: ${sym}${isCleared ? 0 : dueTx.balance_after}${
          isCleared ? ' (DUE CLEARED)' : ''
        }`
      );
    } else {
      lines.push(
        isCleared
          ? 'DUE CLEARED RECEIPT / বকেয়া পরিশোধিত'
          : 'DUE PAYMENT RECEIPT / বকেয়া পেমেন্ট রিসিপ্ট'
      );
      lines.push(`Receipt #: ${receiptNo}`);
      lines.push(`Date: ${dueTx.date} ${dueTx.time}`);
      lines.push(`Customer: ${dueTx.customer_name}${dueTx.mobile ? ` (${dueTx.mobile})` : ''}`);
      lines.push('------------------------------');
      lines.push(`Previous Due (পূর্বের বকেয়া): ${sym}${dueTx.total_amount}`);
      lines.push(`Paid (${(dueTx.payment_method || 'cash').toUpperCase()}): ${sym}${dueTx.paid_amount}`);
      lines.push(
        `Remaining Due (বর্তমান বাকি): ${sym}${isCleared ? 0 : dueTx.balance_after}${
          isCleared ? ' *** DUE CLEARED / পরিশোধিত ***' : ''
        }`
      );
    }
  } else {
    const supTx = receipt.data;
    const liveSup = suppliers.find((s) => s.id === supTx.supplier_id);
    const isSupCleared =
      supTx.balance_after <= 0.01 || (liveSup !== undefined && (liveSup.total_due || 0) <= 0.01);
    const latestSupClear =
      isSupCleared && supTx.balance_after > 0.01 && liveSup
        ? supplierDues.find(
            (d) =>
              d.supplier_id === liveSup.id &&
              d.type === 'due_payment' &&
              d.balance_after <= 0.01
          )
        : undefined;
    const receiptNo = `SUP-${supTx.id.slice(-8).toUpperCase()}`;

    lines.push(
      isSupCleared
        ? 'SUPPLIER DUE CLEARED RECEIPT'
        : 'SUPPLIER DUE PAYMENT RECEIPT'
    );
    lines.push(`Receipt #: ${receiptNo}`);
    lines.push(`Date/Time: ${supTx.date} ${supTx.time}`);
    lines.push(`Supplier: ${supTx.supplier_name}${liveSup?.mobile ? ` (${liveSup.mobile})` : ''}`);
    lines.push('------------------------------');
    lines.push(`Previous Payable: ${sym}${supTx.total_amount}`);
    lines.push(`Payment Made (${(supTx.payment_method || 'cash').toUpperCase()}): ${sym}${supTx.paid_amount}`);
    lines.push(
      `Remaining Payable: ${sym}${isSupCleared ? 0 : supTx.balance_after}${
        isSupCleared ? ' (DUE CLEARED / পরিশোধিত)' : ''
      }`
    );
    if (latestSupClear) {
      lines.push(`Cleared On: ${latestSupClear.date} ${latestSupClear.time}`);
    }
  }

  lines.push('------------------------------');
  if (store.receipt_footer) {
    lines.push(store.receipt_footer.trim());
  } else {
    lines.push(
      lang === 'bn'
        ? `ধন্যবাদ — ${shopName}`
        : lang === 'en'
        ? `Thank you for your business — ${shopName}`
        : `ধন্যবাদ / Thank you — ${shopName}`
    );
  }

  return lines.filter(Boolean).join('\n');
}
