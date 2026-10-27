import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Plus,
  KeyRound,
  Edit,
  ShieldCheck,
  X,
} from 'lucide-react';
import { User, UserRole } from '../../types';

export const UsersManagement: React.FC = () => {
  const { users, activeUser, setActiveUser, saveUser, store } = useApp();

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [pin, setPin] = useState('');
  const [active, setActive] = useState(true);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setPhone('');
    setRole('cashier');
    setPin('');
    setActive(true);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username || '');
    setPhone(user.phone || '');
    setRole(user.role);
    setPin(user.pin);
    setActive(user.active);
    setShowAddEditModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) {
      alert('Please fill in required fields (Name and 4-digit PIN)');
      return;
    }

    const userData: User = {
      id: editingUser ? editingUser.id : `usr_${Date.now()}`,
      name: name.trim(),
      username: username.trim() || name.toLowerCase().replace(/\s+/g, '_'),
      phone: phone.trim() || undefined,
      role,
      pin: pin.trim(),
      active,
      permissions:
        role === 'admin'
          ? [
              'pos_sale',
              'product_manage',
              'inventory_adjust',
              'supplier_manage',
              'customer_manage',
              'due_manage',
              'expense_manage',
              'reports_view',
              'user_manage',
              'settings_manage',
              'backup_manage',
            ]
          : role === 'manager'
          ? [
              'pos_sale',
              'product_manage',
              'inventory_adjust',
              'supplier_manage',
              'customer_manage',
              'due_manage',
              'expense_manage',
            ]
          : ['pos_sale', 'customer_manage', 'due_manage'],
      created_at: editingUser ? editingUser.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
      branch_id: store.branch_id,
      device_id: 'DEV-POS-01',
    };

    saveUser(userData);
    setShowAddEditModal(false);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <ShieldAlert className="w-6 h-6 text-blue-600" />
            <span>Users & Cashier PIN Security</span>
          </h1>
          <p className="text-xs text-slate-500">
            Configure cashier login PINs, staff roles, and access authorization for terminal operations.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Staff User</span>
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const isCurrent = user.id === activeUser.id;
          return (
            <div
              key={user.id}
              className={`p-5 rounded-2xl bg-white border shadow-sm transition-all relative ${
                isCurrent ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm uppercase ${
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
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>{user.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-mono">
                          Active
                        </span>
                      )}
                    </h3>
                    <div className="text-xs text-slate-400 capitalize flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>{user.role}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenEdit(user)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                {user.phone && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Mobile:</span>
                    <span className="font-mono">{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Cashier PIN:</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-800">
                    {user.pin}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
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

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                {!isCurrent && (
                  <button
                    onClick={() => setActiveUser(user)}
                    className="w-full py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Switch to this Cashier
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
              <li>Add or remove user accounts</li>
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
            <span className="font-bold text-emerald-900 block text-sm">Cashier / Staff</span>
            <ul className="text-slate-600 space-y-1 list-disc list-inside">
              <li>Barcode scanning and POS checkout</li>
              <li>Cash and digital payment collection</li>
              <li>Thermal receipt printing</li>
              <li>Customer Due ledger payments</li>
              <li>Cash drawer shift opening and closing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {editingUser ? 'Edit Staff Profile' : 'Add New Staff Member'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shakil Ahmed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Access Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Store Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4-Digit POS PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono text-center tracking-widest focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold">User Account is Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
