import { TaskDocument, TaskItem, FlattenedGanttNode, TimeBlock } from '../types.js';
import {
  parseDateTimeSafe,
  formatDateSafe,
  getItemTimeBlocks,
  addDays,
} from './dateUtils.js';

// Returns array of ancestor tasks from root down to parent of itemId
export function getAncestors(
  items: Record<string, TaskItem>,
  itemId: string | null
): TaskItem[] {
  const ancestors: TaskItem[] = [];
  if (!itemId) return ancestors;

  let currentId: string | null = items[itemId]?.parentId || null;
  while (currentId && items[currentId]) {
    ancestors.unshift(items[currentId]);
    currentId = items[currentId].parentId;
  }
  return ancestors;
}

// Get all descendant item IDs recursively
export function getAllDescendantIds(
  items: Record<string, TaskItem>,
  itemId: string
): string[] {
  const descendants: string[] = [];
  const item = items[itemId];
  if (!item || !item.childIds) return descendants;

  for (const childId of item.childIds) {
    descendants.push(childId);
    descendants.push(...getAllDescendantIds(items, childId));
  }
  return descendants;
}

export function calculateSummaryDates(
  items: Record<string, TaskItem>,
  itemId: string
): {
  startDate: Date | null;
  endDate: Date | null;
  hasDates: boolean;
  timeBlocks: TimeBlock[];
  hasSubtaskDates: boolean;
} {
  const item = items[itemId];
  if (!item) {
    return { startDate: null, endDate: null, hasDates: false, timeBlocks: [], hasSubtaskDates: false };
  }

  const directBlocks = getItemTimeBlocks(item);

  // Collect direct block date ranges
  const directDates: { start: Date; end: Date }[] = [];
  for (const b of directBlocks) {
    const s = parseDateTimeSafe(b.startDate, b.startTime);
    const e = parseDateTimeSafe(b.endDate, b.endTime, true);
    if (s && e) {
      directDates.push({ start: s, end: e });
    } else if (s) {
      directDates.push({ start: s, end: addDays(s, 1) });
    }
  }

  // Descendants
  const descendantIds = getAllDescendantIds(items, itemId);
  const descendantDates: { start: Date; end: Date }[] = [];

  for (const id of descendantIds) {
    const desc = items[id];
    if (desc) {
      const dBlocks = getItemTimeBlocks(desc);
      for (const b of dBlocks) {
        const s = parseDateTimeSafe(b.startDate, b.startTime);
        const e = parseDateTimeSafe(b.endDate, b.endTime, true);
        if (s && e) {
          descendantDates.push({ start: s, end: e });
        } else if (s) {
          descendantDates.push({ start: s, end: addDays(s, 1) });
        }
      }
    }
  }

  // If item has direct time blocks
  if (directDates.length > 0) {
    const minStart = new Date(Math.min(...directDates.map((d) => d.start.getTime())));
    const maxEnd = new Date(Math.max(...directDates.map((d) => d.end.getTime())));
    return {
      startDate: minStart,
      endDate: maxEnd,
      hasDates: true,
      timeBlocks: directBlocks,
      hasSubtaskDates: descendantDates.length > 0,
    };
  }

  // If item has no direct time blocks, but subtasks do (summary item)
  if (descendantDates.length > 0) {
    const minStart = new Date(Math.min(...descendantDates.map((d) => d.start.getTime())));
    const maxEnd = new Date(Math.max(...descendantDates.map((d) => d.end.getTime())));
    return {
      startDate: minStart,
      endDate: maxEnd,
      hasDates: true,
      timeBlocks: [
        {
          id: `${itemId}-summary`,
          startDate: formatDateSafe(minStart),
          endDate: formatDateSafe(maxEnd),
        },
      ],
      hasSubtaskDates: true,
    };
  }

  // Truly dateless / timeless task!
  return {
    startDate: null,
    endDate: null,
    hasDates: false,
    timeBlocks: [],
    hasSubtaskDates: false,
  };
}

// Flatten a subtree for hierarchical Gantt view
export function flattenSubtreeForGantt(
  document: TaskDocument,
  rootId: string | null, // null means whole document
  collapsedSet: Set<string>
): FlattenedGanttNode[] {
  const result: FlattenedGanttNode[] = [];
  const items = document.items;

  function traverse(itemId: string, depth: number, parentVisible: boolean) {
    const item = items[itemId];
    if (!item) return;

    const hasChildren = Boolean(item.childIds && item.childIds.length > 0);
    const isExpanded = !item.collapsed && (!collapsedSet || !collapsedSet.has(itemId));
    const visible = parentVisible;

    const { startDate, endDate, hasDates, timeBlocks } = calculateSummaryDates(items, itemId);

    if (visible) {
      result.push({
        id: itemId,
        item,
        depth,
        hasChildren,
        isExpanded,
        visible: true,
        hasDates,
        timeBlocks,
        calculatedStartDate: startDate,
        calculatedEndDate: endDate,
        isSummary: hasChildren && hasDates && (!item.timeBlocks || item.timeBlocks.length === 0) && !item.startDate,
      });
    }

    if (hasChildren) {
      for (const childId of item.childIds) {
        traverse(childId, depth + 1, visible && isExpanded);
      }
    }
  }

  if (rootId && items[rootId]) {
    // Zoomed into specific item
    traverse(rootId, 0, true);
  } else {
    // Root level tasks
    for (const rootId of document.rootItemIds) {
      traverse(rootId, 0, true);
    }
  }

  return result;
}
