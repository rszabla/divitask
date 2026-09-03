import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  Check,
  Trash2,
  CheckSquare,
  CornerDownRight,
  CornerUpLeft,
  Copy,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TaskDocument, TaskItem } from '../../types.js';
import { OutlinerItem } from './OutlinerItem.js';
import { getAllDescendantIds } from '../../utils/treeUtils.js';
import { TaskDetailModal } from '../gantt/TaskDetailModal.js';

interface OutlinerTreeProps {
  document: TaskDocument;
  zoomItemId: string | null;
  onUpdateDocument: (doc: TaskDocument, isStructural?: boolean) => void;
  onZoomIn: (itemId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  filterQuery?: string;
  onFilterTag?: (tag: string) => void;
  hideCompleted?: boolean;
}

export const OutlinerTree: React.FC<OutlinerTreeProps> = ({
  document,
  zoomItemId,
  onUpdateDocument,
  onZoomIn,
  onUndo,
  onRedo,
  filterQuery,
  onFilterTag,
  hideCompleted,
}) => {
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [focusedCursor, setFocusedCursor] = useState<number | 'start' | 'end' | undefined>(undefined);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const isMouseSelectingRef = useRef(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseSelectingRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const [dragInfo, setDragInfo] = useState<{
    draggedId: string;
    targetId: string | null;
    position: 'before' | 'after' | 'inside' | null;
  } | null>(null);
  const zoomHeaderRef = useRef<HTMLInputElement>(null);
  const [editingModalItemId, setEditingModalItemId] = useState<string | null>(null);

  const generateId = () => 'item-' + Math.random().toString(36).substring(2, 9);

  const handleDragStart = (id: string) => {
    setDragInfo({ draggedId: id, targetId: null, position: null });
  };

  const handleDragEnd = () => {
    setDragInfo(null);
  };

  const handleDragOver = (targetId: string, position: 'before' | 'after' | 'inside') => {
    setDragInfo((prev) => {
      if (!prev) return null;
      if (prev.targetId === targetId && prev.position === position) return prev;
      return { ...prev, targetId, position };
    });
  };

  const handleDropItem = (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    if (draggedId === targetId) {
      setDragInfo(null);
      return;
    }

    const descendantIds = getAllDescendantIds(document.items, draggedId);
    if (descendantIds.includes(targetId)) {
      setDragInfo(null);
      return;
    }

    const draggedItem = document.items[draggedId];
    const targetItem = document.items[targetId];
    if (!draggedItem || !targetItem) {
      setDragInfo(null);
      return;
    }

    const now = new Date().toISOString();
    const newItems = { ...document.items };
    let newRootIds = [...document.rootItemIds];

    // 1. Remove draggedId from its old parent or rootItemIds
    if (draggedItem.parentId && newItems[draggedItem.parentId]) {
      const oldParent = newItems[draggedItem.parentId];
      newItems[draggedItem.parentId] = {
        ...oldParent,
        childIds: oldParent.childIds.filter((id) => id !== draggedId),
        updatedAt: now,
      };
    } else {
      newRootIds = newRootIds.filter((id) => id !== draggedId);
    }

    // 2. Insert into new location
    if (position === 'inside') {
      const parent = newItems[targetId];
      newItems[targetId] = {
        ...parent,
        collapsed: false,
        childIds: [...parent.childIds, draggedId],
        updatedAt: now,
      };
      newItems[draggedId] = {
        ...draggedItem,
        parentId: targetId,
        updatedAt: now,
      };
    } else if (position === 'before') {
      const newParentId = targetItem.parentId;
      newItems[draggedId] = {
        ...draggedItem,
        parentId: newParentId,
        updatedAt: now,
      };

      if (newParentId && newItems[newParentId]) {
        const parent = newItems[newParentId];
        const idx = parent.childIds.indexOf(targetId);
        const newChildIds = [...parent.childIds];
        newChildIds.splice(idx, 0, draggedId);
        newItems[newParentId] = {
          ...parent,
          childIds: newChildIds,
          updatedAt: now,
        };
      } else {
        const idx = newRootIds.indexOf(targetId);
        newRootIds.splice(idx, 0, draggedId);
      }
    } else if (position === 'after') {
      const newParentId = targetItem.parentId;
      newItems[draggedId] = {
        ...draggedItem,
        parentId: newParentId,
        updatedAt: now,
      };

      if (newParentId && newItems[newParentId]) {
        const parent = newItems[newParentId];
        const idx = parent.childIds.indexOf(targetId);
        const newChildIds = [...parent.childIds];
        newChildIds.splice(idx + 1, 0, draggedId);
        newItems[newParentId] = {
          ...parent,
          childIds: newChildIds,
          updatedAt: now,
        };
      } else {
        const idx = newRootIds.indexOf(targetId);
        newRootIds.splice(idx + 1, 0, draggedId);
      }
    }

    onUpdateDocument({
      ...document,
      rootItemIds: newRootIds,
      items: newItems,
      updatedAt: now,
    });

    setDragInfo(null);
  };

  // Helper to update a single item
  const handleUpdateItem = (itemId: string, updates: Partial<TaskItem>) => {
    const existing = document.items[itemId];
    if (!existing) return;

    const updatedItem: TaskItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    onUpdateDocument({
      ...document,
      items: {
        ...document.items,
        [itemId]: updatedItem,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleFocusItem = (id: string | null, cursor?: number | 'start' | 'end') => {
    setFocusedItemId(id);
    setFocusedCursor(cursor);
  };

  const handleBlurItem = (blurredId: string) => {
    setFocusedItemId((curr) => (curr === blurredId ? null : curr));
  };

  // Helper to add a new item below an existing item with split text support
  const handleAddItemBelow = (afterItemId: string, textBelow: string = '', textRemaining?: string) => {
    const afterItem = document.items[afterItemId];
    if (!afterItem) return;

    const newId = generateId();
    const now = new Date().toISOString();

    const updatedAfterItem: TaskItem = textRemaining !== undefined
      ? { ...afterItem, content: textRemaining, updatedAt: now }
      : afterItem;

    const newItem: TaskItem = {
      id: newId,
      content: textBelow,
      note: '',
      completed: false,
      collapsed: false,
      parentId: afterItem.parentId,
      childIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const newItems = {
      ...document.items,
      [afterItemId]: updatedAfterItem,
      [newId]: newItem,
    };

    // If afterItem has children and is expanded, insert as its first child
    if (afterItem.childIds.length > 0 && !afterItem.collapsed) {
      newItem.parentId = afterItemId;
      newItems[afterItemId] = {
        ...updatedAfterItem,
        childIds: [newId, ...updatedAfterItem.childIds],
        updatedAt: now,
      };

      onUpdateDocument({
        ...document,
        items: newItems,
        updatedAt: now,
      });
      setFocusedCursor('start');
      setFocusedItemId(newId);
      return;
    }

    if (afterItem.parentId) {
      const parent = document.items[afterItem.parentId];
      const idx = parent.childIds.indexOf(afterItemId);
      const newChildIds = [...parent.childIds];
      newChildIds.splice(idx + 1, 0, newId);
      newItems[afterItem.parentId] = {
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
      const idx = document.rootItemIds.indexOf(afterItemId);
      const newRootIds = [...document.rootItemIds];
      newRootIds.splice(idx + 1, 0, newId);

      onUpdateDocument({
        ...document,
        rootItemIds: newRootIds,
        items: newItems,
        updatedAt: now,
      });
    }

    setFocusedCursor('start');
    setFocusedItemId(newId);
  };

  // Helper to add a subtask under an item
  const handleAddSubtask = (parentId: string) => {
    const parent = document.items[parentId];
    if (!parent) return;

    const newId = generateId();
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
        collapsed: false, // auto-expand parent when adding child
        childIds: [...parent.childIds, newId],
        updatedAt: now,
      },
    };

    onUpdateDocument({
      ...document,
      items: newItems,
      updatedAt: now,
    });

    setFocusedCursor('start');
    setFocusedItemId(newId);
  };

  // Helper to delete an item and all its descendants
  const handleDeleteItem = (itemId: string) => {
    const item = document.items[itemId];
    if (!item) return;

    // Get previous visible item to focus next
    const visible = getVisibleItemsLinear();
    const idx = visible.indexOf(itemId);
    const nextFocusId = idx > 0 ? visible[idx - 1] : (idx < visible.length - 1 ? visible[idx + 1] : null);

    const descendantIds = getAllDescendantIds(document.items, itemId);
    const toDeleteIds = new Set([itemId, ...descendantIds]);

    const newItems = { ...document.items };
    toDeleteIds.forEach(id => delete newItems[id]);

    const now = new Date().toISOString();

    if (item.parentId && newItems[item.parentId]) {
      newItems[item.parentId] = {
        ...newItems[item.parentId],
        childIds: newItems[item.parentId].childIds.filter(id => id !== itemId),
        updatedAt: now,
      };
    }

    const newRootItemIds = document.rootItemIds.filter(id => !toDeleteIds.has(id));

    onUpdateDocument({
      ...document,
      rootItemIds: newRootItemIds,
      items: newItems,
      updatedAt: now,
    });

    if (nextFocusId) {
      setFocusedCursor('end');
      setFocusedItemId(nextFocusId);
    } else {
      setFocusedCursor(undefined);
      setFocusedItemId(null);
    }
  };

  // Indent an item (make it child of previous sibling)
  const handleIndentItem = (itemId: string, cursor?: number | 'start' | 'end') => {
    const item = document.items[itemId];
    if (!item) return;

    const parentId = item.parentId;
    const siblings = parentId ? document.items[parentId]?.childIds || [] : document.rootItemIds;
    const idx = siblings.indexOf(itemId);
    if (idx <= 0) return; // cannot indent first item

    const newParentId = siblings[idx - 1];
    const newParent = document.items[newParentId];
    if (!newParent) return;

    const now = new Date().toISOString();
    const newItems = { ...document.items };

    // Remove from old parent / roots
    if (parentId) {
      newItems[parentId] = {
        ...newItems[parentId],
        childIds: newItems[parentId].childIds.filter(id => id !== itemId),
        updatedAt: now,
      };
    }

    // Add to new parent
    newItems[newParentId] = {
      ...newParent,
      collapsed: false,
      childIds: [...newParent.childIds, itemId],
      updatedAt: now,
    };

    // Update item
    newItems[itemId] = {
      ...item,
      parentId: newParentId,
      updatedAt: now,
    };

    const newRootItemIds = parentId ? document.rootItemIds : document.rootItemIds.filter(id => id !== itemId);

    onUpdateDocument({
      ...document,
      rootItemIds: newRootItemIds,
      items: newItems,
      updatedAt: now,
    });

    setFocusedCursor(cursor ?? 'end');
    setFocusedItemId(itemId);
  };

  // Unindent an item (move it up to be sibling of current parent)
  const handleUnindentItem = (itemId: string, cursor?: number | 'start' | 'end') => {
    const item = document.items[itemId];
    if (!item || !item.parentId) return;

    const parent = document.items[item.parentId];
    if (!parent) return;

    const grandParentId = parent.parentId;
    const now = new Date().toISOString();
    const newItems = { ...document.items };

    // Remove from current parent
    newItems[parent.id] = {
      ...parent,
      childIds: parent.childIds.filter(id => id !== itemId),
      updatedAt: now,
    };

    // Update item parent
    newItems[itemId] = {
      ...item,
      parentId: grandParentId,
      updatedAt: now,
    };

    if (grandParentId && newItems[grandParentId]) {
      // Insert right after parent
      const gp = newItems[grandParentId];
      const pIdx = gp.childIds.indexOf(parent.id);
      const newChildIds = [...gp.childIds];
      newChildIds.splice(pIdx + 1, 0, itemId);

      newItems[grandParentId] = {
        ...gp,
        childIds: newChildIds,
        updatedAt: now,
      };

      onUpdateDocument({
        ...document,
        items: newItems,
        updatedAt: now,
      });
    } else {
      // Move to root
      const pIdx = document.rootItemIds.indexOf(parent.id);
      const newRootIds = [...document.rootItemIds];
      newRootIds.splice(pIdx + 1, 0, itemId);

      onUpdateDocument({
        ...document,
        rootItemIds: newRootIds,
        items: newItems,
        updatedAt: now,
      });
    }

    setFocusedCursor(cursor ?? 'end');
    setFocusedItemId(itemId);
  };

  // Duplicate an item
  const handleDuplicateItem = (itemId: string) => {
    const original = document.items[itemId];
    if (!original) return;

    const now = new Date().toISOString();
    const idMap: Record<string, string> = {};
    const descendantIds = getAllDescendantIds(document.items, itemId);
    const allIds = [itemId, ...descendantIds];

    allIds.forEach(id => {
      idMap[id] = 'item-' + Math.random().toString(36).substring(2, 9);
    });

    const newItems = { ...document.items };

    allIds.forEach(id => {
      const orig = document.items[id];
      const newId = idMap[id];
      newItems[newId] = {
        ...orig,
        id: newId,
        content: id === itemId ? `${orig.content} (Copy)` : orig.content,
        parentId: id === itemId ? orig.parentId : idMap[orig.parentId!] || null,
        childIds: orig.childIds.map(c => idMap[c]).filter(Boolean),
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

  // Linear list of visible item IDs for smooth arrow navigation
  const getVisibleItemsLinear = (): string[] => {
    const list: string[] = [];

    const traverse = (id: string) => {
      const it = document.items[id];
      if (!it) return;

      if (filterQuery) {
        const q = filterQuery.toLowerCase();
        const matches = it.content.toLowerCase().includes(q);
        const descIds = getAllDescendantIds(document.items, id);
        const hasMatchingDesc = descIds.some(did => document.items[did]?.content.toLowerCase().includes(q));
        if (!matches && !hasMatchingDesc) return;
      }

      list.push(id);
      if (!it.collapsed && it.childIds) {
        it.childIds.forEach(traverse);
      }
    };

    if (zoomItemId && document.items[zoomItemId]) {
      list.push(zoomItemId);
      const parentItem = document.items[zoomItemId];
      parentItem.childIds.forEach(traverse);
    } else {
      document.rootItemIds.forEach(traverse);
    }

    return list;
  };

  const getVisibleRange = (idA: string, idB: string): string[] => {
    const visible = getVisibleItemsLinear();
    const idxA = visible.indexOf(idA);
    const idxB = visible.indexOf(idB);
    if (idxA === -1 || idxB === -1) return [idB];
    const start = Math.min(idxA, idxB);
    const end = Math.max(idxA, idxB);
    return visible.slice(start, end + 1);
  };

  const handleRowMouseDown = (itemId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.shiftKey) {
      e.preventDefault();
      const anchor = selectionAnchorId || focusedItemId || itemId;
      const range = getVisibleRange(anchor, itemId);
      setSelectedItemIds(range);
      if (!selectionAnchorId) setSelectionAnchorId(anchor);
      return;
    }

    isMouseSelectingRef.current = true;
    setSelectionAnchorId(itemId);
    if (selectedItemIds.length > 0 && !selectedItemIds.includes(itemId)) {
      setSelectedItemIds([]);
    }
  };

  const handleRowMouseEnter = (itemId: string, e: React.MouseEvent) => {
    if (isMouseSelectingRef.current && e.buttons === 1) {
      const anchor = selectionAnchorId || itemId;
      if (anchor !== itemId) {
        const range = getVisibleRange(anchor, itemId);
        setSelectedItemIds(range);
        window.getSelection()?.removeAllRanges();
      }
    }
  };

  const handleExpandSelection = (currentId: string, direction: 'up' | 'down') => {
    const visible = getVisibleItemsLinear();
    const anchor = selectionAnchorId || currentId;
    if (!selectionAnchorId) setSelectionAnchorId(anchor);

    const anchorIdx = visible.indexOf(anchor);
    if (anchorIdx === -1) return;

    if (direction === 'down') {
      const currentEndId = selectedItemIds.length > 0 ? selectedItemIds[selectedItemIds.length - 1] : currentId;
      const nextIdx = visible.indexOf(currentEndId) + 1;
      if (nextIdx < visible.length) {
        const nextId = visible[nextIdx];
        const range = getVisibleRange(anchor, nextId);
        setSelectedItemIds(range);
      }
    } else {
      const currentStartId = selectedItemIds.length > 0 ? selectedItemIds[0] : currentId;
      const prevIdx = visible.indexOf(currentStartId) - 1;
      if (prevIdx >= 0) {
        const prevId = visible[prevIdx];
        const range = getVisibleRange(anchor, prevId);
        setSelectedItemIds(range);
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedItemIds([]);
    setSelectionAnchorId(null);
  };

  // Bulk Delete
  const handleBulkDelete = (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    const visible = getVisibleItemsLinear();
    const firstIdx = visible.indexOf(idsToDelete[0]);
    const lastIdx = visible.indexOf(idsToDelete[idsToDelete.length - 1]);
    const nextFocusId = firstIdx > 0 ? visible[firstIdx - 1] : (lastIdx < visible.length - 1 ? visible[lastIdx + 1] : null);

    const allIdsToDelete = new Set<string>();
    idsToDelete.forEach((id) => {
      allIdsToDelete.add(id);
      getAllDescendantIds(document.items, id).forEach((did) => allIdsToDelete.add(did));
    });

    const newItems = { ...document.items };
    allIdsToDelete.forEach((id) => delete newItems[id]);
    const now = new Date().toISOString();

    Object.keys(newItems).forEach((parentId) => {
      const parent = newItems[parentId];
      if (parent.childIds.some((cid) => allIdsToDelete.has(cid))) {
        newItems[parentId] = {
          ...parent,
          childIds: parent.childIds.filter((cid) => !allIdsToDelete.has(cid)),
          updatedAt: now,
        };
      }
    });

    const newRootIds = document.rootItemIds.filter((id) => !allIdsToDelete.has(id));

    onUpdateDocument({
      ...document,
      rootItemIds: newRootIds,
      items: newItems,
      updatedAt: now,
    });

    setSelectedItemIds([]);
    setSelectionAnchorId(null);
    if (nextFocusId && !allIdsToDelete.has(nextFocusId)) {
      setFocusedCursor('end');
      setFocusedItemId(nextFocusId);
    } else {
      setFocusedCursor(undefined);
      setFocusedItemId(null);
    }
  };

  // Bulk Toggle Complete
  const handleBulkToggleComplete = (ids: string[]) => {
    if (ids.length === 0) return;
    const anyIncomplete = ids.some((id) => !document.items[id]?.completed);
    const nextCompleted = anyIncomplete;
    const now = new Date().toISOString();
    const newItems = { ...document.items };

    ids.forEach((id) => {
      if (newItems[id]) {
        newItems[id] = {
          ...newItems[id],
          completed: nextCompleted,
          updatedAt: now,
        };
      }
    });

    if (nextCompleted) {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
      });
    }

    onUpdateDocument({
      ...document,
      items: newItems,
      updatedAt: now,
    });
  };

  // Bulk Indent
  const handleBulkIndent = (ids: string[]) => {
    if (ids.length === 0) return;
    let currentDoc = { ...document, items: { ...document.items }, rootItemIds: [...document.rootItemIds] };
    const now = new Date().toISOString();
    const visible = getVisibleItemsLinear();
    const sortedIds = [...ids].sort((a, b) => visible.indexOf(a) - visible.indexOf(b));

    let anyChanged = false;
    for (const itemId of sortedIds) {
      const item = currentDoc.items[itemId];
      if (!item) continue;
      const parentId = item.parentId;
      const siblings = parentId ? currentDoc.items[parentId]?.childIds || [] : currentDoc.rootItemIds;
      const idx = siblings.indexOf(itemId);
      if (idx <= 0) continue;

      const newParentId = siblings[idx - 1];
      const newParent = currentDoc.items[newParentId];
      if (!newParent) continue;

      if (parentId) {
        currentDoc.items[parentId] = {
          ...currentDoc.items[parentId],
          childIds: currentDoc.items[parentId].childIds.filter((id) => id !== itemId),
          updatedAt: now,
        };
      } else {
        currentDoc.rootItemIds = currentDoc.rootItemIds.filter((id) => id !== itemId);
      }

      currentDoc.items[newParentId] = {
        ...newParent,
        collapsed: false,
        childIds: [...currentDoc.items[newParentId].childIds, itemId],
        updatedAt: now,
      };

      currentDoc.items[itemId] = {
        ...item,
        parentId: newParentId,
        updatedAt: now,
      };
      anyChanged = true;
    }

    if (anyChanged) {
      onUpdateDocument({
        ...currentDoc,
        updatedAt: now,
      });
    }
  };

  // Bulk Unindent
  const handleBulkUnindent = (ids: string[]) => {
    if (ids.length === 0) return;
    let currentDoc = { ...document, items: { ...document.items }, rootItemIds: [...document.rootItemIds] };
    const now = new Date().toISOString();
    const visible = getVisibleItemsLinear();
    const sortedIds = [...ids].sort((a, b) => visible.indexOf(b) - visible.indexOf(a));

    let anyChanged = false;
    for (const itemId of sortedIds) {
      const item = currentDoc.items[itemId];
      if (!item || !item.parentId) continue;

      const parent = currentDoc.items[item.parentId];
      if (!parent) continue;

      const grandParentId = parent.parentId;

      currentDoc.items[parent.id] = {
        ...parent,
        childIds: parent.childIds.filter((id) => id !== itemId),
        updatedAt: now,
      };

      currentDoc.items[itemId] = {
        ...item,
        parentId: grandParentId,
        updatedAt: now,
      };

      if (grandParentId && currentDoc.items[grandParentId]) {
        const gp = currentDoc.items[grandParentId];
        const pIdx = gp.childIds.indexOf(parent.id);
        const newChildIds = [...gp.childIds];
        newChildIds.splice(pIdx + 1, 0, itemId);
        currentDoc.items[grandParentId] = {
          ...gp,
          childIds: newChildIds,
          updatedAt: now,
        };
      } else {
        const pIdx = currentDoc.rootItemIds.indexOf(parent.id);
        const newRootIds = [...currentDoc.rootItemIds];
        newRootIds.splice(pIdx + 1, 0, itemId);
        currentDoc.rootItemIds = newRootIds;
      }
      anyChanged = true;
    }

    if (anyChanged) {
      onUpdateDocument({
        ...currentDoc,
        updatedAt: now,
      });
    }
  };

  // Window keydown listener when multiple tasks are selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedItemIds.length <= 1) return;

      if (e.key === 'Delete') {
        e.preventDefault();
        handleBulkDelete(selectedItemIds);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleBulkToggleComplete(selectedItemIds);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          handleBulkUnindent(selectedItemIds);
        } else {
          handleBulkIndent(selectedItemIds);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleCopySelectedTasks();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        onUndo?.();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))
      ) {
        e.preventDefault();
        onRedo?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedItemIds([]);
        setSelectionAnchorId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemIds, document, onUndo, onRedo]);

  // Copy selected tasks as indented plain text (2 spaces per level)
  const handleCopySelectedTasks = useCallback(() => {
    if (selectedItemIds.length === 0) return;

    const visible = getVisibleItemsLinear();
    const sortedIds = [...selectedItemIds].sort(
      (a, b) => visible.indexOf(a) - visible.indexOf(b)
    );

    const getItemDepth = (id: string): number => {
      let d = 0;
      let curr = document.items[id];
      while (curr && curr.parentId && curr.parentId !== zoomItemId) {
        d++;
        curr = document.items[curr.parentId];
      }
      return d;
    };

    const depths = sortedIds.map(getItemDepth);
    const minDepth = Math.min(...depths);

    const formattedText = sortedIds
      .map((id, idx) => {
        const item = document.items[id];
        if (!item) return '';
        const relativeLevel = Math.max(0, depths[idx] - minDepth);
        const indent = '  '.repeat(relativeLevel);
        return `${indent}${item.content}`;
      })
      .join('\n');

    navigator.clipboard.writeText(formattedText).catch((err) => {
      console.error('Failed to copy tasks to clipboard:', err);
    });

    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
  }, [selectedItemIds, document, zoomItemId]);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (selectedItemIds.length > 0) {
        const activeEl = window.document.activeElement;
        const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
        if (isInput) {
          const input = activeEl as HTMLInputElement | HTMLTextAreaElement;
          if (input.selectionStart !== input.selectionEnd) {
            return;
          }
        }
        e.preventDefault();
        handleCopySelectedTasks();
      }
    };

    window.addEventListener('copy', handleCopy);
    return () => window.removeEventListener('copy', handleCopy);
  }, [selectedItemIds, handleCopySelectedTasks]);

  // Handle multi-line pasted text and parse its hierarchy
  const handlePasteHierarchy = (targetItemId: string, pastedText: string) => {
    const rawLines = pastedText.split(/\r?\n/);
    const nonEmpty = rawLines.filter((l) => l.trim().length > 0);
    if (nonEmpty.length === 0) return;

    // Measure indent for each line
    const linesWithIndent = nonEmpty.map((line) => {
      const match = line.match(/^([ \t]+)/);
      let indentCount = 0;
      let content = line;
      if (match) {
        const leading = match[1];
        indentCount = leading.replace(/\t/g, '    ').length;
        content = line.slice(match[0].length);
      }
      // Clean bullet markers: "- ", "* ", "+ ", "1. ", "[ ] ", "[x] "
      content = content.replace(/^([-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/, '').trim();
      return { indent: indentCount, content };
    });

    // Base indent is min indent
    const minIndent = Math.min(...linesWithIndent.map((l) => l.indent));
    const relativeIndents = linesWithIndent.map((l) => Math.max(0, l.indent - minIndent));

    // Determine indentation step
    const positiveDeltas = relativeIndents.filter((d) => d > 0);
    let step = 4;
    if (positiveDeltas.length > 0) {
      const minDelta = Math.min(...positiveDeltas);
      step = minDelta > 0 ? minDelta : 4;
    }

    let lastDepth = 0;
    const parsedItems = linesWithIndent.map((item, idx) => {
      let depth = Math.round((item.indent - minIndent) / step);
      if (idx === 0) {
        depth = 0;
      } else {
        depth = Math.min(depth, lastDepth + 1);
      }
      lastDepth = depth;
      return {
        content: item.content,
        depth,
      };
    });

    const targetItem = document.items[targetItemId];
    if (!targetItem) return;

    const now = new Date().toISOString();
    const newItems = { ...document.items };
    const baseParentId = targetItem.parentId;
    const reuseTarget = targetItem.content.trim() === '';

    const lastIdAtDepth: Record<number, string> = {};
    const depth0Ids: string[] = [];

    // Process first item
    if (reuseTarget) {
      newItems[targetItemId] = {
        ...targetItem,
        content: parsedItems[0].content,
        updatedAt: now,
      };
      lastIdAtDepth[0] = targetItemId;
      depth0Ids.push(targetItemId);
    } else {
      const firstId = generateId();
      const firstItem: TaskItem = {
        id: firstId,
        content: parsedItems[0].content,
        note: '',
        completed: false,
        collapsed: false,
        parentId: baseParentId,
        childIds: [],
        createdAt: now,
        updatedAt: now,
      };
      newItems[firstId] = firstItem;
      lastIdAtDepth[0] = firstId;
      depth0Ids.push(firstId);
    }

    // Process remaining items
    let lastCreatedId = lastIdAtDepth[0];
    for (let i = 1; i < parsedItems.length; i++) {
      const p = parsedItems[i];
      const newId = generateId();
      lastCreatedId = newId;

      let parentId: string | null = null;
      if (p.depth === 0) {
        parentId = baseParentId;
        depth0Ids.push(newId);
      } else {
        parentId = lastIdAtDepth[p.depth - 1] || lastIdAtDepth[0];
      }

      const newItem: TaskItem = {
        id: newId,
        content: p.content,
        note: '',
        completed: false,
        collapsed: false,
        parentId,
        childIds: [],
        createdAt: now,
        updatedAt: now,
      };
      newItems[newId] = newItem;
      lastIdAtDepth[p.depth] = newId;

      // Add to parent's children if depth > 0
      if (p.depth > 0 && parentId && newItems[parentId]) {
        newItems[parentId] = {
          ...newItems[parentId],
          collapsed: false,
          childIds: [...newItems[parentId].childIds, newId],
          updatedAt: now,
        };
      }
    }

    // Insert depth 0 items into baseParent's childIds or document.rootItemIds
    const itemsToInsert = reuseTarget ? depth0Ids.slice(1) : depth0Ids;
    let newRootItemIds = [...document.rootItemIds];

    if (itemsToInsert.length > 0) {
      if (baseParentId && newItems[baseParentId]) {
        const parent = newItems[baseParentId];
        const targetIdx = parent.childIds.indexOf(targetItemId);
        const newChildIds = [...parent.childIds];
        newChildIds.splice(targetIdx + 1, 0, ...itemsToInsert);
        newItems[baseParentId] = {
          ...parent,
          childIds: newChildIds,
          updatedAt: now,
        };
      } else {
        const targetIdx = newRootItemIds.indexOf(targetItemId);
        newRootItemIds.splice(targetIdx + 1, 0, ...itemsToInsert);
      }
    }

    onUpdateDocument({
      ...document,
      rootItemIds: newRootItemIds,
      items: newItems,
      updatedAt: now,
    }, true);

    setFocusedCursor('end');
    setFocusedItemId(lastCreatedId);
  };

  const handleNavigateUp = (currentId: string, cursorCol?: number | 'start' | 'end') => {
    const visible = getVisibleItemsLinear();
    const idx = visible.indexOf(currentId);
    if (idx > 0) {
      const prevId = visible[idx - 1];
      setFocusedCursor(cursorCol !== undefined ? cursorCol : 'end');
      setFocusedItemId(prevId);
    }
  };

  const handleNavigateDown = (currentId: string, cursorCol?: number | 'start' | 'end') => {
    const visible = getVisibleItemsLinear();
    const idx = visible.indexOf(currentId);
    if (idx >= 0 && idx < visible.length - 1) {
      const nextId = visible[idx + 1];
      setFocusedCursor(cursorCol !== undefined ? cursorCol : 'end');
      setFocusedItemId(nextId);
    }
  };

  // Add item at end of root list
  const handleAddRootItem = () => {
    const newId = generateId();
    const now = new Date().toISOString();
    const newItem: TaskItem = {
      id: newId,
      content: '',
      note: '',
      completed: false,
      collapsed: false,
      parentId: zoomItemId || null,
      childIds: [],
      createdAt: now,
      updatedAt: now,
    };

    if (zoomItemId && document.items[zoomItemId]) {
      handleAddSubtask(zoomItemId);
    } else {
      onUpdateDocument({
        ...document,
        rootItemIds: [...document.rootItemIds, newId],
        items: {
          ...document.items,
          [newId]: newItem,
        },
        updatedAt: now,
      });
      setFocusedCursor('start');
      setFocusedItemId(newId);
    }
  };

  const zoomedItem = zoomItemId && document.items[zoomItemId] ? document.items[zoomItemId] : null;

  useEffect(() => {
    if (zoomedItem && focusedItemId === zoomedItem.id && zoomHeaderRef.current) {
      if (typeof window !== 'undefined' && window.document.activeElement !== zoomHeaderRef.current) {
        zoomHeaderRef.current.focus();
      }
      if (focusedCursor !== undefined) {
        const len = zoomedItem.content.length;
        if (focusedCursor === 'start') {
          zoomHeaderRef.current.setSelectionRange(0, 0);
        } else if (focusedCursor === 'end') {
          zoomHeaderRef.current.setSelectionRange(len, len);
        } else if (typeof focusedCursor === 'number') {
          const pos = Math.min(Math.max(0, focusedCursor), len);
          zoomHeaderRef.current.setSelectionRange(pos, pos);
        }
      }
    }
  }, [focusedItemId, focusedCursor, zoomedItem]);

  let itemsToRender = zoomedItem
    ? zoomedItem.childIds
    : document.rootItemIds;

  if (hideCompleted) {
    itemsToRender = itemsToRender.filter((id) => !document.items[id]?.completed);
  }

  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    itemsToRender = itemsToRender.filter((id) => {
      const item = document.items[id];
      if (!item) return false;
      if (item.content.toLowerCase().includes(q)) return true;
      const descIds = getAllDescendantIds(document.items, id);
      return descIds.some((did) => document.items[did]?.content.toLowerCase().includes(q));
    });
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="max-w-4xl min-w-[500px] mx-auto px-4 py-8">
      {/* Focused Item Banner Header (focus header) */}
      {zoomedItem && (
        <div className="mb-6 pb-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <button
              onClick={() => handleUpdateItem(zoomedItem.id, { completed: !zoomedItem.completed })}
              className={`w-5 h-5 flex items-center justify-center rounded border mt-1.5 flex-shrink-0 transition-all ${
                zoomedItem.completed
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-gray-300 dark:border-zinc-600 hover:border-blue-500 bg-white dark:bg-zinc-900'
              }`}
              title={zoomedItem.completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {zoomedItem.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            <div className="flex-1 min-w-0">
              <input
                ref={zoomHeaderRef}
                type="text"
                value={zoomedItem.content}
                onChange={(e) => handleUpdateItem(zoomedItem.id, { content: e.target.value })}
                onFocus={() => {
                  setFocusedItemId(zoomedItem.id);
                  setFocusedCursor(undefined);
                }}
                onBlur={() => handleBlurItem(zoomedItem.id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const cursor = zoomHeaderRef.current?.selectionStart ?? 'end';
                    handleNavigateDown(zoomedItem.id, cursor);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask(zoomedItem.id);
                  }
                }}
                className={`w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white ${
                  zoomedItem.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
                }`}
                placeholder="Untitled Task"
              />

              {/* Note */}
              <textarea
                value={zoomedItem.note || ''}
                onChange={(e) => handleUpdateItem(zoomedItem.id, { note: e.target.value })}
                placeholder="Add notes for this task..."
                rows={zoomedItem.note ? Math.min(zoomedItem.note.split('\n').length + 1, 4) : 1}
                className="w-full mt-1 text-xs text-gray-500 dark:text-gray-400 bg-transparent border-none outline-none resize-y placeholder-gray-400/60"
              />
            </div>
          </div>
        </div>
      )}

      {/* List items */}
      <div className="space-y-1">
        {itemsToRender.map((rootId) => (
          <OutlinerItem
            key={rootId}
            itemId={rootId}
            document={document}
            depth={0}
            focusedItemId={focusedItemId}
            focusedCursor={focusedCursor}
            onFocusItem={handleFocusItem}
            onBlurItem={handleBlurItem}
            onUpdateItem={handleUpdateItem}
            onAddItemBelow={handleAddItemBelow}
            onAddSubtask={handleAddSubtask}
            onDeleteItem={handleDeleteItem}
            onIndentItem={handleIndentItem}
            onUnindentItem={handleUnindentItem}
            onDuplicateItem={handleDuplicateItem}
            onZoomIn={onZoomIn}
            onNavigateUp={handleNavigateUp}
            onNavigateDown={handleNavigateDown}
            onFilterTag={onFilterTag}
            dragInfo={dragInfo}
            onDragStartItem={handleDragStart}
            onDragEndItem={handleDragEnd}
            onDragOverItem={handleDragOver}
            onDropItem={handleDropItem}
            isSelected={selectedItemIds.includes(rootId)}
            isMultiSelecting={selectedItemIds.length > 1}
            selectedItemIds={selectedItemIds}
            onRowMouseDown={handleRowMouseDown}
            onRowMouseEnter={handleRowMouseEnter}
            onExpandSelection={handleExpandSelection}
            onClearSelection={handleClearSelection}
            onBulkDelete={() => handleBulkDelete(selectedItemIds)}
            onBulkToggleComplete={() => handleBulkToggleComplete(selectedItemIds)}
            onBulkIndent={() => handleBulkIndent(selectedItemIds)}
            onBulkUnindent={() => handleBulkUnindent(selectedItemIds)}
            onPasteHierarchy={handlePasteHierarchy}
            hideCompleted={hideCompleted}
            onOpenDetailsModal={(id) => setEditingModalItemId(id)}
          />
        ))}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedItemIds.length > 1 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 bg-gray-900/90 dark:bg-zinc-800/95 text-white backdrop-blur-md rounded-full shadow-2xl border border-gray-700/50 text-xs select-none animate-in fade-in slide-in-from-bottom-3 duration-150">
          <span className="font-semibold text-blue-400 mr-1">
            {selectedItemIds.length} tasks selected
          </span>
          <div className="h-4 w-px bg-gray-700 mx-0.5" />
          <button
            onClick={() => handleBulkToggleComplete(selectedItemIds)}
            className="flex items-center gap-1 px-2.5 py-1 hover:bg-gray-800 dark:hover:bg-zinc-700 rounded-md transition-colors"
            title="Toggle complete (Ctrl+Enter)"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Complete</span>
          </button>
          <button
            onClick={() => handleBulkIndent(selectedItemIds)}
            className="flex items-center gap-1 px-2.5 py-1 hover:bg-gray-800 dark:hover:bg-zinc-700 rounded-md transition-colors"
            title="Indent tasks (Tab)"
          >
            <CornerDownRight className="w-3.5 h-3.5 text-blue-400" />
            <span>Indent</span>
          </button>
          <button
            onClick={() => handleBulkUnindent(selectedItemIds)}
            className="flex items-center gap-1 px-2.5 py-1 hover:bg-gray-800 dark:hover:bg-zinc-700 rounded-md transition-colors"
            title="Unindent tasks (Shift+Tab)"
          >
            <CornerUpLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Unindent</span>
          </button>
          <button
            onClick={handleCopySelectedTasks}
            className="flex items-center gap-1 px-2.5 py-1 hover:bg-gray-800 dark:hover:bg-zinc-700 rounded-md transition-colors text-sky-400"
            title="Copy tasks with 2 spaces per indent (Ctrl+C)"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copyFeedback ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={() => handleBulkDelete(selectedItemIds)}
            className="flex items-center gap-1 px-2.5 py-1 hover:bg-red-500/20 text-red-300 rounded-md transition-colors"
            title="Delete tasks (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete</span>
          </button>
          <button
            onClick={handleClearSelection}
            className="p-1 hover:bg-gray-800 dark:hover:bg-zinc-700 text-gray-400 hover:text-white rounded-full transition-colors ml-1"
            title="Clear selection (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty state or Add Task button */}
      {itemsToRender.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-3">
            {zoomedItem ? 'No subtasks under this task yet.' : 'No tasks in this document yet.'}
          </p>
          <button
            onClick={handleAddRootItem}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{zoomedItem ? 'Add First Subtask' : 'Add First Task'}</span>
          </button>
        </div>
      )}

      {/* Bottom quick add button */}
      {itemsToRender.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <button
            onClick={handleAddRootItem}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add new {zoomedItem ? 'subtask' : 'task'} (or press Enter)</span>
          </button>
        </div>
      )}

      {/* Unified Task & Timeline Details Modal */}
      {editingModalItemId && document.items[editingModalItemId] && (
        <TaskDetailModal
          item={document.items[editingModalItemId]}
          onSave={(updates) => {
            handleUpdateItem(editingModalItemId, updates);
            setEditingModalItemId(null);
          }}
          onDelete={(id) => {
            handleDeleteItem(id);
            setEditingModalItemId(null);
          }}
          onClose={() => setEditingModalItemId(null)}
        />
      )}
      </div>
    </div>
  );
};
