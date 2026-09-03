import { useState, useEffect, useCallback, useRef } from 'react';
import { TaskDocument, DocumentSummary, ViewMode, AppSettings } from './types.js';
import {
  fetchDocuments,
  fetchDocument,
  saveDocument,
  createDocument,
  deleteDocument,
  duplicateDocument,
  reorderDocuments,
} from './utils/api.js';
import { loadAppSettings, saveAppSettings } from './utils/settings.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { Header } from './components/layout/Header.js';
import { OutlinerTree } from './components/outliner/OutlinerTree.js';
import { GanttChart, TimelineViewState } from './components/gantt/GanttChart.js';
import { SearchModal } from './components/layout/SearchModal.js';
import { KeyboardShortcutsModal } from './components/layout/KeyboardShortcutsModal.js';
import { ExportImportModal } from './components/layout/ExportImportModal.js';
import { SettingsModal } from './components/layout/SettingsModal.js';

export function App() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [timelineViewState, setTimelineViewState] = useState<TimelineViewState>({
    zoomLevel: 4,
    viewDate: new Date(),
    scrollLeft: 0,
  });
  const [isZenMode, setIsZenMode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('doc') || '';
  });
  const [activeDoc, setActiveDoc] = useState<TaskDocument | null>(null);
  const [zoomItemId, setZoomItemId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('zoom') || null;
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    return v === 'gantt' ? 'gantt' : 'outline';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('divitask-sidebar-open') ?? localStorage.getItem('dynagantt-sidebar-open');
    return saved !== null ? saved === 'true' : false;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [hideCompleted, setHideCompleted] = useState<boolean>(() => {
    return localStorage.getItem('divitask-hide-completed') === 'true';
  });

  const handleToggleHideCompleted = () => {
    setHideCompleted((prev) => {
      const next = !prev;
      localStorage.setItem('divitask-hide-completed', String(next));
      return next;
    });
  };

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Global Settings
  const [settings, setSettings] = useState<AppSettings>(loadAppSettings);

  // Theme
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('divitask-theme') ?? localStorage.getItem('dynagantt-theme');
    return saved === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      window.document.documentElement.classList.add('dark');
      localStorage.setItem('divitask-theme', 'dark');
    } else {
      window.document.documentElement.classList.remove('dark');
      localStorage.setItem('divitask-theme', 'light');
    }
  }, [isDarkMode]);

  // Synchronize state with Browser History (Back / Forward buttons)
  const isPopStateRef = useRef(false);

  // Read initial state from URL search params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlDocId = params.get('doc');
    const urlZoomId = params.get('zoom');
    const urlView = params.get('view') as ViewMode | null;

    if (urlDocId) {
      setActiveDocId(urlDocId);
    }
    if (urlZoomId) {
      setZoomItemId(urlZoomId);
    }
    if (urlView === 'outline' || urlView === 'gantt') {
      setViewMode(urlView);
    }

    const initialState = {
      docId: urlDocId || activeDocId,
      zoomItemId: urlZoomId || null,
      view: urlView || 'outline',
    };
    window.history.replaceState(initialState, '', window.location.href);
  }, []);

  // Listen for browser Back / Forward (popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      const params = new URLSearchParams(window.location.search);
      const targetDocId = state?.docId || params.get('doc');
      const targetZoomId = state?.zoomItemId !== undefined ? state.zoomItemId : params.get('zoom');
      const targetView = (state?.view || params.get('view') || 'outline') as ViewMode;

      isPopStateRef.current = true;
      if (targetDocId && targetDocId !== activeDocId) {
        setActiveDocId(targetDocId);
      }
      setZoomItemId(targetZoomId || null);
      if (targetView && (targetView === 'outline' || targetView === 'gantt')) {
        setViewMode(targetView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeDocId]);

  const updateHistory = useCallback(
    (newDocId: string, newZoomId: string | null, newView: ViewMode) => {
      if (isPopStateRef.current) {
        isPopStateRef.current = false;
        return;
      }

      const params = new URLSearchParams();
      if (newDocId) params.set('doc', newDocId);
      if (newZoomId) params.set('zoom', newZoomId);
      if (newView) params.set('view', newView);

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      const currentParams = new URLSearchParams(window.location.search);
      if (
        currentParams.get('doc') === (newDocId || null) &&
        currentParams.get('zoom') === (newZoomId || null) &&
        currentParams.get('view') === newView
      ) {
        return;
      }

      window.history.pushState(
        { docId: newDocId, zoomItemId: newZoomId, view: newView },
        '',
        newUrl
      );
    },
    []
  );

  // Whenever activeDocId is resolved, ensure it is recorded in the current URL and history state
  useEffect(() => {
    if (activeDocId) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('doc') !== activeDocId) {
        params.set('doc', activeDocId);
        if (zoomItemId) params.set('zoom', zoomItemId);
        params.set('view', viewMode);
        window.history.replaceState(
          { docId: activeDocId, zoomItemId, view: viewMode },
          '',
          `${window.location.pathname}?${params.toString()}`
        );
      }
    }
  }, [activeDocId, zoomItemId, viewMode]);

  // Undo / Redo History Stacks
  const undoStackRef = useRef<TaskDocument[]>([]);
  const redoStackRef = useRef<TaskDocument[]>([]);
  const lastSnapshotTimeRef = useRef<number>(0);

  const pushUndoSnapshot = useCallback((doc: TaskDocument) => {
    if (!doc || !doc.items || Object.keys(doc.items).length === 0) return;
    const last = undoStackRef.current[undoStackRef.current.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(doc)) {
      return;
    }
    undoStackRef.current.push(JSON.parse(JSON.stringify(doc)));
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  // Debounced auto-save
  const saveTimeoutRef = useRef<any>(null);
  const handleUpdateDocument = useCallback(
    (updatedDoc: TaskDocument, isStructural: boolean = false) => {
      const now = Date.now();
      if (activeDoc && activeDoc.items && Object.keys(activeDoc.items).length > 0) {
        if (isStructural || now - lastSnapshotTimeRef.current > 1000) {
          pushUndoSnapshot(activeDoc);
          lastSnapshotTimeRef.current = now;
        }
      }
      setActiveDoc(updatedDoc);
      setIsSaving(true);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveDocument(updatedDoc);
          setIsSaving(false);
        } catch (err) {
          console.error('Auto-save error:', err);
          setIsSaving(false);
        }
      }, 400);
    },
    [activeDoc, pushUndoSnapshot]
  );

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0 || !activeDoc) return;
    const previousDoc = undoStackRef.current.pop()!;
    if (!previousDoc || !previousDoc.items || Object.keys(previousDoc.items).length === 0) {
      setCanUndo(undoStackRef.current.length > 0);
      return;
    }
    redoStackRef.current.push(JSON.parse(JSON.stringify(activeDoc)));
    setActiveDoc(previousDoc);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveDocument(previousDoc);
        setIsSaving(false);
      } catch (err) {
        setIsSaving(false);
      }
    }, 300);
  }, [activeDoc]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0 || !activeDoc) return;
    const nextDoc = redoStackRef.current.pop()!;
    if (!nextDoc || !nextDoc.items || Object.keys(nextDoc.items).length === 0) {
      setCanRedo(redoStackRef.current.length > 0);
      return;
    }
    undoStackRef.current.push(JSON.parse(JSON.stringify(activeDoc)));
    setActiveDoc(nextDoc);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveDocument(nextDoc);
        setIsSaving(false);
      } catch (err) {
        setIsSaving(false);
      }
    }, 300);
  }, [activeDoc]);

  const handleNavigateTo = (newZoomId: string | null) => {
    setZoomItemId(newZoomId);
    updateHistory(activeDocId, newZoomId, viewMode);
  };

  const handleToggleViewMode = (newView: ViewMode) => {
    setViewMode(newView);
    if (newView === 'outline') setIsZenMode(false);
    updateHistory(activeDocId, zoomItemId, newView);
  };

  const handleSelectDocument = (newDocId: string) => {
    setActiveDocId(newDocId);
    setZoomItemId(null);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    lastSnapshotTimeRef.current = 0;
    updateHistory(newDocId, null, viewMode);
  };

  // Load documents list
  const loadDocuments = useCallback(async () => {
    try {
      const list = await fetchDocuments();
      setDocuments(list);
      setActiveDocId((current) => {
        if (current) return current;
        const params = new URLSearchParams(window.location.search);
        const urlDoc = params.get('doc');
        if (urlDoc && list.some((d) => d.id === urlDoc)) {
          return urlDoc;
        }
        return list.length > 0 ? list[0].id : '';
      });
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Load active document
  useEffect(() => {
    if (!activeDocId) return;
    let cancelled = false;

    fetchDocument(activeDocId)
      .then((doc) => {
        if (!cancelled) {
          setActiveDoc(doc);
        }
      })
      .catch((err) => {
        console.error('Failed to load document:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [activeDocId]);

  // Document management
  const handleCreateDocument = async () => {
    try {
      const newDoc = await createDocument('New Document');
      setDocuments((prev) => [
        {
          id: newDoc.id,
          title: newDoc.title,
          itemCount: 1,
          completedCount: 0,
          createdAt: newDoc.createdAt,
          updatedAt: newDoc.updatedAt,
        },
        ...prev,
      ]);
      setActiveDocId(newDoc.id);
      setActiveDoc(newDoc);
      setZoomItemId(null);
      setViewMode('outline');
    } catch (err) {
      console.error('Failed to create doc', err);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument(id);
      const remaining = documents.filter((d) => d.id !== id);
      setDocuments(remaining);
      if (activeDocId === id && remaining.length > 0) {
        setActiveDocId(remaining[0].id);
      }
    } catch (err) {
      console.error('Failed to delete doc', err);
    }
  };

  const handleDuplicateDocument = async (id: string) => {
    try {
      const dup = await duplicateDocument(id);
      setDocuments((prev) => [
        {
          id: dup.id,
          title: dup.title,
          itemCount: Object.keys(dup.items).length,
          completedCount: Object.values(dup.items).filter((i) => i.completed).length,
          createdAt: dup.createdAt,
          updatedAt: dup.updatedAt,
        },
        ...prev,
      ]);
      setActiveDocId(dup.id);
      setActiveDoc(dup);
    } catch (err) {
      console.error('Failed to duplicate doc', err);
    }
  };

  const handleRenameDocument = async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    try {
      if (activeDoc && activeDoc.id === id) {
        const updated = { ...activeDoc, title: trimmed, updatedAt: new Date().toISOString() };
        handleUpdateDocument(updated, true);
      } else {
        const doc = await fetchDocument(id);
        const updated = { ...doc, title: trimmed, updatedAt: new Date().toISOString() };
        await saveDocument(updated);
      }
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, title: trimmed, updatedAt: new Date().toISOString() } : d))
      );
    } catch (err) {
      console.error('Failed to rename doc', err);
    }
  };

  const handleReorderDocuments = async (newOrderedIds: string[]) => {
    const map = new Map(documents.map((d) => [d.id, d]));
    const reordered: DocumentSummary[] = [];
    for (const id of newOrderedIds) {
      const d = map.get(id);
      if (d) {
        reordered.push(d);
        map.delete(id);
      }
    }
    for (const rem of map.values()) {
      reordered.push(rem);
    }
    setDocuments(reordered);

    try {
      await reorderDocuments(newOrderedIds);
    } catch (err) {
      console.error('Failed to persist document order:', err);
    }
  };

  // Zoom into an item (preserves current viewMode!)
  const handleZoomIn = (itemId: string) => {
    handleNavigateTo(itemId);
  };

  // Keyboard shortcut listener (Ctrl+F, Ctrl+/, Alt+G, Ctrl+[, Alt+Left, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        handleToggleViewMode(viewMode === 'outline' ? 'gantt' : 'outline');
      } else if (((e.ctrlKey || e.metaKey) && e.key === '[') || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        // Zoom out to parent
        if (zoomItemId && activeDoc?.items[zoomItemId]) {
          const parentId = activeDoc.items[zoomItemId].parentId;
          handleNavigateTo(parentId);
        }
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        if (undoStackRef.current.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))
      ) {
        if (redoStackRef.current.length > 0) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [zoomItemId, activeDoc, viewMode, handleUndo, handleRedo]);

  if (!activeDoc) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Loading DiviTask...</span>
        </div>
      </div>
    );
  }

  const validZoomItemId = zoomItemId && activeDoc.items[zoomItemId] ? zoomItemId : null;

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('divitask-sidebar-open', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggleOpen={handleToggleSidebar}
        documents={documents}
        activeDocId={activeDocId}
        onSelectDocument={handleSelectDocument}
        onCreateDocument={handleCreateDocument}
        onDeleteDocument={handleDeleteDocument}
        onDuplicateDocument={handleDuplicateDocument}
        onRenameDocument={handleRenameDocument}
        onReorderDocuments={handleReorderDocuments}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Consolidated Top Header (collapsible in Zen / Fullscreen mode) */}
        {!isZenMode && (
          <Header
            document={activeDoc}
            zoomItemId={validZoomItemId}
            viewMode={viewMode}
            onNavigateTo={handleNavigateTo}
            onToggleViewMode={handleToggleViewMode}
            onOpenSearch={() => setIsSearchOpen(true)}
            isSaving={isSaving}
            hideCompleted={hideCompleted}
            onToggleHideCompleted={handleToggleHideCompleted}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        )}

        {/* Tag Filter Banner */}
        {filterTag && (
          <div className="flex items-center justify-between px-4 py-1.5 bg-blue-50 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-900/60 text-xs text-blue-700 dark:text-blue-300">
            <span>
              Filtering by: <strong className="font-semibold">{filterTag}</strong>
            </span>
            <button
              onClick={() => setFilterTag(null)}
              className="text-xs hover:underline text-blue-600 dark:text-blue-400"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Main View Area: Outline View OR Timeline View */}
        <main className="flex-1 overflow-auto relative">
          {viewMode === 'outline' ? (
            <OutlinerTree
              document={activeDoc}
              zoomItemId={validZoomItemId}
              onUpdateDocument={handleUpdateDocument}
              onZoomIn={handleZoomIn}
              onUndo={handleUndo}
              onRedo={handleRedo}
              filterQuery={filterTag || undefined}
              onFilterTag={(tag) => setFilterTag(tag)}
              hideCompleted={hideCompleted}
            />
          ) : (
            <GanttChart
              document={activeDoc}
              zoomItemId={validZoomItemId}
              settings={settings}
              onUpdateDocument={handleUpdateDocument}
              onBackToOutline={() => handleToggleViewMode('outline')}
              onZoomIntoNode={handleZoomIn}
              hideCompleted={hideCompleted}
              initialViewState={timelineViewState}
              onSaveViewState={setTimelineViewState}
              isZenMode={isZenMode}
              onToggleZenMode={() => setIsZenMode((prev) => !prev)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={(newSettings) => {
            setSettings(newSettings);
            saveAppSettings(newSettings);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isSearchOpen && (
        <SearchModal
          document={activeDoc}
          onSelectTask={(id, openGantt) => {
            if (openGantt) {
              setZoomItemId(id);
              setViewMode('gantt');
            } else {
              setZoomItemId(id);
              setViewMode('outline');
            }
          }}
          onClose={() => setIsSearchOpen(false)}
        />
      )}

      {isShortcutsOpen && (
        <KeyboardShortcutsModal onClose={() => setIsShortcutsOpen(false)} />
      )}

      {isExportImportOpen && (
        <ExportImportModal
          document={activeDoc}
          onImportSuccess={(newDoc) => {
            setDocuments((prev) => [
              {
                id: newDoc.id,
                title: newDoc.title,
                itemCount: Object.keys(newDoc.items).length,
                completedCount: Object.values(newDoc.items).filter((i) => i.completed).length,
                createdAt: newDoc.createdAt,
                updatedAt: newDoc.updatedAt,
              },
              ...prev,
            ]);
            setActiveDocId(newDoc.id);
            setActiveDoc(newDoc);
            setZoomItemId(null);
          }}
          onClose={() => setIsExportImportOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
