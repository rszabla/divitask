import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TaskDocument, DocumentSummary, TaskItem } from './types.js';
import { createDemoDocument } from './defaultData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory is in /work/2026-09-01_diy_task_manager/data (or DATA_DIR env)
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const DOCS_DIR = path.join(DATA_DIR, 'documents');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
}

// Atomic write to avoid partial writes or corruptions
function writeJsonAtomic(filePath: string, data: any) {
  const tmpPath = `${filePath}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export function initDatabase() {
  ensureDirectories();

  if (!fs.existsSync(INDEX_FILE)) {
    const demo = createDemoDocument();
    saveDocument(demo);
  }
}

export function listDocuments(): DocumentSummary[] {
  ensureDirectories();
  if (!fs.existsSync(INDEX_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading index.json', err);
    return [];
  }
}

function updateIndexSummary(doc: TaskDocument) {
  const summaries = listDocuments();
  const items = Object.values(doc.items);
  const itemCount = items.length;
  const completedCount = items.filter(i => i.completed).length;

  const existingIdx = summaries.findIndex(s => s.id === doc.id);
  const summary: DocumentSummary = {
    id: doc.id,
    title: doc.title,
    itemCount,
    completedCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (existingIdx >= 0) {
    summaries[existingIdx] = summary;
  } else {
    summaries.unshift(summary);
  }

  writeJsonAtomic(INDEX_FILE, summaries);
}

export function reorderDocuments(orderedIds: string[]): DocumentSummary[] {
  ensureDirectories();
  const summaries = listDocuments();
  const map = new Map(summaries.map((s) => [s.id, s]));
  const reordered: DocumentSummary[] = [];

  for (const id of orderedIds) {
    const s = map.get(id);
    if (s) {
      reordered.push(s);
      map.delete(id);
    }
  }

  for (const remaining of map.values()) {
    reordered.push(remaining);
  }

  writeJsonAtomic(INDEX_FILE, reordered);
  return reordered;
}

export function getDocument(id: string): TaskDocument | null {
  ensureDirectories();
  const docPath = path.join(DOCS_DIR, `${id}.json`);
  if (!fs.existsSync(docPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(docPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading document ${id}`, err);
    return null;
  }
}

export function saveDocument(doc: TaskDocument): TaskDocument {
  ensureDirectories();
  doc.updatedAt = new Date().toISOString();
  if (!doc.createdAt) {
    doc.createdAt = doc.updatedAt;
  }
  const docPath = path.join(DOCS_DIR, `${doc.id}.json`);
  writeJsonAtomic(docPath, doc);
  updateIndexSummary(doc);
  return doc;
}

export function createDocument(title: string): TaskDocument {
  const id = 'doc-' + Math.random().toString(36).substring(2, 9);
  const firstItemId = 'item-' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  const doc: TaskDocument = {
    id,
    title: title || 'Untitled Document',
    rootItemIds: [firstItemId],
    items: {
      [firstItemId]: {
        id: firstItemId,
        content: 'First task',
        note: '',
        completed: false,
        collapsed: false,
        parentId: null,
        childIds: [],
        createdAt: now,
        updatedAt: now,
      }
    },
    createdAt: now,
    updatedAt: now,
  };

  return saveDocument(doc);
}

export function deleteDocument(id: string): boolean {
  ensureDirectories();
  const docPath = path.join(DOCS_DIR, `${id}.json`);
  if (fs.existsSync(docPath)) {
    fs.unlinkSync(docPath);
  }

  const summaries = listDocuments().filter(s => s.id !== id);
  writeJsonAtomic(INDEX_FILE, summaries);
  return true;
}

export function duplicateDocument(id: string): TaskDocument | null {
  const original = getDocument(id);
  if (!original) return null;

  const newDocId = 'doc-' + Math.random().toString(36).substring(2, 9);
  const idMap: Record<string, string> = {};

  // generate new IDs for all items
  for (const oldId of Object.keys(original.items)) {
    idMap[oldId] = 'item-' + Math.random().toString(36).substring(2, 9);
  }

  const newItems: Record<string, TaskItem> = {};
  const now = new Date().toISOString();

  for (const [oldId, item] of Object.entries(original.items)) {
    const newId = idMap[oldId];
    newItems[newId] = {
      ...item,
      id: newId,
      parentId: item.parentId ? idMap[item.parentId] || null : null,
      childIds: item.childIds.map(c => idMap[c]).filter(Boolean),
      createdAt: now,
      updatedAt: now,
    };
  }

  const newDoc: TaskDocument = {
    id: newDocId,
    title: `${original.title} (Copy)`,
    rootItemIds: original.rootItemIds.map(r => idMap[r]).filter(Boolean),
    items: newItems,
    createdAt: now,
    updatedAt: now,
  };

  return saveDocument(newDoc);
}

// Convert Document to Markdown Outline
export function exportToMarkdown(doc: TaskDocument): string {
  const lines: string[] = [`# ${doc.title}`, ''];

  function dumpItem(itemId: string, indentLevel: number) {
    const item = doc.items[itemId];
    if (!item) return;

    const indent = '  '.repeat(indentLevel);
    const check = item.completed ? '[x] ' : '[ ] ';
    const dates = (item.startDate || item.endDate) ? ` !(${item.startDate || ''} ~ ${item.endDate || ''})` : '';
    lines.push(`${indent}- ${check}${item.content}${dates}`);
    if (item.note) {
      const noteIndent = '  '.repeat(indentLevel + 1);
      lines.push(`${noteIndent}${item.note.replace(/\n/g, `\n${noteIndent}`)}`);
    }

    for (const childId of item.childIds) {
      dumpItem(childId, indentLevel + 1);
    }
  }

  for (const rootId of doc.rootItemIds) {
    dumpItem(rootId, 0);
  }

  return lines.join('\n');
}

// Convert Document to OPML (standard XML outliner format)
export function exportToOPML(doc: TaskDocument): string {
  function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  function dumpItemXml(itemId: string): string {
    const item = doc.items[itemId];
    if (!item) return '';

    const text = escapeXml(item.content);
    const note = item.note ? ` _note="${escapeXml(item.note)}"` : '';
    const completed = item.completed ? ' _complete="true"' : '';
    const startDate = item.startDate ? ` startDate="${escapeXml(item.startDate)}"` : '';
    const endDate = item.endDate ? ` endDate="${escapeXml(item.endDate)}"` : '';

    if (item.childIds.length === 0) {
      return `<outline text="${text}"${note}${completed}${startDate}${endDate} />\n`;
    }

    const childrenXml = item.childIds.map(dumpItemXml).join('');
    return `<outline text="${text}"${note}${completed}${startDate}${endDate}>\n${childrenXml}</outline>\n`;
  }

  const bodyXml = doc.rootItemIds.map(dumpItemXml).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(doc.title)}</title>
    <dateCreated>${doc.createdAt}</dateCreated>
  </head>
  <body>
${bodyXml}
  </body>
</opml>`;
}

// Import Markdown outline into a new TaskDocument
export function importFromMarkdown(title: string, markdownText: string): TaskDocument {
  const docId = 'doc-' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();
  const items: Record<string, TaskItem> = {};
  const rootItemIds: string[] = [];

  const lines = markdownText.split('\n');
  const stack: { id: string; indent: number }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // determine indent
    const matchIndent = rawLine.match(/^(\s*)/);
    const indentLength = matchIndent ? matchIndent[1].length : 0;
    const trimmed = line.trim();

    // Check if bullet
    const bulletMatch = trimmed.match(/^[-*+]\s+(\[( |x|X)\]\s+)?(.*)$/);
    if (bulletMatch) {
      const isCompleted = bulletMatch[2]?.toLowerCase() === 'x';
      const content = bulletMatch[3];
      const newItemId = 'item-' + Math.random().toString(36).substring(2, 9);

      // Find parent in stack
      while (stack.length > 0 && stack[stack.length - 1].indent >= indentLength) {
        stack.pop();
      }

      const parentId = stack.length > 0 ? stack[stack.length - 1].id : null;

      const newItem: TaskItem = {
        id: newItemId,
        content,
        note: '',
        completed: isCompleted,
        collapsed: false,
        parentId,
        childIds: [],
        createdAt: now,
        updatedAt: now,
      };

      items[newItemId] = newItem;

      if (parentId && items[parentId]) {
        items[parentId].childIds.push(newItemId);
      } else {
        rootItemIds.push(newItemId);
      }

      stack.push({ id: newItemId, indent: indentLength });
    } else if (stack.length > 0) {
      // It's a note on the current item
      const currentItem = items[stack[stack.length - 1].id];
      if (currentItem) {
        currentItem.note = currentItem.note ? `${currentItem.note}\n${trimmed}` : trimmed;
      }
    }
  }

  const doc: TaskDocument = {
    id: docId,
    title: title || 'Imported Document',
    rootItemIds,
    items,
    createdAt: now,
    updatedAt: now,
  };

  return saveDocument(doc);
}
