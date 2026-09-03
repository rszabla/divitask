import React, { useState } from 'react';
import { X, Check, Trash2, Clock, Plus, Calendar } from 'lucide-react';
import { TaskItem, TimeBlock } from '../../types.js';
import {
  getItemTimeBlocks,
  formatDateSafe,
  formatDuration,
  parseDateTimeSafe,
} from '../../utils/dateUtils.js';

interface TaskDetailModalProps {
  item: TaskItem;
  onSave: (updates: Partial<TaskItem>) => void;
  onDelete: (id: string) => void;
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

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  item,
  onSave,
  onDelete,
  onClose,
}) => {
  const [content, setContent] = useState(item.content);
  const [note, setNote] = useState(item.note || '');
  const [color, setColor] = useState(item.color || '#3b82f6');
  const [completed, setCompleted] = useState(item.completed);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(() => {
    return getItemTimeBlocks(item);
  });

  const handleAddTimeBlock = () => {
    const today = new Date();
    const todayStr = formatDateSafe(today);
    const newBlock: TimeBlock = {
      id: 'tb-' + Math.random().toString(36).substring(2, 9),
      startDate: todayStr,
      endDate: todayStr,
      startTime: '09:00',
      endTime: '17:00',
      color,
    };
    setTimeBlocks((prev) => [...prev, newBlock]);
  };

  const handleRemoveTimeBlock = (blockId: string) => {
    setTimeBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<TimeBlock>) => {
    setTimeBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
    );
  };

  const handleColorSelect = (newColor: string) => {
    setColor(newColor);
    setTimeBlocks((prev) => prev.map((b) => ({ ...b, color: newColor })));
  };

  const handleApply = () => {
    const sorted = [...timeBlocks].sort((a, b) => {
      const aStart = parseDateTimeSafe(a.startDate, a.startTime)?.getTime() || 0;
      const bStart = parseDateTimeSafe(b.startDate, b.startTime)?.getTime() || 0;
      return aStart - bStart;
    });

    onSave({
      content: content.trim() || 'Untitled Task',
      note: note.trim(),
      color,
      completed,
      timeBlocks: sorted,
      startDate: sorted[0]?.startDate || undefined,
      endDate: sorted[sorted.length - 1]?.endDate || undefined,
      startTime: sorted[0]?.startTime || undefined,
      endTime: sorted[sorted.length - 1]?.endTime || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete(item.id);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
            <Clock className="w-5 h-5 text-blue-500" />
            Task & Timeline Details
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
          {/* Task Title */}
          <div>
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
              Task Title
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Time Blocks Section */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl p-3 bg-gray-50/50 dark:bg-zinc-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span>Scheduled Time Blocks ({timeBlocks.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddTimeBlock}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Time Block</span>
              </button>
            </div>

            {timeBlocks.length === 0 ? (
              <div className="py-4 text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-zinc-800/50 rounded-lg border border-dashed border-gray-200 dark:border-zinc-700">
                <p className="text-[11px] mb-2">This task is currently dateless / timeless.</p>
                <button
                  type="button"
                  onClick={handleAddTimeBlock}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Time Block</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {timeBlocks.map((block, idx) => {
                  const sDate = parseDateTimeSafe(block.startDate, block.startTime);
                  const eDate = parseDateTimeSafe(block.endDate, block.endTime, true);
                  const durationStr = sDate && eDate ? formatDuration(sDate.getTime(), eDate.getTime()) : '';

                  return (
                    <div
                      key={block.id || idx}
                      className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-[11px]">
                          Block #{idx + 1} {durationStr && <span className="text-blue-500 ml-1">({durationStr})</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTimeBlock(block.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                          title="Remove time block"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Start Date & Time */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={block.startDate}
                            onChange={(e) => handleUpdateBlock(block.id, { startDate: e.target.value })}
                            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                            Start Time (optional)
                          </label>
                          <input
                            type="time"
                            value={block.startTime || ''}
                            onChange={(e) => handleUpdateBlock(block.id, { startTime: e.target.value || undefined })}
                            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* End Date & Time */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={block.endDate}
                            onChange={(e) => handleUpdateBlock(block.id, { endDate: e.target.value })}
                            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                            End Time (optional)
                          </label>
                          <input
                            type="time"
                            value={block.endTime || ''}
                            onChange={(e) => handleUpdateBlock(block.id, { endTime: e.target.value || undefined })}
                            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Color Presets */}
          <div>
            <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300">
              Bar Accent Color
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColorSelect(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Multiline Note */}
          <div>
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add optional notes or descriptions..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Completed Checkbox */}
          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 font-medium">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Mark as Completed</span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex-shrink-0">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Task</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow-sm transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
