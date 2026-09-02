import React, { useState } from 'react';
import { Calendar, X, Check, Palette } from 'lucide-react';
import { TaskItem } from '../../types.js';

interface DatePickerPopoverProps {
  item: TaskItem;
  onSave: (updates: Partial<TaskItem>) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#64748b', // slate
];

export const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({ item, onSave, onClose }) => {
  const [startDate, setStartDate] = useState(item.startDate || '');
  const [endDate, setEndDate] = useState(item.endDate || '');
  const [color, setColor] = useState(item.color || '#3b82f6');

  const handleApply = () => {
    onSave({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      color,
    });
    onClose();
  };

  const handleClear = () => {
    onSave({
      startDate: undefined,
      endDate: undefined,
    });
    onClose();
  };

  // Quick preset helpers (today, +3d, +1w, +2w)
  const setQuickSpan = (days: number) => {
    const start = startDate ? new Date(startDate) : new Date();
    const startStr = start.toISOString().split('T')[0];
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    const endStr = end.toISOString().split('T')[0];
    setStartDate(startStr);
    setEndDate(endStr);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-5 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Calendar className="w-4 h-4 text-blue-500" />
            Schedule & Gantt Details
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {/* Quick presets */}
          <div>
            <label className="block mb-1.5 font-medium text-gray-600 dark:text-gray-400">
              Quick Presets
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setQuickSpan(1)}
                className="py-1 px-2 text-center rounded bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300"
              >
                1 Day
              </button>
              <button
                type="button"
                onClick={() => setQuickSpan(3)}
                className="py-1 px-2 text-center rounded bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300"
              >
                3 Days
              </button>
              <button
                type="button"
                onClick={() => setQuickSpan(7)}
                className="py-1 px-2 text-center rounded bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300"
              >
                1 Week
              </button>
              <button
                type="button"
                onClick={() => setQuickSpan(14)}
                className="py-1 px-2 text-center rounded bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300"
              >
                2 Weeks
              </button>
            </div>
          </div>

          {/* Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Gantt Bar Color */}
          <div>
            <label className="flex items-center gap-1.5 mb-1.5 font-medium text-gray-700 dark:text-gray-300">
              <Palette className="w-3.5 h-3.5" />
              Gantt Bar Color
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            Clear Dates
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
