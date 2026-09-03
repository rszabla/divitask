import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Check,
  MoreVertical,
  ZoomIn,
  Trash2,
  Palette,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  TaskDocument,
  TaskItem,
  FlattenedGanttNode,
  DraggingState,
  DraggingBlockInfo,
  TimeBlock,
  AppSettings,
} from '../../types.js';
import {
  getSpanWindow,
  stepViewDate,
  getZoomLabel,
  getGanttSubdivisions,
  formatDateSafe,
  formatTimeSafe,
  formatDisplayDateTime,
  formatDuration,
  parseDateTimeSafe,
  getItemTimeBlocks,
} from '../../utils/dateUtils.js';
import {
  flattenSubtreeForGantt,
  getAllDescendantIds,
} from '../../utils/treeUtils.js';
import { GanttHeader } from './GanttHeader.js';
import { GanttTaskBar } from './GanttTaskBar.js';
import { TaskDetailModal } from './TaskDetailModal.js';
import { ItemMenu } from '../outliner/ItemMenu.js';

export interface TimelineViewState {
  zoomLevel: number;
  viewDate: Date;
  scrollLeft: number;
}

const COLOR_PRESETS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

interface GanttChartProps {
  document: TaskDocument;
  zoomItemId: string | null;
  settings: AppSettings;
  onUpdateDocument: (doc: TaskDocument, isStructural?: boolean) => void;
  onBackToOutline?: () => void;
  onZoomIntoNode: (itemId: string) => void;
  hideCompleted?: boolean;
  initialViewState?: TimelineViewState;
  onSaveViewState?: (state: TimelineViewState) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  document,
  zoomItemId,
  settings,
  onUpdateDocument,
  onBackToOutline: _onBackToOutline,
  onZoomIntoNode,
  hideCompleted = false,
  initialViewState,
  onSaveViewState,
  isZenMode,
  onToggleZenMode,
}) => {
  // Zoom level & view date: restore from initialViewState if present
  const [zoomLevel, setZoomLevel] = useState<number>(() => initialViewState?.zoomLevel ?? 4);
  const [viewDate, setViewDate] = useState<Date>(() => initialViewState?.viewDate ?? new Date());
  const [treePaneWidth, setTreePaneWidth] = useState(360);
  const [isResizingSplitter, setIsResizingSplitter] = useState(false);
  const [editingModalNode, setEditingModalNode] = useState<FlattenedGanttNode | null>(null);
  const [taskMenuInfo, setTaskMenuInfo] = useState<{
    item: TaskItem;
    position: { x: number; y: number };
  } | null>(null);

  // Short screen detection (e.g. mobile phone in landscape orientation)
  const [isShortScreen, setIsShortScreen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerHeight <= 520 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsShortScreen(window.innerHeight <= 520);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rowHeight = isShortScreen ? 32 : 38;

  // In-place outliner editing state
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Outliner drag and drop reordering state
  const [dragInfo, setDragInfo] = useState<{
    draggedId: string;
    targetId: string | null;
    position: 'before' | 'after' | null;
  } | null>(null);

  // Selection state for time blocks: set of `${itemId}:::${blockId}`
  const [selectedBlockKeys, setSelectedBlockKeys] = useState<Set<string>>(new Set());
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isColorPickerOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [isColorPickerOpen]);

  // Rectangle marquee selection state (canvas coordinates)
  const [selectionMarquee, setSelectionMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const marqueeStartRef = useRef<{ clientX: number; clientY: number; canvasX: number; canvasY: number } | null>(null);
  const marqueeActiveRef = useRef(false);

  // Dragging state for bar move / resize (single or batch)
  const [dragState, setDragState] = useState<DraggingState | null>(null);
  const isDraggingRef = useRef(false);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const leftTableContainerRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef(false);

  const [timelineContainerWidth, setTimelineContainerWidth] = useState(800);

  // Track container width of the timeline for responsive full-width display
  useEffect(() => {
    const updateWidth = () => {
      if (timelineContainerRef.current) {
        setTimelineContainerWidth(timelineContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [treePaneWidth]);

  // Synchronize vertical scrolling between Left Task List and Right Timeline
  const handleLeftScroll = () => {
    if (isSyncingScrollRef.current) return;
    if (!timelineContainerRef.current || !leftTableContainerRef.current) return;
    isSyncingScrollRef.current = true;
    timelineContainerRef.current.scrollTop = leftTableContainerRef.current.scrollTop;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  // Restore initial horizontal scroll if provided
  useEffect(() => {
    if (initialViewState?.scrollLeft !== undefined && timelineContainerRef.current) {
      timelineContainerRef.current.scrollLeft = initialViewState.scrollLeft;
    }
  }, []);

  // Sync scroll and report view state updates
  useEffect(() => {
    onSaveViewState?.({
      zoomLevel,
      viewDate,
      scrollLeft: timelineContainerRef.current?.scrollLeft || 0,
    });
  }, [zoomLevel, viewDate, onSaveViewState]);

  const handleRightScroll = (e: React.UIEvent<HTMLDivElement>) => {
    onSaveViewState?.({
      zoomLevel,
      viewDate,
      scrollLeft: e.currentTarget.scrollLeft,
    });
    if (isSyncingScrollRef.current) return;
    if (!timelineContainerRef.current || !leftTableContainerRef.current) return;
    isSyncingScrollRef.current = true;
    leftTableContainerRef.current.scrollTop = timelineContainerRef.current.scrollTop;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  // Flatten the subtree (inherits item.collapsed from document items)
  const allNodes = useMemo(() => {
    return flattenSubtreeForGantt(document, zoomItemId, new Set());
  }, [document, zoomItemId]);

  const visibleNodes = useMemo(() => {
    if (!hideCompleted) return allNodes;
    return allNodes.filter((n) => !n.item.completed);
  }, [allNodes, hideCompleted]);

  // Current span window according to zoom level & yearMode setting
  const { start: windowStart, end: windowEnd, title: windowTitle } = useMemo(() => {
    return getSpanWindow(viewDate, zoomLevel, settings.yearMode);
  }, [viewDate, zoomLevel, settings.yearMode]);

  // Subdivisions with responsive full page width and min threshold
  const subdivisions = useMemo(() => {
    return getGanttSubdivisions(
      zoomLevel,
      windowStart,
      windowEnd,
      timelineContainerWidth,
      settings,
      isShortScreen
    );
  }, [zoomLevel, windowStart, windowEnd, timelineContainerWidth, settings, isShortScreen]);

  const { headerTiers, minorUnits, minorDurationMs, totalTimelineWidth, totalHeaderHeight, todayX } = subdivisions;

  // Center timeline to a given timestamp (Next occurrence or Now)
  const centerOnTimestamp = (targetTimeMs: number) => {
    const targetDate = new Date(targetTimeMs);
    const { start: newStart, end: newEnd } = getSpanWindow(targetDate, zoomLevel, settings.yearMode);

    if (targetTimeMs < windowStart.getTime() || targetTimeMs > windowEnd.getTime()) {
      setViewDate(targetDate);
    }

    setTimeout(() => {
      if (timelineContainerRef.current) {
        const totalWinMs = Math.max(newEnd.getTime() - newStart.getTime(), 1000);
        const ratio = (targetTimeMs - newStart.getTime()) / totalWinMs;
        const targetX = ratio * totalTimelineWidth;
        const halfViewport = timelineContainerRef.current.clientWidth / 2;
        timelineContainerRef.current.scrollTo({
          left: Math.max(0, targetX - halfViewport),
          behavior: 'smooth',
        });
      }
    }, 60);
  };

  // Window navigation
  const handlePrevWindow = () => {
    setViewDate((prev) => stepViewDate(prev, zoomLevel, -1, settings.yearMode));
  };

  const handleNextWindow = () => {
    setViewDate((prev) => stepViewDate(prev, zoomLevel, 1, settings.yearMode));
  };

  const handleNow = () => {
    centerOnTimestamp(Date.now());
  };

  // Zoom slider & buttons
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 1, 1));
  };

  const handleSetZoomLevel = (lvl: number) => {
    setZoomLevel(Math.max(1, Math.min(5, lvl)));
  };

  // Single-clicking on a task name/row centers the timeline on its next upcoming occurrence (or Now)
  const handleTaskNameClick = (node: FlattenedGanttNode) => {
    const blocks = getItemTimeBlocks(node.item);
    const nowMs = Date.now();
    let nextStartMs = Infinity;

    for (const b of blocks) {
      const bStart = parseDateTimeSafe(b.startDate, b.startTime);
      const bEnd = parseDateTimeSafe(b.endDate, b.endTime, true);
      if (bStart) {
        const sMs = bStart.getTime();
        const eMs = bEnd ? bEnd.getTime() : sMs;
        if (eMs >= nowMs && sMs < nextStartMs) {
          nextStartMs = sMs;
        }
      }
    }

    const targetTimeMs = nextStartMs !== Infinity ? nextStartMs : nowMs;
    centerOnTimestamp(targetTimeMs);
  };

  // In-place content edit
  const handleContentChange = (id: string, newContent: string) => {
    const item = document.items[id];
    if (!item) return;

    onUpdateDocument({
      ...document,
      items: {
        ...document.items,
        [id]: {
          ...item,
          content: newContent,
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    });
  };

  // Outliner: Create item below directly matching Outline View behavior:
  // If target item has subtasks and is expanded, insert as its first child directly below it!
  // Otherwise, insert as sibling directly below it!
  const handleAddItemBelow = (targetId: string) => {
    const targetItem = document.items[targetId];
    if (!targetItem) return;

    const newId = 'item-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const newItem: TaskItem = {
      id: newId,
      content: '',
      note: '',
      completed: false,
      collapsed: false,
      parentId: targetItem.parentId,
      childIds: [],
      color: targetItem.color || '#3b82f6',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    const newItems = { ...document.items, [newId]: newItem };
    let newRootIds = [...document.rootItemIds];

    // If targetItem has children and is expanded, insert as its first child directly below it!
    const isExpanded = !document.items[targetId]?.collapsed;
    if (targetItem.childIds.length > 0 && isExpanded) {
      newItem.parentId = targetId;
      newItems[targetId] = {
        ...targetItem,
        childIds: [newId, ...targetItem.childIds],
        updatedAt: now,
      };

      onUpdateDocument({
        ...document,
        items: newItems,
        updatedAt: now,
      });

      setFocusedItemId(newId);
      setTimeout(() => {
        inputRefs.current[newId]?.focus();
      }, 50);
      return;
    }

    // Otherwise, insert as sibling directly below targetItem!
    if (targetItem.parentId && newItems[targetItem.parentId]) {
      const parent = newItems[targetItem.parentId];
      const idx = parent.childIds.indexOf(targetId);
      const newChildIds = [...parent.childIds];
      newChildIds.splice(idx + 1, 0, newId);
      newItems[targetItem.parentId] = {
        ...parent,
        childIds: newChildIds,
        updatedAt: now,
      };
    } else {
      const idx = newRootIds.indexOf(targetId);
      newRootIds.splice(idx + 1, 0, newId);
    }

    onUpdateDocument({
      ...document,
      rootItemIds: newRootIds,
      items: newItems,
      updatedAt: now,
    });

    setFocusedItemId(newId);
    setTimeout(() => {
      inputRefs.current[newId]?.focus();
    }, 50);
  };

  // Add subtask (make child of target)
  const handleAddSubtask = (parentId: string) => {
    const parent = document.items[parentId];
    if (!parent) return;

    const newId = 'item-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const newItem: TaskItem = {
      id: newId,
      content: '',
      note: '',
      completed: false,
      collapsed: false,
      parentId,
      childIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const newItems = {
      ...document.items,
      [newId]: newItem,
      [parentId]: {
        ...parent,
        collapsed: false,
        childIds: [...parent.childIds, newId],
        updatedAt: now,
      },
    };

    onUpdateDocument({
      ...document,
      items: newItems,
      updatedAt: now,
    });

    setFocusedItemId(newId);
    setTimeout(() => {
      inputRefs.current[newId]?.focus();
    }, 50);
  };

  // Outliner: Indent item (make subtask of preceding sibling)
  const handleIndent = (id: string) => {
    const item = document.items[id];
    if (!item) return;

    let siblings: string[];
    if (item.parentId && document.items[item.parentId]) {
      siblings = document.items[item.parentId].childIds;
    } else {
      siblings = document.rootItemIds;
    }

    const idx = siblings.indexOf(id);
    if (idx <= 0) return;

    const prevSiblingId = siblings[idx - 1];
    const prevSibling = document.items[prevSiblingId];
    if (!prevSibling) return;

    const now = new Date().toISOString();
    const newItems = { ...document.items };
    let newRootIds = [...document.rootItemIds];

    // Remove from current parent
    if (item.parentId && newItems[item.parentId]) {
      const parent = newItems[item.parentId];
      newItems[item.parentId] = {
        ...parent,
        childIds: parent.childIds.filter((cid) => cid !== id),
        updatedAt: now,
      };
    } else {
      newRootIds = newRootIds.filter((rid) => rid !== id);
    }

    // Add to new parent (prevSibling)
    newItems[prevSiblingId] = {
      ...prevSibling,
      childIds: [...prevSibling.childIds, id],
      collapsed: false,
      updatedAt: now,
    };

    // Update item
    newItems[id] = {
      ...item,
      parentId: prevSiblingId,
      updatedAt: now,
    };

    onUpdateDocument({
      ...document,
      rootItemIds: newRootIds,
      items: newItems,
      updatedAt: now,
    });

    setFocusedItemId(id);
    setTimeout(() => inputRefs.current[id]?.focus(), 50);
  };

  // Outliner: Unindent item (move up to parent's level)
  const handleUnindent = (id: string) => {
    const item = document.items[id];
    if (!item || !item.parentId) return;

    const parent = document.items[item.parentId];
    if (!parent) return;

    const now = new Date().toISOString();
    const newItems = { ...document.items };
    let newRootIds = [...document.rootItemIds];

    // Remove from current parent
    newItems[item.parentId] = {
      ...parent,
      childIds: parent.childIds.filter((cid) => cid !== id),
      updatedAt: now,
    };

    const grandparentId = parent.parentId;
    if (grandparentId && newItems[grandparentId]) {
      const grandparent = newItems[grandparentId];
      const pIdx = grandparent.childIds.indexOf(parent.id);
      const newChildIds = [...grandparent.childIds];
      newChildIds.splice(pIdx + 1, 0, id);

      newItems[grandparentId] = {
        ...grandparent,
        childIds: newChildIds,
        updatedAt: now,
      };
      newItems[id] = {
        ...item,
        parentId: grandparentId,
        updatedAt: now,
      };
    } else {
      // Move to root
      const pIdx = newRootIds.indexOf(parent.id);
      newRootIds.splice(pIdx + 1, 0, id);
      newItems[id] = {
        ...item,
        parentId: null,
        updatedAt: now,
      };
    }

    onUpdateDocument({
      ...document,
      rootItemIds: newRootIds,
      items: newItems,
      updatedAt: now,
    });

    setFocusedItemId(id);
    setTimeout(() => inputRefs.current[id]?.focus(), 50);
  };

  // Outliner: Delete item
  const handleDeleteItem = (id: string) => {
    const target = document.items[id];
    if (!target) return;

    const idx = visibleNodes.findIndex((n) => n.id === id);
    const prevNode = idx > 0 ? visibleNodes[idx - 1] : null;

    const descendantIds = getAllDescendantIds(document.items, id);
    const toRemove = new Set([id, ...descendantIds]);

    const newItems = { ...document.items };
    for (const rid of toRemove) {
      delete newItems[rid];
    }

    if (target.parentId && newItems[target.parentId]) {
      newItems[target.parentId] = {
        ...newItems[target.parentId],
        childIds: newItems[target.parentId].childIds.filter((cid) => cid !== id),
      };
    }
    const newRootIds = document.rootItemIds.filter((rid) => rid !== id);

    onUpdateDocument({
      ...document,
      rootItemIds: newRootIds,
      items: newItems,
      updatedAt: new Date().toISOString(),
    });

    if (prevNode) {
      setFocusedItemId(prevNode.id);
      setTimeout(() => inputRefs.current[prevNode.id]?.focus(), 50);
    }
  };

  // Outliner: Keyboard navigation & shortcuts
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    node: FlattenedGanttNode,
    rowIdx: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Toggle completed
        const next = !node.item.completed;
        if (next) {
          confetti({ particleCount: 25, spread: 45, origin: { y: 0.8 } });
        }
        onUpdateDocument({
          ...document,
          items: {
            ...document.items,
            [node.id]: {
              ...node.item,
              completed: next,
              progress: next ? 100 : node.item.progress === 100 ? 0 : node.item.progress,
              updatedAt: new Date().toISOString(),
            },
          },
          updatedAt: new Date().toISOString(),
        });
      } else {
        handleAddItemBelow(node.id);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        handleUnindent(node.id);
      } else {
        handleIndent(node.id);
      }
    } else if (e.key === 'Backspace' && node.item.content === '') {
      e.preventDefault();
      handleDeleteItem(node.id);
    } else if (e.key === 'ArrowUp') {
      if (rowIdx > 0) {
        e.preventDefault();
        const prevId = visibleNodes[rowIdx - 1].id;
        setFocusedItemId(prevId);
        inputRefs.current[prevId]?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      if (rowIdx < visibleNodes.length - 1) {
        e.preventDefault();
        const nextId = visibleNodes[rowIdx + 1].id;
        setFocusedItemId(nextId);
        inputRefs.current[nextId]?.focus();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === ']') {
      e.preventDefault();
      onZoomIntoNode(node.id);
    }
  };

  // Outliner: Drag & drop reordering items via bullet
  const handleBulletDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDragInfo({ draggedId: id, targetId: null, position: null });
  };

  const handleRowDragOver = (e: React.DragEvent, id: string) => {
    if (!dragInfo || dragInfo.draggedId === id) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: 'before' | 'after' = e.clientY < midY ? 'before' : 'after';

    setDragInfo({ draggedId: dragInfo.draggedId, targetId: id, position });
  };

  const handleRowDrop = (e: React.DragEvent, targetId: string) => {
    if (!dragInfo || dragInfo.draggedId === targetId || !dragInfo.position) return;
    e.preventDefault();
    e.stopPropagation();

    const draggedId = dragInfo.draggedId;
    const position = dragInfo.position;
    setDragInfo(null);

    const descendantIds = getAllDescendantIds(document.items, draggedId);
    if (descendantIds.includes(targetId)) return;

    const draggedItem = document.items[draggedId];
    const targetItem = document.items[targetId];
    if (!draggedItem || !targetItem) return;

    const now = new Date().toISOString();
    const newItems = { ...document.items };
    let newRootIds = [...document.rootItemIds];

    if (draggedItem.parentId && newItems[draggedItem.parentId]) {
      const p = newItems[draggedItem.parentId];
      newItems[draggedItem.parentId] = {
        ...p,
        childIds: p.childIds.filter((cid) => cid !== draggedId),
        updatedAt: now,
      };
    } else {
      newRootIds = newRootIds.filter((rid) => rid !== draggedId);
    }

    const newParentId = targetItem.parentId;
    if (newParentId && newItems[newParentId]) {
      const p = newItems[newParentId];
      const tIdx = p.childIds.indexOf(targetId);
      const newChildIds = [...p.childIds];
      newChildIds.splice(position === 'before' ? tIdx : tIdx + 1, 0, draggedId);
      newItems[newParentId] = {
        ...p,
        childIds: newChildIds,
        updatedAt: now,
      };
      newItems[draggedId] = {
        ...draggedItem,
        parentId: newParentId,
        updatedAt: now,
      };
    } else {
      const tIdx = newRootIds.indexOf(targetId);
      newRootIds.splice(position === 'before' ? tIdx : tIdx + 1, 0, draggedId);
      newItems[draggedId] = {
        ...draggedItem,
        parentId: null,
        updatedAt: now,
      };
    }

    onUpdateDocument({
      ...document,
      rootItemIds: newRootIds,
      items: newItems,
      updatedAt: now,
    });
  };

  // Splitter resizing
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSplitter(true);
    const startX = e.clientX;
    const startW = treePaneWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setTreePaneWidth(Math.max(220, Math.min(650, startW + delta)));
    };

    const handleMouseUp = () => {
      setIsResizingSplitter(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Block Selection
  const handleSelectBlock = (e: React.MouseEvent, node: FlattenedGanttNode, blockId: string) => {
    e.stopPropagation();
    const key = `${node.id}:::${blockId}`;
    setSelectedBlockKeys((prev) => {
      const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
      if (isMulti) {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }
      return new Set([key]);
    });
  };

  // Delete a single time block
  const handleDeleteBlock = (itemId: string, blockId: string) => {
    const item = document.items[itemId];
    if (!item) return;

    const currentBlocks = getItemTimeBlocks(item);
    const updatedBlocks = currentBlocks.filter((b) => b.id !== blockId);

    setSelectedBlockKeys((prev) => {
      const next = new Set(prev);
      next.delete(`${itemId}:::${blockId}`);
      return next;
    });

    onUpdateDocument({
      ...document,
      items: {
        ...document.items,
        [itemId]: {
          ...item,
          timeBlocks: updatedBlocks,
          startDate: updatedBlocks[0]?.startDate,
          endDate: updatedBlocks[updatedBlocks.length - 1]?.endDate,
          startTime: updatedBlocks[0]?.startTime,
          endTime: updatedBlocks[updatedBlocks.length - 1]?.endTime,
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    });
  };

  // Batch delete all currently selected blocks
  const handleBatchDelete = () => {
    if (selectedBlockKeys.size === 0) return;

    const newItems = { ...document.items };
    let hasChanges = false;

    const toDeleteByItem: Record<string, Set<string>> = {};
    for (const key of selectedBlockKeys) {
      const [itemId, blockId] = key.split(':::');
      if (itemId && blockId) {
        if (!toDeleteByItem[itemId]) toDeleteByItem[itemId] = new Set();
        toDeleteByItem[itemId].add(blockId);
      }
    }

    for (const [itemId, blockIds] of Object.entries(toDeleteByItem)) {
      const item = newItems[itemId];
      if (item) {
        const currentBlocks = getItemTimeBlocks(item);
        const updatedBlocks = currentBlocks.filter((b) => !blockIds.has(b.id));
        newItems[itemId] = {
          ...item,
          timeBlocks: updatedBlocks,
          startDate: updatedBlocks[0]?.startDate,
          endDate: updatedBlocks[updatedBlocks.length - 1]?.endDate,
          startTime: updatedBlocks[0]?.startTime,
          endTime: updatedBlocks[updatedBlocks.length - 1]?.endTime,
          updatedAt: new Date().toISOString(),
        };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setSelectedBlockKeys(new Set());
      onUpdateDocument({
        ...document,
        items: newItems,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Batch change color of all currently selected blocks
  const handleBatchColor = (newColor: string) => {
    if (selectedBlockKeys.size === 0) return;
    const newItems = { ...document.items };
    let hasChanges = false;

    selectedBlockKeys.forEach((key) => {
      const [itemId, blockId] = key.split(':::');
      const item = newItems[itemId];
      if (item) {
        const blocks = getItemTimeBlocks(item);
        const updatedBlocks = blocks.map((b) => (b.id === blockId ? { ...b, color: newColor } : b));
        newItems[itemId] = {
          ...item,
          color: newColor,
          timeBlocks: updatedBlocks,
          updatedAt: new Date().toISOString(),
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      onUpdateDocument({
        ...document,
        items: newItems,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Duplicate an item in timeline view
  const handleDuplicate = (itemId: string) => {
    const original = document.items[itemId];
    if (!original) return;

    const now = new Date().toISOString();
    const idMap: Record<string, string> = {};
    const descendantIds = getAllDescendantIds(document.items, itemId);
    const allIds = [itemId, ...descendantIds];

    allIds.forEach((id) => {
      idMap[id] = 'item-' + Math.random().toString(36).substring(2, 9);
    });

    const newItems = { ...document.items };

    allIds.forEach((id) => {
      const orig = document.items[id];
      const newId = idMap[id];
      newItems[newId] = {
        ...orig,
        id: newId,
        content: id === itemId ? `${orig.content} (Copy)` : orig.content,
        parentId: id === itemId ? orig.parentId : idMap[orig.parentId!] || null,
        childIds: orig.childIds.map((c) => idMap[c]).filter(Boolean),
        createdAt: now,
        updatedAt: now,
      };
    });

    const newCloneRootId = idMap[itemId];

    if (original.parentId && newItems[original.parentId]) {
      const parent = newItems[original.parentId];
      const idx = parent.childIds.indexOf(itemId);
      const newChildIds = [...parent.childIds];
      newChildIds.splice(idx + 1, 0, newCloneRootId);
      newItems[original.parentId] = {
        ...parent,
        childIds: newChildIds,
        updatedAt: now,
      };

      onUpdateDocument({
        ...document,
        items: newItems,
        updatedAt: now,
      });
    } else {
      const idx = document.rootItemIds.indexOf(itemId);
      const newRootIds = [...document.rootItemIds];
      newRootIds.splice(idx + 1, 0, newCloneRootId);

      onUpdateDocument({
        ...document,
        rootItemIds: newRootIds,
        items: newItems,
        updatedAt: now,
      });
    }
  };

  // Keyboard shortcut for Delete / Escape (Backspace does NOT delete blocks)
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      const active = window.document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Delete') {
        if (selectedBlockKeys.size > 0) {
          e.preventDefault();
          handleBatchDelete();
        }
      } else if (e.key === 'Escape') {
        if (isColorPickerOpen) {
          setIsColorPickerOpen(false);
        } else if (selectedBlockKeys.size > 0) {
          setSelectedBlockKeys(new Set());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [selectedBlockKeys, document, onUpdateDocument]);

  // Rectangle selection tool (mousedown on timeline canvas)
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (isDraggingRef.current) return;
    if (selectedBlockKeys.size > 0 && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedBlockKeys(new Set());
    }

    const target = e.target as HTMLElement;
    if (target.closest('.group\\/bar') || target.closest('button') || target.closest('input')) {
      return;
    }

    if (!timelineContainerRef.current) return;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left + timelineContainerRef.current.scrollLeft;
    const canvasY = e.clientY - rect.top + timelineContainerRef.current.scrollTop;

    if (canvasY < totalHeaderHeight) return;

    marqueeStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      canvasX,
      canvasY,
    };
    marqueeActiveRef.current = false;
  };

  // Marquee mousemove & mouseup listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!marqueeStartRef.current || !timelineContainerRef.current) return;

      const deltaX = Math.abs(e.clientX - marqueeStartRef.current.clientX);
      const deltaY = Math.abs(e.clientY - marqueeStartRef.current.clientY);

      if (deltaX > 4 || deltaY > 4) {
        marqueeActiveRef.current = true;
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const curCanvasX = e.clientX - rect.left + timelineContainerRef.current.scrollLeft;
        const curCanvasY = e.clientY - rect.top + timelineContainerRef.current.scrollTop;

        setSelectionMarquee({
          startX: marqueeStartRef.current.canvasX,
          startY: marqueeStartRef.current.canvasY,
          currentX: curCanvasX,
          currentY: curCanvasY,
        });

        const boxLeft = Math.min(marqueeStartRef.current.canvasX, curCanvasX);
        const boxRight = Math.max(marqueeStartRef.current.canvasX, curCanvasX);
        const boxTop = Math.min(marqueeStartRef.current.canvasY, curCanvasY);
        const boxBottom = Math.max(marqueeStartRef.current.canvasY, curCanvasY);

        const newSelected = new Set<string>(e.shiftKey ? selectedBlockKeys : []);

        visibleNodes.forEach((node, rowIdx) => {
          const rowTop = totalHeaderHeight + rowIdx * rowHeight;
          const rowBottom = rowTop + rowHeight;

          if (rowBottom >= boxTop && rowTop <= boxBottom) {
            const blocks = getItemTimeBlocks(node.item);
            blocks.forEach((b) => {
              const bStart = parseDateTimeSafe(b.startDate, b.startTime) || windowStart;
              const bEnd = parseDateTimeSafe(b.endDate, b.endTime) || windowEnd;
              const sMs = bStart.getTime();
              const eMs = bEnd.getTime();

              const totalWindowMs = Math.max(windowEnd.getTime() - windowStart.getTime(), 1000);
              const bLeft = ((sMs - windowStart.getTime()) / totalWindowMs) * totalTimelineWidth;
              const bRight = ((eMs - windowStart.getTime()) / totalWindowMs) * totalTimelineWidth;

              if (bRight >= boxLeft && bLeft <= boxRight) {
                newSelected.add(`${node.id}:::${b.id}`);
              }
            });
          }
        });

        setSelectedBlockKeys(newSelected);
      } else {
        marqueeActiveRef.current = false;
        setSelectionMarquee(null);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (marqueeStartRef.current) {
        if (!marqueeActiveRef.current && !isDraggingRef.current) {
          if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            setSelectedBlockKeys(new Set());
          }
        }
        marqueeStartRef.current = null;
        marqueeActiveRef.current = false;
        setSelectionMarquee(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [totalHeaderHeight, visibleNodes, windowStart, windowEnd, totalTimelineWidth, selectedBlockKeys, rowHeight]);

  // Start dragging a time block (single or batch)
  const handleStartDrag = (
    type: 'move' | 'resize-start' | 'resize-end',
    e: React.MouseEvent | React.TouchEvent,
    node: FlattenedGanttNode,
    blockId: string
  ) => {
    e.stopPropagation();

    const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const clickedKey = `${node.id}:::${blockId}`;
    let currentSelected = selectedBlockKeys;
    if (!selectedBlockKeys.has(clickedKey)) {
      currentSelected = new Set([clickedKey]);
      setSelectedBlockKeys(currentSelected);
    }

    const blocks = getItemTimeBlocks(node.item);
    const targetBlock = blocks.find((b) => b.id === blockId) || blocks[0];
    if (!targetBlock) return;

    const parsedStart = parseDateTimeSafe(targetBlock.startDate, targetBlock.startTime) || windowStart;
    const parsedEnd = parseDateTimeSafe(targetBlock.endDate, targetBlock.endTime, true) || windowEnd;

    let batchBlocks: DraggingBlockInfo[] | undefined;
    if (type === 'move' && currentSelected.size > 1 && currentSelected.has(clickedKey)) {
      batchBlocks = [];
      for (const key of currentSelected) {
        const [sItemId, sBlockId] = key.split(':::');
        const sItem = document.items[sItemId];
        if (sItem) {
          const b = getItemTimeBlocks(sItem).find((x) => x.id === sBlockId);
          if (b) {
            const bs = parseDateTimeSafe(b.startDate, b.startTime) || windowStart;
            const be = parseDateTimeSafe(b.endDate, b.endTime, true) || windowEnd;
            batchBlocks.push({
              itemId: sItemId,
              blockId: sBlockId,
              initialStartMs: bs.getTime(),
              initialEndMs: be.getTime(),
            });
          }
        }
      }
    }

    isDraggingRef.current = true;

    setDragState({
      type,
      itemId: node.id,
      blockId,
      startX: clientX,
      initialStartMs: parsedStart.getTime(),
      initialEndMs: parsedEnd.getTime(),
      currentStartMs: parsedStart.getTime(),
      currentEndMs: parsedEnd.getTime(),
      batchBlocks,
    });
  };

  // Dragging mouse & touch listener
  useEffect(() => {
    if (!dragState) return;

    const totalWindowMs = windowEnd.getTime() - windowStart.getTime();

    const handleMove = (clientX: number) => {
      const deltaPixels = clientX - dragState.startX;
      const deltaMs = (deltaPixels / totalTimelineWidth) * totalWindowMs;
      const snappedDeltaMs = Math.round(deltaMs / minorDurationMs) * minorDurationMs;

      if (dragState.type === 'move') {
        const duration = dragState.initialEndMs - dragState.initialStartMs;
        const newStart = dragState.initialStartMs + snappedDeltaMs;
        const newEnd = newStart + duration;
        setDragState((prev) => (prev ? { ...prev, currentStartMs: newStart, currentEndMs: newEnd } : null));
      } else if (dragState.type === 'resize-start') {
        let newStart = dragState.initialStartMs + snappedDeltaMs;
        if (newStart >= dragState.initialEndMs - minorDurationMs) {
          newStart = dragState.initialEndMs - minorDurationMs;
        }
        setDragState((prev) => (prev ? { ...prev, currentStartMs: newStart } : null));
      } else if (dragState.type === 'resize-end') {
        let newEnd = dragState.initialEndMs + snappedDeltaMs;
        if (newEnd <= dragState.initialStartMs + minorDurationMs) {
          newEnd = dragState.initialStartMs + minorDurationMs;
        }
        setDragState((prev) => (prev ? { ...prev, currentEndMs: newEnd } : null));
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      if (!dragState) return;

      const deltaMs = dragState.currentStartMs - dragState.initialStartMs;

      // Case 1: Batch translation of multiple blocks
      if (dragState.batchBlocks && dragState.batchBlocks.length > 1 && deltaMs !== 0) {
        const updatedItems = { ...document.items };
        const blocksByItem: Record<string, { blockId: string; newStartMs: number; newEndMs: number }[]> = {};

        for (const b of dragState.batchBlocks) {
          if (!blocksByItem[b.itemId]) blocksByItem[b.itemId] = [];
          blocksByItem[b.itemId].push({
            blockId: b.blockId,
            newStartMs: b.initialStartMs + deltaMs,
            newEndMs: b.initialEndMs + deltaMs,
          });
        }

        for (const [itemId, blockUpdates] of Object.entries(blocksByItem)) {
          const item = updatedItems[itemId];
          if (item) {
            const curBlocks = getItemTimeBlocks(item);
            const nextBlocks = curBlocks.map((b) => {
              const update = blockUpdates.find((u) => u.blockId === b.id);
              if (update) {
                return {
                  ...b,
                  startDate: formatDateSafe(new Date(update.newStartMs)),
                  endDate: formatDateSafe(new Date(update.newEndMs)),
                  startTime: formatTimeSafe(new Date(update.newStartMs)),
                  endTime: formatTimeSafe(new Date(update.newEndMs)),
                };
              }
              return b;
            });

            updatedItems[itemId] = {
              ...item,
              timeBlocks: nextBlocks,
              startDate: nextBlocks[0]?.startDate,
              endDate: nextBlocks[nextBlocks.length - 1]?.endDate,
              startTime: nextBlocks[0]?.startTime,
              endTime: nextBlocks[nextBlocks.length - 1]?.endTime,
              updatedAt: new Date().toISOString(),
            };
          }
        }

        onUpdateDocument({
          ...document,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        });
      }
      // Case 2: Single block moved or resized
      else {
        const targetItem = document.items[dragState.itemId];
        if (targetItem) {
          const existingBlocks = getItemTimeBlocks(targetItem);
          const startDateStr = formatDateSafe(new Date(dragState.currentStartMs));
          const endDateStr = formatDateSafe(new Date(dragState.currentEndMs));
          const startTimeStr = formatTimeSafe(new Date(dragState.currentStartMs));
          const endTimeStr = formatTimeSafe(new Date(dragState.currentEndMs));

          let updatedBlocks: TimeBlock[];
          if (existingBlocks.some((b) => b.id === dragState.blockId)) {
            updatedBlocks = existingBlocks.map((b) =>
              b.id === dragState.blockId
                ? {
                    ...b,
                    startDate: startDateStr,
                    endDate: endDateStr,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                  }
                : b
            );
          } else {
            updatedBlocks = [
              ...existingBlocks,
              {
                id: dragState.blockId,
                startDate: startDateStr,
                endDate: endDateStr,
                startTime: startTimeStr,
                endTime: endTimeStr,
              },
            ];
          }

          onUpdateDocument({
            ...document,
            items: {
              ...document.items,
              [dragState.itemId]: {
                ...targetItem,
                timeBlocks: updatedBlocks,
                startDate: updatedBlocks[0]?.startDate,
                endDate: updatedBlocks[updatedBlocks.length - 1]?.endDate,
                startTime: updatedBlocks[0]?.startTime,
                endTime: updatedBlocks[updatedBlocks.length - 1]?.endTime,
                updatedAt: new Date().toISOString(),
              },
            },
            updatedAt: new Date().toISOString(),
          });
        }
      }

      setDragState(null);
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [dragState, windowStart, windowEnd, totalTimelineWidth, minorDurationMs, document, onUpdateDocument]);

  // DOUBLE-CLICK on empty timeline area to add a new time block of one minor division
  const handleTimelineRowDoubleClick = (node: FlattenedGanttNode, e: React.MouseEvent) => {
    if (dragState || isDraggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    const totalWindowMs = windowEnd.getTime() - windowStart.getTime();
    const clickRatio = Math.max(0, Math.min(1, clickX / totalTimelineWidth));
    const rawClickMs = windowStart.getTime() + clickRatio * totalWindowMs;

    const snappedStartMs =
      Math.floor((rawClickMs - windowStart.getTime()) / minorDurationMs) * minorDurationMs +
      windowStart.getTime();
    const snappedEndMs = snappedStartMs + minorDurationMs;

    const targetItem = document.items[node.id];
    if (!targetItem) return;

    const newBlockId = 'tb-' + Math.random().toString(36).substring(2, 9);
    const newBlock: TimeBlock = {
      id: newBlockId,
      startDate: formatDateSafe(new Date(snappedStartMs)),
      endDate: formatDateSafe(new Date(snappedEndMs)),
      startTime: formatTimeSafe(new Date(snappedStartMs)),
      endTime: formatTimeSafe(new Date(snappedEndMs)),
      color: targetItem.color || '#3b82f6',
    };

    const existingBlocks = getItemTimeBlocks(targetItem);
    const updatedBlocks = [...existingBlocks, newBlock];

    setSelectedBlockKeys(new Set([`${node.id}:::${newBlockId}`]));

    onUpdateDocument({
      ...document,
      items: {
        ...document.items,
        [node.id]: {
          ...targetItem,
          timeBlocks: updatedBlocks,
          startDate: updatedBlocks[0]?.startDate,
          endDate: updatedBlocks[updatedBlocks.length - 1]?.endDate,
          startTime: updatedBlocks[0]?.startTime,
          endTime: updatedBlocks[updatedBlocks.length - 1]?.endTime,
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    });
  };

  // Toggle row collapse in Gantt & persist to document items
  const handleToggleRowCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = document.items[nodeId];
    if (!item) return;
    const nextCollapsed = !item.collapsed;
    onUpdateDocument({
      ...document,
      items: {
        ...document.items,
        [nodeId]: {
          ...item,
          collapsed: nextCollapsed,
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const currentZoomLabel = getZoomLabel(zoomLevel, settings.yearMode);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 overflow-hidden select-none">
      {/* Top Gantt Toolbar with Zoom Slider */}
      <GanttHeader
        windowTitle={windowTitle}
        onPrevWindow={handlePrevWindow}
        onNextWindow={handleNextWindow}
        onNow={handleNow}
        zoomLevel={zoomLevel}
        zoomLabel={currentZoomLabel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onSetZoomLevel={handleSetZoomLevel}
        isZenMode={isZenMode}
        onToggleZenMode={onToggleZenMode}
        isShortScreen={isShortScreen}
      />

      {/* Floating Drag Info Tooltip */}
      {dragState && (
        <div
          style={{
            position: 'fixed',
            left: `${dragState.startX + 15}px`,
            top: '80px',
          }}
          className="z-50 px-3 py-1.5 bg-gray-900/90 text-white rounded-lg shadow-xl text-xs backdrop-blur-sm pointer-events-none border border-gray-700 animate-in fade-in duration-75"
        >
          {dragState.batchBlocks && dragState.batchBlocks.length > 1 ? (
            <>
              <div className="font-semibold text-blue-400">
                Moving {dragState.batchBlocks.length} selected blocks
              </div>
              <div className="text-[11px] text-gray-200">
                Shift:{' '}
                {dragState.currentStartMs - dragState.initialStartMs >= 0 ? '+' : ''}
                {formatDuration(0, Math.abs(dragState.currentStartMs - dragState.initialStartMs))}
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold text-blue-400">
                {document.items[dragState.itemId]?.content || 'Task'}
              </div>
              <div className="text-[11px] text-gray-200">
                {formatDisplayDateTime(new Date(dragState.currentStartMs), true)} ~{' '}
                {formatDisplayDateTime(new Date(dragState.currentEndMs), true)} (
                {formatDuration(dragState.currentStartMs, dragState.currentEndMs)})
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Split Body: Left Task Table & Right Zoomable Timeline (SYNCHRONIZED VERTICAL SCROLL!) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Interactive Outliner Task Table (Hidden on mobile portrait; visible in landscape & desktop) */}
        <div
          style={{ width: `${treePaneWidth}px` }}
          className="hidden sm:flex flex-shrink-0 flex-col border-r border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 min-w-[220px]"
        >
          {/* Table Header (Duration column removed as requested) */}
          <div
            style={{ height: `${totalHeaderHeight}px` }}
            className="border-b border-gray-200 dark:border-zinc-800 flex items-center px-3 bg-gray-100 dark:bg-zinc-900 text-xs font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0"
          >
            <div className="flex-1 truncate font-semibold">Tasks ({visibleNodes.length})</div>
          </div>

          {/* Table Rows (Fully displayed long task names, horizontal scrollbar support, left-hand hover icons) */}
          <div
            ref={leftTableContainerRef}
            onScroll={handleLeftScroll}
            className="flex-1 overflow-y-auto overflow-x-auto divide-y divide-gray-100/60 dark:divide-zinc-800/40"
          >
            <div className="min-w-max">
              {visibleNodes.map((node, rowIdx) => {
                const item = node.item;
                const hasKids = node.hasChildren;
                const isCollapsed = !node.isExpanded;
                const isFocused = focusedItemId === node.id;
                const isDropTarget = dragInfo?.targetId === node.id;

                return (
                  <div
                    key={node.id}
                    data-task-row-id={node.id}
                    style={{
                      height: `${rowHeight}px`,
                      paddingLeft: `${Math.max(node.depth * 18, 10)}px`,
                    }}
                    onDragOver={(e) => handleRowDragOver(e, node.id)}
                    onDrop={(e) => handleRowDrop(e, node.id)}
                    onMouseDown={() => {
                      if (selectedBlockKeys.size > 0) setSelectedBlockKeys(new Set());
                    }}
                    className={`group flex items-center pr-3 transition-colors text-xs relative min-w-max ${
                      isFocused
                        ? 'bg-blue-50/70 dark:bg-zinc-800/80'
                        : 'hover:bg-blue-50/40 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {/* Drop Indicator Lines */}
                    {isDropTarget && dragInfo?.position === 'before' && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-30 pointer-events-none" />
                    )}
                    {isDropTarget && dragInfo?.position === 'after' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-30 pointer-events-none" />
                    )}

                    {/* Left-Hand Hover Icons: "Focus on task" and "Task menu" to the left of the collapse icon */}
                    <div className="w-8 flex items-center justify-end gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => onZoomIntoNode(node.id)}
                        className="p-0.5 text-gray-400 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded"
                        title="Focus on task (Ctrl+])"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setTaskMenuInfo({
                            item: node.item,
                            position: { x: rect.left, y: rect.bottom + 4 },
                          });
                        }}
                        className="p-0.5 text-gray-400 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded"
                        title="Task menu"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Expand / Collapse chevron: closer to the task (like before) */}
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 ml-0.5 mr-0.5">
                      {hasKids ? (
                        <button
                          onClick={(e) => handleToggleRowCollapse(node.id, e)}
                          className="p-0.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded"
                          title={isCollapsed ? 'Expand subtasks' : 'Collapse subtasks'}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Draggable Outliner Bullet: Click to Focus, Drag to Reorder */}
                    <div
                      draggable
                      onDragStart={(e) => handleBulletDragStart(e, node.id)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setDragInfo({ draggedId: node.id, targetId: null, position: null });
                      }}
                      onTouchMove={(e) => {
                        e.stopPropagation();
                        if (e.touches && e.touches[0]) {
                          const touch = e.touches[0];
                          const targetEl = window.document.elementFromPoint(touch.clientX, touch.clientY);
                          const targetRow = targetEl?.closest('[data-task-row-id]');
                          if (targetRow) {
                            const targetId = targetRow.getAttribute('data-task-row-id');
                            if (targetId && targetId !== node.id) {
                              const rect = targetRow.getBoundingClientRect();
                              const midY = rect.top + rect.height / 2;
                              const pos: 'before' | 'after' = touch.clientY < midY ? 'before' : 'after';
                              setDragInfo({ draggedId: node.id, targetId, position: pos });
                            }
                          }
                        }
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        if (dragInfo && dragInfo.targetId && dragInfo.position) {
                          handleRowDrop(e as any, dragInfo.targetId);
                        } else {
                          setDragInfo(null);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onZoomIntoNode(node.id);
                      }}
                      className="group/bullet relative w-4 h-4 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full mr-1.5 transition-colors flex-shrink-0 touch-none"
                      title="Click to focus • Drag to reorder"
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full transition-transform group-hover/bullet:scale-125"
                        style={{ backgroundColor: item.color || '#3b82f6' }}
                      />
                    </div>

                    {/* Checkbox */}
                    <button
                      onClick={() => {
                        const next = !item.completed;
                        if (next) {
                          confetti({ particleCount: 25, spread: 45, origin: { y: 0.8 } });
                        }
                        onUpdateDocument({
                          ...document,
                          items: {
                            ...document.items,
                            [node.id]: {
                              ...item,
                              completed: next,
                              progress: next ? 100 : item.progress === 100 ? 0 : item.progress,
                              updatedAt: new Date().toISOString(),
                            },
                          },
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border mr-2 flex-shrink-0 transition-all ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:border-blue-500'
                      }`}
                    >
                      {item.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>

                    {/* In-place Task Title (Exact content sizing, no dead whitespace) */}
                    <input
                      ref={(el) => (inputRefs.current[node.id] = el)}
                      type="text"
                      value={item.content}
                      onChange={(e) => handleContentChange(node.id, e.target.value)}
                      onFocus={() => {
                        setFocusedItemId(node.id);
                        handleTaskNameClick(node);
                        if (selectedBlockKeys.size > 0) setSelectedBlockKeys(new Set());
                      }}
                      onKeyDown={(e) => handleKeyDown(e, node, rowIdx)}
                      placeholder="Untitled task..."
                      style={{
                        width: `${Math.max(40, ((item.content || '').length + 1) * 7.5)}px`,
                      }}
                      className={`bg-transparent text-xs outline-none rounded px-1.5 py-0.5 border border-transparent focus:border-blue-400 focus:bg-white dark:focus:bg-zinc-800 transition-colors whitespace-nowrap ${
                        item.completed
                          ? 'line-through text-gray-400 dark:text-gray-500'
                          : 'text-gray-900 dark:text-gray-100 font-medium'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resizer Splitter Bar (hidden on mobile portrait screens) */}
        <div
          onMouseDown={handleSplitterMouseDown}
          className={`hidden sm:block w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20 ${
            isResizingSplitter ? 'bg-blue-500' : 'bg-gray-200 dark:border-zinc-800'
          }`}
          title="Drag to resize table width"
        />

        {/* Right Pane: Zoomable Timeline (SYNCHRONIZED VERTICAL SCROLL!) */}
        <div
          ref={timelineContainerRef}
          onScroll={handleRightScroll}
          onMouseDown={handleTimelineMouseDown}
          className="flex-1 overflow-y-auto overflow-x-auto relative bg-white dark:bg-zinc-950 w-full"
        >
          <div
            style={{ width: `${totalTimelineWidth}px` }}
            className="min-h-full relative flex flex-col"
          >
            {/* Multi-Tier Sticky Header (LEFT-JUSTIFIED labels & High Contrast Tier 2 with dark background in dark mode) */}
            <div className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-gray-300 dark:border-zinc-700 shadow-2xs flex-shrink-0">
              {headerTiers.map((tier) => (
                <div
                  key={tier.id}
                  style={{ height: `${tier.heightPx}px` }}
                  className={`flex border-b border-gray-200 dark:border-zinc-800 select-none overflow-hidden ${
                    tier.className || ''
                  }`}
                >
                  {tier.units.map((u) => (
                    <div
                      key={u.id}
                      style={{ width: `${u.widthPx}px` }}
                      className="flex items-center justify-start border-r border-gray-300 dark:border-zinc-700 flex-shrink-0 px-1.5 truncate text-left"
                      title={u.subLabel || u.label}
                    >
                      <span className="truncate">{u.label}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Vertical Now guideline */}
            {todayX !== null && todayX >= 0 && todayX <= totalTimelineWidth && (
              <div
                style={{
                  left: `${todayX}px`,
                  top: `${totalHeaderHeight}px`,
                }}
                className="absolute bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none shadow-xs"
              >
                <div
                  style={{ top: `${totalHeaderHeight + 2}px` }}
                  className="sticky -ml-5 px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded shadow-sm whitespace-nowrap"
                >
                  Now
                </div>
              </div>
            )}

            {/* LEVEL 1: Exact Month-Aligned Alternating Background Shading (Starts/ends on actual calendar month 1st and last day) */}
            {zoomLevel === 1 && (
              <div
                style={{ top: `${totalHeaderHeight}px` }}
                className="absolute bottom-0 left-0 right-0 pointer-events-none"
              >
                {Array.from({ length: 12 }, (_, m) => {
                  const mStart = new Date(viewDate.getFullYear(), m, 1, 0, 0, 0, 0);
                  const mEnd = new Date(viewDate.getFullYear(), m + 1, 0, 23, 59, 59, 999);
                  const totalWinMs = windowEnd.getTime() - windowStart.getTime();
                  const leftPx = ((mStart.getTime() - windowStart.getTime()) / totalWinMs) * totalTimelineWidth;
                  const rightPx = ((mEnd.getTime() - windowStart.getTime()) / totalWinMs) * totalTimelineWidth;
                  const widthPx = rightPx - leftPx;

                  if (m % 2 !== 0) return null;

                  return (
                    <div
                      key={`month-shade-${m}`}
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                      }}
                      className="absolute top-0 bottom-0 bg-slate-100/60 dark:bg-indigo-950/20"
                    />
                  );
                })}
              </div>
            )}

            {/* Background Grid Columns with Division 1, 2, 3, MWF, and Weekend/Night highlights */}
            <div
              style={{ top: `${totalHeaderHeight}px` }}
              className="absolute bottom-0 left-0 right-0 flex pointer-events-none"
            >
              {minorUnits.map((nu) => {
                let borderClass = 'border-r border-dotted border-gray-200/90 dark:border-zinc-800/80';
                if (nu.divisionRank === 1) {
                  borderClass = 'border-r-2 border-gray-400 dark:border-zinc-500';
                } else if (nu.divisionRank === 2) {
                  borderClass = 'border-r border-gray-300 dark:border-zinc-700';
                }

                let bgClass = '';
                if (nu.isWeekend && nu.isNight) {
                  bgClass = 'bg-slate-200/70 dark:bg-indigo-950/40';
                } else if (nu.isNight) {
                  bgClass = 'bg-slate-100/60 dark:bg-indigo-950/20';
                } else if (nu.isWeekend) {
                  bgClass = 'bg-amber-50/50 dark:bg-amber-950/20';
                } else if (zoomLevel !== 1 && (nu.isAlternate || nu.isMWF)) {
                  bgClass = 'bg-slate-100/60 dark:bg-indigo-950/20';
                }

                return (
                  <div
                    key={nu.id}
                    style={{ width: `${nu.widthPx}px` }}
                    className={`${borderClass} ${bgClass} flex-shrink-0`}
                  />
                );
              })}
            </div>

            {/* Selection Marquee Rectangle Overlay */}
            {selectionMarquee && (
              <div
                style={{
                  left: `${Math.min(selectionMarquee.startX, selectionMarquee.currentX)}px`,
                  top: `${Math.min(selectionMarquee.startY, selectionMarquee.currentY)}px`,
                  width: `${Math.abs(selectionMarquee.currentX - selectionMarquee.startX)}px`,
                  height: `${Math.abs(selectionMarquee.currentY - selectionMarquee.startY)}px`,
                }}
                className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-40 rounded-xs"
              />
            )}

            {/* Task Rows & Bars */}
            <div className="relative flex-1">
              {visibleNodes.map((node) => {
                const blocks = getItemTimeBlocks(node.item);

                return (
                  <div
                    key={node.id}
                    style={{ height: `${rowHeight}px` }}
                    onDoubleClick={(e) => handleTimelineRowDoubleClick(node, e)}
                    className="relative border-b border-gray-100/60 dark:border-zinc-800/40 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 cursor-cell transition-colors"
                    title="Double-click empty area to create a time block"
                  >
                    {blocks.map((block) => {
                      const blockKey = `${node.id}:::${block.id}`;
                      const isSelected = selectedBlockKeys.has(blockKey);

                      const isDirectDragging =
                        dragState?.itemId === node.id && dragState.blockId === block.id;
                      const isBatchDragging = Boolean(
                        dragState?.batchBlocks?.some((b) => b.itemId === node.id && b.blockId === block.id)
                      );
                      const isDraggingThisBlock = isDirectDragging || isBatchDragging;

                      let effectiveDragStartMs: number | undefined;
                      let effectiveDragEndMs: number | undefined;

                      if (isDirectDragging && dragState) {
                        effectiveDragStartMs = dragState.currentStartMs;
                        effectiveDragEndMs = dragState.currentEndMs;
                      } else if (isBatchDragging && dragState) {
                        const batchInfo = dragState.batchBlocks?.find(
                          (b) => b.itemId === node.id && b.blockId === block.id
                        );
                        if (batchInfo) {
                          const deltaMs = dragState.currentStartMs - dragState.initialStartMs;
                          effectiveDragStartMs = batchInfo.initialStartMs + deltaMs;
                          effectiveDragEndMs = batchInfo.initialEndMs + deltaMs;
                        }
                      }

                      return (
                        <GanttTaskBar
                          key={block.id}
                          node={node}
                          block={block}
                          windowStart={windowStart}
                          windowEnd={windowEnd}
                          totalTimelineWidth={totalTimelineWidth}
                          isSelected={isSelected}
                          onSelect={handleSelectBlock}
                          onDeleteBlock={handleDeleteBlock}
                          onStartDrag={handleStartDrag}
                          onDoubleClick={() => setEditingModalNode(node)}
                          isDragging={isDraggingThisBlock}
                          dragStartMs={effectiveDragStartMs}
                          dragEndMs={effectiveDragEndMs}
                          rowHeight={rowHeight}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Batch Selection Toolbar */}
      {selectedBlockKeys.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-gray-900/90 text-white rounded-xl shadow-2xl backdrop-blur-md border border-gray-700 animate-in fade-in slide-in-from-bottom-2">
          <span className="text-xs font-semibold select-none">
            {selectedBlockKeys.size} {selectedBlockKeys.size === 1 ? 'block' : 'blocks'} selected
          </span>
          {/* Collapsible Color Chooser */}
          <div className="relative" ref={colorPickerRef}>
            <button
              type="button"
              onClick={() => setIsColorPickerOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors border ${
                isColorPickerOpen
                  ? 'bg-gray-800 text-white border-blue-500 shadow-xs'
                  : 'bg-gray-800/80 text-gray-200 hover:text-white hover:bg-gray-800 border-gray-700'
              }`}
              title="Change timeblock color"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Color</span>
            </button>

            {/* Color Picker Popover */}
            {isColorPickerOpen && (
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 p-2.5 bg-gray-900/95 text-white rounded-xl shadow-2xl border border-gray-700 flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-100 min-w-[140px]">
                <div className="text-[10px] font-semibold text-gray-400 px-0.5 select-none uppercase tracking-wider">
                  Preset Colors
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        handleBatchColor(c);
                        setIsColorPickerOpen(false);
                      }}
                      className="w-5 h-5 rounded-full transition-transform hover:scale-125 border border-white/20 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      style={{ backgroundColor: c }}
                      title={`Set color ${c}`}
                    />
                  ))}
                </div>
                <label className="flex items-center gap-2 pt-1.5 border-t border-gray-800 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                  <input
                    type="color"
                    onChange={(e) => {
                      handleBatchColor(e.target.value);
                      setIsColorPickerOpen(false);
                    }}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                    title="Custom color"
                  />
                  <span>Custom...</span>
                </label>
              </div>
            )}
          </div>
          <div className="h-3.5 w-px bg-gray-700" />
          <button
            onClick={handleBatchDelete}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs"
            title="Delete selected blocks (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
          <button
            onClick={() => {
              setSelectedBlockKeys(new Set());
              setIsColorPickerOpen(false);
            }}
            className="px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded transition-colors"
            title="Clear selection (Esc)"
          >
            Deselect
          </button>
        </div>
      )}

      {/* Task Detail Modal */}
      {editingModalNode && (
        <TaskDetailModal
          item={document.items[editingModalNode.id] || editingModalNode.item}
          onSave={(updates) => {
            const currentItem = document.items[editingModalNode.id];
            if (!currentItem) return;

            onUpdateDocument({
              ...document,
              items: {
                ...document.items,
                [editingModalNode.id]: {
                  ...currentItem,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                },
              },
              updatedAt: new Date().toISOString(),
            });
          }}
          onDelete={(id) => {
            const target = document.items[id];
            if (!target) return;

            const newItems = { ...document.items };
            delete newItems[id];

            if (target.parentId && newItems[target.parentId]) {
              newItems[target.parentId] = {
                ...newItems[target.parentId],
                childIds: newItems[target.parentId].childIds.filter((cid) => cid !== id),
              };
            }
            const newRootIds = document.rootItemIds.filter((rid) => rid !== id);

            onUpdateDocument({
              ...document,
              rootItemIds: newRootIds,
              items: newItems,
              updatedAt: new Date().toISOString(),
            });
          }}
          onClose={() => setEditingModalNode(null)}
        />
      )}

      {/* Task Context Menu Dropdown */}
      {taskMenuInfo && (
        <ItemMenu
          item={document.items[taskMenuInfo.item.id] || taskMenuInfo.item}
          position={taskMenuInfo.position}
          onClose={() => setTaskMenuInfo(null)}
          onZoomIn={() => onZoomIntoNode(taskMenuInfo.item.id)}
          onAddSubtask={() => handleAddSubtask(taskMenuInfo.item.id)}
          onAddNote={() => {}}
          hideAddNote={true}
          onOpenDatePicker={() => {
            const n = visibleNodes.find((vn) => vn.id === taskMenuInfo.item.id);
            if (n) setEditingModalNode(n);
          }}
          onToggleComplete={() => {
            const it = document.items[taskMenuInfo.item.id] || taskMenuInfo.item;
            const next = !it.completed;
            onUpdateDocument({
              ...document,
              items: {
                ...document.items,
                [it.id]: {
                  ...it,
                  completed: next,
                  progress: next ? 100 : it.progress === 100 ? 0 : it.progress,
                  updatedAt: new Date().toISOString(),
                },
              },
              updatedAt: new Date().toISOString(),
            });
          }}
          onIndent={() => {
            handleIndent(taskMenuInfo.item.id);
          }}
          onUnindent={() => {
            handleUnindent(taskMenuInfo.item.id);
          }}
          onDuplicate={() => {
            handleDuplicate(taskMenuInfo.item.id);
          }}
          onDelete={() => {
            handleDeleteItem(taskMenuInfo.item.id);
          }}
          canIndent={(() => {
            const idx = visibleNodes.findIndex((vn) => vn.id === taskMenuInfo.item.id);
            return idx > 0;
          })()}
          canUnindent={Boolean(taskMenuInfo.item.parentId && taskMenuInfo.item.parentId !== zoomItemId)}
        />
      )}
    </div>
  );
};
