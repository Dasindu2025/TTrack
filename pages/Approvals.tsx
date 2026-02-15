import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../services/mockDb';
import { TimeEntry, EntryStatus, User } from '../types';
import { Button } from '../components/ui/Button';
import { Check, X, Search, Clock, Calendar } from 'lucide-react';
import { formatDate, formatTime, cn } from '../lib/utils';
import { toast } from 'sonner';

export const Approvals = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Record<string, User>>({});
  const [filterUser, setFilterUser] = useState('');
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('tyo_user') || '{}');

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch entries
      const allEntries = await api.getTimeEntries(undefined, user.companyId);
      const pending = allEntries.filter(e => e.status === EntryStatus.PENDING);
      setEntries(pending);

      // Fetch employees for accurate names
      const empList = await api.getEmployees(user.companyId);
      const empMap = empList.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {} as Record<string, User>);
      setEmployees(empMap);
    } catch (e) {
      toast.error('Failed to load approval data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const status = action === 'APPROVE' ? EntryStatus.APPROVED : EntryStatus.REJECTED;
      await api.updateEntryStatus(id, status);
      toast.success(action === 'APPROVE' ? 'Entry Approved' : 'Entry Rejected');
      loadData(); // Refresh list to remove processed entry
    } catch (e) {
      toast.error('Action failed');
    }
  };

  const filteredEntries = entries.filter(e => {
    const empName = employees[e.userId]?.name?.toLowerCase() || '';
    return empName.includes(filterUser.toLowerCase());
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Approvals</h1>
            <p className="text-slate-400">Review and approve employee time entries</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by employee..." 
              className="pl-9 pr-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-sm w-full md:w-64 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            />
          </div>
        </header>

        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
          {entries.length === 0 ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
                <Check className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium text-slate-300">All caught up!</p>
              <p className="text-sm">No pending entries to review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 border-b border-slate-800 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4 text-center">Hrs</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredEntries.map(entry => {
                    const employee = employees[entry.userId];
                    return (
                      <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                              {employee?.name?.[0] || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-white">{employee?.name || 'Unknown'}</p>
                              <p className="text-xs text-slate-500">{employee?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span className="font-medium">{formatDate(entry.date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Clock className="w-3 h-3" />
                            {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-900/50">
                            {entry.projectId}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-bold text-white text-base">{entry.totalHours}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {entry.notes && (
                            <div className="mb-2 italic text-slate-300">"{entry.notes}"</div>
                          )}
                          <div className="flex gap-2">
                            {entry.eveningHours > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-300 border border-orange-900/40" title="Evening Hours">
                                🌅 {entry.eveningHours}h
                              </span>
                            )}
                            {entry.nightHours > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-900/30 text-indigo-300 border border-indigo-900/40" title="Night Hours">
                                🌙 {entry.nightHours}h
                              </span>
                            )}
                          </div>
                          {entry.eveningHours === 0 && entry.nightHours === 0 && (
                            <span className="text-slate-600">Standard Shift</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="danger" 
                              className="h-9 w-9 p-0 rounded-full border border-red-900/50" 
                              title="Reject"
                              onClick={() => handleAction(entry.id, 'REJECT')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="primary" 
                              className="h-9 w-9 p-0 rounded-full bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/50 shadow-lg shadow-emerald-900/20" 
                              title="Approve"
                              onClick={() => handleAction(entry.id, 'APPROVE')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEntries.length === 0 && entries.length > 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No employees found matching "{filterUser}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};