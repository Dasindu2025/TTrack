import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { User, UserRole } from '../types';

const TEST_ROLE_CREDENTIALS = {
  EMPLOYEE: { email: 'bob@acme.com', password: 'password123' },
  COMPANY_ADMIN: { email: 'alice@acme.com', password: 'password123' },
  SUPER_ADMIN: { email: 'super@tyo.com', password: 'password123' },
} as const satisfies Record<UserRole, { email: string; password: string }>;

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const completeLogin = (user: User) => {
    localStorage.setItem('tyo_user', JSON.stringify(user));
    toast.success(`Welcome back, ${user.name}`);

    if (user.role === UserRole.SUPER_ADMIN) {
      navigate('/companies');
      return;
    }

    navigate('/dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await api.login(email, password);
      completeLogin(user);
    } catch (err: any) {
      toast.error(err?.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleLogin = async (role: UserRole) => {
    if (isLoading) return;
    const credentials = TEST_ROLE_CREDENTIALS[role];
    setEmail(credentials.email);
    setPassword(credentials.password);
    setIsLoading(true);
    try {
      const user = await api.loginAsRole(role);
      completeLogin(user);
    } catch (err: any) {
      toast.error(err?.message || 'Role login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 ambient-grid opacity-30 pointer-events-none" />
      <div className="absolute top-[14%] left-[18%] w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl float-orb pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl float-orb delay pointer-events-none" />
      <div className="absolute top-[35%] right-[8%] w-56 h-56 bg-cyan-300/15 rounded-full blur-3xl float-orb slow pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md flex flex-col items-center relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.3 }}
            className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 text-white shadow-[0_18px_50px_rgba(14,116,144,0.45)] ring-1 ring-white/20"
          >
            <Clock className="w-8 h-8" />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight font-display accent-text">TyoTrack</h1>
          <p className="text-slate-300/90 mt-2 text-center">Enterprise Time Management</p>
          <p className="text-slate-400 text-sm mt-1 text-center">Secure access for modern teams</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="w-full glass-surface panel-lift rounded-2xl p-8"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-white focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2 top-1.5 p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-3.5 font-semibold"
              isLoading={isLoading}
            >
              Sign In <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-center text-slate-400 mb-4 uppercase tracking-[0.12em]">Role Test Login</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleLogin(UserRole.EMPLOYEE)}
                disabled={isLoading}
                className="p-2.5 bg-slate-800/70 hover:bg-slate-700/80 border border-slate-600/40 rounded-xl text-xs text-slate-200 transition-all"
              >
                Employee
              </button>
              <button
                type="button"
                onClick={() => handleRoleLogin(UserRole.COMPANY_ADMIN)}
                disabled={isLoading}
                className="p-2.5 bg-slate-800/70 hover:bg-slate-700/80 border border-slate-600/40 rounded-xl text-xs text-slate-200 transition-all"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleRoleLogin(UserRole.SUPER_ADMIN)}
                disabled={isLoading}
                className="p-2.5 bg-indigo-900/30 hover:bg-indigo-800/35 border border-indigo-400/35 rounded-xl text-xs text-indigo-100 transition-all text-center flex flex-col items-center justify-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" />
                Super Admin
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
