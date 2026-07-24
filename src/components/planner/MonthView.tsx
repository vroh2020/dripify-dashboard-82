'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface MonthViewProps {
  displayMonth: Date; // Any date in the target month
  selectedDate: Date;
  plannedDates: Set<string>;
  generationStatuses: Map<string, 'pending' | 'generating' | 'completed' | 'failed'>;
  onSelectDate: (date: Date) => void;
  /** Called when navigating to previous/next month */
  onMonthChange?: (month: Date) => void;
}

/**
 * Month view — a compact/expandable calendar.
 *
 * **Compact state (default):** Shows only a single-row week strip
 * (7 days centered on the selected date) with month navigation
 * arrows and an expand chevron. Takes minimal vertical space so
 * the AI Try-On card stays above the fold.
 *
 * **Expanded state:** Animates the full 6-row month grid into view.
 * The grid overlays/pushes the content below using a smooth
 * framer-motion height transition.
 */
export function MonthView({
  displayMonth,
  selectedDate,
  plannedDates,
  generationStatuses,
  onSelectDate,
  onMonthChange,
}: MonthViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDateStr = useCallback((d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  []);

  const todayStr = useMemo(() => formatDateStr(new Date()), [formatDateStr]);

  // ── Compact week: 7 days centered on selectedDate ──────────────
  const compactWeek = useMemo(() => {
    const dayOfWeek = selectedDate.getDay(); // 0=Sun
    // Build week centered on selected date (3 days before, 3 after)
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  }, [selectedDate]);

  // ── Full month grid ───────────────────────────────────────────
  const calendarCells = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const cells: Array<{ date: Date | null; key: string }> = [];

    for (let i = 0; i < startPad; i++) {
      cells.push({ date: null, key: `pad-start-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), key: `day-${d}` });
    }
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        cells.push({ date: null, key: `pad-end-${i}` });
      }
    }

    return cells;
  }, [displayMonth]);

  const selectedStr = formatDateStr(selectedDate);

  const handlePrevMonth = useCallback(() => {
    const prev = new Date(displayMonth);
    prev.setMonth(prev.getMonth() - 1);
    onMonthChange?.(prev);
  }, [displayMonth, onMonthChange]);

  const handleNextMonth = useCallback(() => {
    const next = new Date(displayMonth);
    next.setMonth(next.getMonth() + 1);
    onMonthChange?.(next);
  }, [displayMonth, onMonthChange]);

  // ── Render a single day cell (shared by compact and expanded) ──
  const renderDayCell = useCallback(
    (date: Date, size: 'sm' | 'md' = 'md') => {
      const dateStr = formatDateStr(date);
      const day = date.getDate();
      const selected = dateStr === selectedStr;
      const today = dateStr === todayStr;
      const hasPlanned = plannedDates.has(dateStr);
      const genStatus = generationStatuses.get(dateStr);

      const isSm = size === 'sm';

      return (
        <button
          key={dateStr}
          type="button"
          onClick={() => {
            onSelectDate(date);
            // Auto-collapse after selecting a date (if expanded)
            if (isExpanded && !selected) {
              setIsExpanded(false);
            }
          }}
          className={cn(
            'relative flex items-center justify-center rounded-full text-sm transition-all',
            isSm ? 'h-9 w-9' : 'h-11 w-full',
            selected
              ? 'bg-foreground text-background font-semibold shadow-sm'
              : today
                ? 'bg-muted text-foreground font-medium ring-1 ring-border/60'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium',
            // Dark theme elevation: selected day gets strong contrast,
            // today gets a subtle ring, others are flat
          )}
        >
          <span className={cn(isSm ? 'text-xs' : 'text-sm')}>{day}</span>
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
                // Dark theme: planned dots are vivid against dark bg
              )}
            />
          )}
        </button>
      );
    },
    [selectedStr, todayStr, plannedDates, generationStatuses, onSelectDate, formatDateStr, isExpanded],
  );

  return (
    <div className="px-4 pb-3">
      {/* ── Header: Month/Year + Navigation + Expand ─────────────── */}
      <div className="flex items-center justify-between mb-2">
        {/* Previous month */}
        <motion.button
          type="button"
          onClick={handlePrevMonth}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </motion.button>

        {/* Month/Year label */}
        <motion.h2
          key={displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold text-foreground"
        >
          {displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </motion.h2>

        {/* Next month */}
        <motion.button
          type="button"
          onClick={handleNextMonth}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>

      {/* ── Day-of-week headers ─────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-0 mb-1.5">
        {DAY_ABBREVIATIONS.map((abbr) => (
          <div
            key={abbr}
            className="flex h-6 items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60"
          >
            {abbr}
          </div>
        ))}
      </div>

      {/* ── Compact: current week strip ─────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center justify-around">
          {compactWeek.map((date) => renderDayCell(date, 'sm'))}
        </div>

        {/* Expand/Collapse chevron */}
        <motion.button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label={isExpanded ? 'Collapse calendar' : 'Expand full month'}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.button>
      </div>

      {/* ── Expanded: full month grid ───────────────────────────── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={`full-grid-${displayMonth.getFullYear()}-${displayMonth.getMonth()}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {/* Full month grid */}
            <div className="mt-2 grid grid-cols-7 gap-0">
              {calendarCells.map(({ date, key }) => {
                if (!date) {
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-center h-10"
                    />
                  );
                }
                return (
                  <div key={key} className="flex items-center justify-center h-10">
                    {renderDayCell(date, 'sm')}
                  </div>
                );
              })}
            </div>

            {/* Tip text */}
            <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
              Tap a date to select it · Tap again to collapse
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
