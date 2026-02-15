
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/mockDb';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Mock login logic
      const user = await api.login(email);
      localStorage.setItem('tyo_user', JSON.stringify(user));
      toast.success(`Welcome back, ${user.name}`);
      
      // Redirect based on role
      if (user.role === 'SUPER_ADMIN') {
        navigate('/companies');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md flex flex-col items-center relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 text-white shadow-2xl shadow-blue-500/20 ring-1 ring-white/10">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TyoTrack</h1>
          <p className="text-slate-400 mt-2 text-center">Enterprise Time Management</p>
        </div>

        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                <input 
                  type="email" 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
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
                  type="password" 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 transition-all"
              isLoading={isLoading}
            >
              Sign In <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs text-center text-slate-500 mb-4">Demo Credentials</p>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => { setEmail('bob@acme.com'); setPassword('password'); }}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors text-center"
              >
                Employee
              </button>
              <button 
                onClick={() => { setEmail('alice@acme.com'); setPassword('password'); }}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors text-center"
              >
                Admin
              </button>
              <button 
                onClick={() => { setEmail('super@tyo.com'); setPassword('password'); }}
                className="p-2 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 rounded text-xs text-purple-200 transition-colors text-center flex flex-col items-center justify-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" />
                Super Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
