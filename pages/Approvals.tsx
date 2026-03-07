import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import { TimeEntry, EntryStatus, User, Project } from '../types';
import { Button } from '../components/ui/Button';
import { Check, X, Search, Clock, Calendar, Sun, Moon, Trash2 } from 'lucide-react';
import { formatDate, formatTime, cn } from '../lib/utils';
import { toast } from 'sonner';

export const Approvals = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Record<string, User>>({});
  const [projectsById, setProjectsById] = useState<Record<string, string>>({});
  const [filterUser, setFilterUser] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EntryStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('tyo_user') || '{}');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allEntries, empList, projects] = await Promise.all([
        api.getTimeEntries(undefined, user.companyId),
        api.getEmployees(user.companyId),
        api.getAllCompanyProjects(user.companyId)
      ]);

      const sortedEntries = [...allEntries].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      setEntries(sortedEntries);

      const empMap = empList.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {} as Record<string, User>);
      setEmployees(empMap);

      const projectMap = projects.reduce((acc, project: Project) => {
        acc[project.id] = project.name;
        return acc;
      }, {} as Record<string, string>);
      setProjectsById(projectMap);
    } catch (e) {
      toast.error('Failed to load time entries');
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

  const handleDelete = async (entry: TimeEntry) => {
    const confirmed = window.confirm(
      `Delete this submitted entry for ${formatDate(entry.date)}? This removes the full parent time entry and any midnight splits.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.deleteTimeEntry(entry.id);
      toast.success('Time entry deleted');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  const filteredEntries = entries.filter(e => {
    const empName = employees[e.userId]?.name?.toLowerCase() || '';
    const statusMatches = statusFilter === 'ALL' || e.status === statusFilter;
    return empName.includes(filterUser.toLowerCase()) && statusMatches;
  });

  const statusCounts = {
    all: entries.length,
    pending: entries.filter((entry) => entry.status === EntryStatus.PENDING).length,
    approved: entries.filter((entry) => entry.status === EntryStatus.APPROVED).length,
    rejected: entries.filter((entry) => entry.status === EntryStatus.REJECTED).length
  };

  const getStatusBadgeClass = (status: EntryStatus) =>
    status === EntryStatus.APPROVED
      ? 'bg-emerald-900/30 text-emerald-300 border-emerald-900/50'
      : status === EntryStatus.REJECTED
        ? 'bg-red-900/30 text-red-300 border-red-900/50'
        : 'bg-amber-900/30 text-amber-300 border-amber-900/50';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Company Time Entries</h1>
            <p className="text-slate-400">View all entries in your company and manage each record one by one.</p>
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

        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant={statusFilter === 'ALL' ? 'primary' : 'outline'} size="sm" onClick={() => setStatusFilter('ALL')}>
            All ({statusCounts.all})
          </Button>
          <Button variant={statusFilter === EntryStatus.PENDING ? 'primary' : 'outline'} size="sm" onClick={() => setStatusFilter(EntryStatus.PENDING)}>
            Pending ({statusCounts.pending})
          </Button>
          <Button variant={statusFilter === EntryStatus.APPROVED ? 'primary' : 'outline'} size="sm" onClick={() => setStatusFilter(EntryStatus.APPROVED)}>
            Approved ({statusCounts.approved})
          </Button>
          <Button variant={statusFilter === EntryStatus.REJECTED ? 'primary' : 'outline'} size="sm" onClick={() => setStatusFilter(EntryStatus.REJECTED)}>
            Rejected ({statusCounts.rejected})
          </Button>
        </div>

        <div className="glass-surface panel-lift rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-500">Loading entries...</div>
          ) : entries.length === 0 ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
                <Check className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium text-slate-300">No entries yet</p>
              <p className="text-sm">There are no submitted entries in this company.</p>
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
                    <th className="px-6 py-4">Status</th>
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
                            {projectsById[entry.projectId] || entry.projectId}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="font-bold text-white text-base">{entry.totalHours}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border", getStatusBadgeClass(entry.status))}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {entry.notes && (
                            <div className="mb-2 italic text-slate-300">"{entry.notes}"</div>
                          )}
                          <div className="flex gap-2">
                            {entry.eveningHours > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-300 border border-orange-900/40" title="Evening Hours">
                                <Sun className="inline w-3 h-3 mr-1" />
                                {entry.eveningHours}h
                              </span>
                            )}
                            {entry.nightHours > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-900/30 text-indigo-300 border border-indigo-900/40" title="Night Hours">
                                <Moon className="inline w-3 h-3 mr-1" />
                                {entry.nightHours}h
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
                              variant="ghost"
                              className="h-9 w-9 p-0 rounded-full border border-slate-700 text-slate-400 hover:text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/10"
                              title="Delete"
                              onClick={() => handleDelete(entry)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            {entry.status === EntryStatus.PENDING && (
                              <>
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
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEntries.length === 0 && entries.length > 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        No time entries found for current filters.
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
