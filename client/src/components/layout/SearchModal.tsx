import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Calendar, CheckCircle2, ChevronRight, BarChart3 } from 'lucide-react';
import { TaskDocument } from '../../types.js';

interface SearchModalProps {
  document: TaskDocument;
  onSelectTask: (id: string, openGantt: boolean) => void;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  document,
  onSelectTask,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allItems = Object.values(document.items);
  const filtered = query.trim()
    ? allItems.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.content.toLowerCase().includes(q) ||
          (item.note && item.note.toLowerCase().includes(q))
        );
      })
    : allItems.slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search bar input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
          <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, notes, #tags, @mentions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 text-xs">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No matching tasks found.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-blue-50/60 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors"
                onClick={() => {
                  onSelectTask(item.id, false);
                  onClose();
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle2
                    className={`w-4 h-4 flex-shrink-0 ${
                      item.completed ? 'text-emerald-500' : 'text-gray-300 dark:text-zinc-600'
                    }`}
                  />
                  <div className="truncate">
                    <span
                      className={`font-medium ${
                        item.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {item.content || 'Untitled task'}
                    </span>
                    {item.note && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  {(item.startDate || item.endDate) && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      <Calendar className="w-3 h-3" />
                      {item.startDate || ''}
                    </span>
                  )}

                  {/* Quick button to open Gantt view for this task */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTask(item.id, true);
                      onClose();
                    }}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 rounded hover:bg-blue-200 transition-all font-medium"
                    title="Open in Timeline"
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span>Timeline</span>
                  </button>

                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
