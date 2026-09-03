import React from 'react';
import { Check, X } from 'lucide-react';
import { FlattenedGanttNode, TimeBlock } from '../../types.js';
import {
  parseDateTimeSafe,
  formatDuration,
  formatDisplayDateTime,
} from '../../utils/dateUtils.js';

interface GanttTaskBarProps {
  node: FlattenedGanttNode;
  block: TimeBlock;
  windowStart: Date;
  windowEnd: Date;
  totalTimelineWidth: number;
  isSelected?: boolean;
  onSelect: (e: React.MouseEvent, node: FlattenedGanttNode, blockId: string) => void;
  onDeleteBlock?: (itemId: string, blockId: string) => void;
  onStartDrag: (
    type: 'move' | 'resize-start' | 'resize-end',
    e: React.MouseEvent | React.TouchEvent,
    node: FlattenedGanttNode,
    blockId: string
  ) => void;
  onDoubleClick: (node: FlattenedGanttNode) => void;
  isDragging?: boolean;
  dragStartMs?: number;
  dragEndMs?: number;
  rowHeight: number;
}

export const GanttTaskBar: React.FC<GanttTaskBarProps> = ({
  node,
  block,
  windowStart,
  windowEnd,
  totalTimelineWidth,
  isSelected = false,
  onSelect,
  onDeleteBlock,
  onStartDrag,
  onDoubleClick,
  isDragging,
  dragStartMs,
  dragEndMs,
  rowHeight,
}) => {
  const item = node.item;

  const parsedStart = parseDateTimeSafe(block.startDate, block.startTime) || windowStart;
  const parsedEnd = parseDateTimeSafe(block.endDate, block.endTime, true) || windowEnd;

  const startMs = isDragging && dragStartMs !== undefined ? dragStartMs : parsedStart.getTime();
  const endMs = isDragging && dragEndMs !== undefined ? dragEndMs : parsedEnd.getTime();

  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  const totalWindowMs = Math.max(windowEndMs - windowStartMs, 1000);

  // If outside current span window
  if (endMs < windowStartMs || startMs > windowEndMs) {
    return null;
  }

  const rawLeft = ((startMs - windowStartMs) / totalWindowMs) * totalTimelineWidth;
  const rawRight = ((endMs - windowStartMs) / totalWindowMs) * totalTimelineWidth;

  const visibleLeft = Math.max(0, rawLeft);
  const visibleRight = Math.min(totalTimelineWidth, rawRight);
  const left = visibleLeft;
  const width = Math.max(14, visibleRight - visibleLeft);

  const continuesBefore = rawLeft < -1;
  const continuesAfter = rawRight > totalTimelineWidth + 1;
  const roundingClass =
    continuesBefore && continuesAfter
      ? 'rounded-none'
      : continuesBefore
      ? 'rounded-r-md rounded-l-none'
      : continuesAfter
      ? 'rounded-l-md rounded-r-none'
      : 'rounded-md';

  const durationStr = formatDuration(startMs, endMs);
  const barColor = block.color || item.color || '#3b82f6';
  const barTop = (rowHeight - 24) / 2;

  // Protect against white text on light task bar background
  const isLightBar = (() => {
    if (!barColor || !barColor.startsWith('#')) return false;
    const c = barColor.substring(1);
    if (c.length !== 6 && c.length !== 3) return false;
    const expanded = c.length === 3 ? c.split('').map((ch) => ch + ch).join('') : c;
    const rgb = parseInt(expanded, 16);
    if (isNaN(rgb)) return false;
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 175;
  })();
  const textColorClass = isLightBar ? 'text-gray-900 font-semibold' : 'text-white font-medium';

  const hasTime = Boolean(block.startTime || block.endTime);
  const tooltipText = `Task: ${item.content}${node.isSummary ? ' (Summary)' : ''}
Duration: ${durationStr}
Dates: ${formatDisplayDateTime(new Date(startMs), hasTime)} – ${formatDisplayDateTime(new Date(endMs), hasTime)}${
    isSelected ? '\n[Selected: drag to move, drag edges to resize, Delete to remove]' : '\n[Click to select]'
  }`;

  // Render parent summary bracket bar
  if (node.isSummary) {
    return (
      <div
        style={{
          left: `${left}px`,
          top: `${barTop}px`,
          width: `${width}px`,
          height: '24px',
        }}
        className={`absolute select-none cursor-pointer group z-10 ${
          isSelected ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-zinc-900 rounded-sm touch-none' : ''
        }`}
        onClick={(e) => onSelect(e, node, block.id)}
        onMouseDown={(e) => {
          if (isSelected) {
            onStartDrag('move', e, node, block.id);
          } else {
            onSelect(e, node, block.id);
          }
        }}
        onTouchStart={(e) => {
          if (isSelected) {
            e.stopPropagation();
            onStartDrag('move', e, node, block.id);
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick(node);
        }}
        title={tooltipText}
      >
        {/* Parent Summary Bar (Bracket Shape) */}
        <div
          className={`relative h-2 ${roundingClass} shadow-xs transition-transform group-hover:scale-y-110`}
          style={{ backgroundColor: item.completed ? '#9ca3af' : barColor }}
        >
          {/* Left bracket down-arrow */}
          {!continuesBefore && (
            <div
              className="absolute left-0 -bottom-1 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px]"
              style={{ borderTopColor: item.completed ? '#9ca3af' : barColor }}
            />
          )}
          {/* Right bracket down-arrow */}
          {!continuesAfter && (
            <div
              className="absolute right-0 -bottom-1 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px]"
              style={{ borderTopColor: item.completed ? '#9ca3af' : barColor }}
            />
          )}
        </div>

        {/* Task Label beside bar */}
        <div className={`absolute left-full ml-2 top-0 whitespace-nowrap text-[11px] font-semibold text-gray-700 dark:text-gray-200 pointer-events-none drop-shadow-xs ${item.completed ? 'line-through opacity-70' : ''}`}>
          {item.content}
          <span className="ml-1.5 text-[10px] font-normal text-gray-400">
            ({durationStr})
          </span>
        </div>
      </div>
    );
  }

  // Regular leaf task bar
  return (
    <div
      style={{
        left: `${left}px`,
        top: `${barTop}px`,
        width: `${width}px`,
        height: '24px',
      }}
      className={`absolute select-none group/bar transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-zinc-900 shadow-md z-20 brightness-105 touch-none'
          : 'hover:brightness-95 hover:shadow-xs z-10'
      } ${isDragging ? 'opacity-85 shadow-lg' : ''} ${item.completed ? 'opacity-70' : 'opacity-90'}`}
      onClick={(e) => onSelect(e, node, block.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(node);
      }}
      title={tooltipText}
    >
      <div
        className={`relative w-full h-full ${roundingClass} overflow-hidden flex items-center justify-between px-2 text-xs transition-colors ${
          item.completed
            ? 'bg-slate-400 dark:bg-zinc-600 text-slate-100 dark:text-zinc-200 border border-dashed border-slate-500 dark:border-zinc-500 shadow-2xs'
            : `${textColorClass}`
        } ${isSelected ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-pointer'}`}
        style={{ backgroundColor: item.completed ? undefined : barColor }}
        onMouseDown={(e) => {
          if (isSelected) {
            e.stopPropagation();
            onStartDrag('move', e, node, block.id);
          } else {
            // First click selects
            onSelect(e, node, block.id);
          }
        }}
        onTouchStart={(e) => {
          if (isSelected) {
            e.stopPropagation();
            onStartDrag('move', e, node, block.id);
          }
        }}
      >
        {/* Checkmark or label */}
        <div className="relative z-10 flex items-center gap-1.5 min-w-0 overflow-hidden truncate">
          {item.completed && (
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/90 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          )}
          <span className={`truncate text-[11px] select-none font-medium drop-shadow-xs ${item.completed ? 'line-through opacity-85' : ''}`}>
            {item.content}
          </span>
        </div>

        {/* Duration pill and delete button inside bar */}
        <div className="relative z-10 flex items-center gap-1 flex-shrink-0 ml-1">
          {width > 65 && (
            <span className={`text-[10px] select-none ${item.completed ? 'opacity-70 text-slate-200' : 'opacity-80'}`}>
              {durationStr}
            </span>
          )}

          {/* Delete button only visible when selected */}
          {isSelected && onDeleteBlock && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteBlock(node.id, block.id);
              }}
              className="p-0.5 hover:bg-black/30 rounded text-white/80 hover:text-white transition-colors"
              title="Delete this time block"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Resize handles - ONLY active and visible when selected */}
      {isSelected && (
        <>
          {/* Left resize handle (Adjust Start Time) */}
          <div
            className="absolute left-0 top-0 bottom-0 w-3.5 sm:w-2.5 cursor-ew-resize hover:bg-white/50 active:bg-white/70 rounded-l-md transition-colors z-20 flex items-center justify-center bg-white/20 touch-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartDrag('resize-start', e, node, block.id);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              onStartDrag('resize-start', e, node, block.id);
            }}
            title="Drag to change start time"
          >
            <div className="w-0.5 h-3 bg-white/80 rounded-full" />
          </div>

          {/* Right resize handle (Adjust End Time) */}
          <div
            className="absolute right-0 top-0 bottom-0 w-3.5 sm:w-2.5 cursor-ew-resize hover:bg-white/50 active:bg-white/70 rounded-r-md transition-colors z-20 flex items-center justify-center bg-white/20 touch-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartDrag('resize-end', e, node, block.id);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              onStartDrag('resize-end', e, node, block.id);
            }}
            title="Drag to change end time"
          >
            <div className="w-0.5 h-3 bg-white/80 rounded-full" />
          </div>
        </>
      )}
    </div>
  );
};
