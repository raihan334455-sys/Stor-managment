import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Sale, CustomerDueTransaction } from '../../types';

interface ThermalReceiptProps {
  receipt: { type: 'sale' | 'due' | 'quotation'; data: any } | null;
  onClose: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ receipt, onClose }) => {
  const { store } = useApp();
  const printRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const is58mm = store.receipt_size === '58mm';
  const widthClass = is58mm ? 'w-[58mm] min-w-[58mm]' : 'w-[80mm] min-w-[80mm]';

  const now = new Date();
  const printedAtStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-base">Thermal Receipt Preview ({store.receipt_size})</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Preview Canvas */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          <div
            ref={printRef}
            id="printable-receipt"
            className={`bg-white p-4 shadow-md text-slate-900 font-mono text-xs leading-tight ${widthClass} border border-slate-200 printable-area`}
          >
            {/* STORE HEADER */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              {store.receipt_show_logo && store.store_logo && (
                <img
                  src={store.store_logo}
                  alt={store.store_name}
                  className="h-10 mx-auto mb-1 object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
              <h1 className="font-bold text-sm uppercase tracking-wider">{store.store_name}</h1>
              <p className="text-[10px] text-slate-700">{store.store_address}</p>
              <p className="text-[10px] text-slate-700">Phone: {store.store_phone}</p>
              {store.receipt_header && (
                <p className="text-[10px] italic mt-1 font-sans text-slate-600 whitespace-pre-line">
                  {store.receipt_header}
                </p>
              )}
            </div>

            {/* RECEIPT TYPE: SALE */}
            {receipt.type === 'sale' && (
              <>
                {(() => {
                  const sale = receipt.data as Sale;
                  return (
                    <div>
                      <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
                        <div className="flex justify-between">
                          <span className="font-bold">INVOICE #:</span>
                          <span className="font-bold">{sale.invoice_number}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span>Date/Time:</span>
                          <span>
                            {sale.date} {sale.time}
                          </span>
                        </div>
                        {store.receipt_show_seller && (
                          <div className="flex justify-between text-[10px]">
                            <span>Seller:</span>
                            <span>{sale.seller_name}</span>
                          </div>
                        )}
                        {store.receipt_show_customer && (
                          <div className="flex justify-between text-[10px] pt-1">
                            <span>Customer:</span>
                            <span className="font-semibold">{sale.customer_name}</span>
                          </div>
                        )}
                        {store.receipt_show_customer && sale.customer_mobile && (
                          <div className="flex justify-between text-[10px]">
                            <span>Mobile:</span>
                            <span>{sale.customer_mobile}</span>
                          </div>
                        )}
                      </div>

                      {/* ITEMS TABLE */}
                      <div className="py-2 border-b border-dashed border-slate-400">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="border-b border-slate-300">
                              <th className="pb-1 text-left">ITEM</th>
                              <th className="pb-1 text-center">QTY</th>
                              <th className="pb-1 text-right">PRICE</th>
                              <th className="pb-1 text-right">TOTAL</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sale.items.map((item, idx) => (
                              <tr key={idx} className="align-top">
                                <td className="py-1 pr-1">
                                  <div className="font-semibold text-slate-900 leading-tight">
                                    {item.product_name}
                                  </div>
                                  <div className="text-[9px] text-slate-500">
                                    {item.variant_name}
                                  </div>
                                </td>
                                <td className="py-1 text-center whitespace-nowrap">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="py-1 text-right whitespace-nowrap">
                                  {store.currency_symbol}
                                  {item.unit_selling_price}
                                </td>
                                <td className="py-1 text-right font-semibold whitespace-nowrap">
                                  {store.currency_symbol}
                                  {item.total_price}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* TOTALS & CALCULATIONS */}
                      <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>
                            {store.currency_symbol}
                            {sale.subtotal}
                          </span>
                        </div>
                        {store.receipt_show_discount && sale.discount_amount > 0 && (
                          <div className="flex justify-between text-emerald-700 font-semibold">
                            <span>Discount ({sale.discount_percentage}%):</span>
                            <span>
                              -{store.currency_symbol}
                              {sale.discount_amount}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                          <span>GRAND TOTAL:</span>
                          <span>
                            {store.currency_symbol}
                            {sale.grand_total}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-700">
                          <span>Payment Method:</span>
                          <span className="uppercase font-semibold">{sale.payment_method}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span>Paid Amount:</span>
                          <span className="font-semibold">
                            {store.currency_symbol}
                            {sale.paid_amount}
                          </span>
                        </div>
                        {sale.due_amount > 0 && (
                          <div className="flex justify-between text-xs font-bold text-rose-600 bg-rose-50 p-1 rounded">
                            <span>CUSTOMER DUE:</span>
                            <span>
                              {store.currency_symbol}
                              {sale.due_amount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* RECEIPT TYPE: DUE PAYMENT */}
            {receipt.type === 'due' && (
              <>
                {(() => {
                  const dueTx = receipt.data as CustomerDueTransaction;
                  return (
                    <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                      <div className="text-center font-bold text-xs uppercase bg-amber-100 py-1 my-1 rounded border border-amber-300">
                        CUSTOMER DUE PAYMENT RECEIPT
                      </div>
                      <div className="flex justify-between">
                        <span>Receipt ID:</span>
                        <span className="font-semibold">{dueTx.id.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date/Time:</span>
                        <span>
                          {dueTx.date} {dueTx.time}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer Name:</span>
                        <span className="font-bold">{dueTx.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mobile Number:</span>
                        <span>{dueTx.mobile}</span>
                      </div>
                      <div className="py-1 border-t border-b border-slate-200 my-1 space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Previous Due:</span>
                          <span>
                            {store.currency_symbol}
                            {dueTx.total_amount}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-700 text-xs">
                          <span>Payment Received:</span>
                          <span>
                            -{store.currency_symbol}
                            {dueTx.paid_amount}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1">
                          <span>Remaining Due:</span>
                          <span className="text-rose-600">
                            {store.currency_symbol}
                            {dueTx.balance_after}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Payment Method:</span>
                        <span className="uppercase font-semibold">{dueTx.payment_method}</span>
                      </div>
                      {dueTx.created_by && (
                        <div className="flex justify-between text-[10px]">
                          <span>Received By:</span>
                          <span>{dueTx.created_by}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {/* SELLER SIGNATURE */}
            {store.receipt_show_signature && (
              <div className="pt-4 text-center">
                {store.seller_signature ? (
                  <img
                    src={store.seller_signature}
                    alt="Seller Signature"
                    className="h-8 mx-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-6 border-b border-slate-400 w-3/4 mx-auto mb-1"></div>
                )}
                <p className="text-[9px] text-slate-600 uppercase font-sans">
                  {store.seller_name} (Authorized Signature)
                </p>
              </div>
            )}

            {/* FOOTER & RETURN POLICY */}
            <div className="text-center pt-3 mt-2 border-t border-dashed border-slate-400 space-y-1">
              {store.receipt_footer && (
                <p className="text-[10px] text-slate-800 font-sans">{store.receipt_footer}</p>
              )}
              {store.receipt_show_return_policy && store.return_policy && (
                <p className="text-[8px] text-slate-500 italic font-sans">{store.return_policy}</p>
              )}
              <div className="text-[8px] text-slate-400 pt-2 border-t border-slate-200">
                Printed: {printedAtStr} • Offline POS
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Transaction Committed to Storage</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
