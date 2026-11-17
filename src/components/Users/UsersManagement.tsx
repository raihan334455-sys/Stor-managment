import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Plus,
  KeyRound,
  Edit,
  ShieldCheck,
  X,
  ShoppingCart,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  UserPlus,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { EmployeeShiftType, User, UserRole } from '../../types';
import { getPermissionsForRole } from '../../utils/security';

const SHIFT_TIMES: Record<EmployeeShiftType, { label: string; start: string; end: string }> = {
  morning: { label: 'Morning Shift', start: '08:00', end: '16:00' },
  evening: { label: 'Evening Shift', start: '14:00', end: '22:00' },
  night: { label: 'Night Shift', start: '22:00', end: '06:00' },
  full_day: { label: 'Full Day', start: '09:00', end: '21:00' },
  custom: { label: 'Custom Shift', start: '09:00', end: '18:00' },
};

export const UsersManagement: React.FC = () => {
  const {
    users,
    employees,
    activeUser,
    loginWithPin,
    saveUser,
    saveUnifiedStaff,
    deleteUser,
    checkPermission,
    store,
    setActiveTab,
  } = useApp();

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Unified Staff Form states
  const [name, setName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [empDesignation, setEmpDesignation] = useState('Salesman');
  const [empShift, setEmpShift] = useState<EmployeeShiftType>('full_day');
  const [empSalary, setEmpSalary] = useState('12000');
  const [username, setUsername] = useState('');
  const [usernameEditedManually, setUsernameEditedManually] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('salesman');
  const [pin, setPin] = useState('');
  const [showFormPass, setShowFormPass] = useState(true);
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Card states
  const [copiedUserKey, setCopiedUserKey] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);
  const [switchTargetUser, setSwitchTargetUser] = useState<User | null>(null);
  const [switchPin, setSwitchPin] = useState('');
  const [switchError, setSwitchError] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  if (!checkPermission('user_manage')) {
    return (
      <div className="min-h-full w-full bg-slate-50 flex items-center justify-center p-4 sm:p-8">
        <div className="pos-modal-enter p-8 max-w-lg w-full text-center bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800">অ্যাক্সেস সংরক্ষিত (Access Restricted)</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              আপনার অ্যাকাউন্টে ইউজার ও সেলসম্যান সেটিংস (Salesman & Security) দেখার অনুমতি নেই। কেবল অ্যাডমিন এই ডেটা দেখতে পারবেন।
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('pos')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>পিওএস টার্মিনালে ফিরে যান (Return to POS)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  const handleOpenAdd = (defaultRole: UserRole = 'salesman') => {
    setEditingUser(null);
    setName('');
    setEmployeeCode(getNextEmpCode());
    setEmpDesignation(defaultRole === 'cashier' ? 'Cashier' : 'Salesman');
    setEmpShift('full_day');
    setEmpSalary('12000');
    setUsername('');
    setUsernameEditedManually(false);
    setPhone('');
    setRole(defaultRole);
    setPin('');
    setShowFormPass(true);
    setActive(true);
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (user: User) => {
    const linked = employees.find((e) => e.linked_user_id === user.id);
    setEditingUser(user);
    setName(user.name);
    setEmployeeCode(linked?.employee_code || getNextEmpCode());
    setEmpDesignation(linked?.designation || (user.role === 'admin' ? 'Owner / Admin' : user.role));
    setEmpShift(linked?.shift || 'full_day');
    setEmpSalary(String(linked?.basic_salary ?? 0));
    setUsername(user.username || '');
    setUsernameEditedManually(true);
    setPhone(user.phone || linked?.phone || '');
    setRole(user.role);
    setPin(''); // Never populate stored PBKDF2 hash into password input
    setShowFormPass(false);
    setActive(user.active);
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setFormError('');
    if (!editingUser && !usernameEditedManually) {
      const slug = slugifyUsername(val);
      setUsername(slug);
    }
  };

  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(randomPin);
    setShowFormPass(true);
    setFormError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError('');

    const cleanName = name.trim();
    const cleanUsername = (username.trim() || slugifyUsername(cleanName)).toLowerCase().replace(/\s+/g, '_');
    const cleanPin = pin.trim();
    const cleanEmpCode = employeeCode.trim() || getNextEmpCode();

    if (!cleanName) {
      setFormError('অনুগ্রহ করে স্টাফ/সেলসম্যানের নাম লিখুন (Full Name is required).');
      return;
    }

    if (!cleanUsername || cleanUsername.length < 2) {
      setFormError('অনুগ্রহ করে কমপক্ষে ২ অক্ষরের একটি App / Login ID দিন (Login ID must be at least 2 characters).');
      return;
    }

    if (!editingUser && (!cleanPin || cleanPin.length < 4)) {
      setFormError('অনুগ্রহ করে কমপক্ষে ৪ সংখ্যার পাসওয়ার্ড বা পিন দিন (Password/PIN must be at least 4 characters).');
      return;
    }

    if (editingUser && cleanPin && cleanPin.length < 4) {
      setFormError('নতুন পাসওয়ার্ড দিলে কমপক্ষে ৪ সংখ্যার হতে হবে (Minimum 4 characters).');
      return;
    }

    if (role === 'admin' && cleanPin === '1234') {
      setFormError('নিরাপত্তার জন্য অ্যাডমিন পিন হিসেবে 1234 ব্যবহার করা যাবে না।');
      return;
    }

    // Check duplicate login ID
    const duplicate = users.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.id !== editingUser?.id
    );
    if (duplicate) {
      setFormError(`"${cleanUsername}" আইডিটি ইতোমধ্যে (${duplicate.name}) ব্যবহার করছেন। অন্য একটি আইডি দিন।`);
      return;
    }

    const linkedEmp = editingUser ? employees.find((emp) => emp.linked_user_id === editingUser.id) : undefined;
    if (role !== 'visitor') {
      const dupEmp = employees.find(
        (emp) => emp.employee_code.trim().toLowerCase() === cleanEmpCode.toLowerCase() && emp.id !== linkedEmp?.id
      );
      if (dupEmp) {
        setFormError(`Employee ID "${cleanEmpCode}" ইতোমধ্যে (${dupEmp.name}) ব্যবহার করছেন।`);
        return;
      }
    }

    setIsSaving(true);
    try {
      if (editingUser?.role === 'visitor' || typeof saveUnifiedStaff !== 'function') {
        const userData: User = {
          id: editingUser ? editingUser.id : `user_${Date.now()}`,
          name: cleanName,
          username: cleanUsername,
          phone: phone.trim() || undefined,
          role,
          pin: editingUser ? editingUser.pin : cleanPin,
          must_change_pin: editingUser?.must_change_pin,
          active,
          permissions: getPermissionsForRole(role),
          created_at: editingUser ? editingUser.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: 'pending',
          branch_id: store.branch_id,
          device_id: store.device_id,
        };
        await saveUser(userData, cleanPin || undefined);
      } else {
        const shiftMeta = SHIFT_TIMES[empShift] || SHIFT_TIMES.full_day;
        await saveUnifiedStaff({
          employeeId: linkedEmp?.id,
          linkedUserId: editingUser?.id,
          employeeCode: cleanEmpCode,
          name: cleanName,
          designation: empDesignation.trim() || (role === 'cashier' ? 'Cashier' : role === 'manager' ? 'Store Manager' : role === 'admin' ? 'Owner / Admin' : 'Salesman'),
          department: linkedEmp?.department || (role === 'admin' ? 'Management' : 'Sales & POS'),
          phone: phone.trim(),
          email: linkedEmp?.email || editingUser?.email,
          joiningDate: linkedEmp?.joining_date || new Date().toISOString().split('T')[0],
          basicSalary: parseFloat(empSalary) || 0,
          shift: empShift,
          shiftLabel: shiftMeta.label,
          shiftStart: linkedEmp?.shift_start || shiftMeta.start,
          shiftEnd: linkedEmp?.shift_end || shiftMeta.end,
          active,
          enablePosLogin: true,
          username: cleanUsername,
          role,
          plainPin: cleanPin || undefined,
        });
      }
      setShowAddEditModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const copyLoginId = (user: User) => {
    navigator.clipboard?.writeText(`Login ID: ${user.username}`);
    setCopiedUserKey(user.id);
    setTimeout(() => setCopiedUserKey(null), 2000);
  };

  const handleConfirmSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!switchTargetUser || isSwitching) return;
    setIsSwitching(true);
    setSwitchError('');
    try {
      const res = await loginWithPin(switchTargetUser.username, switchPin);
      if (res.success) {
        setSwitchTargetUser(null);
        setSwitchPin('');
      } else {
        setSwitchError(res.message || 'Invalid PIN');
        setSwitchPin('');
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'Admin / Owner';
      case 'manager':
        return 'Store Manager';
      case 'salesman':
        return 'Salesman (সেলসম্যান)';
      case 'cashier':
        return 'Cashier / Salesman';
      case 'visitor':
        return 'Demo Visitor';
      default:
        return r;
    }
  };

  const isDemoEnabled = store.demo_mode_enabled !== false;
  const visibleUsers = users.filter((u) => isDemoEnabled || u.role !== 'visitor');

  const filteredUsers = visibleUsers.filter((u) => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'salesman') return u.role === 'salesman' || u.role === 'cashier';
    return u.role === roleFilter;
  });

  const salesmanCount = visibleUsers.filter((u) => u.role === 'salesman' || u.role === 'cashier').length;

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-full w-full text-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <UserCheck className="w-6 h-6 text-blue-600" />
            <span>Staff, Salesman &amp; Login Roles (স্টাফ ও সেলসম্যান)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Employee, Salesman ও Staff একই প্রোফাইল — এখান থেকে যুক্ত করলে Employee ID, Shift ও বেতনও স্বয়ংক্রিয়ভাবে সেট হবে।
          </p>
        </div>

        <button
          onClick={() => handleOpenAdd('salesman')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff / Salesman (নতুন স্টাফ)</span>
        </button>
      </div>

      {!isDemoEnabled && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Production Security Active: Public Demo Visitor Account (demo / 1234) is completely disabled & hidden.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="text-[11px] font-bold text-[#5b46b5] hover:underline shrink-0 cursor-pointer"
          >
            Module Settings →
          </button>
        </div>
      )}

      {/* Role Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: `All Staff (${visibleUsers.length})` },
          { id: 'salesman', label: `Salesman & Cashier (${salesmanCount})` },
          { id: 'manager', label: `Managers (${visibleUsers.filter((u) => u.role === 'manager').length})` },
          { id: 'admin', label: `Admins (${visibleUsers.filter((u) => u.role === 'admin').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRoleFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              roleFilter === tab.id
                ? 'bg-[#201c56] text-white border-[#201c56] shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const isCurrent = user.id === activeUser.id;
          const isProtectedOwner =
            user.id === 'user_admin' ||
            (user.role === 'admin' &&
              (user.id === activeUser.id ||
                users.filter((u) => u.role === 'admin' && u.active).length <= 1));
          const linkedEmp =
            employees.find((e) => e.linked_user_id === user.id && e.active) ||
            employees.find((e) => e.linked_user_id === user.id);

          return (
            <div
              key={user.id}
              className={`p-5 rounded-2xl bg-white border shadow-sm transition-all relative flex flex-col justify-between ${
                isCurrent ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm uppercase shrink-0 ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : user.role === 'manager'
                          ? 'bg-blue-100 text-blue-700'
                          : user.role === 'visitor'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{user.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-mono">
                            Active
                          </span>
                        )}
                      </h3>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{getRoleLabel(user.role)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      title="Edit ID & Reset Password"
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!isProtectedOwner && !isCurrent && (
                      <button
                        onClick={() => setConfirmDeleteUser(user)}
                        title="Remove Staff / Salesman"
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Credentials Box */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-medium">App ID:</span>
                    <span className="font-mono font-bold text-blue-700">@{user.username}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 bg-indigo-50/70 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                    <span className="text-slate-500 font-medium">Employee ID:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {linkedEmp ? linkedEmp.employee_code : 'Demo'}
                    </span>
                  </div>

                  {linkedEmp && (
                    <div className="flex items-center justify-between text-slate-600 px-1">
                      <span className="text-slate-400">Shift &amp; Salary:</span>
                      <span className="font-semibold text-slate-700">
                        {linkedEmp.shift_label || 'Full Day'} · {store.currency_symbol}
                        {linkedEmp.basic_salary.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-medium">Password / PIN:</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        user.must_change_pin
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {user.must_change_pin ? 'Default PIN (Change!)' : 'PBKDF2 Protected'}
                    </span>
                  </div>

                  {user.phone && (
                    <div className="flex items-center justify-between text-slate-600 px-1">
                      <span className="text-slate-400">Mobile:</span>
                      <span className="font-mono">{user.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600 px-1">
                    <span className="text-slate-400">Account Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        user.active ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                      }`}
                    >
                      {user.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyLoginId(user)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Copy Login ID"
                >
                  {copiedUserKey === user.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>

                {!isCurrent && user.active && (
                  <button
                    onClick={() => {
                      setSwitchTargetUser(user);
                      setSwitchPin('');
                      setSwitchError('');
                    }}
                    className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Switch (PIN)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Permission Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <KeyRound className="w-4 h-4 text-blue-600" />
          <span>Role Authorization Matrix</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2">
            <span className="font-bold text-purple-900 block text-sm">Admin / Owner</span>
            <ul className="text-slate-600 space-y-1 list-disc list-inside">
              <li>Full access to Profit/Loss reports</li>
              <li>Edit store configuration & currency</li>
              <li>Export & restore database backups</li>
              <li>Add or remove salesman accounts</li>
              <li>Void completed sales invoices</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
            <span className="font-bold text-blue-900 block text-sm">Store Manager</span>
            <ul className="text-slate-600 space-y-1 list-disc list-inside">
              <li>Stock Inward purchases from vendors</li>
              <li>Pay supplier due accounts</li>
              <li>Manual inventory stock adjustments</li>
              <li>Log operating bills and expenses</li>
              <li>Process customer returns & refunds</li>
            </ul>
          </div>

          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
            <span className="font-bold text-emerald-900 block text-sm">Salesman / Cashier</span>
            <ul className="text-slate-600 space-y-1 list-disc list-inside">
              <li>Login with custom Salesman ID & Password</li>
              <li>Barcode scanning and POS checkout</li>
              <li>Thermal receipt printing</li>
              <li>Customer Due ledger collection</li>
              <li>Cash drawer shift opening and closing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add / Edit Salesman & Staff Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {editingUser ? 'Edit Salesman / Staff Profile' : 'Add New Salesman (নতুন সেলসম্যান যোগ)'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Set unique Login ID and Password/PIN for POS terminal login.
                </p>
              </div>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name (পুরো নাম) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Md. Karim (Salesman)"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {role !== 'visitor' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Employee ID (কোড) *
                    </label>
                    <input
                      type="text"
                      required
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Dedicated Salesman Login ID & Password/PIN Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    App ID / Login ID *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-blue-500 font-mono text-xs font-bold">@</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. karim01"
                      value={username}
                      onChange={(e) => {
                        setUsernameEditedManually(true);
                        setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                        setFormError('');
                      }}
                      className="w-full bg-white border border-blue-200 rounded-xl pl-6 pr-2.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">লগইন করার App আইডি</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-blue-900">
                      Password / PIN *
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePin}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                      title="Generate 4-digit PIN"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Auto PIN</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showFormPass ? 'text' : 'password'}
                      minLength={editingUser ? undefined : 4}
                      maxLength={24}
                      required={!editingUser}
                      placeholder={editingUser ? 'Leave blank to keep current PIN' : 'e.g. 4829 or pass123'}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        setFormError('');
                      }}
                      className="w-full bg-white border border-blue-200 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPass(!showFormPass)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showFormPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {editingUser ? 'নতুন পিন দিলে পরিবর্তন হবে (PBKDF2 Hashed)' : 'কমপক্ষে ৪ সংখ্যা বা অক্ষর (PBKDF2 Hashed)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Access Role *</label>
                  <select
                    value={role}
                    disabled={
                      editingUser?.id === 'user_admin' ||
                      editingUser?.role === 'visitor' ||
                      (editingUser?.role === 'admin' &&
                        (editingUser?.id === activeUser.id ||
                          users.filter((u) => u.role === 'admin' && u.active).length <= 1))
                    }
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="salesman">Salesman (সেলসম্যান)</option>
                    <option value="cashier">Cashier (ক্যাশিয়ার)</option>
                    <option value="stock_manager">Stock Manager</option>
                    <option value="manager">Store Manager (ম্যানেজার)</option>
                    <option value="admin">Administrator (অ্যাডমিন)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile / Phone</label>
                  <input
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {role !== 'visitor' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={empDesignation}
                      onChange={(e) => setEmpDesignation(e.target.value)}
                      placeholder="Salesman"
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Duty Shift</label>
                    <select
                      value={empShift}
                      onChange={(e) => setEmpShift(e.target.value as EmployeeShiftType)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold"
                    >
                      <option value="full_day">Full Day</option>
                      <option value="morning">Morning</option>
                      <option value="evening">Evening</option>
                      <option value="night">Night</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Salary ({store.currency_symbol})</label>
                    <input
                      type="number"
                      min="0"
                      value={empSalary}
                      onChange={(e) => setEmpSalary(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold">Account &amp; Staff Active (সক্রিয়)</span>
                </label>
              </div>

              {(username || pin) && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Login Preview:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ID: <span className="text-blue-600">{username || '...'}</span> | Pass:{' '}
                    <span className="text-emerald-700">
                      {pin ? (showFormPass ? pin : '••••') : editingUser ? '(Unchanged)' : '...'}
                    </span>
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Hashing...' : editingUser ? 'Update Account' : 'Create Salesman Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verified PIN Switch User Modal */}
      {switchTargetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Verify PIN to Switch</span>
              </h3>
              <button
                type="button"
                onClick={() => setSwitchTargetUser(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Enter Password/PIN for <strong>{switchTargetUser.name}</strong> (@{switchTargetUser.username}):
            </p>
            {switchError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {switchError}
              </div>
            )}
            <form onSubmit={handleConfirmSwitch} className="space-y-3">
              <input
                type="password"
                autoFocus
                required
                value={switchPin}
                onChange={(e) => setSwitchPin(e.target.value)}
                placeholder="Enter Password / PIN"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-center font-mono text-base tracking-widest focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSwitchTargetUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSwitching}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isSwitching ? 'Verifying...' : 'Confirm Switch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Remove Salesman / Staff?</h3>
            <p className="text-xs text-slate-600">
              আপনি কি নিশ্চিত যে <strong>{confirmDeleteUser.name}</strong> (@{confirmDeleteUser.username}) অ্যাকাউন্টটি মুছে ফেলতে চান?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteUser(confirmDeleteUser.id);
                  setConfirmDeleteUser(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
