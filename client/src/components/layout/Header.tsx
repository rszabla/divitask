import React from 'react';
import {
  Search,
  ListTree,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
} from 'lucide-react';
import { TaskDocument, ViewMode } from '../../types.js';
import { getAncestors } from '../../utils/treeUtils.js';

interface HeaderProps {
  document: TaskDocument;
  zoomItemId: string | null;
  viewMode: ViewMode;
  onNavigateTo: (itemId: string | null) => void;
  onToggleViewMode: (mode: ViewMode) => void;
  onOpenSearch: () => void;
  isSaving: boolean;
  hideCompleted: boolean;
  onToggleHideCompleted: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  document,
  zoomItemId,
  viewMode,
  onNavigateTo,
  onToggleViewMode,
  onOpenSearch,
  isSaving,
  hideCompleted,
  onToggleHideCompleted,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const currentItem = zoomItemId ? document.items[zoomItemId] : null;
  const ancestors = zoomItemId ? getAncestors(document.items, zoomItemId) : [];

  return (
    <header className="h-9 sm:h-11 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-2 sm:px-3 text-xs select-none z-20 gap-1.5 sm:gap-3">
      {/* Left section: Pathbar (Breadcrumbs) */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar">
        {/* Root Doc Button */}
        <button
          onClick={() => onNavigateTo(null)}
          title={`Go to root of ${document.title || 'Untitled'}`}
          className={`flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition-colors flex-shrink-0 max-w-[140px] sm:max-w-[180px] ${
            !zoomItemId
              ? 'font-semibold text-gray-900 dark:text-white bg-gray-100/80 dark:bg-zinc-800'
              : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="truncate">{document.title || 'Untitled'}</span>
        </button>

        {/* Ancestors (intermediate hidden on small mobile to preserve horizontal space) */}
        {ancestors.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {ancestors.map((anc) => (
              <React.Fragment key={anc.id}>
                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <button
                  onClick={() => onNavigateTo(anc.id)}
                  className="px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors truncate max-w-[120px] flex-shrink-0"
                  title={`Focus on "${anc.content || 'Untitled'}"`}
                >
                  {anc.content || 'Untitled'}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Currently focused item */}
        {currentItem && (
          <>
            <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span
              className="px-1.5 sm:px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 rounded-md border border-blue-200 dark:border-blue-900/60 truncate max-w-[130px] sm:max-w-[200px] flex-shrink-0"
              title={`Currently focused: ${currentItem.content || 'Untitled'}`}
            >
              {currentItem.content || 'Untitled'}
            </span>
          </>
        )}
      </div>

      {/* Right section: Undo/Redo, Saving status, Show/Hide Completed toggle, View Mode toggle, Search */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Undo / Redo Buttons (single-tap undo/redo on mobile and desktop) */}
        {(onUndo || onRedo) && (
          <div className="flex items-center gap-0.5 border-r border-gray-200 dark:border-zinc-800 pr-1 sm:pr-1.5 mr-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1 sm:p-1.5 rounded-md transition-colors ${
                canUndo
                  ? 'text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-95'
                  : 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1 sm:p-1.5 rounded-md transition-colors ${
                canRedo
                  ? 'text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-95'
                  : 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sync / Save status pill */}
        <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 mr-0.5 sm:mr-1">
          <CheckCircle2 className={`w-3.5 h-3.5 ${isSaving ? 'text-amber-500 animate-pulse' : 'text-emerald-500'}`} />
          <span className="hidden md:inline">{isSaving ? 'Saving...' : 'Saved'}</span>
        </div>

        {/* Show / Hide Completed Tasks Toggle Button */}
        <button
          onClick={onToggleHideCompleted}
          className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border text-xs font-medium transition-colors ${
            hideCompleted
              ? 'bg-gray-50/80 dark:bg-zinc-900/60 border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-400 opacity-80'
              : 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700'
          }`}
          title={hideCompleted ? 'Completed tasks are hidden (Click to show)' : 'Completed tasks are shown (Click to hide)'}
        >
          {hideCompleted ? <EyeOff className="w-3.5 h-3.5 opacity-75" /> : <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />}
          <span className={`hidden sm:inline ${hideCompleted ? 'line-through opacity-80' : ''}`}>Complete</span>
        </button>

        {/* View Switcher (Outline ⟷ Timeline) */}
        <div className="flex items-center bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-gray-200 dark:border-zinc-700">
          <button
            onClick={() => onToggleViewMode('outline')}
            className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium transition-all ${
              viewMode === 'outline'
                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title="Outline View (Alt+G to toggle)"
          >
            <ListTree className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Outline</span>
          </button>
          <button
            onClick={() => onToggleViewMode('gantt')}
            className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium transition-all ${
              viewMode === 'gantt'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title="Timeline View (Alt+G to toggle)"
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Timeline</span>
          </button>
        </div>

        {/* Search Button */}
        <button
          onClick={onOpenSearch}
          className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="Search in document (Ctrl+F)"
        >
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </header>
  );
};
