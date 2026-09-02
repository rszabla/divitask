import {
  format,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  getQuarter,
  getWeek,
  isWeekend,
  isValid,
} from 'date-fns';
import { TaskItem, TimeBlock, AppSettings } from '../types.js';

export { addDays };

export function parseDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? startOfDay(d) : null;
  } catch {
    return null;
  }
}

export function parseDateTimeSafe(dateStr?: string | null, timeStr?: string | null, isEnd = false): Date | null {
  if (!dateStr) return null;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    let hours = isEnd ? 23 : 0;
    let minutes = isEnd ? 59 : 0;
    let seconds = isEnd ? 59 : 0;

    if (timeStr && timeStr.includes(':')) {
      const [h, m] = timeStr.split(':').map(Number);
      if (!isNaN(h)) hours = h;
      if (!isNaN(m)) minutes = m;
      seconds = 0;
    }

    const d = new Date(year, month - 1, day, hours, minutes, seconds, 0);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

export function formatDateSafe(date: Date | null | undefined, fmt = 'yyyy-MM-dd'): string {
  if (!date || !isValid(date)) return '';
  return format(date, fmt);
}

export function formatTimeSafe(date: Date | null | undefined): string {
  if (!date || !isValid(date)) return '';
  return format(date, 'HH:mm');
}

export function formatDisplayDate(date: Date | null | undefined): string {
  if (!date || !isValid(date)) return '';
  return format(date, 'MMM d, yyyy');
}

export function formatDisplayDateTime(date: Date | null | undefined, hasTime = false): string {
  if (!date || !isValid(date)) return '';
  return hasTime ? format(date, 'MMM d, yyyy HH:mm') : format(date, 'MMM d, yyyy');
}

export function formatDuration(startMs: number, endMs: number): string {
  const diffMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const remainingMins = diffMinutes % 60;
  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
  const days = Math.round(diffMinutes / 1440);
  if (days < 14) {
    return `${days}d`;
  }
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return `${weeks}w`;
  }
  const months = Math.round(days / 30);
  return `${months}mo`;
}

// Extract all effective time blocks for an item
export function getItemTimeBlocks(item: TaskItem): TimeBlock[] {
  if (item.timeBlocks && item.timeBlocks.length > 0) {
    return item.timeBlocks;
  }
  if (item.startDate) {
    return [
      {
        id: `${item.id}-legacy`,
        startDate: item.startDate,
        endDate: item.endDate || item.startDate,
        startTime: item.startTime,
        endTime: item.endTime,
        color: item.color,
        progress: item.progress,
      },
    ];
  }
  return [];
}

// --- TERM MODE HELPERS (4-month blocks: Jan-Apr, May-Aug, Sep-Dec) ---
export function getTerm(d: Date): number {
  const month = d.getMonth(); // 0 to 11
  if (month < 4) return 1;
  if (month < 8) return 2;
  return 3;
}

export function startOfTerm(d: Date): Date {
  const term = getTerm(d);
  const startMonth = (term - 1) * 4; // 0, 4, 8
  return new Date(d.getFullYear(), startMonth, 1, 0, 0, 0, 0);
}

export function endOfTerm(d: Date): Date {
  const term = getTerm(d);
  const endMonth = term * 4; // 4, 8, 12
  return new Date(d.getFullYear(), endMonth, 0, 23, 59, 59, 999);
}

export function addTerms(d: Date, n: number): Date {
  const term = getTerm(d);
  const total = (term - 1) + n;
  const yearDelta = Math.floor(total / 3);
  const newTerm = ((total % 3) + 3) % 3 + 1;
  const newMonth = (newTerm - 1) * 4;
  return new Date(d.getFullYear() + yearDelta, newMonth, 1, 0, 0, 0, 0);
}

export function getTermLabel(termNum: number): string {
  if (termNum === 1) return 'Term 1 (Jan – Apr)';
  if (termNum === 2) return 'Term 2 (May – Aug)';
  return 'Term 3 (Sep – Dec)';
}

export function getZoomLabel(zoomLevel: number, yearMode: 'quarter' | 'term' = 'quarter'): string {
  switch (zoomLevel) {
    case 1:
      return '1 Year';
    case 2:
      return yearMode === 'term' ? '1 Term' : '1 Quarter';
    case 3:
      return '1 Month';
    case 4:
      return '1 Week';
    case 5:
      return '1 Day';
    default:
      return '1 Week';
  }
}

// Compute the window [start, end] and human-readable header label for a zoom level (1 to 5)
// On zoom levels 2 & 3: only includes the extra days required to complete the first and last weeks of the displayed range
export function getSpanWindow(
  viewDate: Date,
  zoomLevel: number,
  yearMode: 'quarter' | 'term' = 'quarter'
): {
  start: Date;
  end: Date;
  title: string;
} {
  switch (zoomLevel) {
    case 1: {
      // 1 Year
      const start = startOfYear(viewDate);
      const end = endOfYear(viewDate);
      return {
        start,
        end,
        title: format(viewDate, 'yyyy'),
      };
    }
    case 2: {
      const baseStart = yearMode === 'term' ? startOfTerm(viewDate) : startOfQuarter(viewDate);
      const baseEnd = yearMode === 'term' ? endOfTerm(viewDate) : endOfQuarter(viewDate);
      // Only include the extra days required to complete the first and last weeks of the displayed range
      const start = startOfWeek(baseStart, { weekStartsOn: 0 }); // Sunday of the week containing baseStart
      const end = endOfWeek(baseEnd, { weekStartsOn: 0 });       // Saturday of the week containing baseEnd

      const title =
        yearMode === 'term'
          ? `Term ${getTerm(baseStart)} ${format(baseStart, 'yyyy')} (${format(baseStart, 'MMM')} – ${format(baseEnd, 'MMM')})`
          : `Q${getQuarter(baseStart)} ${format(baseStart, 'yyyy')} (${format(baseStart, 'MMM')} – ${format(baseEnd, 'MMM')})`;

      return {
        start,
        end,
        title,
      };
    }
    case 3: {
      // 1 Month - only include extra days required to complete the first and last weeks of the displayed range
      const baseStart = startOfMonth(viewDate);
      const baseEnd = endOfMonth(viewDate);
      const start = startOfWeek(baseStart, { weekStartsOn: 0 });
      const end = endOfWeek(baseEnd, { weekStartsOn: 0 });

      return {
        start,
        end,
        title: format(baseStart, 'MMMM yyyy'),
      };
    }
    case 4: {
      // 1 Week
      const start = startOfWeek(viewDate, { weekStartsOn: 0 });
      const end = endOfWeek(viewDate, { weekStartsOn: 0 });
      return {
        start,
        end,
        title: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')} (Week ${getWeek(start)})`,
      };
    }
    case 5:
    default: {
      // 1 Day
      const start = startOfDay(viewDate);
      const end = endOfDay(viewDate);
      return {
        start,
        end,
        title: format(viewDate, 'EEEE, MMMM d, yyyy'),
      };
    }
  }
}

// Step view date forward or backward based on zoom level and yearMode
export function stepViewDate(
  viewDate: Date,
  zoomLevel: number,
  delta: 1 | -1,
  yearMode: 'quarter' | 'term' = 'quarter'
): Date {
  switch (zoomLevel) {
    case 1:
      return addYears(viewDate, delta);
    case 2:
      return yearMode === 'term' ? addTerms(viewDate, delta) : addQuarters(viewDate, delta);
    case 3:
      return addMonths(viewDate, delta);
    case 4:
      return addWeeks(viewDate, delta);
    case 5:
    default:
      return addDays(viewDate, delta);
  }
}

export interface HeaderTierUnit {
  id: string;
  label: string;
  subLabel?: string;
  leftPx: number;
  widthPx: number;
  date: Date;
  isWeekend?: boolean;
  isNight?: boolean;
  isAlternate?: boolean;
  isMWF?: boolean;
  divisionRank?: 1 | 2 | 3;
}

export interface HeaderTier {
  id: string;
  heightPx: number;
  className?: string;
  units: HeaderTierUnit[];
}

export interface GanttSubdivisionResult {
  headerTiers: HeaderTier[];
  minorUnits: HeaderTierUnit[];
  minorDurationMs: number;
  totalTimelineWidth: number;
  totalHeaderHeight: number;
  todayX: number | null;
}

// Generate multi-tier hierarchical column headers with responsive full page width
export function getGanttSubdivisions(
  zoomLevel: number,
  windowStart: Date,
  windowEnd: Date,
  containerWidth: number = 800,
  settings?: AppSettings
): GanttSubdivisionResult {
  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  const totalWindowMs = Math.max(windowEndMs - windowStartMs, 1000);

  const yearMode = settings?.yearMode || 'quarter';

  // Parse working hours (default 9am - 5pm)
  let workStartHour = 9;
  let workEndHour = 17;
  if (settings?.workingHoursStart) {
    const [h] = settings.workingHoursStart.split(':').map(Number);
    if (!isNaN(h)) workStartHour = h;
  }
  if (settings?.workingHoursEnd) {
    const [h] = settings.workingHoursEnd.split(':').map(Number);
    if (!isNaN(h)) workEndHour = h;
  }

  // Helper to create a tier from millisecond steps
  const makeStepTier = (
    tierId: string,
    heightPx: number,
    className: string,
    stepMs: number,
    formatLabel: (d: Date, idx: number) => string,
    totalWidth: number
  ): HeaderTier => {
    const units: HeaderTierUnit[] = [];
    let curMs = windowStartMs;
    let idx = 0;

    while (curMs < windowEndMs) {
      const nextMs = Math.min(curMs + stepMs, windowEndMs);
      const leftPx = ((curMs - windowStartMs) / totalWindowMs) * totalWidth;
      const rightPx = ((nextMs - windowStartMs) / totalWindowMs) * totalWidth;
      const widthPx = rightPx - leftPx;
      const d = new Date(curMs);

      units.push({
        id: `${tierId}-${idx}`,
        label: formatLabel(d, idx),
        leftPx,
        widthPx,
        date: d,
        isWeekend: isWeekend(d),
      });

      idx++;
      curMs = nextMs;
    }

    return { id: tierId, heightPx, className, units };
  };

  // Helper to create a tier using true calendar months (aligned to 1st of each month)
  const makeMonthTier = (
    tierId: string,
    heightPx: number,
    className: string,
    formatLabel: (d: Date) => string,
    wStart: Date,
    wEnd: Date,
    totalWidth: number
  ): HeaderTier => {
    const units: HeaderTierUnit[] = [];
    let cur = new Date(wStart);
    const wEndMs = wEnd.getTime();
    let idx = 0;

    while (cur.getTime() < wEndMs) {
      const nextMonthStart = startOfMonth(addMonths(cur, 1));
      const segEnd = nextMonthStart.getTime() > wEndMs ? new Date(wEnd) : nextMonthStart;

      const leftPx = ((cur.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
      const rightPx = ((segEnd.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
      const widthPx = rightPx - leftPx;

      units.push({
        id: `${tierId}-${idx++}`,
        label: formatLabel(cur),
        leftPx,
        widthPx,
        date: cur,
        isWeekend: isWeekend(cur),
      });

      cur = segEnd;
    }

    return { id: tierId, heightPx, className, units };
  };

  // Helper to create true calendar-aligned week tiers (Sunday to Sunday boundaries)
  const makeCalendarWeekTier = (
    tierId: string,
    heightPx: number,
    className: string,
    formatLabel: (segStart: Date, segEnd: Date, weekStart: Date, weekEnd: Date, idx: number) => string,
    wStart: Date,
    wEnd: Date,
    totalWidth: number
  ): HeaderTier => {
    const units: HeaderTierUnit[] = [];
    let cur = new Date(wStart);
    let idx = 0;
    const wEndMs = wEnd.getTime();

    while (cur.getTime() < wEndMs) {
      let nextSun = startOfWeek(addWeeks(cur, 1), { weekStartsOn: 0 });
      let segEnd = nextSun.getTime() > wEndMs ? new Date(wEnd) : nextSun;

      const leftPx = ((cur.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
      const rightPx = ((segEnd.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
      const widthPx = rightPx - leftPx;

      const calWeekStart = startOfWeek(cur, { weekStartsOn: 0 });
      const calWeekEnd = endOfWeek(cur, { weekStartsOn: 0 });

      units.push({
        id: `${tierId}-${idx}`,
        label: formatLabel(cur, segEnd, calWeekStart, calWeekEnd, idx),
        leftPx,
        widthPx,
        date: cur,
        isWeekend: isWeekend(cur),
      });

      idx++;
      cur = segEnd;
    }

    return { id: tierId, heightPx, className, units };
  };

  let headerTiers: HeaderTier[] = [];
  let minorUnits: HeaderTierUnit[] = [];
  let minorDurationMs = 24 * 3600 * 1000;

  // Midpoint of window gives true focal date for Quarter/Term/Month labels
  const focalDate = new Date(windowStartMs + totalWindowMs / 2);

  // =========================================================================
  // LEVEL 1: Range: 1 Year
  // =========================================================================
  if (zoomLevel === 1) {
    minorDurationMs = 7 * 24 * 3600 * 1000; // 1 week
    const numWeeks = 53;
    const minThreshold = numWeeks * 20;
    const totalWidth = Math.max(containerWidth || 800, minThreshold);

    // Tier 1: Quarters or Terms
    let tier1: HeaderTier;
    if (yearMode === 'term') {
      const units: HeaderTierUnit[] = [];
      for (let t = 1; t <= 3; t++) {
        const tStart = new Date(windowStart.getFullYear(), (t - 1) * 4, 1, 0, 0, 0);
        const tEnd = new Date(windowStart.getFullYear(), t * 4, 0, 23, 59, 59, 999);
        const leftPx = ((tStart.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
        const rightPx = ((tEnd.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
        units.push({
          id: `l1-term-${t}`,
          label: `${getTermLabel(t)} ${windowStart.getFullYear()}`,
          leftPx,
          widthPx: rightPx - leftPx,
          date: tStart,
        });
      }
      tier1 = {
        id: 'l1-terms',
        heightPx: 24,
        className: 'bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 font-bold text-[11px]',
        units,
      };
    } else {
      const units: HeaderTierUnit[] = [];
      for (let q = 1; q <= 4; q++) {
        const qStart = new Date(windowStart.getFullYear(), (q - 1) * 3, 1, 0, 0, 0);
        const qEnd = new Date(windowStart.getFullYear(), q * 3, 0, 23, 59, 59, 999);
        const leftPx = ((qStart.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
        const rightPx = ((qEnd.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
        units.push({
          id: `l1-quarter-${q}`,
          label: `Q${q} (${windowStart.getFullYear()})`,
          leftPx,
          widthPx: rightPx - leftPx,
          date: qStart,
        });
      }
      tier1 = {
        id: 'l1-quarters',
        heightPx: 24,
        className: 'bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 font-bold text-[11px]',
        units,
      };
    }

    // Tier 2: Months (HIGH CONTRAST: dark:bg-zinc-800 dark:text-gray-100)
    const tier2 = makeMonthTier(
      'l1-months',
      22,
      'bg-gray-200 text-gray-900 dark:bg-zinc-800 dark:text-gray-100 font-bold text-[10px]',
      (d) => format(d, 'MMMM'),
      windowStart,
      windowEnd,
      totalWidth
    );

    headerTiers = [tier1, tier2];

    // Minor units with weekly lines
    minorUnits = [];
    let cur = new Date(windowStart);
    let idx = 0;
    while (cur.getTime() < windowEndMs) {
      let next = addWeeks(cur, 1);
      if (next.getTime() > windowEndMs) next = new Date(windowEnd);

      const leftPx = ((cur.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
      const rightPx = ((next.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
      const widthPx = rightPx - leftPx;

      let isDiv1End = false;
      if (yearMode === 'term') {
        isDiv1End = next.getMonth() % 4 === 0 && next.getDate() <= 7;
      } else {
        isDiv1End = next.getMonth() % 3 === 0 && next.getDate() <= 7;
      }
      const isMonthEnd = next.getDate() <= 7;

      let divisionRank: 1 | 2 | 3 = 3;
      if (isDiv1End) divisionRank = 1;
      else if (isMonthEnd) divisionRank = 2;

      minorUnits.push({
        id: `l1-minor-${idx++}`,
        label: '',
        leftPx,
        widthPx,
        date: cur,
        divisionRank,
      });

      cur = next;
    }
  }

  // =========================================================================
  // LEVEL 2: Range: 1 Quarter / 1 Term (Padded to full weeks)
  // Smallest unit is WEEK (No day divisions!)
  // =========================================================================
  else if (zoomLevel === 2) {
    minorDurationMs = 7 * 24 * 3600 * 1000; // 1 week
    const numWeeks = Math.max(1, Math.round(totalWindowMs / (7 * 24 * 3600 * 1000)));
    const minThreshold = numWeeks * 45;
    const totalWidth = Math.max(containerWidth || 800, minThreshold);

    // Tier 1: Quarter or Term Title using focalDate
    const baseStart = yearMode === 'term' ? startOfTerm(focalDate) : startOfQuarter(focalDate);
    const baseEnd = yearMode === 'term' ? endOfTerm(focalDate) : endOfQuarter(focalDate);
    const tier1Title =
      yearMode === 'term'
        ? `Term ${getTerm(focalDate)} (${format(baseStart, 'MMM')} – ${format(baseEnd, 'MMM yyyy')})`
        : `Q${getQuarter(focalDate)} (${format(baseStart, 'MMM')} – ${format(baseEnd, 'MMM yyyy')})`;

    const tier1: HeaderTier = {
      id: 'l2-title',
      heightPx: 24,
      className: 'bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 font-bold text-[11px]',
      units: [
        {
          id: 'l2-quarter-term',
          label: tier1Title,
          leftPx: 0,
          widthPx: totalWidth,
          date: baseStart,
        },
      ],
    };

    // Tier 2: True Calendar Months (aligned to 1st of each month, with dark background in dark mode!)
    const tier2 = makeMonthTier(
      'l2-months',
      22,
      'bg-gray-200 text-gray-900 dark:bg-zinc-800 dark:text-gray-100 font-bold text-[10px]',
      (d) => format(d, 'MMMM yyyy'),
      windowStart,
      windowEnd,
      totalWidth
    );

    headerTiers = [tier1, tier2];

    // Minor units: Full weeks (Sunday to Saturday) with alternating week shading
    minorUnits = [];
    let cur = new Date(windowStart);
    let idx = 0;
    while (cur.getTime() < windowEndMs) {
      let next = addWeeks(cur, 1);
      if (next.getTime() > windowEndMs) next = new Date(windowEnd);

      const leftPx = ((cur.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
      const rightPx = ((next.getTime() - windowStartMs) / totalWindowMs) * totalWidth;
      const widthPx = rightPx - leftPx;

      const isMonthEnd = next.getDate() <= 7;
      let divisionRank: 1 | 2 | 3 = 3;
      if (isMonthEnd) divisionRank = 2;

      const isAlternate = getWeek(cur) % 2 === 0;

      minorUnits.push({
        id: `l2-minor-${idx++}`,
        label: `W${getWeek(cur)}`,
        leftPx,
        widthPx,
        date: cur,
        divisionRank,
        isAlternate,
      });

      cur = next;
    }
  }

  // =========================================================================
  // LEVEL 3: Range: 1 Month (Padded to full weeks)
  // =========================================================================
  else if (zoomLevel === 3) {
    minorDurationMs = 6 * 3600 * 1000; // 6 hours
    const numBlocks = Math.max(1, Math.round(totalWindowMs / (6 * 3600 * 1000)));
    const minThreshold = numBlocks * 12;
    const totalWidth = Math.max(containerWidth || 800, minThreshold);

    // Tier 1: Weeks (Full 7-day calendar weeks: Sunday to Saturday)
    const tier1 = makeCalendarWeekTier(
      'l3-weeks',
      24,
      'bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 font-bold text-[11px]',
      (_segStart, _segEnd, weekStart, weekEnd) => {
        const wNum = getWeek(weekStart);
        return `Week ${wNum} (${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')})`;
      },
      windowStart,
      windowEnd,
      totalWidth
    );

    // Tier 2: Days (HIGH CONTRAST: dark:bg-zinc-800 dark:text-gray-100)
    const tier2 = makeStepTier(
      'l3-days',
      22,
      'bg-gray-200 text-gray-900 dark:bg-zinc-800 dark:text-gray-100 font-bold text-[10px]',
      24 * 3600 * 1000,
      (d) => format(d, 'EEE d'),
      totalWidth
    );

    // Minor units (6-hour intervals with MWF and weekend shading)
    minorUnits = [];
    let curMs = windowStartMs;
    let idx = 0;

    while (curMs < windowEndMs) {
      const nextMs = Math.min(curMs + 6 * 3600 * 1000, windowEndMs);
      const leftPx = ((curMs - windowStartMs) / totalWindowMs) * totalWidth;
      const rightPx = ((nextMs - windowStartMs) / totalWindowMs) * totalWidth;
      const widthPx = rightPx - leftPx;
      const d = new Date(curMs);
      const nextD = new Date(nextMs);

      let divisionRank: 1 | 2 | 3 = 3;
      if (nextD.getHours() === 0 && nextD.getDay() === 0) divisionRank = 1;
      else if (nextD.getHours() === 0) divisionRank = 2;

      const day = d.getDay();
      const isMWF = day === 1 || day === 3 || day === 5;

      minorUnits.push({
        id: `l3-minor-${idx++}`,
        label: '',
        leftPx,
        widthPx,
        date: d,
        isWeekend: isWeekend(d),
        isMWF,
        divisionRank,
      });

      curMs = nextMs;
    }

    headerTiers = [tier1, tier2];
  }

  // =========================================================================
  // LEVEL 4: Range: 1 Week
  // =========================================================================
  else if (zoomLevel === 4) {
    minorDurationMs = 3600 * 1000; // 1 hour
    const numHours = 168;
    const minThreshold = numHours * 16;
    const totalWidth = Math.max(containerWidth || 800, minThreshold);

    // Tier 1: Days
    const tier1 = makeStepTier(
      'l4-days',
      24,
      'bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 font-bold text-[11px]',
      24 * 3600 * 1000,
      (d) => format(d, 'EEEE, MMMM d'),
      totalWidth
    );

    // Tier 2: 6hr chunks (HIGH CONTRAST: dark:bg-zinc-800 dark:text-gray-100)
    const tier2 = makeStepTier(
      'l4-6hr-chunks',
      22,
      'bg-gray-200 text-gray-900 dark:bg-zinc-800 dark:text-gray-100 font-bold text-[10px]',
      6 * 3600 * 1000,
      (d) => {
        const h = d.getHours();
        if (h === 0) return 'Night';
        if (h === 6) return 'Morning';
        if (h === 12) return 'Afternoon';
        return 'Evening';
      },
      totalWidth
    );

    // Minor units (1-hour intervals)
    minorUnits = [];
    let curMs = windowStartMs;
    let idx = 0;

    while (curMs < windowEndMs) {
      const nextMs = Math.min(curMs + 3600 * 1000, windowEndMs);
      const leftPx = ((curMs - windowStartMs) / totalWindowMs) * totalWidth;
      const rightPx = ((nextMs - windowStartMs) / totalWindowMs) * totalWidth;
      const widthPx = rightPx - leftPx;
      const d = new Date(curMs);
      const nextD = new Date(nextMs);

      let divisionRank: 1 | 2 | 3 = 3;
      if (nextD.getHours() === 0) divisionRank = 1;
      else if (nextD.getHours() % 6 === 0) divisionRank = 2;

      const hour = d.getHours();
      const isNight = hour < workStartHour || hour >= workEndHour;

      minorUnits.push({
        id: `l4-minor-${idx++}`,
        label: format(d, 'h a'),
        leftPx,
        widthPx,
        date: d,
        isWeekend: isWeekend(d),
        isNight,
        divisionRank,
      });

      curMs = nextMs;
    }

    headerTiers = [tier1, tier2];
  }

  // =========================================================================
  // LEVEL 5: Range: 1 Day
  // =========================================================================
  else {
    minorDurationMs = 15 * 60 * 1000; // 15 min
    const numBlocks = 96;
    const minThreshold = numBlocks * 16;
    const totalWidth = Math.max(containerWidth || 800, minThreshold);

    // Tier 1: Day Header
    const tier1 = makeStepTier(
      'l5-day-title',
      24,
      'bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 font-bold text-[11px]',
      totalWindowMs,
      () => format(windowStart, 'EEEE, MMMM d, yyyy'),
      totalWidth
    );

    // Tier 2: 6hr chunks (HIGH CONTRAST: dark:bg-zinc-800 dark:text-gray-100)
    const tier2 = makeStepTier(
      'l5-6hr-chunks',
      22,
      'bg-gray-200 text-gray-900 dark:bg-zinc-800 dark:text-gray-100 font-bold text-[10px]',
      6 * 3600 * 1000,
      (d) => {
        const h = d.getHours();
        if (h === 0) return 'Night (12 AM – 6 AM)';
        if (h === 6) return 'Morning (6 AM – 12 PM)';
        if (h === 12) return 'Afternoon (12 PM – 6 PM)';
        return 'Evening (6 PM – 12 AM)';
      },
      totalWidth
    );

    // Tier 3: Every hour
    const tier3 = makeStepTier(
      'l5-hours',
      20,
      'bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200 font-semibold text-[9px]',
      3600 * 1000,
      (d) => format(d, 'h a'),
      totalWidth
    );

    minorUnits = [];
    let curMs = windowStartMs;
    let idx = 0;

    while (curMs < windowEndMs) {
      const nextMs = Math.min(curMs + 15 * 60 * 1000, windowEndMs);
      const leftPx = ((curMs - windowStartMs) / totalWindowMs) * totalWidth;
      const rightPx = ((nextMs - windowStartMs) / totalWindowMs) * totalWidth;
      const widthPx = rightPx - leftPx;
      const d = new Date(curMs);
      const nextD = new Date(nextMs);

      let divisionRank: 1 | 2 | 3 = 3;
      if (nextD.getMinutes() === 0 && nextD.getHours() % 6 === 0) divisionRank = 1;
      else if (nextD.getMinutes() === 0) divisionRank = 2;

      const hour = d.getHours();
      const isNight = hour < workStartHour || hour >= workEndHour;

      minorUnits.push({
        id: `l5-minor-${idx++}`,
        label: format(d, ':mm'),
        leftPx,
        widthPx,
        date: d,
        isWeekend: isWeekend(d),
        isNight,
        divisionRank,
      });

      curMs = nextMs;
    }

    headerTiers = [tier1, tier2, tier3];
  }

  const totalHeaderHeight = headerTiers.reduce((sum, t) => sum + t.heightPx, 0);
  const totalTimelineWidth =
    headerTiers[0]?.units.reduce((sum, u) => sum + u.widthPx, 0) || Math.max(containerWidth || 800, 800);

  const nowMs = Date.now();
  let todayX: number | null = null;
  if (nowMs >= windowStartMs && nowMs <= windowEndMs) {
    todayX = ((nowMs - windowStartMs) / totalWindowMs) * totalTimelineWidth;
  }

  return {
    headerTiers,
    minorUnits,
    minorDurationMs,
    totalTimelineWidth,
    totalHeaderHeight,
    todayX,
  };
}
