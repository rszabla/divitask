import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Enter', desc: 'Create new task below' },
  { key: 'Tab', desc: 'Indent task (make subtask)' },
  { key: 'Shift + Tab', desc: 'Unindent task' },
  { key: 'Backspace (at start)', desc: 'Delete empty task or unindent' },
  { key: 'Ctrl + Enter', desc: 'Toggle task complete' },
  { key: 'Ctrl + ] or Alt + →', desc: 'Focus on task (or hover Focus button)' },
  { key: 'Ctrl + [ or Alt + ←', desc: 'Unfocus to parent' },
  { key: 'Drag bullet', desc: 'Drag to reorder or nest task' },
  { key: 'Right-click bullet', desc: 'Task context menu' },
  { key: 'Alt + G', desc: 'Toggle Outline ⟷ Timeline view' },
  { key: '↑ / ↓ Arrows', desc: 'Navigate between tasks' },
  { key: 'Shift + ↑ / ↓ Arrows', desc: 'Select multiple tasks' },
  { key: 'Ctrl + Z', desc: 'Undo action / multi-line paste' },
  { key: 'Ctrl + Y or Ctrl + Shift + Z', desc: 'Redo action' },
  { key: 'Ctrl + C (selected tasks)', desc: 'Copy tasks as indented text (2 spaces)' },
  { key: 'Ctrl + F', desc: 'Open search modal' },
  { key: 'Ctrl + /', desc: 'Open keyboard shortcuts cheatsheet' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Keyboard className="w-4 h-4 text-blue-500" />
            Keyboard Shortcuts & Tips
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
          {SHORTCUTS.map((sc, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-300">{sc.desc}</span>
              <kbd className="px-2 py-1 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 text-[11px] text-gray-400">
          Tip: In the Gantt view, drag any task bar to shift dates, or drag the left/right handles to resize duration!
        </div>
      </div>
    </div>
  );
};
