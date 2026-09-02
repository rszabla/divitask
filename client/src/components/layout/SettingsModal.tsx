import React, { useState } from 'react';
import { X, Settings, Clock, Calendar } from 'lucide-react';
import { AppSettings } from '../../types.js';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
}) => {
  const [yearMode, setYearMode] = useState<'quarter' | 'term'>(settings.yearMode);
  const [workingHoursStart, setWorkingHoursStart] = useState(settings.workingHoursStart || '09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState(settings.workingHoursEnd || '17:00');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      yearMode,
      workingHoursStart,
      workingHoursEnd,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-850/50">
          <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold text-base">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Global Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 space-y-6 text-sm">
          {/* Year Mode Toggle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Year Partition Mode</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose how the annual timeline is partitioned into multi-month periods.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setYearMode('quarter')}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  yearMode === 'quarter'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium'
                    : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="font-semibold text-sm">Quarter Mode</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  4 quarters of 3 months each (Q1–Q4)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setYearMode('term')}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  yearMode === 'term'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium'
                    : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="font-semibold text-sm">Term Mode</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  3 terms of 4 months each (Jan-Apr, May-Aug, Sep-Dec)
                </span>
              </button>
            </div>
          </div>

          {/* Working Hours Setting */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Working Hours (Timeline Shading)</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Non-working hours (outside this window) and weekends are highlighted with background shading on the day and week views.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="text-gray-400 pt-5 font-semibold text-xs">to</div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
