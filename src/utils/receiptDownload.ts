import { Customer, CustomerDueTransaction, Sale, StoreSettings, Supplier, SupplierDueTransaction } from '../types';
import { getMobilePurchaseStats } from './customerPurchaseStats';

export type UnifiedReceiptPayload =
  | { type: 'sale'; data: Sale }
  | { type: 'due'; data: CustomerDueTransaction }
  | { type: 'supplier_due'; data: SupplierDueTransaction };

export interface DownloadContextData {
  store: StoreSettings;
  customers: Customer[];
  customerDues: CustomerDueTransaction[];
  suppliers: Supplier[];
  supplierDues: SupplierDueTransaction[];
  sales?: Sale[];
}

interface DrawLine {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  size?: number;
  color?: string;
  rightText?: string;
  rightColor?: string;
  boxBg?: string;
  boxBorder?: string;
}

export function resolveCustomerForSale(sale: Sale, customers: Customer[]): Customer | undefined {
  if (sale.customer_id) {
    const byId = customers.find((c) => c.id === sale.customer_id);
    if (byId) return byId;
  }
  const mob = (sale.customer_mobile || '').trim();
  if (mob) {
    return customers.find((c) => (c.mobile || '').trim() === mob);
  }
  return undefined;
}

export function isReceiptDueCleared(
  receipt: UnifiedReceiptPayload,
  ctx: Pick<DownloadContextData, 'customers' | 'suppliers'>
): boolean {
  if (receipt.type === 'sale') {
    const sale = receipt.data;
    if (sale.due_amount <= 0) return true;
    const cust = resolveCustomerForSale(sale, ctx.customers);
    return cust !== undefined && (cust.total_due_amount || 0) <= 0.01;
  }
  if (receipt.type === 'due') {
    const dueTx = receipt.data;
    if (dueTx.balance_after <= 0.01) return true;
    const cust =
      ctx.customers.find((c) => c.id === dueTx.customer_id) ||
      ctx.customers.find((c) => (c.mobile || '').trim() === (dueTx.mobile || '').trim());
    return cust !== undefined && (cust.total_due_amount || 0) <= 0.01;
  }
  const supTx = receipt.data;
  if (supTx.balance_after <= 0.01) return true;
  const sup = ctx.suppliers.find((s) => s.id === supTx.supplier_id);
  return sup !== undefined && (sup.total_due || 0) <= 0.01;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

export function renderReceiptCanvas(
  receipt: UnifiedReceiptPayload,
  data: DownloadContextData
): { canvas: HTMLCanvasElement; fileSlug: string } | null {
  const { store, customers, customerDues, suppliers, supplierDues } = data;
  const sym = store.currency_symbol || '৳';
  const lines: DrawLine[] = [];

  // Header
  lines.push({ text: store.store_name.toUpperCase(), align: 'center', bold: true, size: 22, color: '#0f172a' });
  if (store.store_address) {
    lines.push({ text: store.store_address, align: 'center', size: 13, color: '#475569' });
  }
  if (store.store_phone) {
    lines.push({ text: `Phone: ${store.store_phone}`, align: 'center', size: 13, color: '#475569' });
  }
  if (store.receipt_header) {
    store.receipt_header.split('\n').forEach((hl) => {
      if (hl.trim()) lines.push({ text: hl.trim(), align: 'center', size: 12, color: '#64748b' });
    });
  }
  lines.push({ text: '------------------------------------------------', align: 'center', size: 13, color: '#94a3b8' });

  let fileSlug = 'receipt';

  if (receipt.type === 'sale') {
    const sale = receipt.data;
    fileSlug = sale.invoice_number;
    const liveCust = resolveCustomerForSale(sale, customers);
    const isDueClearedLater =
      sale.due_amount > 0 && liveCust !== undefined && (liveCust.total_due_amount || 0) <= 0.01;
    const latestClear = isDueClearedLater
      ? customerDues.find(
          (d) => d.customer_id === liveCust.id && d.type === 'due_payment' && d.balance_after <= 0.01
        )
      : undefined;

    lines.push({
      text: isDueClearedLater
        ? 'SALES INVOICE • DUE CLEARED'
        : sale.due_amount > 0
        ? 'SALES INVOICE (DUE)'
        : 'SALES PAYMENT RECEIPT',
      align: 'center',
      bold: true,
      size: 14,
      color: isDueClearedLater || sale.due_amount <= 0 ? '#065f46' : '#9f1239',
      boxBg: isDueClearedLater || sale.due_amount <= 0 ? '#d1fae5' : '#ffe4e6',
      boxBorder: isDueClearedLater || sale.due_amount <= 0 ? '#10b981' : '#fb7185',
    });

    lines.push({ text: 'INVOICE #:', rightText: sale.invoice_number, bold: true, size: 14 });
    lines.push({ text: 'Date/Time:', rightText: `${sale.date} ${sale.time}`, size: 13, color: '#475569' });
    if (store.receipt_show_seller) {
      lines.push({ text: 'Seller:', rightText: sale.seller_name, size: 13, color: '#475569' });
    }
    if (store.receipt_show_customer) {
      lines.push({ text: 'Customer:', rightText: sale.customer_name, bold: true, size: 13 });
      if (sale.customer_mobile) {
        lines.push({ text: 'Mobile:', rightText: sale.customer_mobile, size: 13, color: '#475569' });
        if (data.sales) {
          const mStats = getMobilePurchaseStats(sale.customer_mobile, data.sales, sale.customer_id);
          if (mStats.totalOrders > 0) {
            lines.push({
              text: 'Mobile Total Bought:',
              rightText: `${mStats.totalProductQuantity} pcs (${mStats.totalOrders} Orders)`,
              size: 12,
              color: '#5b46b5',
              rightColor: '#5b46b5',
            });
          }
        }
      }
    }

    lines.push({ text: '------------------------------------------------', align: 'center', size: 13, color: '#94a3b8' });
    lines.push({ text: 'ITEM DETAILS', rightText: 'TOTAL', bold: true, size: 13, color: '#334155' });

    sale.items.forEach((it) => {
      lines.push({
        text: `${it.product_name} (${it.variant_name})`,
        size: 13,
        bold: true,
        color: '#0f172a',
      });
      lines.push({
        text: `  ${it.quantity} ${it.unit} x ${sym}${it.unit_selling_price}`,
        rightText: `${sym}${it.total_price}`,
        size: 12,
        color: '#475569',
      });
    });

    lines.push({ text: '------------------------------------------------', align: 'center', size: 13, color: '#94a3b8' });
    lines.push({ text: 'Subtotal:', rightText: `${sym}${sale.subtotal}`, size: 14 });
    if (store.receipt_show_discount && sale.discount_amount > 0) {
      lines.push({
        text: `Discount (${sale.discount_percentage}%):`,
        rightText: `-${sym}${sale.discount_amount}`,
        size: 14,
        color: '#047857',
        rightColor: '#047857',
      });
    }
    lines.push({
      text: 'GRAND TOTAL:',
      rightText: `${sym}${sale.grand_total}`,
      bold: true,
      size: 17,
      color: '#0f172a',
    });
    lines.push({
      text: 'Payment Method:',
      rightText: sale.payment_method.toUpperCase(),
      size: 13,
      color: '#334155',
    });
    lines.push({
      text: 'Paid at Sale:',
      rightText: `${sym}${sale.paid_amount}`,
      bold: true,
      size: 14,
    });

    if (sale.due_amount > 0 && isDueClearedLater) {
      lines.push({
        text: 'Initial Invoice Due:',
        rightText: `${sym}${sale.due_amount} (Settled)`,
        size: 13,
        color: '#64748b',
      });
      lines.push({
        text: `*** DUE CLEARED / পরিশোধিত ***\nCurrent Balance: ${sym}0 (CLEAR)${
          latestClear ? `\nCleared On: ${latestClear.date} ${latestClear.time}` : ''
        }`,
        align: 'center',
        bold: true,
        size: 15,
        color: '#065f46',
        boxBg: '#ecfdf5',
        boxBorder: '#10b981',
      });
    } else if (sale.due_amount > 0) {
      lines.push({
        text: `CUSTOMER DUE: ${sym}${sale.due_amount}`,
        align: 'center',
        bold: true,
        size: 15,
        color: '#9f1239',
        boxBg: '#fff1f2',
        boxBorder: '#fb7185',
      });
    } else {
      lines.push({
        text: '*** PAYMENT STATUS: PAID / CLEAR ***',
        align: 'center',
        bold: true,
        size: 14,
        color: '#065f46',
        boxBg: '#ecfdf5',
        boxBorder: '#10b981',
      });
    }
  } else if (receipt.type === 'due') {
    const dueTx = receipt.data;
    fileSlug = `DUE-${dueTx.id.slice(-8).toUpperCase()}`;
    const liveCust =
      customers.find((c) => c.id === dueTx.customer_id) ||
      customers.find((c) => (c.mobile || '').trim() === (dueTx.mobile || '').trim());
    const isCleared =
      dueTx.balance_after <= 0.01 || (liveCust !== undefined && (liveCust.total_due_amount || 0) <= 0.01);
    const latestClear =
      isCleared && dueTx.balance_after > 0.01 && liveCust
        ? customerDues.find(
            (d) => d.customer_id === liveCust.id && d.type === 'due_payment' && d.balance_after <= 0.01
          )
        : undefined;

    lines.push({
      text: isCleared ? 'DUE CLEARED PAYMENT RECEIPT' : 'CUSTOMER DUE PAYMENT RECEIPT',
      align: 'center',
      bold: true,
      size: 15,
      color: isCleared ? '#065f46' : '#92400e',
      boxBg: isCleared ? '#d1fae5' : '#fef3c7',
      boxBorder: isCleared ? '#10b981' : '#f59e0b',
    });
    lines.push({ text: 'Receipt ID:', rightText: dueTx.id.slice(-8).toUpperCase(), bold: true, size: 14 });
    lines.push({ text: 'Date/Time:', rightText: `${dueTx.date} ${dueTx.time}`, size: 13, color: '#475569' });
    lines.push({ text: 'Customer:', rightText: dueTx.customer_name, bold: true, size: 14 });
    lines.push({ text: 'Mobile:', rightText: dueTx.mobile, size: 13, color: '#475569' });
    if (dueTx.mobile && data.sales) {
      const mStats = getMobilePurchaseStats(dueTx.mobile, data.sales, dueTx.customer_id);
      if (mStats.totalOrders > 0) {
        lines.push({
          text: 'Mobile Total Bought:',
          rightText: `${mStats.totalProductQuantity} pcs (${mStats.totalOrders} Orders)`,
          size: 12,
          color: '#5b46b5',
          rightColor: '#5b46b5',
        });
      }
    }
    lines.push({ text: '------------------------------------------------', align: 'center', size: 13, color: '#94a3b8' });
    lines.push({ text: 'Previous Due:', rightText: `${sym}${dueTx.total_amount}`, size: 14 });
    lines.push({
      text: 'Payment Received:',
      rightText: `-${sym}${dueTx.paid_amount}`,
      bold: true,
      size: 15,
      color: '#047857',
      rightColor: '#047857',
    });
    lines.push({
      text: dueTx.balance_after > 0.01 && isCleared ? 'Balance After Pay:' : 'Remaining Due:',
      rightText: `${sym}${dueTx.balance_after}${dueTx.balance_after <= 0.01 ? ' (CLEAR)' : ''}`,
      bold: true,
      size: 15,
      rightColor: isCleared ? '#047857' : '#e11d48',
    });
    if (dueTx.balance_after > 0.01 && isCleared) {
      lines.push({
        text: 'Current Account Due:',
        rightText: `${sym}0 (CLEARED)`,
        bold: true,
        size: 15,
        color: '#047857',
        rightColor: '#047857',
      });
    }
    if (isCleared) {
      lines.push({
        text: `*** DUE CLEARED / পরিশোধিত ***\nSTATUS: ALL DUES PAID IN FULL${
          latestClear ? `\nCleared On: ${latestClear.date} ${latestClear.time}` : ''
        }`,
        align: 'center',
        bold: true,
        size: 15,
        color: '#065f46',
        boxBg: '#ecfdf5',
        boxBorder: '#10b981',
      });
    }
    lines.push({
      text: 'Payment Method:',
      rightText: (dueTx.payment_method || 'cash').toUpperCase(),
      size: 13,
      color: '#334155',
    });
    if (dueTx.created_by) {
      lines.push({ text: 'Received By:', rightText: dueTx.created_by, size: 13, color: '#475569' });
    }
  } else {
    const supTx = receipt.data;
    fileSlug = `SUP-DUE-${supTx.id.slice(-8).toUpperCase()}`;
    const liveSup = suppliers.find((s) => s.id === supTx.supplier_id);
    const isSupCleared =
      supTx.balance_after <= 0.01 || (liveSup !== undefined && (liveSup.total_due || 0) <= 0.01);
    const latestSupClear =
      isSupCleared && supTx.balance_after > 0.01 && liveSup
        ? supplierDues.find(
            (d) => d.supplier_id === liveSup.id && d.type === 'due_payment' && d.balance_after <= 0.01
          )
        : undefined;

    lines.push({
      text: isSupCleared ? 'SUPPLIER DUE CLEARED RECEIPT' : 'SUPPLIER DUE PAYMENT RECEIPT',
      align: 'center',
      bold: true,
      size: 15,
      color: isSupCleared ? '#065f46' : '#92400e',
      boxBg: isSupCleared ? '#d1fae5' : '#fef3c7',
      boxBorder: isSupCleared ? '#10b981' : '#f59e0b',
    });
    lines.push({ text: 'Receipt ID:', rightText: supTx.id.slice(-8).toUpperCase(), bold: true, size: 14 });
    lines.push({ text: 'Date/Time:', rightText: `${supTx.date} ${supTx.time}`, size: 13, color: '#475569' });
    lines.push({ text: 'Supplier:', rightText: supTx.supplier_name, bold: true, size: 14 });
    if (liveSup?.mobile) {
      lines.push({ text: 'Mobile:', rightText: liveSup.mobile, size: 13, color: '#475569' });
    }
    lines.push({ text: '------------------------------------------------', align: 'center', size: 13, color: '#94a3b8' });
    lines.push({ text: 'Previous Payable:', rightText: `${sym}${supTx.total_amount}`, size: 14 });
    lines.push({
      text: 'Payment Made:',
      rightText: `-${sym}${supTx.paid_amount}`,
      bold: true,
      size: 15,
      color: '#047857',
      rightColor: '#047857',
    });
    lines.push({
      text: supTx.balance_after > 0.01 && isSupCleared ? 'Balance After Pay:' : 'Remaining Payable:',
      rightText: `${sym}${supTx.balance_after}${supTx.balance_after <= 0.01 ? ' (CLEAR)' : ''}`,
      bold: true,
      size: 15,
      rightColor: isSupCleared ? '#047857' : '#e11d48',
    });
    if (supTx.balance_after > 0.01 && isSupCleared) {
      lines.push({
        text: 'Current Supplier Due:',
        rightText: `${sym}0 (CLEARED)`,
        bold: true,
        size: 15,
        color: '#047857',
        rightColor: '#047857',
      });
    }
    if (isSupCleared) {
      lines.push({
        text: `*** DUE CLEARED / পরিশোধিত ***\nSTATUS: SUPPLIER DUE PAID IN FULL${
          latestSupClear ? `\nCleared On: ${latestSupClear.date} ${latestSupClear.time}` : ''
        }`,
        align: 'center',
        bold: true,
        size: 15,
        color: '#065f46',
        boxBg: '#ecfdf5',
        boxBorder: '#10b981',
      });
    }
    lines.push({
      text: 'Payment Method:',
      rightText: (supTx.payment_method || 'cash').toUpperCase(),
      size: 13,
      color: '#334155',
    });
    if (supTx.created_by) {
      lines.push({ text: 'Paid By:', rightText: supTx.created_by, size: 13, color: '#475569' });
    }
  }

  // Footer
  lines.push({ text: '------------------------------------------------', align: 'center', size: 13, color: '#94a3b8' });
  if (store.receipt_show_signature) {
    lines.push({ text: `${store.seller_name} (Authorized Signature)`, align: 'center', size: 12, color: '#475569' });
  }
  if (store.receipt_footer) {
    store.receipt_footer.split('\n').forEach((fl) => {
      if (fl.trim()) lines.push({ text: fl.trim(), align: 'center', size: 12, color: '#334155' });
    });
  }
  lines.push({
    text: `Downloaded: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    align: 'center',
    size: 11,
    color: '#94a3b8',
  });

  // Measure height dynamically
  const width = 580;
  const padX = 28;
  const contentWidth = width - padX * 2;
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) return null;

  interface ComputedBlock {
    line: DrawLine;
    wrapped: string[];
    height: number;
  }

  const blocks: ComputedBlock[] = [];
  let totalHeight = 32;

  for (const line of lines) {
    const fontSize = line.size || 14;
    mCtx.font = `${line.bold ? 'bold ' : ''}${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, sans-serif`;
    const subLines = line.text.split('\n');
    const wrapped: string[] = [];
    for (const s of subLines) {
      const avail = line.rightText ? contentWidth * 0.62 : contentWidth - (line.boxBg ? 20 : 0);
      wrapped.push(...wrapText(mCtx, s, avail));
    }
    const lineHeight = fontSize + 7;
    const blockH = wrapped.length * lineHeight + (line.boxBg ? 18 : 4);
    blocks.push({ line, wrapped, height: blockH });
    totalHeight += blockH;
  }
  totalHeight += 24;

  // Render crisp 2x PNG canvas
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);

  // Subtle receipt border
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, totalHeight - 20);

  let y = 30;
  for (const block of blocks) {
    const { line, wrapped, height } = block;
    const fontSize = line.size || 14;
    const lineHeight = fontSize + 7;
    ctx.font = `${line.bold ? 'bold ' : ''}${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, sans-serif`;

    if (line.boxBg) {
      ctx.fillStyle = line.boxBg;
      ctx.fillRect(padX, y - 4, contentWidth, height - 4);
      if (line.boxBorder) {
        ctx.strokeStyle = line.boxBorder;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(padX, y - 4, contentWidth, height - 4);
        ctx.setLineDash([]);
      }
    }

    const startY = line.boxBg ? y + 12 : y + fontSize;
    wrapped.forEach((wText, idx) => {
      const drawY = startY + idx * lineHeight;
      ctx.fillStyle = line.color || '#1e293b';
      if (line.align === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(wText, width / 2, drawY);
      } else if (line.align === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(wText, width - padX, drawY);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(wText, padX + (line.boxBg ? 8 : 0), drawY);
      }

      if (idx === 0 && line.rightText) {
        ctx.textAlign = 'right';
        ctx.fillStyle = line.rightColor || line.color || '#0f172a';
        ctx.fillText(line.rightText, width - padX, drawY);
      }
    });

    y += height;
  }

  return { canvas, fileSlug };
}

export function downloadReceiptAsPng(
  receipt: UnifiedReceiptPayload,
  data: DownloadContextData
): void {
  const rendered = renderReceiptCanvas(receipt, data);
  if (!rendered) return;
  const dataUrl = rendered.canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${rendered.fileSlug}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function createReceiptPngFile(
  receipt: UnifiedReceiptPayload,
  data: DownloadContextData
): Promise<File | null> {
  const rendered = renderReceiptCanvas(receipt, data);
  if (!rendered) return Promise.resolve(null);
  return new Promise((resolve) => {
    if (typeof rendered.canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }
    rendered.canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(new File([blob], `${rendered.fileSlug}.png`, { type: 'image/png' }));
      },
      'image/png'
    );
  });
}
