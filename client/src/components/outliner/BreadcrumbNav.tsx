import React from 'react';
import { ChevronRight, BarChart3, ListTree } from 'lucide-react';
import { TaskDocument, ViewMode } from '../../types.js';
import { getAncestors } from '../../utils/treeUtils.js';

interface BreadcrumbNavProps {
  document: TaskDocument;
  zoomItemId: string | null;
  viewMode: ViewMode;
  onNavigateTo: (itemId: string | null) => void;
  onToggleViewMode: (mode: ViewMode) => void;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  document,
  zoomItemId,
  viewMode,
  onNavigateTo,
  onToggleViewMode,
}) => {
  const currentItem = zoomItemId ? document.items[zoomItemId] : null;
  const ancestors = zoomItemId ? getAncestors(document.items, zoomItemId) : [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gray-50/80 dark:bg-zinc-900/80 border-b border-gray-200 dark:border-zinc-800 text-xs">
      {/* Breadcrumb path */}
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        {/* Root Doc item */}
        <button
          onClick={() => onNavigateTo(null)}
          className={`flex items-center px-2 py-0.5 rounded transition-colors ${
            !zoomItemId
              ? 'font-semibold text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="truncate max-w-[160px]">{document.title || 'Untitled'}</span>
        </button>

        {/* Ancestors */}
        {ancestors.map((anc) => (
          <React.Fragment key={anc.id}>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <button
              onClick={() => onNavigateTo(anc.id)}
              className="px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors truncate max-w-[180px]"
            >
              {anc.content || 'Untitled'}
            </button>
          </React.Fragment>
        ))}

        {/* Currently zoomed item */}
        {currentItem && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="px-1.5 py-0.5 font-semibold text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-900/60 truncate max-w-[220px]">
              {currentItem.content || 'Untitled'}
            </span>
          </>
        )}
      </div>

      {/* View Switcher Toggle: Outline vs Gantt */}
      <div className="flex items-center bg-gray-200 dark:bg-zinc-800 p-0.5 rounded-lg">
        <button
          onClick={() => onToggleViewMode('outline')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            viewMode === 'outline'
              ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ListTree className="w-3.5 h-3.5" />
          Outline
        </button>
        <button
          onClick={() => onToggleViewMode('gantt')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            viewMode === 'gantt'
              ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Gantt Chart
        </button>
      </div>
    </div>
  );
};
