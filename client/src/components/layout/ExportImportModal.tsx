import React, { useState } from 'react';
import { X, Download, FileJson, FileText } from 'lucide-react';
import { TaskDocument } from '../../types.js';
import { importDocument } from '../../utils/api.js';

interface ExportImportModalProps {
  document: TaskDocument;
  onImportSuccess: (doc: TaskDocument) => void;
  onClose: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  document,
  onImportSuccess,
  onClose,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [importFormat, setImportFormat] = useState<'json' | 'markdown'>('markdown');
  const [importTitle, setImportTitle] = useState('');
  const [importContent, setImportContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleDownload = (format: 'json' | 'markdown' | 'opml') => {
    window.open(`/api/documents/${document.id}/export?format=${format}`, '_blank');
  };

  const handleExecuteImport = async () => {
    if (!importContent.trim()) {
      setImportError('Please enter or paste the content to import');
      return;
    }
    setImportError(null);
    setIsImporting(true);

    try {
      const newDoc = await importDocument(
        importTitle.trim() || 'Imported Document',
        importContent,
        importFormat
      );
      onImportSuccess(newDoc);
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'Import failed. Check file format.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Download className="w-4 h-4 text-blue-500" />
            Export / Import Documents
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-zinc-800 mt-2 text-xs">
          <button
            onClick={() => setTab('export')}
            className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
              tab === 'export'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Export
          </button>
          <button
            onClick={() => setTab('import')}
            className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
              tab === 'import'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Import
          </button>
        </div>

        {tab === 'export' ? (
          <div className="py-4 space-y-3 text-xs">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Export "{document.title}" in standard formats compatible with Workflowy, Markdown outliners, or other tools:
            </p>

            <button
              onClick={() => handleDownload('json')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileJson className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <div className="font-semibold text-gray-800 dark:text-gray-200">JSON Format</div>
                  <div className="text-[11px] text-gray-400">Full fidelity with timeline dates, colors, notes</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={() => handleDownload('markdown')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-500" />
                <div className="text-left">
                  <div className="font-semibold text-gray-800 dark:text-gray-200">Markdown Outline (.md)</div>
                  <div className="text-[11px] text-gray-400">Standard bulleted list with checkboxes</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={() => handleDownload('opml')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-500" />
                <div className="text-left">
                  <div className="font-semibold text-gray-800 dark:text-gray-200">OPML Format (.opml)</div>
                  <div className="text-[11px] text-gray-400">Import directly into Workflowy or OPML readers</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="py-4 space-y-3 text-xs">
            {importError && (
              <div className="p-2 text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
                {importError}
              </div>
            )}

            <div>
              <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
                Document Title
              </label>
              <input
                type="text"
                placeholder="My Project Outline"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
                Format
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportFormat('markdown')}
                  className={`flex-1 py-1.5 text-center rounded-lg border font-medium ${
                    importFormat === 'markdown'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600'
                      : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Markdown Bullets
                </button>
                <button
                  type="button"
                  onClick={() => setImportFormat('json')}
                  className={`flex-1 py-1.5 text-center rounded-lg border font-medium ${
                    importFormat === 'json'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600'
                      : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
                Paste Content
              </label>
              <textarea
                rows={6}
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder={
                  importFormat === 'markdown'
                    ? "- Task 1\n  - Subtask 1.1\n  - Subtask 1.2\n- Task 2"
                    : '{"id": "...", "title": "...", "items": {...}}'
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 font-mono text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Create Document from Import'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
