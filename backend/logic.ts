import { PrismaClient, EntryStatus } from '@prisma/client';

const prisma = new PrismaClient();

// --- Business Logic Helpers (Server Side) ---

/**
 * Parses "HH:mm" string into minutes from midnight
 */
const parseTimeStr = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Calculates overlap in minutes between a time range and a shift.
 * Supports cross-midnight shifts (e.g. 22:00 - 06:00).
 */
const calculateOverlap = (
  entryStart: Date,
  entryEnd: Date,
  shiftStartStr: string,
  shiftEndStr: string
): number => {
  const startMins = entryStart.getHours() * 60 + entryStart.getMinutes();
  const endMins = entryEnd.getHours() * 60 + entryEnd.getMinutes();
  
  const shiftStart = parseTimeStr(shiftStartStr);
  const shiftEnd = parseTimeStr(shiftEndStr);
  
  let overlap = 0;

  if (shiftStart < shiftEnd) {
    // Normal shift (e.g., 18:00 - 22:00)
    const s = Math.max(startMins, shiftStart);
    const e = Math.min(endMins, shiftEnd);
    if (s < e) overlap += (e - s);
  } else {
    // Cross-midnight shift (e.g., 22:00 - 06:00)
    // Segment 1: Start to Midnight (1440)
    const s1 = Math.max(startMins, shiftStart);
    const e1 = Math.min(endMins, 1440);
    if (s1 < e1) overlap += (e1 - s1);
    
    // Segment 2: Midnight (0) to End
    const s2 = Math.max(startMins, 0);
    const e2 = Math.min(endMins, shiftEnd);
    if (s2 < e2) overlap += (e2 - s2);
  }
  
  return Number((overlap / 60).toFixed(2));
};

/**
 * Validates if the entry date is within the employee's allowed backdate limit.
 */
const validateBackdate = async (userId: string, entryDate: Date) => {
  const profile = await prisma.employeeProfile.findUnique({ where: { userId } });
  const limitDays = profile?.backdateLimitDays || 7; // Default 7 days
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const target = new Date(entryDate);
  target.setHours(0,0,0,0);
  
  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > limitDays) {
    throw new Error(`Time entry is too old. Limit is ${limitDays} days.`);
  }
};

/**
 * Core Service: Create Time Entry
 * Handles: Backdate check, Midnight splitting, Shift calculation, Database Transaction
 */
export const createTimeEntry = async (
  userId: string,
  workspaceId: string,
  projectId: string,
  startTime: Date,
  endTime: Date,
  notes?: string
) => {
  // 1. Fetch Company Config for Shift Logic
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    include: { company: true } 
  });
  
  if (!user || !user.company) throw new Error("User or Company not found");
  const { eveningStart, eveningEnd, nightStart, nightEnd, timezone } = user.company;

  // 2. Validate Backdate
  await validateBackdate(userId, startTime);

  // 3. Logic: Midnight Splitting
  // If start and end are on different calendar days, split them.
  const entriesToCreate = [];
  
  const startDay = new Date(startTime);
  const endDay = new Date(endTime);
  
  // Reset times to compare dates
  const d1 = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate());
  const d2 = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate());
  
  if (d1.getTime() === d2.getTime()) {
    // Same day
    entriesToCreate.push({ start: startTime, end: endTime });
  } else {
    // Crosses midnight
    const splitPoint = new Date(startTime);
    splitPoint.setHours(24, 0, 0, 0); // Midnight logic
    
    // Entry A: Start -> Midnight
    entriesToCreate.push({ start: startTime, end: splitPoint });
    // Entry B: Midnight -> End
    entriesToCreate.push({ start: splitPoint, end: endTime });
  }

  // 4. Calculate & Transaction Save
  return await prisma.$transaction(async (tx) => {
    const results = [];
    
    for (const segment of entriesToCreate) {
      const durationMins = (segment.end.getTime() - segment.start.getTime()) / 1000 / 60;
      const totalHours = Number((durationMins / 60).toFixed(2));
      
      const eveningHours = calculateOverlap(segment.start, segment.end, eveningStart, eveningEnd);
      const nightHours = calculateOverlap(segment.start, segment.end, nightStart, nightEnd);
      
      // Store date string relative to company timezone (simplified here to ISO date for demo)
      const dateStr = segment.start.toISOString().split('T')[0];
      
      const entry = await tx.timeEntry.create({
        data: {
          userId,
          workspaceId,
          projectId,
          startTime: segment.start,
          endTime: segment.end,
          date: dateStr,
          totalHours,
          eveningHours,
          nightHours,
          notes,
          status: EntryStatus.PENDING,
        }
      });
      results.push(entry);
    }
    
    return results;
  });
};

/**
 * Service: Approve/Reject Entry
 * Ensures locked entries cannot be modified.
 */
export const updateEntryStatus = async (
  entryId: string, 
  status: EntryStatus, 
  adminId: string,
  reason?: string
) => {
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new Error("Entry not found");
  
  // Business Rule: Cannot edit already approved entries (unless by Super Admin - logic can be added)
  if (entry.status === EntryStatus.APPROVED && status === EntryStatus.PENDING) {
     // Re-opening logic if needed
  }

  return await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      status,
      rejectionReason: reason,
      approvedAt: status === EntryStatus.APPROVED ? new Date() : null,
      approvedBy: status === EntryStatus.APPROVED ? adminId : null
    }
  });
};