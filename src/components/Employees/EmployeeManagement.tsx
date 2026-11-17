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
  Clock,
  BadgeCheck,
  IdCard,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Lock,
} from 'lucide-react';
import {
  AttendanceStatus,
  Employee,
  EmployeeShiftType,
  PaymentMethodType,
  SalaryPayment,
  User,
  UserRole,
} from '../../types';

type EmployeeSubTab = 'list' | 'shifts' | 'attendance' | 'salary' | 'roles';

const SHIFT_PRESETS: Record<
  EmployeeShiftType,
  { label: string; labelBn: string; start: string; end: string; badgeClass: string }
> = {
  morning: {
    label: 'Morning Shift',
    labelBn: 'সকাল শিফট',
    start: '08:00',
    end: '16:00',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  evening: {
    label: 'Evening Shift',
    labelBn: 'বিকাল শিফট',
    start: '14:00',
    end: '22:00',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  night: {
    label: 'Night Shift',
    labelBn: 'রাত শিফট',
    start: '22:00',
    end: '06:00',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  full_day: {
    label: 'Full Day',
    labelBn: 'সারাদিন',
    start: '09:00',
    end: '21:00',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  custom: {
    label: 'Custom Shift',
    labelBn: 'কাস্টম শিফট',
    start: '09:00',
    end: '18:00',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

const getEmpShiftMeta = (emp: Employee) => {
  const key: EmployeeShiftType = emp.shift || 'full_day';
  const preset = SHIFT_PRESETS[key] || SHIFT_PRESETS.full_day;
  return {
    key,
    label: emp.shift_label || preset.label,
    labelBn: preset.labelBn,
    start: emp.shift_start || preset.start,
    end: emp.shift_end || preset.end,
    badgeClass: preset.badgeClass,
  };
};

export const EmployeeManagement: React.FC = () => {
  const {
    store,
    employees,
    attendance,
    salaries,
    users,
    activeUser,
    loginWithPin,
    saveUser,
    saveEmployee,
    saveUnifiedStaff,
    markAttendance,
    payEmployeeSalary,
    checkPermission,
  } = useApp();

  const canManageUsers = checkPermission('user_manage');
  const [subTab, setSubTab] = useState<EmployeeSubTab>('list');
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | EmployeeShiftType>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [idCardEmp, setIdCardEmp] = useState<Employee | null>(null);

  // Add/Edit Unified Staff (Employee + Salesman + POS User) modal
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
  const [empShift, setEmpShift] = useState<EmployeeShiftType>('full_day');
  const [empShiftStart, setEmpShiftStart] = useState('09:00');
  const [empShiftEnd, setEmpShiftEnd] = useState('21:00');
  const [empActive, setEmpActive] = useState(true);

  // Unified POS Login fields (App ID, Password/PIN, Role)
  const [enablePosLogin, setEnablePosLogin] = useState(true);
  const [staffUsername, setStaffUsername] = useState('');
  const [usernameEditedManually, setUsernameEditedManually] = useState(false);
  const [staffRole, setStaffRole] = useState<UserRole>('salesman');
  const [staffPin, setStaffPin] = useState('');
  const [showStaffPin, setShowStaffPin] = useState(true);
  const [staffFormError, setStaffFormError] = useState('');
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  // Quick Switch Staff modal
  const [switchTargetUser, setSwitchTargetUser] = useState<User | null>(null);
  const [switchPin, setSwitchPin] = useState('');
  const [switchError, setSwitchError] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

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
    return employees.filter((e) => {
      const empShiftKey = e.shift || 'full_day';
      const matchesShift = shiftFilter === 'all' || empShiftKey === shiftFilter;
      const matchesQuery =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.phone.includes(q);
      return matchesShift && matchesQuery;
    });
  }, [employees, search, shiftFilter]);

  const slugifyUsername = (val: string) =>
    val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_.-]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const getNextEmpCode = () => {
    const used = new Set(employees.map((e) => e.employee_code.trim().toUpperCase()));
    let seq = 1;
    while (used.has(`EMP-${String(seq).padStart(3, '0')}`)) seq += 1;
    return `EMP-${String(seq).padStart(3, '0')}`;
  };

  const openAddEmployee = () => {
    setEditingEmp(null);
    setEmpCode(getNextEmpCode());
    setEmpName('');
    setEmpDesig('Salesman');
    setEmpDept('Sales & POS');
    setEmpPhone('');
    setEmpEmail('');
    setEmpAddress('');
    setEmpNid('');
    setEmpJoining(new Date().toISOString().split('T')[0]);
    setEmpSalary('12000');
    setEmpLinkedUser('');
    setEmpShift('full_day');
    setEmpShiftStart(SHIFT_PRESETS.full_day.start);
    setEmpShiftEnd(SHIFT_PRESETS.full_day.end);
    setEmpActive(true);
    setEnablePosLogin(canManageUsers);
    setStaffUsername('');
    setUsernameEditedManually(false);
    setStaffRole('salesman');
    setStaffPin('');
    setShowStaffPin(true);
    setStaffFormError('');
    setShowEmpModal(true);
  };

  const openEditEmployee = (e: Employee) => {
    const meta = getEmpShiftMeta(e);
    const linked = users.find((u) => u.id === e.linked_user_id);
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
    setEmpShift(meta.key);
    setEmpShiftStart(meta.start);
    setEmpShiftEnd(meta.end);
    setEmpActive(e.active);
    setEnablePosLogin(Boolean(linked));
    setStaffUsername(linked?.username || slugifyUsername(e.name));
    setUsernameEditedManually(Boolean(linked));
    setStaffRole(linked?.role || 'salesman');
    setStaffPin('');
    setShowStaffPin(false);
    setStaffFormError('');
    setShowEmpModal(true);
  };

  const handleStaffNameChange = (val: string) => {
    setEmpName(val);
    setStaffFormError('');
    if (!editingEmp && !usernameEditedManually) {
      setStaffUsername(slugifyUsername(val));
    }
  };

  const handleGenerateStaffPin = () => {
    setStaffPin(Math.floor(1000 + Math.random() * 9000).toString());
    setShowStaffPin(true);
    setStaffFormError('');
  };

  const handleConfirmSwitchStaff = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!switchTargetUser || isSwitching) return;
    setIsSwitching(true);
    setSwitchError('');
    try {
      const res = await loginWithPin(switchTargetUser.username, switchPin);
      if (res.success) {
        setSwitchTargetUser(null);
        setSwitchPin('');
      } else {
        setSwitchError(res.message || 'Invalid Password / PIN');
        setSwitchPin('');
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const handleQuickShiftChange = (emp: Employee, nextShift: EmployeeShiftType, customStart?: string, customEnd?: string) => {
    const preset = SHIFT_PRESETS[nextShift];
    const start = customStart ?? preset.start;
    const end = customEnd ?? preset.end;
    saveEmployee({
      ...emp,
      shift: nextShift,
      shift_label: preset.label,
      shift_start: start,
      shift_end: end,
      updated_at: new Date().toISOString(),
    });
    showNotice(`${emp.name} (${emp.employee_code}) → ${preset.label} (${start}–${end})`);
  };

  const handleSaveEmployee = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (isSavingStaff) return;
    setStaffFormError('');

    const cleanName = empName.trim();
    const cleanCode = empCode.trim() || getNextEmpCode();
    if (!cleanName) {
      setStaffFormError('অনুগ্রহ করে স্টাফ/সেলসম্যানের নাম লিখুন (Full Name is required).');
      return;
    }

    const dupCode = employees.some(
      (e) => e.employee_code.trim().toLowerCase() === cleanCode.toLowerCase() && e.id !== editingEmp?.id
    );
    if (dupCode) {
      setStaffFormError(`Employee ID "${cleanCode}" ইতিমধ্যে ব্যবহার হয়েছে।`);
      return;
    }

    const willHavePosLogin = enablePosLogin && canManageUsers;
    const cleanUsername = (staffUsername.trim() || slugifyUsername(cleanName))
      .toLowerCase()
      .replace(/\s+/g, '_');
    const cleanPin = staffPin.trim();
    const targetLinkedUserId = empLinkedUser || editingEmp?.linked_user_id;

    if (willHavePosLogin) {
      if (!cleanUsername || cleanUsername.length < 2) {
        setStaffFormError('কমপক্ষে ২ অক্ষরের App / Login ID দিন (App ID must be at least 2 characters).');
        return;
      }
      const dupUser = users.some(
        (u) => u.username.toLowerCase() === cleanUsername && u.id !== targetLinkedUserId
      );
      if (dupUser) {
        setStaffFormError(`App ID "@${cleanUsername}" ইতিমধ্যে অন্য স্টাফের জন্য ব্যবহৃত হচ্ছে।`);
        return;
      }
      if (!targetLinkedUserId && (!cleanPin || cleanPin.length < 4)) {
        setStaffFormError('নতুন লগইনের জন্য কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড/পিন দিন (Minimum 4 characters).');
        return;
      }
      if (targetLinkedUserId && cleanPin && cleanPin.length < 4) {
        setStaffFormError('নতুন পাসওয়ার্ড দিলে কমপক্ষে ৪ অক্ষরের হতে হবে (Minimum 4 characters).');
        return;
      }
      if (staffRole === 'admin' && cleanPin === '1234') {
        setStaffFormError('নিরাপত্তার জন্য অ্যাডমিন পিন হিসেবে 1234 ব্যবহার করা যাবে না।');
        return;
      }
    }

    const preset = SHIFT_PRESETS[empShift];
    setIsSavingStaff(true);
    try {
      if (typeof saveUnifiedStaff === 'function') {
        await saveUnifiedStaff({
          employeeId: editingEmp?.id,
          linkedUserId: targetLinkedUserId || undefined,
          employeeCode: cleanCode,
          name: cleanName,
          designation: empDesig.trim() || 'Salesman',
          department: empDept.trim() || 'Sales & POS',
          phone: empPhone.trim(),
          email: empEmail.trim() || undefined,
          address: empAddress.trim() || undefined,
          nidNumber: empNid.trim() || undefined,
          joiningDate: empJoining,
          basicSalary: parseFloat(empSalary) || 0,
          shift: empShift,
          shiftLabel: preset.label,
          shiftStart: empShiftStart || preset.start,
          shiftEnd: empShiftEnd || preset.end,
          active: empActive,
          enablePosLogin: willHavePosLogin,
          username: cleanUsername,
          role: staffRole,
          plainPin: cleanPin || undefined,
        });
      } else {
        const now = new Date().toISOString();
        let nextLinkedId = targetLinkedUserId || undefined;
        if (willHavePosLogin && typeof saveUser === 'function') {
          const existingU = users.find((u) => u.id === targetLinkedUserId);
          const uId = targetLinkedUserId || `user_${Date.now()}`;
          await saveUser(
            {
              id: uId,
              name: cleanName,
              username: cleanUsername,
              pin: existingU?.pin || cleanPin || '1234',
              must_change_pin: existingU?.must_change_pin,
              role: staffRole,
              phone: empPhone.trim() || undefined,
              email: empEmail.trim() || undefined,
              active: empActive,
              permissions: existingU?.permissions || [],
              created_at: existingU?.created_at || now,
              updated_at: now,
              sync_status: 'pending',
              branch_id: store.branch_id,
              device_id: store.device_id,
            },
            cleanPin || undefined
          );
          nextLinkedId = uId;
        }
        saveEmployee({
          id: editingEmp?.id || `emp_${Date.now()}`,
          employee_code: cleanCode,
          name: cleanName,
          designation: empDesig.trim() || 'Salesman',
          department: empDept.trim() || 'Sales & POS',
          phone: empPhone.trim(),
          email: empEmail.trim() || undefined,
          address: empAddress.trim() || undefined,
          nid_number: empNid.trim() || undefined,
          joining_date: empJoining,
          basic_salary: parseFloat(empSalary) || 0,
          linked_user_id: nextLinkedId,
          shift: empShift,
          shift_label: preset.label,
          shift_start: empShiftStart || preset.start,
          shift_end: empShiftEnd || preset.end,
          active: empActive,
          created_at: editingEmp?.created_at || now,
          updated_at: now,
        });
      }
      setShowEmpModal(false);
      showNotice(
        editingEmp
          ? `${cleanName} (${cleanCode}) প্রোফাইল আপডেট হয়েছে।`
          : `${cleanName} (${cleanCode}) স্টাফ ও সেলসম্যান হিসেবে যুক্ত হয়েছে।`
      );
    } finally {
      setIsSavingStaff(false);
    }
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
    <div className="p-4 sm:p-6 bg-slate-50 min-h-full w-full text-slate-800 space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#5b46b5] text-white flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Staff, Employee &amp; Salesman Management
            </h1>
            <p className="text-xs text-slate-500">
              একই প্রোফাইলে Employee ID, POS App ID, Shift, Attendance, Salary ও Role — Employee, Salesman ও Staff একসাথে পরিচালিত হয়
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAddEmployee}
          className="px-4 py-2 bg-[#ec1f73] hover:bg-[#d61665] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff / Salesman</span>
        </button>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 no-print">
        {[
          { id: 'list', label: 'All Staff & Salesmen', icon: Users },
          { id: 'shifts', label: 'Employee ID & Shifts', icon: Clock },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'salary', label: 'Salary & Payroll', icon: Banknote },
          { id: 'roles', label: 'Login Access & Roles', icon: ShieldCheck },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as EmployeeSubTab)}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 leading-tight transition-colors cursor-pointer ${
                active
                  ? 'bg-[#5b46b5] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMPLOYEE LIST */}
      {subTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee ID, name, phone, designation..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Shifts' },
                  { id: 'morning', label: 'Morning' },
                  { id: 'evening', label: 'Evening' },
                  { id: 'night', label: 'Night' },
                  { id: 'full_day', label: 'Full Day' },
                ] as const
              ).map((sf) => (
                <button
                  key={sf.id}
                  type="button"
                  onClick={() => setShiftFilter(sf.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    shiftFilter === sf.id
                      ? 'bg-[#5b46b5] text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {sf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredEmployees.map((emp) => {
              const shiftMeta = getEmpShiftMeta(emp);
              const linkedUser = users.find((u) => u.id === emp.linked_user_id);
              return (
                <div
                  key={emp.id}
                  className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#5b46b5]/10 text-[#5b46b5] font-mono font-bold text-[11px]">
                          ID: {emp.employee_code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${shiftMeta.badgeClass}`}
                        >
                          {shiftMeta.label} ({shiftMeta.start}–{shiftMeta.end})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            emp.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {emp.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-slate-900 mt-1 truncate">{emp.name}</div>
                      <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span>{emp.designation} · {emp.department || 'General'}</span>
                        {linkedUser && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-[10px]">
                            App: @{linkedUser.username} ({linkedUser.role})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                        {store.currency_symbol}{emp.basic_salary.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">Basic / mo</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                    <span className="font-mono truncate">{emp.phone || 'No phone'} · {emp.joining_date}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {linkedUser && linkedUser.active && linkedUser.id !== activeUser.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setSwitchTargetUser(linkedUser);
                            setSwitchPin('');
                            setSwitchError('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Switch</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIdCardEmp(emp)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <IdCard className="w-3 h-3" />
                        <span>ID Card</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditEmployee(emp)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-3">Employee ID</th>
                  <th className="py-2 px-3">Employee Name</th>
                  <th className="py-2 px-3">Duty Shift & Time</th>
                  <th className="py-2 px-3">Designation / Dept</th>
                  <th className="py-2 px-3">Contact</th>
                  <th className="py-2 px-3 text-right">Basic Salary</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const shiftMeta = getEmpShiftMeta(emp);
                  const linkedUser = users.find((u) => u.id === emp.linked_user_id);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-[#5b46b5]/10 text-[#5b46b5] font-mono font-bold text-[11px]">
                          {emp.employee_code}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {linkedUser?.id === activeUser.id && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        {linkedUser ? (
                          <div className="text-[10px] font-mono text-emerald-700 flex items-center gap-1 mt-0.5">
                            <span>App ID: @{linkedUser.username}</span>
                            <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-600 capitalize font-sans font-semibold">
                              {linkedUser.role}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">No POS Login</div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${shiftMeta.badgeClass}`}>
                          <Clock className="w-3 h-3" />
                          <span>{shiftMeta.label}</span>
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {shiftMeta.start} – {shiftMeta.end}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-700">{emp.designation}</div>
                        <div className="text-[10px] text-slate-400">{emp.department || 'General'}</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-mono text-slate-700">{emp.phone || '—'}</div>
                        <div className="text-[10px] text-slate-400">{emp.joining_date}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
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
                        <div className="inline-flex items-center gap-1.5">
                          {linkedUser && linkedUser.active && linkedUser.id !== activeUser.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setSwitchTargetUser(linkedUser);
                                setSwitchPin('');
                                setSwitchError('');
                              }}
                              title="Switch Active Staff (PIN)"
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Switch</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIdCardEmp(emp)}
                            title="View & Print Employee ID Card"
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <IdCard className="w-3.5 h-3.5" />
                            <span>ID</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditEmployee(emp)}
                            title="Edit Staff Profile, Shift & Login"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* TAB 2: EMPLOYEE ID & SHIFT ROSTER */}
      {subTab === 'shifts' && (
        <div className="space-y-4">
          {/* Shift Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['morning', 'evening', 'night', 'full_day'] as EmployeeShiftType[]).map((sKey) => {
              const meta = SHIFT_PRESETS[sKey];
              const count = employees.filter((e) => e.active && (e.shift || 'full_day') === sKey).length;
              return (
                <div
                  key={sKey}
                  className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                    <span className="font-mono text-lg font-extrabold text-slate-900">{count}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{meta.labelBn}</span>
                    <span className="font-mono font-semibold">{meta.start}–{meta.end}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Shift Assignment & ID Card Control */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-[#5b46b5]" />
                  <span>Staff Shift Assignment & Employee ID Cards (ডিউটি শিফট ও আইডি কার্ড)</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  দ্রুত শিফট পরিবর্তন করুন এবং প্রতিটি কর্মচারীর Employee ID কার্ড প্রিন্ট করুন।
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {employees.map((emp) => {
                const shiftMeta = getEmpShiftMeta(emp);
                const linkedUser = users.find((u) => u.id === emp.linked_user_id);
                return (
                  <div
                    key={emp.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-[#5b46b5] text-white font-mono font-bold text-[10px]">
                            {emp.employee_code}
                          </span>
                          <span className="font-bold text-sm text-slate-900 truncate">{emp.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {emp.designation} {linkedUser ? `· Login: @${linkedUser.username}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIdCardEmp(emp)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <IdCard className="w-3.5 h-3.5" />
                        <span>ID Card</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Assigned Shift
                        </label>
                        <select
                          value={shiftMeta.key}
                          onChange={(e) =>
                            handleQuickShiftChange(emp, e.target.value as EmployeeShiftType)
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold"
                        >
                          {(['morning', 'evening', 'night', 'full_day', 'custom'] as EmployeeShiftType[]).map(
                            (sk) => (
                              <option key={sk} value={sk}>
                                {SHIFT_PRESETS[sk].label} ({SHIFT_PRESETS[sk].labelBn})
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Shift Start
                        </label>
                        <input
                          type="time"
                          value={shiftMeta.start}
                          onChange={(e) =>
                            handleQuickShiftChange(emp, shiftMeta.key, e.target.value, shiftMeta.end)
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Shift End
                        </label>
                        <input
                          type="time"
                          value={shiftMeta.end}
                          onChange={(e) =>
                            handleQuickShiftChange(emp, shiftMeta.key, shiftMeta.start, e.target.value)
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

          {/* Mobile Attendance Cards */}
          <div className="md:hidden space-y-2.5">
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
                const shiftMeta = getEmpShiftMeta(emp);
                return (
                  <div
                    key={emp.id}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          {emp.name}{' '}
                          <span className="text-[10px] font-mono text-[#5b46b5]">
                            ({emp.employee_code})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${shiftMeta.badgeClass}`}>
                            {shiftMeta.label} ({shiftMeta.start}–{shiftMeta.end})
                          </span>
                          <span className="text-emerald-700 font-bold">P:{presentCount}</span> ·{' '}
                          <span className="text-rose-600 font-bold">A:{absentCount}</span>
                        </div>
                      </div>
                      {rec ? (
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-bold uppercase text-[10px]">
                          {rec.status.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Not Marked</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'present', label: 'Present', cls: 'bg-emerald-50 text-emerald-700' },
                          { id: 'late', label: 'Late', cls: 'bg-amber-50 text-amber-800' },
                          { id: 'half_day', label: 'Half Day', cls: 'bg-blue-50 text-blue-700' },
                          { id: 'leave', label: 'Leave', cls: 'bg-purple-50 text-purple-700' },
                          { id: 'absent', label: 'Absent', cls: 'bg-rose-50 text-rose-700' },
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
                              check_in: btn.id === 'present' || btn.id === 'late' ? shiftMeta.start : undefined,
                            });
                            showNotice(`Marked ${emp.name} (${emp.employee_code}) as ${btn.label}`);
                          }}
                          className={`py-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                            rec?.status === btn.id ? 'bg-[#5b46b5] text-white' : btn.cls
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="hidden md:block overflow-x-auto">
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
                    const shiftMeta = getEmpShiftMeta(emp);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {emp.name} <span className="text-[10px] font-mono text-[#5b46b5]">({emp.employee_code})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div>{emp.designation}</div>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold ${shiftMeta.badgeClass}`}>
                            {shiftMeta.label} · {shiftMeta.start}–{shiftMeta.end}
                          </span>
                        </td>
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
                                    check_in: btn.id === 'present' || btn.id === 'late' ? emp.shift_start || '09:00' : undefined,
                                  });
                                  showNotice(`Marked ${emp.name} (${emp.employee_code}) as ${btn.label}`);
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

            {/* Mobile Payroll Cards */}
            <div className="md:hidden space-y-2.5">
              {employees
                .filter((e) => e.active)
                .map((emp) => {
                  const paidThisMonth = salaries.find(
                    (s) => s.employee_id === emp.id && s.month_year === salaryMonth
                  );
                  return (
                    <div
                      key={emp.id}
                      className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">{emp.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {emp.designation} · Basic {store.currency_symbol}
                          {emp.basic_salary.toLocaleString()}
                        </div>
                        <div className="mt-1">
                          {paidThisMonth ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                              Paid ({store.currency_symbol}{paidThisMonth.net_paid.toLocaleString()})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[10px]">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {paidThisMonth ? (
                          <button
                            type="button"
                            onClick={() => setPrintSlip(paidThisMonth)}
                            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-blue-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
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
                            className="px-3 py-2 rounded-lg bg-[#ec1f73] hover:bg-[#d61665] text-white text-xs font-bold cursor-pointer"
                          >
                            Pay Salary
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="hidden md:block overflow-x-auto">
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
                          <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
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
            {/* Mobile Salary History Cards */}
            <div className="md:hidden space-y-2.5">
              {salaries.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No salary payments issued yet.
                </div>
              ) : (
                salaries.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-[11px] text-[#5b46b5]">
                        {s.voucher_number} · {s.month_year}
                      </div>
                      <div className="font-bold text-sm text-slate-900 truncate">{s.employee_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{s.payment_date}</div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="font-mono font-bold text-sm text-emerald-700 tabular-nums">
                        {store.currency_symbol}{s.net_paid.toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrintSlip(s)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-blue-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
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
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
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

      {/* ADD / EDIT UNIFIED STAFF / EMPLOYEE / SALESMAN MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEmployee} className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingEmp
                    ? 'Edit Staff / Employee / Salesman Profile'
                    : 'Add New Staff / Employee / Salesman'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Employee, Salesman ও Staff একই প্রোফাইল — এখান থেকেই ID, Shift, বেতন ও POS Login সেট করুন।
                </p>
              </div>
              <button type="button" onClick={() => setShowEmpModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {staffFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{staffFormError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee ID (কোড) *</label>
                <input
                  type="text"
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-[#5b46b5]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name (নাম) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Md. Karim (Salesman)"
                  value={empName}
                  onChange={(e) => handleStaffNameChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Duty Shift (শিফট)</label>
                <select
                  value={empShift}
                  onChange={(e) => {
                    const next = e.target.value as EmployeeShiftType;
                    setEmpShift(next);
                    setEmpShiftStart(SHIFT_PRESETS[next].start);
                    setEmpShiftEnd(SHIFT_PRESETS[next].end);
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                >
                  {(['morning', 'evening', 'night', 'full_day', 'custom'] as EmployeeShiftType[]).map((sk) => (
                    <option key={sk} value={sk}>
                      {SHIFT_PRESETS[sk].label} ({SHIFT_PRESETS[sk].labelBn})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift Start</label>
                  <input type="time" value={empShiftStart} onChange={(e) => setEmpShiftStart(e.target.value)} className="w-full border border-slate-300 rounded-xl px-2.5 py-2 font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift End</label>
                  <input type="time" value={empShiftEnd} onChange={(e) => setEmpShiftEnd(e.target.value)} className="w-full border border-slate-300 rounded-xl px-2.5 py-2 font-mono" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designation (পদবি) *</label>
                <input type="text" required value={empDesig} onChange={(e) => setEmpDesig(e.target.value)} placeholder="Salesman / Cashier / Manager" className="w-full border border-slate-300 rounded-xl px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input type="text" value={empDept} onChange={(e) => setEmpDept(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone (মোবাইল)</label>
                <input type="text" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} placeholder="017XXXXXXXX" className="w-full border border-slate-300 rounded-xl px-3 py-2 font-mono" />
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
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input type="text" value={empAddress} onChange={(e) => setEmpAddress(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
              </div>
            </div>

            {/* Unified POS Login Access Section (App ID, Password/PIN, Role) */}
            {canManageUsers && (
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold text-blue-950">POS Login Access (App ID &amp; Password/PIN)</div>
                      <div className="text-[10px] text-blue-700">
                        টার্মিনাল লগইন ও Switch Active Staff-এ ব্যবহারের জন্য App ID এবং পিন সেট করুন।
                      </div>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={enablePosLogin}
                      disabled={
                        editingEmp?.linked_user_id === 'user_admin' ||
                        editingEmp?.linked_user_id === activeUser.id ||
                        (Boolean(editingEmp?.linked_user_id) &&
                          users.find((u) => u.id === editingEmp?.linked_user_id)?.role === 'admin' &&
                          users.filter((u) => u.role === 'admin' && u.active).length <= 1)
                      }
                      onChange={(e) => setEnablePosLogin(e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="font-bold text-blue-900">Enable Login</span>
                  </label>
                </div>

                {enablePosLogin && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block font-bold text-blue-900 mb-1">App ID (Login ID) *</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-blue-500 font-mono font-bold">@</span>
                        <input
                          type="text"
                          required={enablePosLogin}
                          placeholder="e.g. karim01"
                          value={staffUsername}
                          onChange={(e) => {
                            setUsernameEditedManually(true);
                            setStaffUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                            setStaffFormError('');
                          }}
                          className="w-full bg-white border border-blue-200 rounded-xl pl-6 pr-2.5 py-2 font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-blue-900">Password / PIN</label>
                        <button
                          type="button"
                          onClick={handleGenerateStaffPin}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Auto PIN</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showStaffPin ? 'text' : 'password'}
                          maxLength={24}
                          placeholder={editingEmp?.linked_user_id ? 'Blank = keep current' : 'Min 4 chars'}
                          value={staffPin}
                          onChange={(e) => {
                            setStaffPin(e.target.value);
                            setStaffFormError('');
                          }}
                          className="w-full bg-white border border-blue-200 rounded-xl pl-3 pr-8 py-2 font-mono font-bold text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowStaffPin(!showStaffPin)}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showStaffPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-blue-900 mb-1">Access Role *</label>
                      <select
                        value={staffRole}
                        disabled={
                          editingEmp?.linked_user_id === 'user_admin' ||
                          editingEmp?.linked_user_id === activeUser.id
                        }
                        onChange={(e) => setStaffRole(e.target.value as UserRole)}
                        className="w-full bg-white border border-blue-200 rounded-xl px-2.5 py-2 font-semibold text-slate-800"
                      >
                        <option value="salesman">Salesman (সেলসম্যান)</option>
                        <option value="cashier">Cashier (ক্যাশিয়ার)</option>
                        <option value="stock_manager">Stock Manager</option>
                        <option value="manager">Store Manager (ম্যানেজার)</option>
                        <option value="admin">Admin / Owner</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2 cursor-pointer">
              <span className="font-semibold text-slate-700">Active Status (সক্রিয় স্টাফ ও লগইন)</span>
              <input type="checkbox" checked={empActive} onChange={(e) => setEmpActive(e.target.checked)} className="w-4 h-4 accent-[#5b46b5]" />
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowEmpModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl font-semibold cursor-pointer">Cancel</button>
              <button type="submit" disabled={isSavingStaff} className="px-5 py-2 bg-[#ec1f73] hover:bg-[#d61665] disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer">
                {isSavingStaff ? 'Saving...' : editingEmp ? 'Update Staff Profile' : 'Save Staff & Salesman'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QUICK SWITCH STAFF (PIN) MODAL */}
      {switchTargetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Switch Active Staff</span>
              </h3>
              <button type="button" onClick={() => setSwitchTargetUser(null)} className="text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600">
              Enter Password / PIN for <strong>{switchTargetUser.name}</strong> (@{switchTargetUser.username}):
            </p>
            {switchError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {switchError}
              </div>
            )}
            <form onSubmit={handleConfirmSwitchStaff} className="space-y-3">
              <input
                type="password"
                autoFocus
                required
                value={switchPin}
                onChange={(e) => setSwitchPin(e.target.value)}
                placeholder="Enter Password / PIN"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-center font-mono text-base tracking-widest focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setSwitchTargetUser(null)} className="px-4 py-2 border border-slate-200 rounded-xl font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSwitching} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer">
                  {isSwitching ? 'Verifying...' : 'Confirm Switch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY SALARY MODAL */}
      {payModalEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handlePaySalarySubmit} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 shadow-2xl space-y-3 text-xs">
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
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4 text-xs print:max-h-none print:overflow-visible">
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

      {/* EMPLOYEE ID CARD MODAL */}
      {idCardEmp && (() => {
        const meta = getEmpShiftMeta(idCardEmp);
        const linkedUser = users.find((u) => u.id === idCardEmp.linked_user_id);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl text-xs print:shadow-none">
              <div className="bg-gradient-to-r from-[#091f46] via-[#0d3577] to-[#0b56b8] text-white p-5 text-center space-y-2">
                {store.store_logo && (
                  <img
                    src={store.store_logo}
                    alt={store.store_name}
                    className="w-12 h-12 rounded-xl object-cover mx-auto border border-white/30 bg-white"
                  />
                )}
                <div className="font-extrabold text-sm tracking-wide">{store.store_name}</div>
                {store.store_address && (
                  <div className="text-[10px] text-blue-100 leading-tight">{store.store_address}</div>
                )}
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500 text-white font-mono font-extrabold text-[11px] tracking-wider">
                  ID: {idCardEmp.employee_code}
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-16 h-16 rounded-2xl bg-[#5b46b5]/10 border border-[#5b46b5]/25 text-[#5b46b5] font-extrabold text-2xl flex items-center justify-center mx-auto">
                    {idCardEmp.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 pt-1">{idCardEmp.name}</h3>
                  <p className="text-xs font-semibold text-[#5b46b5]">
                    {idCardEmp.designation} {idCardEmp.department ? `· ${idCardEmp.department}` : ''}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Duty Shift:</span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Shift Timing:</span>
                    <span className="font-mono font-bold text-slate-800">{meta.start} – {meta.end}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Phone:</span>
                    <span className="font-mono font-semibold text-slate-800">{idCardEmp.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Joined:</span>
                    <span className="font-mono text-slate-700">{idCardEmp.joining_date}</span>
                  </div>
                  {linkedUser && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">POS Login ID:</span>
                      <span className="font-mono font-bold text-emerald-700">@{linkedUser.username}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 no-print">
                  <button
                    type="button"
                    onClick={() => setIdCardEmp(null)}
                    className="flex-1 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2 bg-[#0b56b8] hover:bg-[#09479a] text-white rounded-xl font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print ID Card</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
