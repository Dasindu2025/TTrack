
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { cn, formatDateTime24 } from '../lib/utils';
import { ShieldAlert, Search } from 'lucide-react';

export const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState('');
  
  const user = JSON.parse(localStorage.getItem('tyo_user') || '{}');

  useEffect(() => {
    const load = async () => {
      const data = await api.getAuditLogs(user.companyId);
      setLogs(data);
    };
    load();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.details.toLowerCase().includes(filter.toLowerCase()) || 
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.userName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
            <p className="text-slate-400">Traceable history of administrative actions.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="pl-9 pr-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-sm w-full md:w-64 text-white focus:ring-2 focus:ring-accent outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </header>

        <div className="glass-surface panel-lift rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-800 text-xs uppercase text-slate-400 font-semibold">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {formatDateTime24(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">{log.userName}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{log.entity}</td>
                    <td className="px-6 py-4 text-slate-300">{log.details}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No audit records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};
