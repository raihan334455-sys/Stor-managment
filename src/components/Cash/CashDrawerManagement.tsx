import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wallet,
  DollarSign,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  Unlock,
  X,
  FileSpreadsheet,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
} from 'lucide-react';
import { CashSession } from '../../types';

export const CashDrawerManagement: React.FC = () => {
  const { cashSessions, sales, customerDues, expenses, store, activeUser, addAuditLog, refreshData } = useApp();

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('5000');
  const [actualCashInput, setActualCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Active open session
  const activeSession = cashSessions.find((s) => s.status === 'open');

  // Compute live amounts during this active session
  const sessionStartTime = activeSession ? new Date(activeSession.start_time).getTime() : 0;

  const currentCashSales = activeSession
    ? sales
        .filter(
          (s) =>
            s.status === 'completed' &&
            s.payment_method === 'cash' &&
            new Date(s.created_at).getTime() >= sessionStartTime
        )
        .reduce((sum, s) => sum + s.paid_amount, 0)
    : 0;

  const currentDigitalSales = activeSession
    ? sales
        .filter(
          (s) =>
            s.status === 'completed' &&
            s.payment_method !== 'cash' &&
            new Date(s.created_at).getTime() >= sessionStartTime
        )
        .reduce((sum, s) => sum + s.paid_amount, 0)
    : 0;

  const currentDueCollected = activeSession
    ? customerDues
        .filter(
          (d) =>
            d.type === 'due_payment' &&
            d.payment_method === 'cash' &&
            new Date(`${d.date}T${d.time}`).getTime() >= sessionStartTime
        )
        .reduce((sum, d) => sum + d.paid_amount, 0)
    : 0;

  const currentCashExpenses = activeSession
    ? expenses
        .filter(
          (e) =>
            e.payment_method === 'cash' &&
            new Date(e.created_at).getTime() >= sessionStartTime
        )
        .reduce((sum, e) => sum + e.amount, 0)
    : 0;

  const expectedDrawerBalance = activeSession
    ? activeSession.opening_cash + currentCashSales + currentDueCollected - currentCashExpenses
    : 0;

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const openingAmount = parseFloat(openingCashInput) || 0;

    const newSession: CashSession = {
      id: `cs_${Date.now()}`,
      cashier_id: activeUser.id,
      cashier_name: activeUser.name,
      start_time: new Date().toISOString(),
      opening_cash: openingAmount,
      total_cash_sales: 0,
      total_digital_sales: 0,
      total_due_sales: 0,
      total_cash_expenses: 0,
      total_due_collected_cash: 0,
      expected_closing_cash: openingAmount,
      status: 'open',
      branch_id: store.branch_id,
      device_id: 'DEV-POS-01',
    };

    const updated = [newSession, ...cashSessions];
    localStorage.setItem('pos_cash_sessions', JSON.stringify(updated));
    addAuditLog(
      'SHIFT_OPENED',
      'Cash Drawer',
      `Cash register drawer shift opened with float ৳${openingAmount} by ${activeUser.name}`
    );
    refreshData();
    setShowOpenModal(false);
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const actualCash = parseFloat(actualCashInput) || 0;
    const discrepancy = actualCash - expectedDrawerBalance;

    const closedSession: CashSession = {
      ...activeSession,
      end_time: new Date().toISOString(),
      total_cash_sales: currentCashSales,
      total_digital_sales: currentDigitalSales,
      total_due_sales: 0,
      total_cash_expenses: currentCashExpenses,
      total_due_collected_cash: currentDueCollected,
      expected_closing_cash: expectedDrawerBalance,
      actual_closing_cash: actualCash,
      discrepancy,
      status: 'closed',
      notes: closingNotes.trim() || undefined,
    };

    const updated = cashSessions.map((s) => (s.id === activeSession.id ? closedSession : s));
    localStorage.setItem('pos_cash_sessions', JSON.stringify(updated));
    addAuditLog(
      'SHIFT_CLOSED',
      'Cash Drawer',
      `Shift closed by ${activeUser.name}. Expected: ৳${expectedDrawerBalance}, Actual Counted: ৳${actualCash}, Diff: ৳${discrepancy}`
    );
    refreshData();
    setShowCloseModal(false);
    setActualCashInput('');
    setClosingNotes('');
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Wallet className="w-6 h-6 text-blue-600" />
            <span>Cash Drawer & Cashier Shift Reconciliation</span>
          </h1>
          <p className="text-xs text-slate-500">
            Monitor real-time cash flow, drawer opening float, and shift-end cash count reconciliations.
          </p>
        </div>
        <div>
          {activeSession ? (
            <button
              onClick={() => {
                setActualCashInput(expectedDrawerBalance.toString());
                setShowCloseModal(true);
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Close Shift & Balance Drawer</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors"
            >
              <Unlock className="w-4 h-4" />
              <span>Open New Cash Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Dashboard */}
      {activeSession ? (
        <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <span>Active Drawer Shift</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                    LIVE
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Opened by <span className="font-semibold text-slate-700">{activeSession.cashier_name}</span> at{' '}
                  <span className="font-mono">{new Date(activeSession.start_time).toLocaleTimeString()}</span>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
              <span className="text-[11px] text-slate-500 font-semibold uppercase block">
                Calculated System Cash
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-700">
                {store.currency_symbol}
                {expectedDrawerBalance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Opening Cash Float</span>
              <div className="text-lg font-bold font-mono text-slate-800 mt-1">
                {store.currency_symbol}
                {activeSession.opening_cash.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-800 font-bold uppercase flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                <span>Cash Sales In</span>
              </span>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                +{store.currency_symbol}
                {currentCashSales.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-[10px] text-blue-800 font-bold uppercase flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-blue-600" />
                <span>Due Collected (Cash)</span>
              </span>
              <div className="text-lg font-bold font-mono text-blue-700 mt-1">
                +{store.currency_symbol}
                {currentDueCollected.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-100">
              <span className="text-[10px] text-rose-800 font-bold uppercase flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                <span>Cash Expenses Out</span>
              </span>
              <div className="text-lg font-bold font-mono text-rose-700 mt-1">
                -{store.currency_symbol}
                {currentCashExpenses.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No Cash Register Shift Active</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Opening a cash shift allows tracking opening cash float, daily cash receipts, and end-of-day
            reconciliation.
          </p>
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
          >
            Start Shift & Open Drawer
          </button>
        </div>
      )}

      {/* Shift History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span>Shift Reconciliations & Audit History</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {cashSessions.length} total shifts recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                <th className="p-3">SHIFT ID</th>
                <th className="p-3">CASHIER</th>
                <th className="p-3">TIMESTAMPS</th>
                <th className="p-3 text-right">OPEN FLOAT</th>
                <th className="p-3 text-right">CASH SALES</th>
                <th className="p-3 text-right">EXPENSES</th>
                <th className="p-3 text-right">EXPECTED</th>
                <th className="p-3 text-right">ACTUAL COUNT</th>
                <th className="p-3 text-center">STATUS / DIFF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cashSessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-600">{sess.id}</td>
                  <td className="p-3 font-semibold text-slate-800">{sess.cashier_name}</td>
                  <td className="p-3 text-slate-500 font-mono text-[11px]">
                    <div>Start: {new Date(sess.start_time).toLocaleString()}</div>
                    {sess.end_time && (
                      <div>End: {new Date(sess.end_time).toLocaleString()}</div>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {store.currency_symbol}
                    {sess.opening_cash.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
                    {store.currency_symbol}
                    {sess.total_cash_sales.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-600 font-semibold">
                    {store.currency_symbol}
                    {sess.total_cash_expenses.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">
                    {store.currency_symbol}
                    {sess.expected_closing_cash.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    {sess.actual_closing_cash !== undefined
                      ? `${store.currency_symbol}${sess.actual_closing_cash.toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="p-3 text-center">
                    {sess.status === 'open' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          (sess.discrepancy || 0) === 0
                            ? 'bg-slate-100 text-slate-700'
                            : (sess.discrepancy || 0) > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {(sess.discrepancy || 0) === 0
                          ? 'Balanced'
                          : (sess.discrepancy || 0) > 0
                          ? `+৳${sess.discrepancy}`
                          : `-৳${Math.abs(sess.discrepancy || 0)}`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Open Register Shift</h3>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cashier on Duty
                </label>
                <input
                  type="text"
                  disabled
                  value={activeUser.name}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opening Cash Float ({store.currency_symbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 5000"
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-bold font-mono text-emerald-700 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Amount in drawer at start of shift for customer change.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Start Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && activeSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Close Shift & Reconcile Drawer</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">System Expected Cash:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {store.currency_symbol}
                    {expectedDrawerBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Actual Physical Cash Counted ({store.currency_symbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Count notes & coins in drawer"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-bold font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {actualCashInput && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
                    parseFloat(actualCashInput) - expectedDrawerBalance === 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : parseFloat(actualCashInput) - expectedDrawerBalance > 0
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <span>Reconciliation Difference:</span>
                  <span className="font-mono text-sm">
                    {parseFloat(actualCashInput) - expectedDrawerBalance === 0
                      ? 'Perfect Match (৳0)'
                      : parseFloat(actualCashInput) - expectedDrawerBalance > 0
                      ? `+৳${(parseFloat(actualCashInput) - expectedDrawerBalance).toLocaleString()} (Surplus)`
                      : `-৳${Math.abs(parseFloat(actualCashInput) - expectedDrawerBalance).toLocaleString()} (Shortage)`}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Handover Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Handed over to Evening Cashier"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Confirm & Close Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
