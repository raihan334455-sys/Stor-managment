import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UsersManagement } from '../Users/UsersManagement';
import {
  Users,
  Plus,
  Edit2,
  CalendarCheck,
  Banknote,
  ShieldCheck,
  X,
  CheckCircle2,
  Printer,
  Search,
} from 'lucide-react';
import { AttendanceStatus, Employee, PaymentMethodType, SalaryPayment } from '../../types';

type EmployeeSubTab = 'list' | 'attendance' | 'salary' | 'roles';

export const EmployeeManagement: React.FC = () => {
  const {
    store,
    employees,
    attendance,
    salaries,
    users,
    saveEmployee,
    markAttendance,
    payEmployeeSalary,
  } = useApp();

  const [subTab, setSubTab] = useState<EmployeeSubTab>('list');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Add/Edit Employee modal
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empDesig, setEmpDesig] = useState('');
  const [empDept, setEmpDept] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empAddress, setEmpAddress] = useState('');
  const [empNid, setEmpNid] = useState('');
  const [empJoining, setEmpJoining] = useState(new Date().toISOString().split('T')[0]);
  const [empSalary, setEmpSalary] = useState('12000');
  const [empLinkedUser, setEmpLinkedUser] = useState('');
  const [empActive, setEmpActive] = useState(true);

  // Attendance state
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);

  // Salary state
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payModalEmp, setPayModalEmp] = useState<Employee | null>(null);
  const [payBasic, setPayBasic] = useState('');
  const [payBonus, setPayBonus] = useState('0');
  const [payDeduction, setPayDeduction] = useState('0');
  const [payAdvance, setPayAdvance] = useState('0');
  const [payMethod, setPayMethod] = useState<PaymentMethodType>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [payLogExpense, setPayLogExpense] = useState(true);
  const [printSlip, setPrintSlip] = useState<SalaryPayment | null>(null);

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter(
      (e) =>
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.phone.includes(q)
    );
  }, [employees, search]);

  const openAddEmployee = () => {
    setEditingEmp(null);
    setEmpCode(`EMP-${(employees.length + 1).toString().padStart(3, '0')}`);
    setEmpName('');
    setEmpDesig('Sales Associate');
    setEmpDept('Sales');
    setEmpPhone('');
    setEmpEmail('');
    setEmpAddress('');
    setEmpNid('');
    setEmpJoining(new Date().toISOString().split('T')[0]);
    setEmpSalary('12000');
    setEmpLinkedUser('');
    setEmpActive(true);
    setShowEmpModal(true);
  };

  const openEditEmployee = (e: Employee) => {
    setEditingEmp(e);
    setEmpCode(e.employee_code);
    setEmpName(e.name);
    setEmpDesig(e.designation);
    setEmpDept(e.department || '');
    setEmpPhone(e.phone);
    setEmpEmail(e.email || '');
    setEmpAddress(e.address || '');
    setEmpNid(e.nid_number || '');
    setEmpJoining(e.joining_date);
    setEmpSalary(String(e.basic_salary));
    setEmpLinkedUser(e.linked_user_id || '');
    setEmpActive(e.active);
    setShowEmpModal(true);
  };

  const handleSaveEmployee = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!empName.trim() || !empPhone.trim()) return;
    const now = new Date().toISOString();
    saveEmployee({
      id: editingEmp?.id || `emp_${Date.now()}`,
      employee_code: empCode.trim() || `EMP-${Date.now().toString().slice(-3)}`,
      name: empName.trim(),
      designation: empDesig.trim() || 'Staff',
      department: empDept.trim() || undefined,
      phone: empPhone.trim(),
      email: empEmail.trim() || undefined,
      address: empAddress.trim() || undefined,
      nid_number: empNid.trim() || undefined,
      joining_date: empJoining,
      basic_salary: parseFloat(empSalary) || 0,
      linked_user_id: empLinkedUser || undefined,
      active: empActive,
      created_at: editingEmp?.created_at || now,
      updated_at: now,
    });
    setShowEmpModal(false);
    showNotice(editingEmp ? 'Employee profile updated.' : 'New employee added.');
  };

  const handlePaySalarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalEmp) return;
    const paid = payEmployeeSalary({
      employee_id: payModalEmp.id,
      month_year: salaryMonth,
      basic_salary: parseFloat(payBasic) || 0,
      bonus: parseFloat(payBonus) || 0,
      deduction: parseFloat(payDeduction) || 0,
      advance_adjusted: parseFloat(payAdvance) || 0,
      payment_method: payMethod,
      payment_date: new Date().toISOString().split('T')[0],
      notes: payNotes.trim() || undefined,
      log_as_expense: payLogExpense,
    });
    setPayModalEmp(null);
    if (paid) {
      setPrintSlip(paid);
      showNotice(`Salary paid to ${payModalEmp.name} (${salaryMonth}).`);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen text-slate-800 space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#5b46b5] text-white flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Employee Management</h1>
            <p className="text-xs text-slate-500">
              Add Employee, Staff Directory, Daily Attendance, Monthly Salary & User Role Management
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAddEmployee}
          className="px-4 py-2 bg-[#ec1f73] hover:bg-[#d61665] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
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
          { id: 'list', label: 'Employee List', icon: Users },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'salary', label: 'Salary & Payroll', icon: Banknote },
          { id: 'roles', label: 'User & Role Management', icon: ShieldCheck },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as EmployeeSubTab)}
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

      {/* TAB 1: EMPLOYEE LIST */}
      {subTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name, code, phone, designation..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Code</th>
                  <th className="py-2 px-3">Employee Name</th>
                  <th className="py-2 px-3">Designation / Dept</th>
                  <th className="py-2 px-3">Contact</th>
                  <th className="py-2 px-3">Joining Date</th>
                  <th className="py-2 px-3 text-right">Basic Salary</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-[#5b46b5]">{emp.employee_code}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{emp.name}</td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-700">{emp.designation}</div>
                      <div className="text-[10px] text-slate-400">{emp.department || 'General'}</div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-mono text-slate-700">{emp.phone}</div>
                      <div className="text-[10px] text-slate-400">{emp.email || ''}</div>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500">{emp.joining_date}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {store.currency_symbol}{emp.basic_salary.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditEmployee(emp)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {subTab === 'attendance' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daily Staff Attendance</h2>
              <p className="text-[11px] text-slate-500">Select date and mark Present, Absent, Late, Half Day, or Leave.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Date:</label>
              <input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Employee</th>
                  <th className="py-2 px-3">Designation</th>
                  <th className="py-2 px-3">Month Summary</th>
                  <th className="py-2 px-3">Current Status</th>
                  <th className="py-2 px-3 text-right">Mark Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees
                  .filter((e) => e.active)
                  .map((emp) => {
                    const rec = attendance.find(
                      (a) => a.employee_id === emp.id && a.date === attDate
                    );
                    const monthPrefix = attDate.slice(0, 7);
                    const monthRecs = attendance.filter(
                      (a) => a.employee_id === emp.id && a.date.startsWith(monthPrefix)
                    );
                    const presentCount = monthRecs.filter((a) => a.status === 'present').length;
                    const absentCount = monthRecs.filter((a) => a.status === 'absent').length;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {emp.name} <span className="text-[10px] font-mono text-slate-400">({emp.employee_code})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{emp.designation}</td>
                        <td className="py-2.5 px-3 text-[11px] font-mono">
                          <span className="text-emerald-700 font-bold">P:{presentCount}</span> ·{' '}
                          <span className="text-rose-600 font-bold">A:{absentCount}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          {rec ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                              {rec.status.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-slate-400">Not Marked</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1">
                            {(
                              [
                                { id: 'present', label: 'Present', cls: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white' },
                                { id: 'late', label: 'Late', cls: 'bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white' },
                                { id: 'half_day', label: 'Half Day', cls: 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white' },
                                { id: 'leave', label: 'Leave', cls: 'bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white' },
                                { id: 'absent', label: 'Absent', cls: 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white' },
                              ] as { id: AttendanceStatus; label: string; cls: string }[]
                            ).map((btn) => (
                              <button
                                key={btn.id}
                                type="button"
                                onClick={() => {
                                  markAttendance({
                                    employee_id: emp.id,
                                    date: attDate,
                                    status: btn.id,
                                    check_in: btn.id === 'present' || btn.id === 'late' ? '09:00' : undefined,
                                  });
                                  showNotice(`Marked ${emp.name} as ${btn.label}`);
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                                  rec?.status === btn.id
                                    ? 'bg-[#5b46b5] text-white'
                                    : btn.cls
                                }`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SALARY & PAYROLL */}
      {subTab === 'salary' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Monthly Payroll</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Salary Month:</label>
                <input
                  type="month"
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                    <th className="py-2 px-3">Employee</th>
                    <th className="py-2 px-3">Designation</th>
                    <th className="py-2 px-3 text-right">Basic Salary</th>
                    <th className="py-2 px-3 text-center">Month Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees
                    .filter((e) => e.active)
                    .map((emp) => {
                      const paidThisMonth = salaries.find(
                        (s) => s.employee_id === emp.id && s.month_year === salaryMonth
                      );
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{emp.name}</td>
                          <td className="py-2 px-3 text-slate-600">{emp.designation}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            {store.currency_symbol}{emp.basic_salary.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {paidThisMonth ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                                Paid ({store.currency_symbol}{paidThisMonth.net_paid.toLocaleString()})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[10px]">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {paidThisMonth ? (
                              <button
                                type="button"
                                onClick={() => setPrintSlip(paidThisMonth)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Slip</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayModalEmp(emp);
                                  setPayBasic(String(emp.basic_salary));
                                  setPayBonus('0');
                                  setPayDeduction('0');
                                  setPayAdvance('0');
                                  setPayNotes('');
                                }}
                                className="px-3 py-1 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white font-bold cursor-pointer"
                              >
                                Pay Salary
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Salary Payment History ({salaries.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                    <th className="py-2 px-3">Voucher #</th>
                    <th className="py-2 px-3">Employee</th>
                    <th className="py-2 px-3">Month</th>
                    <th className="py-2 px-3">Paid Date</th>
                    <th className="py-2 px-3 text-right">Net Paid</th>
                    <th className="py-2 px-3 text-right">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No salary payments issued yet.
                      </td>
                    </tr>
                  ) : (
                    salaries.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-[#5b46b5]">{s.voucher_number}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{s.employee_name}</td>
                        <td className="py-2 px-3 font-mono">{s.month_year}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{s.payment_date}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {store.currency_symbol}{s.net_paid.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setPrintSlip(s)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print</span>
                          </button>
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

      {/* TAB 4: USER & ROLE MANAGEMENT */}
      {subTab === 'roles' && (
        <div className="-m-4 sm:-m-6">
          <UsersManagement />
        </div>
      )}

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEmployee} className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                {editingEmp ? 'Edit Employee Profile' : 'Add New Employee'}
              </h3>
              <button type="button" onClick={() => setShowEmpModal(false)} className="text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee Code</label>
                <input type="text" value={empCode} onChange={(e) => setEmpCode(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input type="text" required value={empName} onChange={(e) => setEmpName(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designation *</label>
                <input type="text" required value={empDesig} onChange={(e) => setEmpDesig(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input type="text" value={empDept} onChange={(e) => setEmpDept(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                <input type="text" required value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                <input type="date" value={empJoining} onChange={(e) => setEmpJoining(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Basic Salary ({store.currency_symbol})</label>
                <input type="number" min="0" value={empSalary} onChange={(e) => setEmpSalary(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NID Number</label>
                <input type="text" value={empNid} onChange={(e) => setEmpNid(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Linked POS User (Optional)</label>
                <select value={empLinkedUser} onChange={(e) => setEmpLinkedUser(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2">
                  <option value="">None</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input type="text" value={empAddress} onChange={(e) => setEmpAddress(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
              </div>
              <label className="sm:col-span-2 flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2 cursor-pointer">
                <span className="font-semibold text-slate-700">Employee Active Status</span>
                <input type="checkbox" checked={empActive} onChange={(e) => setEmpActive(e.target.checked)} className="w-4 h-4 accent-[#5b46b5]" />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowEmpModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl font-semibold cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#ec1f73] text-white rounded-xl font-bold cursor-pointer">
                {editingEmp ? 'Update Employee' : 'Save Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAY SALARY MODAL */}
      {payModalEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handlePaySalarySubmit} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Pay Salary — {payModalEmp.name} ({salaryMonth})
              </h3>
              <button type="button" onClick={() => setPayModalEmp(null)} className="text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Basic Salary</label>
                <input type="number" value={payBasic} onChange={(e) => setPayBasic(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bonus / Overtime</label>
                <input type="number" min="0" value={payBonus} onChange={(e) => setPayBonus(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deduction</label>
                <input type="number" min="0" value={payDeduction} onChange={(e) => setPayDeduction(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Advance Adjusted</label>
                <input type="number" min="0" value={payAdvance} onChange={(e) => setPayAdvance(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethodType)} className="w-full border border-slate-300 rounded-xl px-3 py-2">
                <option value="cash">Cash</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <label className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2 cursor-pointer">
              <span className="font-semibold text-slate-700">Auto-record in Shop Expenses</span>
              <input type="checkbox" checked={payLogExpense} onChange={(e) => setPayLogExpense(e.target.checked)} className="w-4 h-4 accent-[#5b46b5]" />
            </label>
            <div className="p-3 bg-slate-50 rounded-xl flex justify-between font-bold text-slate-900">
              <span>Net Payable:</span>
              <span className="font-mono text-emerald-700">
                {store.currency_symbol}
                {Math.max(
                  0,
                  (parseFloat(payBasic) || 0) +
                    (parseFloat(payBonus) || 0) -
                    (parseFloat(payDeduction) || 0) -
                    (parseFloat(payAdvance) || 0)
                ).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPayModalEmp(null)} className="px-4 py-2 border border-slate-200 rounded-xl font-semibold cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#ec1f73] text-white rounded-xl font-bold cursor-pointer">Confirm & Issue Slip</button>
            </div>
          </form>
        </div>
      )}

      {/* SALARY SLIP MODAL */}
      {printSlip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="text-center border-b border-slate-200 pb-3">
              <div className="text-base font-extrabold text-slate-900">{store.store_name}</div>
              <div className="text-[11px] text-slate-500">{store.store_address}</div>
              <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-lg font-bold uppercase text-[11px]">
                Salary Slip · {printSlip.month_year}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Voucher #:</span><span className="font-mono font-bold">{printSlip.voucher_number}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Employee:</span><span className="font-bold">{printSlip.employee_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Payment Date:</span><span className="font-mono">{printSlip.payment_date}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Method:</span><span className="uppercase font-semibold">{printSlip.payment_method}</span></div>
            </div>
            <div className="border-t border-b border-slate-200 py-2.5 space-y-1 font-mono">
              <div className="flex justify-between"><span>Basic Salary</span><span>{store.currency_symbol}{printSlip.basic_salary.toLocaleString()}</span></div>
              <div className="flex justify-between text-emerald-700"><span>(+) Bonus</span><span>{store.currency_symbol}{printSlip.bonus.toLocaleString()}</span></div>
              <div className="flex justify-between text-rose-600"><span>(-) Deduction</span><span>{store.currency_symbol}{printSlip.deduction.toLocaleString()}</span></div>
              <div className="flex justify-between text-amber-700"><span>(-) Advance Adjusted</span><span>{store.currency_symbol}{printSlip.advance_adjusted.toLocaleString()}</span></div>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900">
              <span>Net Paid</span>
              <span className="font-mono text-[#5b46b5]">{store.currency_symbol}{printSlip.net_paid.toLocaleString()}</span>
            </div>
            <div className="flex justify-end gap-2 pt-2 no-print">
              <button type="button" onClick={() => setPrintSlip(null)} className="px-4 py-2 border border-slate-200 rounded-xl font-semibold cursor-pointer">Close</button>
              <button type="button" onClick={() => window.print()} className="px-4 py-2 bg-[#5b46b5] text-white rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
