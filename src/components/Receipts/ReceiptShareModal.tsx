import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  buildMailtoUrl,
  buildSmsUrl,
  buildWhatsAppUrl,
} from '../../utils/dueAlerts';
import {
  createReceiptPngFile,
  downloadReceiptAsPng,
  UnifiedReceiptPayload,
} from '../../utils/receiptDownload';
import {
  buildReceiptShareText,
  getReceiptShareMeta,
} from '../../utils/receiptShare';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';

interface ReceiptShareModalProps {
  receipt: UnifiedReceiptPayload;
  onClose: () => void;
}

export const ReceiptShareModal: React.FC<ReceiptShareModalProps> = ({
  receipt,
  onClose,
}) => {
  const { store, customers, customerDues, suppliers, supplierDues, sales } = useApp();

  const ctxData = useMemo(
    () => ({
      store,
      customers,
      customerDues,
      suppliers,
      supplierDues,
      sales,
    }),
    [store, customers, customerDues, suppliers, supplierDues, sales]
  );

  const meta = useMemo(
    () => getReceiptShareMeta(receipt, ctxData),
    [receipt, ctxData]
  );

  const [msgLang, setMsgLang] = useState<'bn' | 'en' | 'both'>(
    store.language === 'bn' ? 'bn' : 'both'
  );
  const [recipientMobile, setRecipientMobile] = useState<string>(meta.partyMobile);
  const [recipientEmail, setRecipientEmail] = useState<string>(meta.partyEmail);
  const [messageText, setMessageText] = useState<string>(() =>
    buildReceiptShareText(receipt, ctxData, store.language === 'bn' ? 'bn' : 'both')
  );
  const [copied, setCopied] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  useEffect(() => {
    setMessageText(buildReceiptShareText(receipt, ctxData, msgLang));
  }, [receipt, ctxData, msgLang]);

  const triggerFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const whatsappUrl = buildWhatsAppUrl(recipientMobile, messageText);
  const smsUrl = buildSmsUrl(recipientMobile, messageText);
  const mailtoUrl = buildMailtoUrl(recipientEmail, meta.title, messageText);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      triggerFeedback('রিসিপ্ট টেক্সট কপি করা হয়েছে! এখন যেকোনো অ্যাপে Paste করুন।');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      triggerFeedback('কপি করতে সমস্যা হয়েছে — নিচের বক্স থেকে টেক্সট সিলেক্ট করে কপি করুন।');
    }
  };

  const handleDownloadPng = () => {
    downloadReceiptAsPng(receipt, ctxData);
    triggerFeedback('রিসিপ্ট PNG ইমেজ ডাউনলোড হয়েছে!');
  };

  const handleNativeSystemShare = async () => {
    setSharingImage(true);
    try {
      const pngFile = await createReceiptPngFile(receipt, ctxData);
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        // Try sharing receipt PNG image + text if supported (Android/iOS/Desktop Share Sheet)
        if (
          pngFile &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [pngFile] })
        ) {
          try {
            await navigator.share({
              title: meta.title,
              text: messageText,
              files: [pngFile],
            });
            triggerFeedback('রিসিপ্ট ইমেজ ও মেসেজ শেয়ার সম্পন্ন হয়েছে!');
            return;
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              return;
            }
            // Fall through to text share
          }
        }

        try {
          await navigator.share({
            title: meta.title,
            text: messageText,
          });
          triggerFeedback('রিসিপ্ট শেয়ার সম্পন্ন হয়েছে!');
          return;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }
        }
      }

      // Desktop/iframe fallback when native Web Share API is unavailable
      downloadReceiptAsPng(receipt, ctxData);
      try {
        await navigator.clipboard.writeText(messageText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // ignore clipboard error
      }
      triggerFeedback(
        'রিসিপ্ট PNG ডাউনলোড এবং টেক্সট কপি হয়েছে — Messenger, Imo বা Telegram-এ Paste/Attach করুন।'
      );
    } finally {
      setSharingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[60] flex items-center justify-center p-4 no-print">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl text-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#5b46b5] to-[#ec1f73] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold leading-tight">
                Share Payment Receipt
              </h3>
              <p className="text-[11px] text-white/85">
                SMS, WhatsApp, Email, Imo, Messenger & Image Share
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

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Receipt Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-extrabold text-[#5b46b5]">
                  #{meta.receiptNo}
                </span>
                <span className="text-xs font-bold text-slate-800">{meta.partyName}</span>
              </div>
              {meta.partyMobile && (
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {meta.partyMobile}
                </div>
              )}
            </div>
            {meta.isCleared && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase">
                <Sparkles className="w-3 h-3" />
                Due Cleared
              </span>
            )}
          </div>

          {feedbackBanner && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackBanner}</span>
            </div>
          )}

          {/* Recipient Mobile & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#f7f7fb] border border-slate-200/80">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#5b46b5]" />
                <span>Recipient Mobile (SMS / WhatsApp)</span>
              </label>
              <input
                type="tel"
                value={recipientMobile}
                onChange={(e) => setRecipientMobile(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#5b46b5]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-[#5b46b5]" />
                <span>Recipient Email (Optional)</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="customer@email.com"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#5b46b5]"
              />
            </div>
          </div>

          {/* Language Switcher & Message Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-slate-700">
                Receipt Message Preview (Editable)
              </label>
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-[11px] font-bold">
                {(
                  [
                    { id: 'both', label: 'Both' },
                    { id: 'bn', label: 'বাংলা' },
                    { id: 'en', label: 'English' },
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
              rows={7}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl p-3 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:border-[#5b46b5]"
            />
          </div>

          {/* Multi-Channel Share Actions */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Send Receipt Via
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  triggerFeedback(
                    recipientMobile.trim()
                      ? `WhatsApp খোলা হয়েছে (${recipientMobile}).`
                      : 'WhatsApp খোলা হয়েছে — কনট্যাক্ট সিলেক্ট করে পাঠান।'
                  )
                }
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>WhatsApp</span>
              </a>

              {/* Direct SMS */}
              <a
                href={smsUrl}
                onClick={(e) => {
                  if (!recipientMobile.trim()) {
                    e.preventDefault();
                    triggerFeedback('SMS পাঠাতে অনুগ্রহ করে উপরের ঘরে মোবাইল নম্বর লিখুন।');
                    return;
                  }
                  triggerFeedback(`SMS অ্যাপ খোলা হয়েছে (${recipientMobile}).`);
                }}
                className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Send SMS</span>
              </a>

              {/* Other System Apps (PNG Image + Text via Web Share API) */}
              <button
                type="button"
                disabled={sharingImage}
                onClick={() => void handleNativeSystemShare()}
                className="p-3 rounded-xl bg-[#ec1f73] hover:bg-[#d61665] disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>{sharingImage ? 'Preparing...' : 'Imo / Other Apps'}</span>
              </button>

              {/* Email */}
              <a
                href={mailtoUrl}
                onClick={() => triggerFeedback('ইমেইল অ্যাপ খোলা হয়েছে।')}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>Send Email</span>
              </a>

              {/* Copy Receipt Text */}
              <button
                type="button"
                onClick={() => void handleCopyText()}
                className="p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>

              {/* Download PNG Image */}
              <button
                type="button"
                onClick={handleDownloadPng}
                className="p-3 rounded-xl bg-[#5b46b5] hover:bg-[#4a379c] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Save PNG</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
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
