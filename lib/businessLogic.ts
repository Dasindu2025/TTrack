
import { TimeEntry, EntryStatus } from '../types';

/**
 * Parses "HH:mm" string into minutes from midnight
 */
const parseTimeStr = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Calculates overlap in minutes between a time range (start-end) and a configured shift (shiftStart-shiftEnd).
 * Handles shift ranges that cross midnight (e.g., Night 22:00 - 06:00).
 */
export const calculateShiftOverlap = (
  entryStart: Date,
  entryEnd: Date,
  shiftStartStr: string,
  shiftEndStr: string
): number => {
  // Convert entry times to minutes from midnight of the start day
  const entryStartMins = entryStart.getHours() * 60 + entryStart.getMinutes();
  const entryEndMins = entryEnd.getHours() * 60 + entryEnd.getMinutes();
  
  // If entry spans across days (handled by split logic externally usually, 
  // but if we treat small chunks, we assume same day for calculation simplifiction 
  // after the split function runs).
  // NOTE: This function assumes the entry DOES NOT cross midnight (has been split already).
  
  const shiftStart = parseTimeStr(shiftStartStr);
  const shiftEnd = parseTimeStr(shiftEndStr);
  
  let overlap = 0;

  if (shiftStart < shiftEnd) {
    // Standard range (e.g. 18:00 - 22:00)
    const start = Math.max(entryStartMins, shiftStart);
    const end = Math.min(entryEndMins, shiftEnd);
    if (start < end) overlap += (end - start);
  } else {
    // Cross midnight range (e.g. 22:00 - 06:00)
    // Part 1: shiftStart to 24:00 (1440)
    const start1 = Math.max(entryStartMins, shiftStart);
    const end1 = Math.min(entryEndMins, 1440);
    if (start1 < end1) overlap += (end1 - start1);

    // Part 2: 00:00 to shiftEnd
    const start2 = Math.max(entryStartMins, 0);
    const end2 = Math.min(entryEndMins, shiftEnd);
    if (start2 < end2) overlap += (end2 - start2);
  }

  return Number((overlap / 60).toFixed(2));
};

/**
 * Splits a time entry if it crosses midnight.
 * Returns an array of 1 or 2 entries.
 */
export const splitTimeEntry = (start: Date, end: Date) => {
  const entries = [];
  
  // Check if dates are different days
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  if (startDay.getTime() === endDay.getTime()) {
    entries.push({ start, end });
  } else {
    // Split at midnight
    const splitPoint = new Date(start);
    splitPoint.setHours(24, 0, 0, 0); // Midnight of next day

    entries.push({ start: new Date(start), end: new Date(splitPoint) });
    
    // Check if end is actually after split point (it should be)
    if (end > splitPoint) {
      entries.push({ start: new Date(splitPoint), end: new Date(end) });
    }
  }
  return entries;
};

/**
 * Validates backdate limit and prevents future dates
 */
export const isBackdateAllowed = (date: Date, limitDays: number): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const entryDate = new Date(date);
  entryDate.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(today.getTime() - entryDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Prevent future dates
  if (entryDate > today) return false;
  
  return diffDays <= limitDays;
};
