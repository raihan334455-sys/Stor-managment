import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Banknote,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Tag,
  Receipt,
  FileSpreadsheet,
  X,
  Trash2,
  Clock,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Repeat,
} from 'lucide-react';
import { Expense, PaymentMethodType, RecurringExpense } from '../../types';

const DEFAULT_CATEGORIES = [
  'Utilities (Electricity/Water)',
  'Shop Rent',
  'Staff Salary & Wages',
  'Tea, Snacks & Entertainment',
  'Packaging & Shopping Bags',
  'Transport & Logistics',
  'Repairs & Maintenance',
  'Internet & Mobile Bills',
  'Government Tax & Trade License',
  'Other Operational Expense',
];

export const ExpensesManagement: React.FC = () => {
  const { expenses, recurringExpenses, store, addExpense, activeUser } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'recurring'>('daily');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Expense Form
  const [title, setTitle] = useState('');
  const [categoryName, setCategoryName] = useState(DEFAULT_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [notes, setNotes] = useState('');

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }
    if (!title.trim()) {
      alert('Please enter an expense title.');
      return;
    }

    addExpense({
      title: title.trim(),
      category_id: `cat_${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      category_name: categoryName,
      amount: numAmount,
      date,
      time: new Date().toTimeString().slice(0, 8),
      payment_method: paymentMethod,
      status: 'paid',
      voucher_number: voucherNumber.trim() || undefined,
      service_provider: serviceProvider.trim() || undefined,
      notes: notes.trim() || undefined,
      created_by: activeUser.name,
      branch_id: store.branch_id,
    });

    setShowAddModal(false);
    setTitle('');
    setAmount('');
    setVoucherNumber('');
    setServiceProvider('');
    setNotes('');
  };

  const handlePayRecurring = (rec: RecurringExpense) => {
    addExpense({
      title: rec.title,
      category_id: `cat_rec_${Date.now()}`,
      category_name: rec.category_name,
      amount: rec.amount,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 8),
      payment_method: 'cash',
      status: 'paid',
      voucher_number: `REC-${Date.now().toString().slice(-4)}`,
      notes: `Auto-recorded from recurring bill: ${rec.notes || rec.title}`,
      created_by: activeUser.name,
      branch_id: store.branch_id,
    });
    alert(`Recorded ৳${rec.amount} payment for '${rec.title}' as daily expense.`);
  };

  // Calculations
  const today = new Date().toISOString().slice(0, 10);
  const thisMonthPrefix = today.slice(0, 7);

  const todayExpenses = expenses.filter((e) => e.date === today);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const thisMonthExpenses = expenses.filter((e) => e.date.startsWith(thisMonthPrefix));
  const monthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const totalAllTime = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      e.title.toLowerCase().includes(q) ||
      e.category_name.toLowerCase().includes(q) ||
      (e.voucher_number && e.voucher_number.toLowerCase().includes(q));
    const matchCat = selectedCategory === 'all' || e.category_name === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Banknote className="w-6 h-6 text-blue-600" />
            <span>Store Expenses & Bills Management</span>
          </h1>
          <p className="text-xs text-slate-500">
            Track daily operating costs, utility bills, salaries, and recurring shop overheads.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Today's Expenses</span>
            <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
              {store.currency_symbol}
              {todayTotal.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">
              {todayExpenses.length} entries today
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">This Month's Overhead</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {store.currency_symbol}
              {monthTotal.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 inline-block">
              {thisMonthExpenses.length} entries this month
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total All-Time Operating Cost</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {store.currency_symbol}
              {totalAllTime.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">Cumulative Total</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
            <Banknote className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub-tabs: Daily Log vs Recurring Bills */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('daily')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeSubTab === 'daily'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Daily Expense Log</span>
        </button>
        <button
          onClick={() => setActiveSubTab('recurring')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeSubTab === 'recurring'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Recurring Monthly Bills ({recurringExpenses.length})</span>
        </button>
      </div>

      {activeSubTab === 'daily' ? (
        /* Daily Expenses Table */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, category, or voucher #..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
              >
                <option value="all">All Categories</option>
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredExpenses.length} entries
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                  <th className="p-3">EXPENSE #</th>
                  <th className="p-3">DATE & TIME</th>
                  <th className="p-3">TITLE / DESCRIPTION</th>
                  <th className="p-3">CATEGORY</th>
                  <th className="p-3 text-center">METHOD</th>
                  <th className="p-3 text-right">AMOUNT</th>
                  <th className="p-3">RECORDED BY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-600">{exp.expense_number}</td>
                    <td className="p-3 text-slate-500 font-mono">
                      {exp.date} {exp.time}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      <div>{exp.title}</div>
                      {exp.voucher_number && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Voucher: #{exp.voucher_number}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {exp.category_name}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {exp.payment_method}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">
                      {store.currency_symbol}
                      {exp.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-600">{exp.created_by}</td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No expenses found for the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Recurring Monthly Overheads */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Fixed Monthly & Weekly Overheads</h3>
              <p className="text-xs text-slate-500">
                Quickly record routine overhead payments without typing every time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recurringExpenses.map((rec) => (
              <div
                key={rec.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-800 text-sm">{rec.title}</div>
                  <div className="text-xs text-slate-500">{rec.category_name}</div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                    <span className="capitalize font-medium">{rec.frequency} schedule</span>
                    <span>•</span>
                    <span>Due Day: {rec.due_day_of_month}th</span>
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <div className="font-mono font-bold text-base text-rose-600">
                    {store.currency_symbol}
                    {rec.amount.toLocaleString()}
                  </div>
                  <button
                    onClick={() => handlePayRecurring(rec)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    Pay & Log Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">Record Store Expense</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Title / Item *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DESCO Electric Bill / Staff Evening Tea"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount ({store.currency_symbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-bold font-mono text-rose-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="cash">Cash Drawer</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="bank">Bank Wire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher / Bill #</label>
                  <input
                    type="text"
                    placeholder="e.g. VC-1049"
                    value={voucherNumber}
                    onChange={(e) => setVoucherNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional notes or supplier reference"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
