export interface TimeBlock {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  color?: string;
  progress?: number;
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
