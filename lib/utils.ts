import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const HELSINKI_TZ = 'Europe/Helsinki';
export const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: HELSINKI_TZ
  });
};

export const formatTime = (date: Date | string) => {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: HELSINKI_TZ
  });
};

export const formatDateTime24 = (date: Date | string) => {
  return new Date(date).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: HELSINKI_TZ
  });
};

export const isValid24HourTime = (value: string) => TIME_24H_REGEX.test(value);

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};
