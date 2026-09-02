export interface TimeBlock {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime?: string; // HH:mm (24h format, optional)
  endTime?: string;   // HH:mm (24h format, optional)
  color?: string;
  progress?: number;  // 0 - 100
}

export interface TaskItem {
  id: string;
  content: string;
  note?: string;
  completed: boolean;
  collapsed: boolean;
  parentId: string | null;
  childIds: string[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  timeBlocks?: TimeBlock[];
  color?: string;
  progress?: number;  // 0 - 100
  createdAt: string;
  updatedAt: string;
}

export interface TaskDocument {
  id: string;
  title: string;
  rootItemIds: string[];
  items: Record<string, TaskItem>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  itemCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'outline' | 'gantt';

export type GanttSpanMode = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type GanttZoomLevel = GanttSpanMode;

export interface FlattenedGanttNode {
  id: string;
  item: TaskItem;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  visible: boolean;
  hasDates: boolean; // false if dateless/timeless
  timeBlocks: TimeBlock[];
  calculatedStartDate: Date | null;
  calculatedEndDate: Date | null;
  isSummary: boolean; // true if it's a parent task spanning children
}

export interface DraggingBlockInfo {
  itemId: string;
  blockId: string;
  initialStartMs: number;
  initialEndMs: number;
}

export interface DraggingState {
  type: 'move' | 'resize-start' | 'resize-end';
  itemId: string;
  blockId: string;
  startX: number;
  initialStartMs: number;
  initialEndMs: number;
  currentStartMs: number;
  currentEndMs: number;
  batchBlocks?: DraggingBlockInfo[];
}

export interface AppSettings {
  yearMode: 'quarter' | 'term'; // 'quarter' (3-month blocks) or 'term' (4-month blocks)
  workingHoursStart: string;    // e.g. "09:00"
  workingHoursEnd: string;      // e.g. "17:00"
}

