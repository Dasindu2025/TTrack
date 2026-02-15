
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Clock,
  Users,
  FileText,
  Building2,
  FolderOpen,
  FileJson,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Mock Auth Hook usage
  const user = JSON.parse(localStorage.getItem('tyo_user') || '{}');
  
  const handleLogout = () => {
    localStorage.removeItem('tyo_user');
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: [UserRole.EMPLOYEE, UserRole.COMPANY_ADMIN] },
    { label: 'Companies', icon: Building2, path: '/companies', roles: [UserRole.SUPER_ADMIN] },
    
    // Company Admin Navigation
    { label: 'Approvals', icon: CheckSquare, path: '/approvals', roles: [UserRole.COMPANY_ADMIN] },
    { label: 'Employees', icon: Users, path: '/employees', roles: [UserRole.COMPANY_ADMIN] },
    { label: 'Projects', icon: FolderOpen, path: '/projects', roles: [UserRole.COMPANY_ADMIN] },
    { label: 'Time Policies', icon: FileJson, path: '/policies', roles: [UserRole.COMPANY_ADMIN] },
    { label: 'Reports', icon: BarChart3, path: '/reports', roles: [UserRole.COMPANY_ADMIN] },
    { label: 'Audit Logs', icon: ShieldAlert, path: '/audit-logs', roles: [UserRole.COMPANY_ADMIN] },
    
    // Employee Navigation
    { label: 'Detailed Reports', icon: FileText, path: '/detailed-reports', roles: [UserRole.EMPLOYEE] },
    
    // Shared
    { label: 'Settings', icon: Settings, path: '/settings', roles: [UserRole.EMPLOYEE, UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-200">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2 font-bold text-xl text-white">
          <Clock className="w-6 h-6 text-accent" />
          <span>TyoTrack</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="text-slate-200 p-2 -mr-2 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Open Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 h-screen w-72 md:w-64 bg-slate-900 border-r border-slate-800 text-slate-300 p-4 flex flex-col transition-transform duration-300 ease-in-out z-50 overflow-y-auto shadow-2xl md:shadow-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Sidebar Header (Logo + Close) */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2 font-bold text-2xl text-white">
            <Clock className="w-8 h-8 text-accent" />
            <span>TyoTrack</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close Menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 px-2 mb-8 bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold border border-accent/30 shadow-[0_0_10px_rgba(59,130,246,0.2)] shrink-0">
            {user.name?.[0] || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-white font-medium text-sm truncate">{user.name}</p>
            <p className="text-xs text-slate-400 capitalize truncate">{user.role?.replace('_', ' ').toLowerCase()}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive ? "bg-accent text-white" : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 mt-6 md:mt-auto"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-950 w-full">
        {children}
      </main>
      
      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
