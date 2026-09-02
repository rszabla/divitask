import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  initDatabase,
  listDocuments,
  getDocument,
  saveDocument,
  createDocument,
  deleteDocument,
  duplicateDocument,
  reorderDocuments,
  exportToMarkdown,
  exportToOPML,
  importFromMarkdown,
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize DB
initDatabase();

// API Routes
app.get('/api/documents', (req, res) => {
  try {
    const docs = listDocuments();
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents', (req, res) => {
  try {
    const { title } = req.body;
    const doc = createDocument(title);
    res.status(201).json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id', (req, res) => {
  try {
    const doc = getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/documents/reorder', (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array' });
    }
    const list = reorderDocuments(orderedIds);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/documents/:id', (req, res) => {
  try {
    const doc = req.body;
    if (!doc || doc.id !== req.params.id) {
      return res.status(400).json({ error: 'Mismatched or missing document id' });
    }
    const saved = saveDocument(doc);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documents/:id', (req, res) => {
  try {
    deleteDocument(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents/:id/duplicate', (req, res) => {
  try {
    const dup = duplicateDocument(req.params.id);
    if (!dup) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.status(201).json(dup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:id/export', (req, res) => {
  try {
    const doc = getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const format = req.query.format || 'json';
    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(doc, null, 2));
    } else if (format === 'markdown') {
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.md"`);
      res.setHeader('Content-Type', 'text/markdown');
      return res.send(exportToMarkdown(doc));
    } else if (format === 'opml') {
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.opml"`);
      res.setHeader('Content-Type', 'text/xml');
      return res.send(exportToOPML(doc));
    } else {
      return res.status(400).json({ error: 'Unsupported format' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents/import', (req, res) => {
  try {
    const { format, content, title } = req.body;
    if (format === 'json') {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      // generate a new id
      parsed.id = 'doc-' + Math.random().toString(36).substring(2, 9);
      const saved = saveDocument(parsed);
      return res.status(201).json(saved);
    } else if (format === 'markdown') {
      const doc = importFromMarkdown(title, content);
      return res.status(201).json(doc);
    } else {
      return res.status(400).json({ error: 'Unsupported import format' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Production: serve client build
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
