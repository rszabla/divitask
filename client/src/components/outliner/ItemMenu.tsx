import React, { useEffect, useRef } from 'react';
import {
  ZoomIn,
  Plus,
  FileText,
  Calendar,
  CheckCircle2,
  Trash2,
  Copy,
  CornerDownRight,
  CornerUpLeft,
} from 'lucide-react';
import { TaskItem } from '../../types.js';

interface ItemMenuProps {
  item: TaskItem;
  position: { x: number; y: number };
  onClose: () => void;
  onZoomIn: () => void;
  onAddSubtask: () => void;
  onAddNote: () => void;
  onOpenDatePicker: () => void;
  onToggleComplete: () => void;
  onIndent: () => void;
  onUnindent: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canIndent: boolean;
  canUnindent: boolean;
}

export const ItemMenu: React.FC<ItemMenuProps> = ({
  item,
  position,
  onClose,
  onZoomIn,
  onAddSubtask,
  onAddNote,
  onOpenDatePicker,
  onToggleComplete,
  onIndent,
  onUnindent,
  onDuplicate,
  onDelete,
  canIndent,
  canUnindent,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Ensure menu stays within viewport
  const style: React.CSSProperties = {
    top: Math.min(position.y, window.innerHeight - 340),
    left: Math.min(position.x, window.innerWidth - 220),
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-50 w-52 py-1.5 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Focus on Task (outliner navigation) */}
      <button
        onClick={() => {
          onZoomIn();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 font-medium transition-colors"
      >
        <span className="flex items-center gap-2">
          <ZoomIn className="w-4 h-4 text-blue-500" />
          Focus on Task
        </span>
        <kbd className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded">
          Ctrl+]
        </kbd>
      </button>

      <div className="h-px my-1 bg-gray-100 dark:bg-zinc-800" />

      {/* Add Subtask */}
      <button
        onClick={() => {
          onAddSubtask();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Plus className="w-3.5 h-3.5 text-gray-400" />
        Add Subtask
      </button>

      {/* Add Note */}
      <button
        onClick={() => {
          onAddNote();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <FileText className="w-3.5 h-3.5 text-gray-400" />
        {item.note ? 'Edit Note' : 'Add Note'}
      </button>

      {/* Schedule / Date Picker */}
      <button
        onClick={() => {
          onOpenDatePicker();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Calendar className="w-3.5 h-3.5 text-gray-400" />
        Set Dates / Schedule
      </button>

      {/* Toggle Complete */}
      <button
        onClick={() => {
          onToggleComplete();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
          {item.completed ? 'Mark Incomplete' : 'Mark Complete'}
        </span>
        <kbd className="text-[10px] text-gray-400 font-mono">Ctrl+↵</kbd>
      </button>

      <div className="h-px my-1 bg-gray-100 dark:bg-zinc-800" />

      {/* Indent / Unindent */}
      <button
        disabled={!canIndent}
        onClick={() => {
          onIndent();
          onClose();
        }}
        className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors ${
          canIndent
            ? 'hover:bg-gray-100 dark:hover:bg-zinc-800'
            : 'opacity-40 cursor-not-allowed'
        }`}
      >
        <span className="flex items-center gap-2">
          <CornerDownRight className="w-3.5 h-3.5 text-gray-400" />
          Indent
        </span>
        <kbd className="text-[10px] text-gray-400 font-mono">Tab</kbd>
      </button>

      <button
        disabled={!canUnindent}
        onClick={() => {
          onUnindent();
          onClose();
        }}
        className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors ${
          canUnindent
            ? 'hover:bg-gray-100 dark:hover:bg-zinc-800'
            : 'opacity-40 cursor-not-allowed'
        }`}
      >
        <span className="flex items-center gap-2">
          <CornerUpLeft className="w-3.5 h-3.5 text-gray-400" />
          Unindent
        </span>
        <kbd className="text-[10px] text-gray-400 font-mono">Shift+Tab</kbd>
      </button>

      <div className="h-px my-1 bg-gray-100 dark:bg-zinc-800" />

      {/* Duplicate */}
      <button
        onClick={() => {
          onDuplicate();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Copy className="w-3.5 h-3.5 text-gray-400" />
        Duplicate
      </button>

      {/* Delete */}
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
        Delete
      </button>
    </div>
  );
};
