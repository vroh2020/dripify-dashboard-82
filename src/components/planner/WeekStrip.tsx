'use client';

import { useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const DAY_ABBREVIATIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface WeekStripProps {
  /** The currently selected date */
  selectedDate: Date;
  /** Called when a day is tapped */
  onSelectDate: (date: Date) => void;
  /**
   * Set of date strings (YYYY-MM-DD) that have a planned outfit.
   * Used to show a small indicator dot below planned days.
   */
  plannedDates?: Set<string>;
  /**
   * Map of date string -> generation status for showing loading states.
   */
  generationStatuses?: Map<string, 'pending' | 'generating' | 'completed' | 'failed'>;
}

/**
 * 7-day horizontal week strip starting from the Monday of the week containing
 * `selectedDate`. Each day shows the abbreviation + date number.
 * The currently selected day is a filled black circle.
 * Days with planned outfits show a small dot indicator.
 */
export function WeekStrip({
  selectedDate,
  onSelectDate,
  plannedDates = new Set(),
  generationStatuses = new Map(),
}: WeekStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Compute the Monday of the current week
  const weekDays = useMemo(() => {
    const dayOfWeek = selectedDate.getDay(); // 0=Sun, 1=Mon, ...
    // Convert to Mon=0 ... Sun=6
    const monIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() - monIndex);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  }, [selectedDate]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const formatDateStr = useCallback((date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }, []);

  const isToday = useCallback(
    (date: Date) => formatDateStr(date) === todayStr,
    [formatDateStr, todayStr],
  );

  const isSelected = useCallback(
    (date: Date) => formatDateStr(date) === formatDateStr(selectedDate),
    [formatDateStr, selectedDate],
  );

  // Scroll to make selected day visible
  const selectedIndex = weekDays.findIndex((d) => isSelected(d));
  // Auto-scroll could be added here with scrollRef

  return (
    <div
      ref={scrollRef}
      className="flex items-center justify-between px-4 py-3"
    >
      {weekDays.map((date, i) => {
        const dateStr = formatDateStr(date);
        const dayNum = date.getDate();
        const abbr = DAY_ABBREVIATIONS[i];
        const selected = isSelected(date);
        const today = isToday(date);
        const hasPlanned = plannedDates.has(dateStr);
        const genStatus = generationStatuses.get(dateStr);

        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => onSelectDate(date)}
            className="flex flex-col items-center gap-1 relative"
            aria-label={`${abbr} ${dayNum}`}
          >
            {/* Day abbreviation */}
            <span
              className={cn(
                'text-[11px] font-medium tracking-tight transition-colors',
                selected
                  ? 'text-white'
                  : today
                    ? 'text-foreground'
                    : 'text-muted-foreground',
              )}
            >
              {abbr}
            </span>

            {/* Day number circle */}
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200',
                selected
                  ? 'bg-foreground text-background shadow-md scale-105'
                  : today
                    ? 'bg-muted text-foreground ring-1 ring-border'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/60',
              )}
            >
              {dayNum}
            </div>

            {/* Planned outfit indicator dot */}
            {hasPlanned && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{
                  scale: 1,
                  y: genStatus === 'generating' ? [0, -2, 0] : 0,
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
                  'absolute -bottom-1 h-1.5 w-1.5 rounded-full',
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
    </div>
  );
}
