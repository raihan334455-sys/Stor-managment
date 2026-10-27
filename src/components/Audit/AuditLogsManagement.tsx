import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  History,
  Search,
  Filter,
  Download,
  Shield,
  Calendar,
  Clock,
  User,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';

export const AuditLogsManagement: React.FC = () => {
  const { auditLogs } = useApp();

  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');

  const modulesList = [
    'all',
    'POS',
    'Inventory',
    'Customer Due',
    'Supplier Due',
    'Purchase',
    'Expense',
    'Returns',
    'Cash Drawer',
    'Quotations',
    'Users',
    'Backup',
    'Products',
  ];

  const filteredLogs = auditLogs.filter((log) => {
    const q = search.toLowerCase();
    const matchSearch =
      log.action.toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q) ||
      log.user_name.toLowerCase().includes(q) ||
      log.module.toLowerCase().includes(q);

    const matchModule =
      selectedModule === 'all' || log.module.toLowerCase() === selectedModule.toLowerCase();

    return matchSearch && matchModule;
  });

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Module', 'Action', 'Description', 'Old Value', 'New Value'];
    const rows = filteredLogs.map((l) => [
      l.created_at,
      `"${l.user_name.replace(/"/g, '""')}"`,
      `"${l.module.replace(/"/g, '""')}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${(l.old_value || '').replace(/"/g, '""')}"`,
      `"${(l.new_value || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <History className="w-6 h-6 text-blue-600" />
            <span>Security Audit Logs & Activity Trail</span>
          </h1>
          <p className="text-xs text-slate-500">
            Immutable offline event ledger tracking cashier operations, stock adjustments, dues, and voids.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search action, cashier, or description..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 capitalize font-medium"
            >
              {modulesList.map((m) => (
                <option key={m} value={m}>
                  {m === 'all' ? 'All Modules' : m}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredLogs.length} of {auditLogs.length} events
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                <th className="p-3">TIMESTAMP</th>
                <th className="p-3">CASHIER / USER</th>
                <th className="p-3">MODULE</th>
                <th className="p-3">ACTION EVENT</th>
                <th className="p-3">DETAILS & REASON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    <div>{new Date(log.created_at).toLocaleDateString()}</div>
                    <div className="text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                        {log.user_name.charAt(0)}
                      </div>
                      <span>{log.user_name}</span>
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {log.module}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-blue-600 text-[11px] whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="p-3 text-slate-700">
                    <div>{log.description}</div>
                    {(log.old_value || log.new_value) && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                        <span>{log.old_value || 'None'}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                        <span className="text-blue-600 font-bold">{log.new_value}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No audit records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
