import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import {
  buildDueReminderMessage,
  buildMailtoUrl,
  buildSmsUrl,
  buildTelUrl,
  buildWhatsAppUrl,
  isCustomerDueOverdue,
  wasAlertedToday,
} from '../../utils/dueAlerts';
import {
  BellRing,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  Share2,
  X,
} from 'lucide-react';

interface DueAlertModalProps {
  customer: Customer;
  invoiceNumber?: string;
  onClose: () => void;
}

export const DueAlertModal: React.FC<DueAlertModalProps> = ({
  customer,
  invoiceNumber,
  onClose,
}) => {
  const { store, customers, saveCustomer, logDueAlert } = useApp();

  // Always resolve freshest customer state from context
  const liveCustomer = customers.find((c) => c.id === customer.id) || customer;

  const [msgLang, setMsgLang] = useState<'bn' | 'en' | 'both'>(
    store.language === 'bn' ? 'bn' : 'both'
  );
  const [messageText, setMessageText] = useState<string>(() =>
    buildDueReminderMessage({
      customer: liveCustomer,
      store,
      lang: store.language === 'bn' ? 'bn' : 'both',
      invoiceNumber,
    })
  );

  const [promiseDate, setPromiseDate] = useState<string>(liveCustomer.due_promise_date || '');
  const [customerEmail, setCustomerEmail] = useState<string>(liveCustomer.email || '');
  const [promiseSaved, setPromiseSaved] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Rebuild default template when language tab changes or promise date updates
  useEffect(() => {
    setMessageText(
      buildDueReminderMessage({
        customer: { ...liveCustomer, due_promise_date: promiseDate || liveCustomer.due_promise_date },
        store,
        lang: msgLang,
        invoiceNumber,
      })
    );
  }, [msgLang, liveCustomer.total_due_amount, promiseDate, invoiceNumber, store]);

  const overdueStatus = isCustomerDueOverdue(liveCustomer, store.due_alert_days || 7);
  const alertedToday = wasAlertedToday(liveCustomer);

  const whatsappUrl = buildWhatsAppUrl(liveCustomer.mobile, messageText);
  const smsUrl = buildSmsUrl(liveCustomer.mobile, messageText);
  const telUrl = buildTelUrl(liveCustomer.mobile);
  const mailtoUrl = buildMailtoUrl(
    customerEmail || liveCustomer.email,
    `Payment Reminder - ${store.store_name} (Due: ${store.currency_symbol}${liveCustomer.total_due_amount})`,
    messageText
  );

  const triggerFeedback = (text: string) => {
    setFeedbackBanner(text);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const handleSavePromiseAndEmail = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomer({
      ...liveCustomer,
      due_promise_date: promiseDate.trim() || undefined,
      email: customerEmail.trim() || undefined,
    });
    setPromiseSaved(true);
    setTimeout(() => setPromiseSaved(false), 3000);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      logDueAlert(liveCustomer.id, 'copy', 'Copied due alert message');
      triggerFeedback('মেসেজ কপি করা হয়েছে! এখন যেকোনো অ্যাপে Paste করে পাঠাতে পারবেন।');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      triggerFeedback('কপি করতে সমস্যা হয়েছে — নিচের টেক্সট সিলেক্ট করে কপি করুন।');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Due Reminder - ${liveCustomer.name}`,
          text: messageText,
        });
        logDueAlert(liveCustomer.id, 'share', 'Shared via device app sheet');
        triggerFeedback('মেসেজ শেয়ার সম্পন্ন হয়েছে (Alert logged).');
        return;
      } catch {
        // User cancelled or unsupported — fall back to copy
      }
    }
    await handleCopyMessage();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl text-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#5b46b5] to-[#ec1f73] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold leading-tight">
                Due Customer Alert Center
              </h3>
              <p className="text-[11px] text-white/85">
                SMS, WhatsApp, Call, Email & Other Reminder Channels
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Customer Summary Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-slate-900">{liveCustomer.name}</span>
                {overdueStatus.overdue && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    {overdueStatus.reason}
                  </span>
                )}
                {alertedToday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Alerted Today ({liveCustomer.last_alert_channel?.toUpperCase()})
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-3 flex-wrap">
                <span>{liveCustomer.mobile}</span>
                {liveCustomer.last_alert_sent_at && (
                  <span className="text-[11px] text-slate-400">
                    Last alert: {new Date(liveCustomer.last_alert_sent_at).toLocaleString()} (Total:{' '}
                    {liveCustomer.alert_count || 1})
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold uppercase text-rose-600">Total Due</div>
              <div className="text-xl font-extrabold font-mono text-rose-700">
                {store.currency_symbol}
                {(liveCustomer.total_due_amount || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {feedbackBanner && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackBanner}</span>
            </div>
          )}

          {/* Promise Date & Email Quick Update */}
          <form
            onSubmit={handleSavePromiseAndEmail}
            className="p-3.5 rounded-2xl bg-[#f7f7fb] border border-slate-200/80 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
          >
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#5b46b5]" />
                <span>Promised Pay Date</span>
              </label>
              <input
                type="date"
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#5b46b5]"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-[#5b46b5]" />
                <span>Email (Optional)</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@email.com"
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#5b46b5]"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full py-1.5 px-3 rounded-xl bg-[#5b46b5] hover:bg-[#4b389b] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {promiseSaved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </form>

          {/* Message Language & Editable Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">
                Reminder Message Preview (Editable)
              </label>
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-[11px] font-bold">
                {(
                  [
                    { id: 'bn', label: 'বাংলা' },
                    { id: 'en', label: 'English' },
                    { id: 'both', label: 'Both' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMsgLang(t.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      msgLang === t.id
                        ? 'bg-white text-[#5b46b5] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl p-3 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-[#5b46b5]"
            />
          </div>

          {/* Multi-Channel Dispatch Buttons */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Send Alert Via
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  logDueAlert(liveCustomer.id, 'whatsapp', 'Opened WhatsApp alert');
                  triggerFeedback('WhatsApp অ্যালার্ট লগ করা হয়েছে (WhatsApp opened).');
                }}
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>WhatsApp</span>
              </a>

              {/* Direct SMS */}
              <a
                href={smsUrl}
                onClick={() => {
                  logDueAlert(liveCustomer.id, 'sms', 'Opened device SMS app');
                  triggerFeedback('SMS অ্যালার্ট লগ করা হয়েছে (SMS composer opened).');
                }}
                className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Send SMS</span>
              </a>

              {/* Direct Phone Call */}
              <a
                href={telUrl}
                onClick={() => {
                  logDueAlert(liveCustomer.id, 'call', 'Placed voice reminder call');
                  triggerFeedback('ফোন কল রিমাইন্ডার লগ করা হয়েছে।');
                }}
                className="p-3 rounded-xl bg-[#5b46b5] hover:bg-[#4b389b] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>Call Now</span>
              </a>

              {/* Other Apps / Share (Imo, Messenger, Telegram, Viber) */}
              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="p-3 rounded-xl bg-[#ec1f73] hover:bg-[#d61665] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>Imo / Other App</span>
              </button>

              {/* Email */}
              <a
                href={mailtoUrl}
                onClick={() => {
                  logDueAlert(liveCustomer.id, 'email', 'Opened email composer');
                  triggerFeedback('ইমেইল রিমাইন্ডার লগ করা হয়েছে।');
                }}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>Send Email</span>
              </a>

              {/* Copy Message */}
              <button
                type="button"
                onClick={() => void handleCopyMessage()}
                className="p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
          </div>

          {/* Manual / In-Person Alert Log Button */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                logDueAlert(liveCustomer.id, 'manual', 'Marked as reminded manually/in-person');
                triggerFeedback('ম্যানুয়াল/সরাসরি রিমাইন্ডার সফলভাবে সংরক্ষিত হয়েছে।');
              }}
              className="text-xs font-semibold text-[#5b46b5] hover:text-[#ec1f73] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Mark as Reminded In-Person</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
