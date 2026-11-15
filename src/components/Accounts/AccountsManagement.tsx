import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ExpensesManagement } from '../Expenses/ExpensesManagement';
import { CashDrawerManagement } from '../Cash/CashDrawerManagement';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Smartphone,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  ReceiptText,
  Calculator,
} from 'lucide-react';
import { FinancialAccount, PaymentMethodType } from '../../types';

type AccountsSubTab =
  | 'income'
  | 'expense'
  | 'cash_flow'
  | 'bank'
  | 'mobile_banking'
  | 'closing';

export const AccountsManagement: React.FC = () => {
  const {
    store,
    sales,
    incomes,
    expenses,
    cashFlows,
    financialAccounts,
    financialAccountTxs,
    addIncome,
    deleteIncome,
    addCashFlow,
    saveFinancialAccount,
    recordFinancialAccountTx,
  } = useApp();

  const [subTab, setSubTab] = useState<AccountsSubTab>('income');
  const [toast, setToast] = useState<string | null>(null);

  // Add Income form state
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incTitle, setIncTitle] = useState('');
  const [incCategory, setIncCategory] = useState('Commission / Rebate');
  const [incAmount, setIncAmount] = useState('');
  const [incMethod, setIncMethod] = useState<PaymentMethodType>('cash');
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [incRef, setIncRef] = useState('');
  const [incNotes, setIncNotes] = useState('');

  // Cash In / Cash Out modal state
  const [cashFlowModalType, setCashFlowModalType] = useState<'cash_in' | 'cash_out' | null>(null);
  const [cfTitle, setCfTitle] = useState('');
  const [cfAmount, setCfAmount] = useState('');
  const [cfSource, setCfSource] = useState('');
  const [cfDate, setCfDate] = useState(new Date().toISOString().split('T')[0]);
  const [cfNotes, setCfNotes] = useState('');

  // Add Bank / Mobile Banking Account modal state
  const [accModalType, setAccModalType] = useState<'bank' | 'mobile_banking' | null>(null);
  const [accProvider, setAccProvider] = useState('');
  const [accName, setAccName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [accBranchOrType, setAccBranchOrType] = useState('');
  const [accBalance, setAccBalance] = useState('0');

  // Deposit / Withdraw modal state
  const [txTarget, setTxTarget] = useState<{
    account: FinancialAccount;
    txType: 'deposit' | 'withdraw';
  } | null>(null);
  const [txAmount, setTxAmount] = useState('');
  const [txRef, setTxRef] = useState('');
  const [txNotes, setTxNotes] = useState('');

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const posSalesCollected = useMemo(
    () =>
      sales
        .filter((s) => s.status !== 'voided')
        .reduce((sum, s) => sum + (s.paid_amount || 0), 0),
    [sales]
  );

  const otherIncomeTotal = useMemo(
    () => incomes.reduce((sum, i) => sum + i.amount, 0),
    [incomes]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const totalCashIn = useMemo(
    () => cashFlows.filter((c) => c.type === 'cash_in').reduce((s, c) => s + c.amount, 0),
    [cashFlows]
  );

  const totalCashOut = useMemo(
    () => cashFlows.filter((c) => c.type === 'cash_out').reduce((s, c) => s + c.amount, 0),
    [cashFlows]
  );

  const bankAccounts = useMemo(
    () => financialAccounts.filter((a) => a.account_type === 'bank'),
    [financialAccounts]
  );

  const mobileAccounts = useMemo(
    () => financialAccounts.filter((a) => a.account_type === 'mobile_banking'),
    [financialAccounts]
  );

  const totalBankAndMobileBalance = useMemo(
    () => financialAccounts.reduce((s, a) => s + a.balance, 0),
    [financialAccounts]
  );

  const handleCreateIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(incAmount);
    if (!incTitle.trim() || !Number.isFinite(amt) || amt <= 0) return;
    addIncome({
      title: incTitle.trim(),
      category: incCategory.trim() || 'Other Income',
      amount: amt,
      date: incDate,
      time: new Date().toTimeString().slice(0, 8),
      payment_method: incMethod,
      reference: incRef.trim() || undefined,
      notes: incNotes.trim() || undefined,
    });
    setShowIncomeModal(false);
    setIncTitle('');
    setIncAmount('');
    setIncRef('');
    setIncNotes('');
    showNotice('Income entry recorded.');
  };

  const handleCreateCashFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashFlowModalType) return;
    const amt = parseFloat(cfAmount);
    if (!cfTitle.trim() || !Number.isFinite(amt) || amt <= 0) return;
    addCashFlow({
      type: cashFlowModalType,
      title: cfTitle.trim(),
      amount: amt,
      source_or_purpose: cfSource.trim() || (cashFlowModalType === 'cash_in' ? 'Owner Cash Inject' : 'Petty Cash Out'),
      date: cfDate,
      time: new Date().toTimeString().slice(0, 8),
      notes: cfNotes.trim() || undefined,
    });
    setCashFlowModalType(null);
    setCfTitle('');
    setCfAmount('');
    setCfSource('');
    setCfNotes('');
    showNotice(cashFlowModalType === 'cash_in' ? 'Cash In recorded.' : 'Cash Out recorded.');
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accModalType || !accProvider.trim() || !accName.trim() || !accNumber.trim()) return;
    const now = new Date().toISOString();
    saveFinancialAccount({
      id: `facc_${Date.now()}`,
      account_type: accModalType,
      provider_name: accProvider.trim(),
      account_name: accName.trim(),
      account_number: accNumber.trim(),
      branch_or_type: accBranchOrType.trim() || undefined,
      balance: parseFloat(accBalance) || 0,
      active: true,
      created_at: now,
      updated_at: now,
    });
    setAccModalType(null);
    setAccProvider('');
    setAccName('');
    setAccNumber('');
    setAccBranchOrType('');
    setAccBalance('0');
    showNotice('Account added.');
  };

  const handleRecordAccountTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTarget) return;
    const amt = parseFloat(txAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const now = new Date();
    recordFinancialAccountTx({
      account_id: txTarget.account.id,
      tx_type: txTarget.txType,
      amount: amt,
      reference: txRef.trim() || undefined,
      notes: txNotes.trim() || undefined,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 8),
    });
    setTxTarget(null);
    setTxAmount('');
    setTxRef('');
    setTxNotes('');
    showNotice('Account transaction posted.');
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen text-slate-800 space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#5b46b5] text-white flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Accounts Management</h1>
            <p className="text-xs text-slate-500">
              Income, Expense, Cash In / Cash Out, Bank Accounts, Mobile Banking & Daily Cash Closing
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>POS + Other Income</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-emerald-700 mt-1">
            {store.currency_symbol}{(posSalesCollected + otherIncomeTotal).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">
            Other: {store.currency_symbol}{otherIncomeTotal.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            <span>Total Expenses</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-rose-600 mt-1">
            {store.currency_symbol}{totalExpenses.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">{expenses.length} vouchers</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>Petty Cash In</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-blue-700 mt-1">
            {store.currency_symbol}{totalCashIn.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">Net: {store.currency_symbol}{(totalCashIn - totalCashOut).toLocaleString()}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
            <span>Petty Cash Out</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-amber-700 mt-1">
            {store.currency_symbol}{totalCashOut.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">{cashFlows.length} entries</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5 text-[#5b46b5]" />
            <span>Bank & Mobile Balance</span>
          </div>
          <div className="text-lg font-extrabold font-mono text-[#5b46b5] mt-1">
            {store.currency_symbol}{totalBankAndMobileBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">{financialAccounts.length} accounts</div>
        </div>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-print">
        {[
          { id: 'income', label: 'Income', icon: TrendingUp },
          { id: 'expense', label: 'Expense', icon: TrendingDown },
          { id: 'cash_flow', label: 'Cash In / Cash Out', icon: ArrowDownLeft },
          { id: 'bank', label: 'Bank Accounts', icon: Landmark },
          { id: 'mobile_banking', label: 'Mobile Banking', icon: Smartphone },
          { id: 'closing', label: 'Daily Cash Closing', icon: Calculator },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as AccountsSubTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? 'bg-[#5b46b5] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: INCOME */}
      {subTab === 'income' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Other Income Ledger</h2>
              <p className="text-[11px] text-slate-500">
                POS Sales Paid: {store.currency_symbol}{posSalesCollected.toLocaleString()} · Recorded Other Income: {store.currency_symbol}{otherIncomeTotal.toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIncomeModal(true)}
              className="px-3.5 py-2 bg-[#ec1f73] hover:bg-[#d61665] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Other Income</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Voucher #</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Title & Reference</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incomes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No additional income entries yet.
                    </td>
                  </tr>
                ) : (
                  incomes.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-[#5b46b5]">{inc.income_number}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{inc.date}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-800">{inc.title}</div>
                        {inc.reference && <div className="text-[10px] text-slate-400">Ref: {inc.reference}</div>}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{inc.category}</td>
                      <td className="py-2 px-3 uppercase font-semibold text-slate-600">{inc.payment_method}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        +{store.currency_symbol}{inc.amount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            deleteIncome(inc.id);
                            showNotice('Income entry removed.');
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSE (EMBED EXISTING MODULE) */}
      {subTab === 'expense' && (
        <div className="-m-4 sm:-m-6">
          <ExpensesManagement />
        </div>
      )}

      {/* TAB 3: CASH IN / CASH OUT */}
      {subTab === 'cash_flow' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Cash In & Cash Out Register</h2>
              <p className="text-[11px] text-slate-500">
                Track owner cash deposits, hand-cash transfers, and petty cash withdrawals.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCashFlowModalType('cash_in')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Cash In</span>
              </button>
              <button
                type="button"
                onClick={() => setCashFlowModalType('cash_out')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>- Cash Out</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Entry #</th>
                  <th className="py-2 px-3">Date / Time</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Title</th>
                  <th className="py-2 px-3">Source / Purpose</th>
                  <th className="py-2 px-3">By</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashFlows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No cash in/out entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  cashFlows.map((cf) => (
                    <tr key={cf.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-700">{cf.entry_number}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{cf.date} {cf.time}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            cf.type === 'cash_in'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {cf.type === 'cash_in' ? 'Cash In' : 'Cash Out'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-800">{cf.title}</td>
                      <td className="py-2 px-3 text-slate-600">{cf.source_or_purpose}</td>
                      <td className="py-2 px-3 text-slate-500">{cf.created_by}</td>
                      <td
                        className={`py-2 px-3 text-right font-mono font-bold ${
                          cf.type === 'cash_in' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {cf.type === 'cash_in' ? '+' : '-'}
                        {store.currency_symbol}{cf.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4 & 5: BANK ACCOUNTS / MOBILE BANKING */}
      {(subTab === 'bank' || subTab === 'mobile_banking') && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {subTab === 'bank' ? 'Bank Accounts' : 'Mobile Banking Wallets (bKash / Nagad / Rocket)'}
              </h2>
              <button
                type="button"
                onClick={() => setAccModalType(subTab)}
                className="px-3.5 py-2 bg-[#5b46b5] hover:bg-[#4b389b] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{subTab === 'bank' ? 'Add Bank Account' : 'Add Mobile Wallet'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(subTab === 'bank' ? bankAccounts : mobileAccounts).map((acc) => (
                <div key={acc.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-[#5b46b5] uppercase">{acc.provider_name}</div>
                      <div className="text-sm font-bold text-slate-900">{acc.account_name}</div>
                      <div className="text-xs font-mono text-slate-500">{acc.account_number}</div>
                      {acc.branch_or_type && (
                        <div className="text-[10px] text-slate-400">{acc.branch_or_type}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Balance</div>
                      <div className="text-base font-extrabold font-mono text-slate-900">
                        {store.currency_symbol}{acc.balance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setTxTarget({ account: acc, txType: 'deposit' })}
                      className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      + Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxTarget({ account: acc, txType: 'withdraw' })}
                      className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      - Withdraw
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ReceiptText className="w-4 h-4 text-[#5b46b5]" />
              <span>Recent Account Transactions</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Account</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Reference / Notes</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financialAccountTxs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No deposits or withdrawals recorded yet.
                      </td>
                    </tr>
                  ) : (
                    financialAccountTxs.slice(0, 30).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-500">{tx.date} {tx.time}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{tx.account_name}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.tx_type === 'deposit'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {tx.tx_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {tx.reference || tx.notes || '—'}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${
                            tx.tx_type === 'deposit' ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {tx.tx_type === 'deposit' ? '+' : '-'}
                          {store.currency_symbol}{tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DAILY CASH CLOSING */}
      {subTab === 'closing' && (
        <div className="-m-4 sm:-m-6">
          <CashDrawerManagement />
        </div>
      )}

      {/* ADD INCOME MODAL */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateIncome} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Record Other Income</h3>
              <button type="button" onClick={() => setShowIncomeModal(false)} className="text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Income Title *</label>
              <input type="text" required value={incTitle} onChange={(e) => setIncTitle(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <input type="text" value={incCategory} onChange={(e) => setIncCategory(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount *</label>
                <input type="number" step="any" min="0.01" required value={incAmount} onChange={(e) => setIncAmount(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select value={incMethod} onChange={(e) => setIncMethod(e.target.value as PaymentMethodType)} className="w-full border border-slate-300 rounded-xl px-3 py-2">
                  <option value="cash">Cash</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input type="date" value={incDate} onChange={(e) => setIncDate(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reference</label>
              <input type="text" value={incRef} onChange={(e) => setIncRef(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowIncomeModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl font-semibold cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#ec1f73] text-white rounded-xl font-bold cursor-pointer">Save Income</button>
            </div>
          </form>
        </div>
      )}

      {/* CASH IN / OUT MODAL */}
      {cashFlowModalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateCashFlow} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                {cashFlowModalType === 'cash_in' ? 'Record Cash In' : 'Record Cash Out'}
              </h3>
              <button type="button" onClick={() => setCashFlowModalType(null)} className="text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Title *</label>
              <input type="text" required value={cfTitle} onChange={(e) => setCfTitle(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount *</label>
                <input type="number" step="any" min="0.01" required value={cfAmount} onChange={(e) => setCfAmount(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input type="date" value={cfDate} onChange={(e) => setCfDate(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Source / Purpose</label>
              <input type="text" value={cfSource} onChange={(e) => setCfSource(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCashFlowModalType(null)} className="px-4 py-2 border border-slate-200 rounded-xl font-semibold cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#5b46b5] text-white rounded-xl font-bold cursor-pointer">Save Entry</button>
            </div>
          </form>
        </div>
      )}

      {/* ADD BANK / MOBILE ACCOUNT MODAL */}
      {accModalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateAccount} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                {accModalType === 'bank' ? 'Add Bank Account' : 'Add Mobile Banking Wallet'}
              </h3>
              <button type="button" onClick={() => setAccModalType(null)} className="text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {accModalType === 'bank' ? 'Bank Name *' : 'Provider (bKash / Nagad / Rocket) *'}
              </label>
              <input type="text" required value={accProvider} onChange={(e) => setAccProvider(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Title *</label>
              <input type="text" required value={accName} onChange={(e) => setAccName(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account / Wallet Number *</label>
              <input type="text" required value={accNumber} onChange={(e) => setAccNumber(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {accModalType === 'bank' ? 'Branch' : 'Wallet Type'}
                </label>
                <input type="text" value={accBranchOrType} onChange={(e) => setAccBranchOrType(e.target.value)} placeholder={accModalType === 'bank' ? 'Main Branch' : 'Merchant'} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Opening Balance</label>
                <input type="number" step="any" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAccModalType(null)} className="px-4 py-2 border border-slate-200 rounded-xl font-semibold cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#5b46b5] text-white rounded-xl font-bold cursor-pointer">Save Account</button>
            </div>
          </form>
        </div>
      )}

      {/* ACCOUNT DEPOSIT / WITHDRAW MODAL */}
      {txTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleRecordAccountTx} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 capitalize">
                {txTarget.txType} — {txTarget.account.provider_name}
              </h3>
              <button type="button" onClick={() => setTxTarget(null)} className="text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount *</label>
              <input type="number" step="any" min="0.01" required value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" autoFocus />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reference / TrxID</label>
              <input type="text" value={txRef} onChange={(e) => setTxRef(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notes</label>
              <input type="text" value={txNotes} onChange={(e) => setTxNotes(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setTxTarget(null)} className="px-4 py-2 border border-slate-200 rounded-xl font-semibold cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#ec1f73] text-white rounded-xl font-bold cursor-pointer">Confirm</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
