
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import { Company } from '../types';
import { Button } from '../components/ui/Button';
import { Time24Input } from '../components/ui/Time24Input';
import { toast } from 'sonner';
import { Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { isValid24HourTime } from '../lib/utils';

export const Policies = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    eveningStart: '',
    eveningEnd: '',
    nightStart: '',
    nightEnd: ''
  });
  
  const user = JSON.parse(localStorage.getItem('tyo_user') || '{}');

  const loadData = async () => {
    setLoading(true);
    try {
      const c = await api.getCompany(user.companyId);
      if (c) {
        setCompany(c);
        setForm({
          eveningStart: c.eveningStart,
          eveningEnd: c.eveningEnd,
          nightStart: c.nightStart,
          nightEnd: c.nightEnd
        });
      }
    } catch (e) {
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (
      !isValid24HourTime(form.eveningStart) ||
      !isValid24HourTime(form.eveningEnd) ||
      !isValid24HourTime(form.nightStart) ||
      !isValid24HourTime(form.nightEnd)
    ) {
      toast.error('All policy times must be in 24-hour HH:mm format');
      return;
    }
    try {
      await api.updateCompanyPolicy(company.id, form, user.name);
      toast.success('Policies updated successfully');
      loadData();
    } catch (e) {
      toast.error('Failed to update policies');
    }
  };

  if (!company) return <Layout><div className="p-8">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Time Policies</h1>
          <p className="text-slate-400">Configure shift definitions and work rules.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Config Form */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass-surface panel-lift rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Shift Definitions</h3>
                  <p className="text-sm text-slate-400">Define hours for evening and night differentials.</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                   <h4 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
                     Evening Shift
                   </h4>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-500 mb-1">Start Time (HH:mm)</label>
                       <Time24Input
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                         value={form.eveningStart}
                         onChange={(value) => setForm({...form, eveningStart: value})}
                         required
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-500 mb-1">End Time (HH:mm)</label>
                       <Time24Input
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                         value={form.eveningEnd}
                         onChange={(value) => setForm({...form, eveningEnd: value})}
                         required
                       />
                     </div>
                   </div>
                </div>

                <div>
                   <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center gap-2">
                     Night Shift
                   </h4>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-500 mb-1">Start Time (HH:mm)</label>
                       <Time24Input
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                         value={form.nightStart}
                         onChange={(value) => setForm({...form, nightStart: value})}
                         required
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-500 mb-1">End Time (HH:mm)</label>
                       <Time24Input
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                         value={form.nightEnd}
                         onChange={(value) => setForm({...form, nightEnd: value})}
                         required
                       />
                       <p className="text-[10px] text-slate-500 mt-1">Times crossing midnight are automatically handled in 24-hour format.</p>
                     </div>
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </div>
          </div>

          {/* Info Side Panel */}
          <div className="space-y-6">
             <div className="glass-surface panel-lift rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4 text-emerald-400 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  Active Policy
                </div>
                <div className="space-y-3 text-sm">
                   <div className="flex justify-between">
                     <span className="text-slate-500">Timezone</span>
                     <span className="text-white font-mono">{company.timezone}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Last Updated</span>
                     <span className="text-white">Today</span>
                   </div>
                </div>
             </div>

             <div className="bg-amber-900/10 border border-amber-900/30 rounded-xl p-6">
               <div className="flex items-start gap-3">
                 <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                 <div>
                   <h4 className="text-sm font-bold text-amber-500 mb-1">Immutable History</h4>
                   <p className="text-xs text-amber-200/70">
                     Changes to time policies only affect future entries. Past entries remain locked to the policy version active at their time of submission.
                   </p>
                 </div>
               </div>
             </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};
