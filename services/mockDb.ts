
import { User, UserRole, Company, Workspace, Project, TimeEntry, EntryStatus, AuditLog } from '../types';
import { splitTimeEntry, calculateShiftOverlap, isBackdateAllowed } from '../lib/businessLogic';
import { v4 as uuidv4 } from 'uuid'; 

const genId = () => Math.random().toString(36).substr(2, 9);

// --- SEED DATA ---

let MOCK_COMPANIES: Company[] = [
  {
    id: 'c1',
    name: 'Acme Corp',
    email: 'contact@acme.com',
    timezone: 'Europe/Helsinki',
    eveningStart: '18:00',
    eveningEnd: '22:00',
    nightStart: '22:00',
    nightEnd: '06:00',
  }
];

let MOCK_USERS: User[] = [
  { id: 'u1', name: 'Super Admin', email: 'super@tyo.com', role: UserRole.SUPER_ADMIN, status: 'ACTIVE' },
  { id: 'u2', name: 'Alice Manager', email: 'alice@acme.com', role: UserRole.COMPANY_ADMIN, companyId: 'c1', status: 'ACTIVE' },
  { id: 'u3', name: 'Bob Worker', email: 'bob@acme.com', role: UserRole.EMPLOYEE, companyId: 'c1', status: 'ACTIVE' },
  { id: 'u4', name: 'Charlie Dev', email: 'charlie@acme.com', role: UserRole.EMPLOYEE, companyId: 'c1', status: 'ACTIVE' },
  { id: 'u5', name: 'Diana Design', email: 'diana@acme.com', role: UserRole.EMPLOYEE, companyId: 'c1', status: 'ACTIVE' },
];

let MOCK_WORKSPACES: Workspace[] = [
  { id: 'w1', name: 'Engineering', companyId: 'c1' },
  { id: 'w2', name: 'Design', companyId: 'c1' },
];

let MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Frontend Revamp', workspaceId: 'w1', color: '#3b82f6', status: 'ACTIVE' },
  { id: 'p2', name: 'Backend Migration', workspaceId: 'w1', color: '#10b981', status: 'ACTIVE' },
  { id: 'p3', name: 'Design System', workspaceId: 'w2', color: '#f59e0b', status: 'ACTIVE' },
  { id: 'p4', name: 'Legacy Maintenance', workspaceId: 'w1', color: '#64748b', status: 'ARCHIVED' },
];

let MOCK_ENTRIES: TimeEntry[] = [
  {
    id: 'e1',
    userId: 'u3',
    workspaceId: 'w1',
    projectId: 'p1',
    startTime: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(12, 30, 0, 0)).toISOString(),
    status: EntryStatus.APPROVED,
    eveningHours: 0,
    nightHours: 0,
    totalHours: 3.5,
    date: new Date().toISOString().split('T')[0],
  },
  {
    id: 'e2',
    userId: 'u3',
    workspaceId: 'w1',
    projectId: 'p1',
    startTime: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
    status: EntryStatus.PENDING,
    eveningHours: 0,
    nightHours: 0,
    totalHours: 4,
    date: new Date().toISOString().split('T')[0],
  },
  {
    id: 'e3',
    userId: 'u4',
    workspaceId: 'w1',
    projectId: 'p2',
    startTime: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
    status: EntryStatus.PENDING,
    eveningHours: 1,
    nightHours: 0,
    totalHours: 9,
    date: new Date().toISOString().split('T')[0],
  },
  {
    id: 'e4',
    userId: 'u5',
    workspaceId: 'w2',
    projectId: 'p3',
    startTime: new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
    status: EntryStatus.PENDING,
    eveningHours: 0,
    nightHours: 0,
    totalHours: 4,
    date: new Date().toISOString().split('T')[0],
  }
];

let MOCK_PROFILES: Record<string, { id: string, userId: string, backdateLimitDays: number }> = {
  'u3': { id: 'prof1', userId: 'u3', backdateLimitDays: 5 },
  'u4': { id: 'prof2', userId: 'u4', backdateLimitDays: 2 },
};

let MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'al1',
    companyId: 'c1',
    userId: 'u2',
    userName: 'Alice Manager',
    action: 'UPDATE_POLICY',
    entity: 'Company',
    details: 'Changed Night Shift start from 23:00 to 22:00',
    timestamp: new Date(Date.now() - 86400000).toISOString()
  }
];

// --- API SIMULATION ---

export const api = {
  login: async (email: string) => {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('User not found');
    return user;
  },

  getUserByEmail: async (email: string) => {
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('User not found in database');
    return user;
  },

  // --- Company Management (Super Admin) ---
  getAllCompanies: async () => MOCK_COMPANIES,
  
  createCompany: async (name: string, email: string, password?: string) => {
    const newCompany: Company = { 
        id: genId(), 
        name, 
        email,
        timezone: 'UTC',
        // Default Policies
        eveningStart: '18:00',
        eveningEnd: '22:00',
        nightStart: '22:00',
        nightEnd: '06:00',
    };
    MOCK_COMPANIES.push(newCompany);
    // Create default workspace
    MOCK_WORKSPACES.push({ id: genId(), name: 'General', companyId: newCompany.id });
    return newCompany;
  },

  createCompanyAdmin: async (companyId: string, name: string, email: string, password?: string) => {
    const existing = MOCK_USERS.find(u => u.email === email);
    if (existing) throw new Error('User with this email already exists');
    
    const newUser: User = {
      id: genId(),
      name,
      email,
      role: UserRole.COMPANY_ADMIN,
      companyId,
      status: 'ACTIVE'
    };
    MOCK_USERS.push(newUser);
    return newUser;
  },

  createEmployee: async (companyId: string, name: string, email: string, password?: string) => {
    const existing = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error('User with this email already exists');
    
    const newUser: User = {
      id: genId(),
      name,
      email,
      role: UserRole.EMPLOYEE,
      companyId,
      status: 'ACTIVE'
    };
    MOCK_USERS.push(newUser);
    // Initialize default profile
    MOCK_PROFILES[newUser.id] = { id: genId(), userId: newUser.id, backdateLimitDays: 7 };
    return newUser;
  },

  getCompanyAdmins: async (companyId: string) => {
    return MOCK_USERS.filter(u => u.companyId === companyId && u.role === UserRole.COMPANY_ADMIN);
  },
  
  getCompany: async (id: string) => MOCK_COMPANIES.find(c => c.id === id),
  
  updateCompanyPolicy: async (id: string, updates: Partial<Company>, adminName: string) => {
    const idx = MOCK_COMPANIES.findIndex(c => c.id === id);
    if (idx !== -1) {
      const old = MOCK_COMPANIES[idx];
      MOCK_COMPANIES[idx] = { ...old, ...updates };
      // Log Audit
      MOCK_AUDIT_LOGS.unshift({
        id: genId(),
        companyId: id,
        userId: 'u2', // Mock ID
        userName: adminName,
        action: 'UPDATE_POLICY',
        entity: 'Company',
        details: `Updated company shift policies`,
        timestamp: new Date().toISOString()
      });
    }
    return MOCK_COMPANIES[idx];
  },

  getWorkspaces: async (companyId: string) => MOCK_WORKSPACES.filter(w => w.companyId === companyId),
  
  getProjects: async (workspaceId: string) => MOCK_PROJECTS.filter(p => p.workspaceId === workspaceId),
  
  getAllCompanyProjects: async (companyId: string) => {
    const workspaceIds = MOCK_WORKSPACES.filter(w => w.companyId === companyId).map(w => w.id);
    return MOCK_PROJECTS.filter(p => workspaceIds.includes(p.workspaceId));
  },

  createProject: async (workspaceId: string, name: string, color: string) => {
    const newProject: Project = {
      id: genId(),
      workspaceId,
      name,
      color,
      status: 'ACTIVE'
    };
    MOCK_PROJECTS.push(newProject);
    return newProject;
  },

  toggleProjectStatus: async (projectId: string) => {
    const p = MOCK_PROJECTS.find(p => p.id === projectId);
    if (p) {
      p.status = p.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    }
  },

  getTimeEntries: async (userId: string | undefined, companyId: string) => {
    if (userId) return MOCK_ENTRIES.filter(e => e.userId === userId);
    const companyUsers = MOCK_USERS.filter(u => u.companyId === companyId).map(u => u.id);
    return MOCK_ENTRIES.filter(e => companyUsers.includes(e.userId));
  },

  getEmployees: async (companyId: string) => {
    return MOCK_USERS.filter(u => u.companyId === companyId && u.role === UserRole.EMPLOYEE).map(u => ({
      ...u,
      profile: MOCK_PROFILES[u.id] || { backdateLimitDays: 7 }
    }));
  },

  updateEmployeeProfile: async (userId: string, data: { backdateLimitDays: number }) => {
    const existing = MOCK_PROFILES[userId] || { id: genId(), userId, backdateLimitDays: 7 };
    MOCK_PROFILES[userId] = { ...existing, ...data };
    return MOCK_PROFILES[userId];
  },
  
  createTimeEntry: async (
    userId: string, 
    workspaceId: string, 
    projectId: string, 
    start: Date, 
    end: Date, 
    notes?: string
  ) => {
    const profile = MOCK_PROFILES[userId as keyof typeof MOCK_PROFILES];
    const limit = profile ? profile.backdateLimitDays : 7; 
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const entryDate = new Date(start);
    entryDate.setHours(0,0,0,0);

    if (entryDate > today) {
      throw new Error("Cannot submit time entries for future dates.");
    }

    if (!isBackdateAllowed(start, limit)) {
      throw new Error(`Cannot submit entries older than ${limit} days.`);
    }

    const rawSegments = splitTimeEntry(start, end);
    const newEntries: TimeEntry[] = [];
    
    for (const seg of rawSegments) {
      const durationMins = (seg.end.getTime() - seg.start.getTime()) / 1000 / 60;
      const totalHours = Number((durationMins / 60).toFixed(2));
      
      const user = MOCK_USERS.find(u => u.id === userId);
      const company = MOCK_COMPANIES.find(c => c.id === user?.companyId);
      
      const evStart = company?.eveningStart || '18:00';
      const evEnd = company?.eveningEnd || '22:00';
      const niStart = company?.nightStart || '22:00';
      const niEnd = company?.nightEnd || '06:00';
      
      const evHours = calculateShiftOverlap(seg.start, seg.end, evStart, evEnd);
      const niHours = calculateShiftOverlap(seg.start, seg.end, niStart, niEnd);
      
      const entry: TimeEntry = {
        id: genId(),
        userId,
        workspaceId,
        projectId,
        startTime: seg.start.toISOString(),
        endTime: seg.end.toISOString(),
        notes,
        status: EntryStatus.PENDING,
        totalHours,
        eveningHours: evHours,
        nightHours: niHours,
        date: seg.start.toISOString().split('T')[0],
      };
      newEntries.push(entry);
    }
    
    MOCK_ENTRIES = [...MOCK_ENTRIES, ...newEntries];
    return newEntries;
  },

  updateEntryStatus: async (entryId: string, status: EntryStatus, reason?: string) => {
    MOCK_ENTRIES = MOCK_ENTRIES.map(e => {
      if (e.id === entryId) {
        return { ...e, status, rejectionReason: reason };
      }
      return e;
    });
  },

  changePassword: async (userId: string, current: string, newPass: string) => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 800));
    // Simulate check
    if (current === 'error') throw new Error('Current password is incorrect');
    return true;
  },

  getAuditLogs: async (companyId: string) => {
    return MOCK_AUDIT_LOGS.filter(l => l.companyId === companyId);
  }
};
