import { Customer, StoreSettings } from '../types';

export function normalizePhoneForWhatsApp(mobile: string): string {
  const digits = (mobile || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('880') && digits.length >= 13) {
    return digits;
  }
  if (digits.startsWith('01') && digits.length === 11) {
    return `88${digits}`;
  }
  if (digits.startsWith('1') && digits.length === 10) {
    return `880${digits}`;
  }
  return digits;
}

export function normalizePhoneForDial(mobile: string): string {
  const cleaned = (mobile || '').replace(/[^\d+]/g, '');
  return cleaned;
}

export function isCustomerDueOverdue(
  customer: Customer,
  alertDays: number = 7
): { overdue: boolean; reason?: string; daysSincePurchase: number } {
  if ((customer.total_due_amount || 0) <= 0) {
    return { overdue: false, daysSincePurchase: 0 };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (customer.due_promise_date && customer.due_promise_date <= todayStr) {
    return {
      overdue: true,
      reason:
        customer.due_promise_date === todayStr
          ? 'Promised Payment Due Today'
          : `Promise Date Passed (${customer.due_promise_date})`,
      daysSincePurchase: 0,
    };
  }

  if (customer.last_purchase_date) {
    const lastMs = new Date(customer.last_purchase_date).getTime();
    if (!Number.isNaN(lastMs)) {
      const days = Math.floor((Date.now() - lastMs) / (1000 * 60 * 60 * 24));
      if (days >= alertDays) {
        return {
          overdue: true,
          reason: `Unpaid for ${days} days`,
          daysSincePurchase: days,
        };
      }
      return { overdue: false, daysSincePurchase: days };
    }
  }

  return { overdue: false, daysSincePurchase: 0 };
}

export function wasAlertedToday(customer: Customer): boolean {
  if (!customer.last_alert_sent_at) return false;
  const todayStr = new Date().toISOString().slice(0, 10);
  return customer.last_alert_sent_at.slice(0, 10) === todayStr;
}

export function buildDueReminderMessage(params: {
  customer: Customer;
  store: StoreSettings;
  lang?: 'bn' | 'en' | 'both';
  invoiceNumber?: string;
}): string {
  const { customer, store, lang = store.language === 'bn' ? 'bn' : 'both', invoiceNumber } = params;
  const sym = store.currency_symbol || '৳';
  const dueFormatted = `${sym}${(customer.total_due_amount || 0).toLocaleString()}`;
  const shopName = store.store_name || 'Our Shop';
  const shopPhone = store.store_phone || store.seller_phone || '';
  const paymentNote = store.due_payment_info?.trim();
  const promiseInfo = customer.due_promise_date
    ? customer.due_promise_date
    : '';

  if (lang === 'bn') {
    const lines = [
      `আসসালামু আলাইকুম ${customer.name},`,
      `${shopName} থেকে বিনীত অনুরোধ — আপনার মোট বকেয়া (Due): ${dueFormatted}।`,
      invoiceNumber ? `ইনভয়েস নং: ${invoiceNumber}` : '',
      promiseInfo ? `পরিশোধের নির্ধারিত তারিখ: ${promiseInfo}` : '',
      `অনুগ্রহ করে সুবিধামতো সময়ে বকেয়া পরিশোধ করার জন্য অনুরোধ রইল।`,
      paymentNote ? `পেমেন্ট তথ্য: ${paymentNote}` : '',
      shopPhone ? `যোগাযোগ: ${shopPhone}` : '',
      `ধন্যবাদ — ${shopName}`,
    ];
    return lines.filter(Boolean).join('\n');
  }

  if (lang === 'en') {
    const lines = [
      `Dear ${customer.name},`,
      `Payment reminder from ${shopName}: Your current outstanding due balance is ${dueFormatted}.`,
      invoiceNumber ? `Invoice Ref: ${invoiceNumber}` : '',
      promiseInfo ? `Promised Payment Date: ${promiseInfo}` : '',
      `Please settle the due amount at your earliest convenience.`,
      paymentNote ? `Payment Info: ${paymentNote}` : '',
      shopPhone ? `Contact: ${shopPhone}` : '',
      `Thank you — ${shopName}`,
    ];
    return lines.filter(Boolean).join('\n');
  }

  const lines = [
    `আসসালামু আলাইকুম ${customer.name} / Dear ${customer.name},`,
    `${shopName}-এ আপনার মোট বকেয়া (Outstanding Due): ${dueFormatted}।`,
    invoiceNumber ? `Invoice: ${invoiceNumber}` : '',
    promiseInfo ? `নির্ধারিত তারিখ (Due Date): ${promiseInfo}` : '',
    `অনুগ্রহ করে দ্রুত বকেয়া পরিশোধ করুন। Please clear your due balance soon.`,
    paymentNote ? `Payment: ${paymentNote}` : '',
    shopPhone ? `Helpline: ${shopPhone}` : '',
    `ধন্যবাদ / Thank you — ${shopName}`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function buildWhatsAppUrl(mobile: string, message: string): string {
  const phone = normalizePhoneForWhatsApp(mobile);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildSmsUrl(mobile: string, message: string): string {
  const phone = normalizePhoneForDial(mobile);
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

export function buildTelUrl(mobile: string): string {
  return `tel:${normalizePhoneForDial(mobile)}`;
}

export function buildMailtoUrl(
  email: string | undefined,
  subject: string,
  message: string
): string {
  const recipient = (email || '').trim();
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
