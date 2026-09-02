import { TaskDocument, DocumentSummary } from '../types.js';

const API_BASE = '/api';

export async function fetchDocuments(): Promise<DocumentSummary[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function fetchDocument(id: string): Promise<TaskDocument> {
  const res = await fetch(`${API_BASE}/documents/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch document ${id}`);
  return res.json();
}

export async function saveDocument(doc: TaskDocument): Promise<TaskDocument> {
  const res = await fetch(`${API_BASE}/documents/${doc.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error('Failed to save document');
  return res.json();
}

export async function createDocument(title = 'Untitled'): Promise<TaskDocument> {
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create document');
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

export async function duplicateDocument(id: string): Promise<TaskDocument> {
  const res = await fetch(`${API_BASE}/documents/${id}/duplicate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to duplicate document');
  return res.json();
}

export async function reorderDocuments(orderedIds: string[]): Promise<DocumentSummary[]> {
  const res = await fetch(`${API_BASE}/documents/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) throw new Error('Failed to reorder documents');
  return res.json();
}

export async function importDocument(title: string, content: string, format: 'json' | 'markdown'): Promise<TaskDocument> {
  const res = await fetch(`${API_BASE}/documents/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, format }),
  });
  if (!res.ok) throw new Error('Failed to import document');
  return res.json();
}
