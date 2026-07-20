'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface MonthViewProps {
  displayMonth: Date; // Any date in the target month
  selectedDate: Date;
  plannedDates: Set<string>;
  generationStatuses: Map<string, 'pending' | 'generating' | 'completed' | 'failed'>;
  onSelectDate: (date: Date) => void;
}

/**
 * Month view — a mini calendar grid showing the full month.
 * Days with planned outfits display a small dot indicator.
 * The currently selected day is highlighted.
 */
export function MonthView({
  displayMonth,
  selectedDate,
  plannedDates,
  generationStatuses,
  onSelectDate,
}: MonthViewProps) {
  const formatDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const todayStr = useMemo(() => formatDateStr(new Date()), []);

  const calendarCells = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    const startPad = firstDay.getDay(); // 0=Sun, ...
    const daysInMonth = lastDay.getDate();

    const cells: Array<{ date: Date | null; key: string }> = [];

    // Padding days from previous month
    for (let i = 0; i < startPad; i++) {
      cells.push({ date: null, key: `pad-start-${i}` });
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), key: `day-${d}` });
    }

    // Padding days at end (keep grid even)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        cells.push({ date: null, key: `pad-end-${i}` });
      }
    }

    return cells;
  }, [displayMonth]);

  const selectedStr = formatDateStr(selectedDate);

  return (
    <div className="px-4 pb-4">
      {/* Day of week headers */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        key={`${displayMonth.getFullYear()}-${displayMonth.getMonth()}-headers`}
        className="grid grid-cols-7 gap-0 mb-2"
      >
        {DAY_ABBREVIATIONS.map((abbr) => (
          <div
            key={abbr}
            className="flex h-8 items-center justify-center text-[11px] font-medium text-muted-foreground"
          >
            {abbr}
          </div>
        ))}
      </motion.div>

      {/* Calendar grid */}
      <motion.div
        key={`${displayMonth.getFullYear()}-${displayMonth.getMonth()}-grid`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="grid grid-cols-7 gap-0"
      >
        {calendarCells.map(({ date, key }) => {
          if (!date) {
            return (
              <div
                key={key}
                className="flex items-center justify-center h-12"
              />
            );
          }

          const dateStr = formatDateStr(date);
          const day = date.getDate();
          const selected = dateStr === selectedStr;
          const today = dateStr === todayStr;
          const hasPlanned = plannedDates.has(dateStr);
          const genStatus = generationStatuses.get(dateStr);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(date)}
              className={cn(
                'relative flex h-12 w-full items-center justify-center rounded-full text-sm transition-all',
                selected
                  ? 'bg-foreground text-background font-semibold'
                  : today
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 font-medium',
              )}
            >
              <span>{day}</span>
              {/* Planned indicator dot */}
              {hasPlanned && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{
                    scale: 1,
                    y: genStatus === 'generating' ? [0, -1.5, 0] : 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                    y: genStatus === 'generating'
                      ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                      : undefined,
                  }}
                  className={cn(
                    'absolute -bottom-0.5 h-1.5 w-1.5 rounded-full',
                    genStatus === 'pending' || genStatus === 'generating'
                      ? 'bg-amber-400'
                      : genStatus === 'completed'
                        ? 'bg-green-500'
                        : genStatus === 'failed'
                          ? 'bg-red-400'
                          : 'bg-muted-foreground/50',
                  )}
                />
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
