import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  ZoomIn,
  Check,
  Menu,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TaskItem, TaskDocument } from '../../types.js';
import { MarkdownText } from '../common/MarkdownText.js';
import { ItemMenu } from './ItemMenu.js';
import { DatePickerPopover } from './DatePickerPopover.js';

interface OutlinerItemProps {
  itemId: string;
  document: TaskDocument;
  depth: number;
  focusedItemId: string | null;
  focusedCursor?: number | 'start' | 'end';
  onFocusItem: (id: string | null, cursor?: number | 'start' | 'end') => void;
  onBlurItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<TaskItem>) => void;
  onAddItemBelow: (afterItemId: string, textBelow?: string, textRemaining?: string) => void;
  onAddSubtask: (parentId: string) => void;
  onDeleteItem: (id: string) => void;
  onIndentItem: (id: string, cursor?: number | 'start' | 'end') => void;
  onUnindentItem: (id: string, cursor?: number | 'start' | 'end') => void;
  onDuplicateItem: (id: string) => void;
  onZoomIn: (id: string) => void;
  onNavigateUp: (currentId: string, cursor?: number | 'start' | 'end') => void;
  onNavigateDown: (currentId: string, cursor?: number | 'start' | 'end') => void;
  onFilterTag?: (tag: string) => void;
  dragInfo?: {
    draggedId: string;
    targetId: string | null;
    position: 'before' | 'after' | 'inside' | null;
  } | null;
  onDragStartItem?: (id: string) => void;
  onDragEndItem?: () => void;
  onDragOverItem?: (targetId: string, position: 'before' | 'after' | 'inside') => void;
  onDropItem?: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  isSelected?: boolean;
  isMultiSelecting?: boolean;
  selectedItemIds?: string[];
  onRowMouseDown?: (itemId: string, e: React.MouseEvent) => void;
  onRowMouseEnter?: (itemId: string, e: React.MouseEvent) => void;
  onExpandSelection?: (itemId: string, direction: 'up' | 'down') => void;
  onClearSelection?: () => void;
  onBulkDelete?: () => void;
  onBulkToggleComplete?: () => void;
  onBulkIndent?: () => void;
  onBulkUnindent?: () => void;
  onPasteHierarchy?: (itemId: string, pastedText: string) => void;
  hideCompleted?: boolean;
}

const hasMarkdown = (text: string): boolean => {
  if (!text) return false;
  return /(\*\*.*?\*\*|\*.*?\*|~~.*?~~|`.*?`|\[.*?\]\(.*?\)|#[a-zA-Z0-9_-]+|@[a-zA-Z0-9_-]+)/.test(text);
};

export const OutlinerItem: React.FC<OutlinerItemProps> = ({
  itemId,
  document,
  depth,
  focusedItemId,
  focusedCursor,
  onFocusItem,
  onBlurItem,
  onUpdateItem,
  onAddItemBelow,
  onAddSubtask,
  onDeleteItem,
  onIndentItem,
  onUnindentItem,
  onDuplicateItem,
  onZoomIn,
  onNavigateUp,
  onNavigateDown,
  onFilterTag,
  dragInfo,
  onDragStartItem,
  onDragEndItem,
  onDragOverItem,
  onDropItem,
  isSelected,
  isMultiSelecting,
  selectedItemIds,
  onRowMouseDown,
  onRowMouseEnter,
  onExpandSelection,
  onClearSelection,
  onBulkDelete,
  onBulkToggleComplete,
  onBulkIndent,
  onBulkUnindent,
  onPasteHierarchy,
  hideCompleted,
}) => {
  const item = document.items[itemId];
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, []);

  useLayoutEffect(() => {
    adjustHeight();
  }, [item?.content, adjustHeight]);

  const isFocused = focusedItemId === itemId;
  const hasChildren = item?.childIds && item.childIds.length > 0;
  const isCollapsed = Boolean(item?.collapsed);

  const isBeingDragged = dragInfo?.draggedId === itemId;
  const isDropTarget = dragInfo?.targetId === itemId;
  const dropPosition = isDropTarget ? dragInfo.position : null;

  // Determine if item can indent or unindent
  const parentId = item?.parentId;
  const siblings = parentId ? document.items[parentId]?.childIds || [] : document.rootItemIds;
  const siblingIndex = siblings.indexOf(itemId);
  const canIndent = siblingIndex > 0;
  const canUnindent = Boolean(parentId);

  useEffect(() => {
    if (isFocused && inputRef.current && !isEditingNote) {
      if (typeof window !== 'undefined' && window.document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
      if (focusedCursor !== undefined) {
        const len = item?.content?.length || 0;
        if (focusedCursor === 'start') {
          inputRef.current.setSelectionRange(0, 0);
        } else if (focusedCursor === 'end') {
          inputRef.current.setSelectionRange(len, len);
        } else if (typeof focusedCursor === 'number') {
          const pos = Math.min(Math.max(0, focusedCursor), len);
          inputRef.current.setSelectionRange(pos, pos);
        }
      }
    }
  }, [isFocused, focusedCursor, isEditingNote]);

  // Auto-focus note textarea when editing starts
  useEffect(() => {
    if (isEditingNote && noteRef.current) {
      noteRef.current.focus();
    }
  }, [isEditingNote]);

  // Close note editor if focus moves to another item
  useEffect(() => {
    if (focusedItemId !== itemId && isEditingNote) {
      setIsEditingNote(false);
    }
  }, [focusedItemId, itemId, isEditingNote]);

  if (!item) return null;

  const handleToggleComplete = () => {
    const nextCompleted = !item.completed;
    onUpdateItem(itemId, {
      completed: nextCompleted,
    });

    if (nextCompleted) {
      // Confetti burst on completion!
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 },
      });
    }
  };

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateItem(itemId, { collapsed: !item.collapsed });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (pasteText && pasteText.includes('\n')) {
      e.preventDefault();
      onPasteHierarchy?.(itemId, pasteText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMultiSelecting) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        onBulkDelete?.();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onBulkToggleComplete?.();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) onBulkUnindent?.();
        else onBulkIndent?.();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClearSelection?.();
        return;
      }
      if (!e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        onClearSelection?.();
      }
    }

    if (e.shiftKey && e.key === 'ArrowDown') {
      e.preventDefault();
      onExpandSelection?.(itemId, 'down');
      return;
    }
    if (e.shiftKey && e.key === 'ArrowUp') {
      e.preventDefault();
      onExpandSelection?.(itemId, 'up');
      return;
    }

    if (e.key === 'Enter') {
      if (e.altKey) {
        // Alt+Enter -> Zoom in
        e.preventDefault();
        onZoomIn(itemId);
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Enter -> Toggle complete
        e.preventDefault();
        handleToggleComplete();
        return;
      }
      e.preventDefault();
      const selStart = inputRef.current?.selectionStart ?? item.content.length;
      const selEnd = inputRef.current?.selectionEnd ?? item.content.length;
      const textRemaining = item.content.slice(0, selStart);
      const textBelow = item.content.slice(selEnd);
      onAddItemBelow(itemId, textBelow, textRemaining);
    } else if ((e.ctrlKey || e.metaKey) && e.key === ']') {
      // Ctrl+] -> Zoom in
      e.preventDefault();
      onZoomIn(itemId);
    } else if (e.altKey && e.key === 'ArrowRight') {
      // Alt+Right -> Zoom in
      e.preventDefault();
      onZoomIn(itemId);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const cursor = inputRef.current?.selectionStart ?? 'end';
      if (e.shiftKey) {
        if (canUnindent) onUnindentItem(itemId, cursor);
      } else {
        if (canIndent) onIndentItem(itemId, cursor);
      }
    } else if (e.key === 'Backspace') {
      if (inputRef.current && inputRef.current.selectionStart === 0 && inputRef.current.selectionEnd === 0) {
        if (!item.content) {
          e.preventDefault();
          onDeleteItem(itemId);
        } else if (canUnindent) {
          e.preventDefault();
          const cursor = inputRef.current?.selectionStart ?? 0;
          onUnindentItem(itemId, cursor);
        }
      }
    } else if (e.key === 'ArrowUp') {
      const isSingleLine = !item.content.includes('\n') && (inputRef.current ? inputRef.current.scrollHeight <= 32 : true);
      const isAtStart = (inputRef.current?.selectionStart ?? 0) === 0;
      if (isSingleLine || isAtStart) {
        e.preventDefault();
        const cursor = inputRef.current?.selectionStart ?? 'end';
        onNavigateUp(itemId, cursor);
      }
    } else if (e.key === 'ArrowDown') {
      const isSingleLine = !item.content.includes('\n') && (inputRef.current ? inputRef.current.scrollHeight <= 32 : true);
      const isAtEnd = (inputRef.current?.selectionEnd ?? 0) === item.content.length;
      if (isSingleLine || isAtEnd) {
        e.preventDefault();
        const cursor = inputRef.current?.selectionStart ?? 'end';
        onNavigateDown(itemId, cursor);
      }
    } else if (e.key === 'ArrowLeft') {
      if (inputRef.current && inputRef.current.selectionStart === 0 && inputRef.current.selectionEnd === 0) {
        e.preventDefault();
        onNavigateUp(itemId, 'end');
      }
    } else if (e.key === 'ArrowRight') {
      if (inputRef.current && inputRef.current.selectionStart === item.content.length && inputRef.current.selectionEnd === item.content.length) {
        e.preventDefault();
        onNavigateDown(itemId, 'start');
      }
    }
  };

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.bottom + 4 });
  };

  return (
    <div className="relative text-sm select-text">
      {/* Drop indicator line: BEFORE */}
      {dropPosition === 'before' && (
        <div className="absolute -top-1 left-2 right-2 h-0.5 bg-blue-500 rounded-full z-20 pointer-events-none flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 -ml-1" />
        </div>
      )}

      {/* Node content row */}
      <div
        onMouseDown={(e) => {
          onRowMouseDown?.(itemId, e);
        }}
        onMouseEnter={(e) => {
          onRowMouseEnter?.(itemId, e);
        }}
        onDragOver={(e) => {
          if (!dragInfo || dragInfo.draggedId === itemId) return;
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const relY = e.clientY - rect.top;
          const height = rect.height;

          let pos: 'before' | 'after' | 'inside';
          if (relY < height * 0.28) {
            pos = 'before';
          } else if (relY > height * 0.72) {
            pos = 'after';
          } else {
            pos = 'inside';
          }
          onDragOverItem?.(itemId, pos);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragInfo && dragInfo.draggedId !== itemId && dropPosition) {
            onDropItem?.(dragInfo.draggedId, itemId, dropPosition);
          }
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName !== 'BUTTON' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
            inputRef.current?.focus();
            onFocusItem(itemId);
          }
        }}
        className={`group/row flex items-start gap-1 py-1 px-1.5 rounded-lg transition-colors relative ${
          isBeingDragged ? 'opacity-40' : ''
        } ${
          dropPosition === 'inside'
            ? 'bg-blue-100/70 dark:bg-blue-950/50 ring-2 ring-blue-500/70'
            : isSelected
            ? 'bg-blue-100/90 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 ring-1 ring-blue-400/70 dark:ring-blue-500/60 shadow-xs'
            : isFocused
            ? 'bg-blue-50/40 dark:bg-blue-950/20'
            : 'hover:bg-gray-100/60 dark:hover:bg-zinc-800/40'
        }`}
      >
        {/* Expand / Collapse toggle */}
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
          {hasChildren ? (
            <button
              onClick={handleToggleCollapse}
              className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded transition-transform"
              title={isCollapsed ? 'Expand children' : 'Collapse children'}
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

        {/* Bullet point (drag to reorder/nest, right-click for menu) */}
        <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0 mt-0.5">
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/plain', itemId);
              e.dataTransfer.effectAllowed = 'move';
              onDragStartItem?.(itemId);
            }}
            onDragEnd={() => {
              onDragEndItem?.();
            }}
            className={`w-2.5 h-2.5 rounded-full transition-all cursor-grab active:cursor-grabbing ${
              item.completed
                ? 'bg-gray-400 dark:bg-zinc-600 scale-90'
                : hasChildren && isCollapsed
                ? 'ring-2 ring-blue-500 bg-blue-500 scale-110'
                : 'bg-gray-700 dark:bg-gray-300 hover:bg-blue-600 dark:hover:bg-blue-400 hover:scale-125'
            }`}
            title="Drag bullet to reorder or nest"
          />
        </div>

        {/* Checkbox toggle */}
        <button
          onClick={handleToggleComplete}
          className={`w-4 h-4 flex items-center justify-center rounded border mt-1 flex-shrink-0 transition-all ${
            item.completed
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-gray-300 dark:border-zinc-600 hover:border-blue-500 bg-white dark:bg-zinc-900'
          }`}
          title={item.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Main Content & Note area */}
        <div className="flex-1 min-w-0 ml-1">
          <div className="relative w-full">
            <textarea
              ref={inputRef}
              rows={1}
              value={item.content}
              onChange={(e) => {
                onUpdateItem(itemId, { content: e.target.value });
                adjustHeight();
              }}
              onFocus={() => {
                if (!isMultiSelecting) {
                  onFocusItem(itemId);
                }
              }}
              onBlur={() => onBlurItem(itemId)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onMouseDown={(e) => {
                onRowMouseDown?.(itemId, e);
              }}
              onMouseEnter={(e) => {
                onRowMouseEnter?.(itemId, e);
              }}
              className={`w-full bg-transparent border-none outline-none py-0.5 resize-none overflow-hidden break-words whitespace-pre-wrap leading-snug ${
                isSelected ? 'text-blue-950 dark:text-blue-100 font-medium' : 'text-gray-900 dark:text-gray-100'
              } ${
                item.completed ? 'task-strikethrough text-gray-400 dark:text-gray-500' : ''
              } ${!isFocused && hasMarkdown(item.content) ? 'opacity-0' : 'opacity-100'}`}
              placeholder="Empty task"
            />
            {!isFocused && hasMarkdown(item.content) && (
              <div className="absolute inset-0 pointer-events-none py-0.5 overflow-hidden break-words whitespace-pre-wrap leading-snug">
                <MarkdownText content={item.content} onTagClick={onFilterTag} />
              </div>
            )}
          </div>

          {/* Note section */}
          {(item.note || isEditingNote) && (
            <div className="mt-1">
              {isEditingNote ? (
                <textarea
                  ref={noteRef}
                  value={item.note || ''}
                  onChange={(e) => onUpdateItem(itemId, { note: e.target.value })}
                  onFocus={() => onFocusItem(itemId)}
                  onBlur={() => setIsEditingNote(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsEditingNote(false);
                      inputRef.current?.focus();
                    }
                  }}
                  placeholder="Add note..."
                  rows={2}
                  className="w-full text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-gray-200 dark:border-zinc-700 outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <p
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingNote(true);
                    onFocusItem(itemId);
                  }}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-text whitespace-pre-wrap py-0.5"
                >
                  {item.note}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Collapsed children pill indicator */}
        {hasChildren && isCollapsed && (
          <button
            onClick={handleToggleCollapse}
            className="px-1.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600 rounded-full border border-gray-200 dark:border-zinc-700 transition-colors mr-1 mt-0.5 flex-shrink-0"
            title={`${item.childIds.length} subtasks collapsed. Click to expand.`}
          >
            +{item.childIds.length}
          </button>
        )}

        {/* Hover Quick Action Buttons - Focus and Hamburger Menu */}
        <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0 mt-0.5 bg-white/90 dark:bg-zinc-900/90 rounded-md shadow-xs border border-gray-100 dark:border-zinc-800 p-0.5">
          {/* Focus button */}
          <button
            type="button"
            onClick={() => onZoomIn(itemId)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded transition-colors"
            title="Focus on task (Ctrl+])"
          >
            <ZoomIn className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px]">Focus</span>
          </button>

          {/* Task Menu (Hamburger) button */}
          <button
            type="button"
            onClick={openMenu}
            className="flex items-center p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
            title="Task menu"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drop indicator line: AFTER */}
      {dropPosition === 'after' && (
        <div className="absolute -bottom-1 left-2 right-2 h-0.5 bg-blue-500 rounded-full z-20 pointer-events-none flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 -ml-1" />
        </div>
      )}

      {/* Children recursive container */}
      {hasChildren && !isCollapsed && (
        <div className="relative ml-6 pl-2 border-l border-gray-200/70 dark:border-zinc-800/70 space-y-0.5 mt-0.5">
          {(hideCompleted
            ? item.childIds.filter((cid) => !document.items[cid]?.completed)
            : item.childIds
          ).map((childId) => (
            <OutlinerItem
              key={childId}
              itemId={childId}
              document={document}
              depth={depth + 1}
              focusedItemId={focusedItemId}
              focusedCursor={focusedCursor}
              onFocusItem={onFocusItem}
              onBlurItem={onBlurItem}
              onUpdateItem={onUpdateItem}
              onAddItemBelow={onAddItemBelow}
              onAddSubtask={onAddSubtask}
              onDeleteItem={onDeleteItem}
              onIndentItem={onIndentItem}
              onUnindentItem={onUnindentItem}
              onDuplicateItem={onDuplicateItem}
              onZoomIn={onZoomIn}
              onNavigateUp={onNavigateUp}
              onNavigateDown={onNavigateDown}
              onFilterTag={onFilterTag}
              dragInfo={dragInfo}
              onDragStartItem={onDragStartItem}
              onDragEndItem={onDragEndItem}
              onDragOverItem={onDragOverItem}
              onDropItem={onDropItem}
              isSelected={selectedItemIds?.includes(childId) ?? false}
              isMultiSelecting={isMultiSelecting}
              selectedItemIds={selectedItemIds}
              onRowMouseDown={onRowMouseDown}
              onRowMouseEnter={onRowMouseEnter}
              onExpandSelection={onExpandSelection}
              onClearSelection={onClearSelection}
              onBulkDelete={onBulkDelete}
              onBulkToggleComplete={onBulkToggleComplete}
              onBulkIndent={onBulkIndent}
              onBulkUnindent={onBulkUnindent}
              onPasteHierarchy={onPasteHierarchy}
              hideCompleted={hideCompleted}
            />
          ))}
        </div>
      )}

      {/* Item Context Menu Dropdown */}
      {menuPosition && (
        <ItemMenu
          item={item}
          position={menuPosition}
          onClose={() => setMenuPosition(null)}
          onZoomIn={() => onZoomIn(itemId)}
          onAddSubtask={() => onAddSubtask(itemId)}
          onAddNote={() => {
            setIsEditingNote(true);
            onFocusItem(itemId);
          }}
          onOpenDatePicker={() => setShowDatePicker(true)}
          onToggleComplete={handleToggleComplete}
          onIndent={() => onIndentItem(itemId)}
          onUnindent={() => onUnindentItem(itemId)}
          onDuplicate={() => onDuplicateItem(itemId)}
          onDelete={() => onDeleteItem(itemId)}
          canIndent={canIndent}
          canUnindent={canUnindent}
        />
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DatePickerPopover
          item={item}
          onSave={(updates) => onUpdateItem(itemId, updates)}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
};
