import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface GanttHeaderProps {
  windowTitle: string;
  onPrevWindow: () => void;
  onNextWindow: () => void;
  onNow: () => void;
  zoomLevel: number; // 1 to 5
  zoomLabel: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoomLevel: (level: number) => void;
}

export const GanttHeader: React.FC<GanttHeaderProps> = ({
  windowTitle,
  onPrevWindow,
  onNextWindow,
  onNow,
  zoomLevel,
  zoomLabel,
  onZoomIn,
  onZoomOut,
  onSetZoomLevel,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-xs shadow-xs z-20">
      {/* Left: Navigation arrows & Window Title & Now button */}
      <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800/80 px-2 py-1 rounded-lg border border-gray-200 dark:border-zinc-700">
        <button
          onClick={onPrevWindow}
          className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors"
          title="Previous Period"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="font-semibold text-gray-900 dark:text-gray-100 px-2 text-center min-w-[170px] select-none text-[12px]">
          {windowTitle}
        </span>

        <button
          onClick={onNextWindow}
          className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors"
          title="Next Period"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* "Now" button: centers timeline to current date & time */}
        <button
          onClick={onNow}
          className="ml-1 flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-700 hover:bg-blue-50 dark:hover:bg-zinc-600 rounded border border-gray-200 dark:border-zinc-600 transition-colors shadow-2xs"
          title="Center timeline on Now"
        >
          <Clock className="w-3 h-3 text-blue-500" />
          <span>Now</span>
        </button>
      </div>

      {/* Right: Zoom Slider (1-5) */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700">
        <button
          onClick={onZoomOut}
          disabled={zoomLevel <= 1}
          className={`p-1 rounded transition-colors ${
            zoomLevel <= 1
              ? 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700'
          }`}
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={zoomLevel}
          onChange={(e) => onSetZoomLevel(Number(e.target.value))}
          className="w-20 sm:w-28 h-1.5 bg-gray-300 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
          title={`Zoom Level ${zoomLevel}: ${zoomLabel}`}
        />

        <button
          onClick={onZoomIn}
          disabled={zoomLevel >= 5}
          className={`p-1 rounded transition-colors ${
            zoomLevel >= 5
              ? 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700'
          }`}
          title="Zoom In (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 min-w-[65px] text-center select-none">
          {zoomLabel}
        </span>
      </div>
    </div>
  );
};
