import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface Time24InputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  id?: string;
  name?: string;
}

const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function parseTime(value: string): { hour: number; minute: number } {
  if (!TIME_24H_REGEX.test(value)) {
    return { hour: 9, minute: 0 };
  }

  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
}

function buildTime(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

export const Time24Input: React.FC<Time24InputProps> = ({
  value,
  onChange,
  className,
  required,
  id,
  name
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(() => parseTime(value), [value]);
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const setHour = (hour: number) => onChange(buildTime(hour, parsed.minute));
  const setMinute = (minute: number) => onChange(buildTime(parsed.hour, minute));

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        name={name}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        value={buildTime(parsed.hour, parsed.minute)}
        required={required}
        pattern="^([01]\d|2[0-3]):[0-5]\d$"
      />

      <button
        type="button"
        className={cn(
          "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left text-sm text-slate-100 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50",
          className
        )}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="font-mono">{buildTime(parsed.hour, parsed.minute)}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[280px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-400">Hour (00-23)</p>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-1">
                {hourOptions.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    className={cn(
                      "mb-1 w-full rounded px-2 py-1 text-left font-mono text-sm",
                      parsed.hour === hour
                        ? "bg-cyan-500/20 text-cyan-200"
                        : "text-slate-300 hover:bg-slate-800"
                    )}
                    onClick={() => setHour(hour)}
                  >
                    {pad2(hour)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-400">Minute (00-59)</p>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-1">
                {minuteOptions.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className={cn(
                      "mb-1 w-full rounded px-2 py-1 text-left font-mono text-sm",
                      parsed.minute === minute
                        ? "bg-cyan-500/20 text-cyan-200"
                        : "text-slate-300 hover:bg-slate-800"
                    )}
                    onClick={() => setMinute(minute)}
                  >
                    {pad2(minute)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-slate-200"
              onClick={() => onChange("00:00")}
            >
              Set 00:00
            </button>
            <button
              type="button"
              className="rounded-md bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
