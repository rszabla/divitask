import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Clock,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
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
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  isShortScreen?: boolean;
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
  isZenMode,
  onToggleZenMode,
  isShortScreen = false,
}) => {
  return (
    <div
      className={`flex items-center justify-end gap-1 sm:gap-2 px-2 sm:px-3 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-xs shadow-xs z-20 ${
        isShortScreen ? 'py-0.5 min-h-[30px]' : 'py-1 min-h-[36px]'
      }`}
    >
      {/* Controls Container */}
      <div className="flex items-center justify-end gap-1 sm:gap-2 flex-1 min-w-0">
        {/* Navigation arrows & Window Title & Now button */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 bg-gray-50 dark:bg-zinc-800/80 px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg border border-gray-200 dark:border-zinc-700 min-w-0 flex-shrink">
          <button
            onClick={onPrevWindow}
            className="p-0.5 sm:p-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors flex-shrink-0"
            title="Previous Period"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <span className="font-semibold text-gray-900 dark:text-gray-100 px-1 text-center truncate select-none text-[11px] sm:text-[12px] min-w-0 max-w-[130px] sm:max-w-none sm:min-w-[150px]">
            {windowTitle}
          </span>

          <button
            onClick={onNextWindow}
            className="p-0.5 sm:p-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors flex-shrink-0"
            title="Next Period"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* "Now" button: centers timeline to current date & time */}
          <button
            onClick={onNow}
            className="ml-0.5 sm:ml-1 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-700 hover:bg-blue-50 dark:hover:bg-zinc-600 rounded border border-gray-200 dark:border-zinc-600 transition-colors shadow-2xs flex-shrink-0"
            title="Center timeline on Now"
          >
            <Clock className="w-3 h-3 text-blue-500" />
            <span className="hidden sm:inline">Now</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-zinc-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg border border-gray-200 dark:border-zinc-700 flex-shrink-0">
          <button
            onClick={onZoomOut}
            disabled={zoomLevel <= 1}
            className={`p-0.5 sm:p-1 rounded transition-colors ${
              zoomLevel <= 1
                ? 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          {/* Slider track: hidden on mobile portrait screens to keep everything on ONE line */}
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={zoomLevel}
            onChange={(e) => onSetZoomLevel(Number(e.target.value))}
            className="hidden md:block w-20 lg:w-28 h-1.5 bg-gray-300 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
            title={`Zoom Level ${zoomLevel}: ${zoomLabel}`}
          />

          <button
            onClick={onZoomIn}
            disabled={zoomLevel >= 5}
            className={`p-0.5 sm:p-1 rounded transition-colors ${
              zoomLevel >= 5
                ? 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          <span className="text-[10px] sm:text-[11px] font-semibold text-gray-800 dark:text-gray-200 min-w-[38px] sm:min-w-[60px] text-center select-none truncate">
            {zoomLabel}
          </span>
        </div>

        {/* Zen Mode / Fullscreen Toggle (Collapse top app header to maximize timeline height on short screens) */}
        {onToggleZenMode && (
          <button
            onClick={onToggleZenMode}
            className={`p-1 sm:p-1.5 rounded-lg border transition-colors flex-shrink-0 ${
              isZenMode
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title={
              isZenMode
                ? 'Exit Fullscreen (Show top navigation bar)'
                : 'Fullscreen Timeline (Hide top navigation bar to maximize height)'
            }
          >
            {isZenMode ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
