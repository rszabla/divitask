import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Pencil,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  HelpCircle,
  Download,
  Search,
  GripVertical,
  Settings,
} from 'lucide-react';
import { DocumentSummary } from '../../types.js';

interface SidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  documents: DocumentSummary[];
  activeDocId: string;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onDeleteDocument: (id: string) => void;
  onDuplicateDocument: (id: string) => void;
  onRenameDocument: (id: string, newTitle: string) => void;
  onReorderDocuments: (newOrderedIds: string[]) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenShortcuts: () => void;
  onOpenExportImport: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggleOpen,
  documents,
  activeDocId,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  onDuplicateDocument,
  onRenameDocument,
  onReorderDocuments,
  isDarkMode,
  onToggleDarkMode,
  onOpenShortcuts,
  onOpenExportImport,
  onOpenSettings,
}) => {
  const [filter, setFilter] = useState('');
  const [menuDocId, setMenuDocId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Resizable sidebar width
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('divitask-sidebar-width') ?? localStorage.getItem('dynagantt-sidebar-width');
    return saved ? Math.max(180, Math.min(500, parseInt(saved, 10))) : 256;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Document drag-and-drop reordering state
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(180, Math.min(500, startWidth + delta));
      setSidebarWidth(newWidth);
      localStorage.setItem('divitask-sidebar-width', String(newWidth));
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDocDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDocId(id);
  };

  const handleDocDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedDocId || draggedDocId === id) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    setDropTarget({ id, position });
  };

  const handleDocDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedDocId || draggedDocId === targetId) {
      setDraggedDocId(null);
      setDropTarget(null);
      return;
    }

    const currentIds = documents.map((d) => d.id);
    const fromIdx = currentIds.indexOf(draggedDocId);
    let toIdx = currentIds.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const newIds = currentIds.filter((id) => id !== draggedDocId);
    const targetIdxInNew = newIds.indexOf(targetId);
    const insertIdx = dropTarget?.position === 'after' ? targetIdxInNew + 1 : targetIdxInNew;
    newIds.splice(insertIdx, 0, draggedDocId);

    setDraggedDocId(null);
    setDropTarget(null);
    onReorderDocuments(newIds);
  };

  const handleDocDragEnd = () => {
    setDraggedDocId(null);
    setDropTarget(null);
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setMenuDocId(null);
    };
    if (menuDocId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [menuDocId]);

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(filter.toLowerCase())
  );

  if (!isOpen) {
    return (
      <div className="flex-shrink-0 flex flex-col justify-between p-2 border-r border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 w-12 items-center">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onToggleOpen}
            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleOpen}
            className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center hover:opacity-85 transition-opacity"
            title="DiviTask"
          >
            <img src="/logo.png" alt="DiviTask" className="w-6 h-6 object-contain" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            title="Global Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ width: `${sidebarWidth}px` }}
      className="flex-shrink-0 flex flex-col h-full bg-gray-50 dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 select-none text-xs relative"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="DiviTask" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">
            DiviTask
          </span>
        </div>
        <button
          onClick={onToggleOpen}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New Document Button */}
      <div className="p-3">
        <button
          onClick={onCreateDocument}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Document</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          My Files ({filteredDocs.length})
        </div>

        {filteredDocs.map((doc) => {
          const isActive = doc.id === activeDocId;
          const isEditing = editingDocId === doc.id;
          const isTarget = dropTarget?.id === doc.id;
          const isDragged = draggedDocId === doc.id;

          return (
            <div key={doc.id} className="relative">
              {/* Drop indicator: BEFORE */}
              {isTarget && dropTarget.position === 'before' && (
                <div className="absolute -top-1 left-2 right-2 h-0.5 bg-blue-500 rounded-full z-20 pointer-events-none" />
              )}

              <div
                draggable={!isEditing}
                onDragStart={(e) => handleDocDragStart(e, doc.id)}
                onDragOver={(e) => handleDocDragOver(e, doc.id)}
                onDrop={(e) => handleDocDrop(e, doc.id)}
                onDragEnd={handleDocDragEnd}
                onClick={() => {
                  if (!isEditing) onSelectDocument(doc.id);
                }}
                className={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                  isDragged ? 'opacity-40' : ''
                } ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                  {/* Subtle drag handle */}
                  <GripVertical className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing flex-shrink-0" />
                  <FileText className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => {
                        if (editingTitle.trim() && editingTitle.trim() !== doc.title) {
                          onRenameDocument(doc.id, editingTitle.trim());
                        }
                        setEditingDocId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (editingTitle.trim() && editingTitle.trim() !== doc.title) {
                            onRenameDocument(doc.id, editingTitle.trim());
                          }
                          setEditingDocId(null);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setEditingDocId(null);
                        }
                      }}
                      className="w-full px-1.5 py-0.5 text-xs bg-white dark:bg-zinc-800 border border-blue-500 rounded outline-none text-gray-900 dark:text-gray-100 shadow-xs"
                    />
                  ) : (
                    <span className="truncate">{doc.title}</span>
                  )}
                </div>

                {/* Hamburger menu button on hover */}
                {!isEditing && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenuPosition({ x: rect.left, y: rect.bottom + 4 });
                        setMenuDocId(doc.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors"
                      title="Document options"
                    >
                      <Menu className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Drop indicator: AFTER */}
              {isTarget && dropTarget.position === 'after' && (
                <div className="absolute -bottom-1 left-2 right-2 h-0.5 bg-blue-500 rounded-full z-20 pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Document Options Dropdown Menu */}
      {menuDocId && menuPosition && (
        <div
          style={{
            top: Math.min(menuPosition.y, window.innerHeight - 150),
            left: Math.min(menuPosition.x, window.innerWidth - 170),
          }}
          className="fixed z-50 w-40 py-1 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const docToEdit = documents.find((d) => d.id === menuDocId);
              if (docToEdit) {
                setEditingDocId(docToEdit.id);
                setEditingTitle(docToEdit.title);
              }
              setMenuDocId(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
          >
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
            <span>Rename</span>
          </button>
          <button
            onClick={() => {
              onDuplicateDocument(menuDocId);
              setMenuDocId(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
          >
            <Copy className="w-3.5 h-3.5 text-gray-400" />
            <span>Duplicate</span>
          </button>
          {documents.length > 1 && (
            <>
              <div className="h-px my-1 bg-gray-100 dark:bg-zinc-800" />
              <button
                onClick={() => {
                  const docToDelete = documents.find((d) => d.id === menuDocId);
                  const title = docToDelete?.title || 'this document';
                  if (confirm(`Delete "${title}"?`)) {
                    onDeleteDocument(menuDocId);
                  }
                  setMenuDocId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Footer controls: theme, export, shortcuts */}
      <div className="p-3 border-t border-gray-200 dark:border-zinc-800 space-y-1">
        <button
          onClick={onOpenExportImport}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-zinc-800/60 transition-colors"
        >
          <Download className="w-4 h-4 text-gray-400" />
          <span>Export / Import</span>
        </button>

        <button
          onClick={onOpenShortcuts}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-zinc-800/60 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span>Shortcuts & Help</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-zinc-800/60 transition-colors"
        >
          <Settings className="w-4 h-4 text-gray-400" />
          <span>Global Settings</span>
        </button>

        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-zinc-800/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-400" />}
            <span>Theme</span>
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            {isDarkMode ? 'Dark' : 'Light'}
          </span>
        </button>
      </div>

      {/* Draggable resize splitter */}
      <div
        onMouseDown={handleMouseDownResize}
        className={`absolute top-0 -right-1 w-2.5 h-full cursor-col-resize hover:bg-blue-500/40 active:bg-blue-500 transition-colors z-40 group select-none ${
          isResizing ? 'bg-blue-500/50' : ''
        }`}
        title="Drag to resize sidebar width"
      >
        <div className="w-0.5 h-8 bg-gray-300 dark:bg-zinc-600 group-hover:bg-blue-500 rounded absolute top-1/2 -translate-y-1/2 right-1" />
      </div>
    </div>
  );
};
