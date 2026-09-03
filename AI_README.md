# DiviTask — Project Blueprint & Context Reference

> **Context Restoration Note for AI Assistants**: This document was written specifically to provide complete context, architecture details, design decisions, and operating instructions for this codebase when starting a fresh session. Read this file first to resume work seamlessly.

---

## 📌 Project Overview & Purpose

**DiviTask** is a self-hostable, full-featured web application combining an infinitely nested outliner/task list with a **hierarchically nested, zoomable Gantt Timeline chart**.

- **Repository / Workspace Path**: `/work/divitask` (formerly `/work/2026-09-01_diy_task_manager`).
- **Host Access**: Runs on port `3000` (e.g. `http://localhost:3000`).
- **Data Persistence**: Stored on disk in `/app/data` (host bind-mount `/docker/divitask/data` or local `./data/`) as atomic JSON documents.
- **PWA Ready**: Installable as a Progressive Web App (PWA) with full offline caching and standalone full-screen support on mobile and desktop.

---

## 🎯 Key Requirements & Evolution

### Core Requirements
1. **Infinitely Nested Outliner**: Keyboard-driven outliner (Workflowy/Dynalist style) with markdown, tags, dates, and drag-and-drop reordering.
2. **Hierarchical Gantt / Timeline**: Zoomable along the x-axis (Hour, Day, Week, Month, Quarter, Year), with interactive timeblocks, start/end dates & times, resize handles, and multi-block support per task.
3. **PWA & Mobile-First Experience**: Touch gestures, responsive auto-switching between portrait (100% timeline) and landscape (split view), and standalone installation.
4. **Self-Hostable & Dockerized**: Zero external database dependencies; deploys seamlessly via Docker Compose and Portainer stacks.

### UX Evolution & Design Refinements
- **Unified Navigation & View Sync**: Top navigation toggles between **Outline View** and **Timeline View** (`Alt + G`).
- **Shared Zoom State (`zoomItemId`)**: The active task zoom is preserved across views:
  - In **Outline View**: Clicking a task's bullet dot (or `Ctrl + ]`) zooms into that subtree.
  - In **Timeline View**: Shows the timeline for that *exact same zoomed subtree*.
  - Breadcrumb navigation (`Document > Project > Task`) mirrors the active hierarchy in both views.
- **Undo / Redo System**: Full history stack tracking document states with physical shortcuts (`Ctrl+Z`, `Ctrl+Y`) and single-tap header buttons (`Undo2`, `Redo2`) next to the Saved indicator.

---

## 🏗️ Architecture & Technology Stack

```
/work/divitask/
├── client/                     # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── public/                 # Static assets & PWA files
│   │   ├── logo.png            # App logo
│   │   ├── favicon.png         # Browser favicon
│   │   ├── apple-touch-icon.png# iOS home screen icon (180x180)
│   │   ├── icon-192.png        # PWA standard icon (192x192)
│   │   ├── icon-512.png        # PWA standard icon (512x512)
│   │   ├── icon-maskable-192.png # Android maskable adaptive icon
│   │   ├── icon-maskable-512.png # Android maskable adaptive icon
│   │   ├── manifest.webmanifest# W3C Web App Manifest (primary)
│   │   ├── manifest.json       # W3C Web App Manifest (alias)
│   │   └── sw.js               # Service Worker (offline cache & network strategies)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Markdown & tag rendering
│   │   │   │   └── MarkdownText.tsx
│   │   │   ├── outliner/       # Recursive outliner
│   │   │   │   ├── BreadcrumbNav.tsx
│   │   │   │   ├── OutlinerTree.tsx
│   │   │   │   ├── OutlinerItem.tsx # Mouse & touch drag reordering
│   │   │   │   ├── ItemMenu.tsx
│   │   │   │   └── DatePickerPopover.tsx
│   │   │   ├── gantt/          # Hierarchical nested Gantt chart
│   │   │   │   ├── GanttChart.tsx   # Split view, touch drags, zoom calculations
│   │   │   │   ├── GanttHeader.tsx  # Single-line navigation, zoom, Zen toggle
│   │   │   │   ├── GanttTimeline.tsx
│   │   │   │   ├── GanttTaskBar.tsx # Multi-block bar, touch handles
│   │   │   │   └── TaskDetailModal.tsx
│   │   │   └── layout/         # Shell, navigation, modals
│   │   │       ├── Sidebar.tsx      # Document list, PWA install prompt
│   │   │       ├── Header.tsx       # Breadcrumbs, Undo/Redo, Save pill, View toggle
│   │   │       ├── SearchModal.tsx
│   │   │       ├── KeyboardShortcutsModal.tsx
│   │   │       └── ExportImportModal.tsx
│   │   ├── utils/
│   │   │   ├── api.ts          # Backend API client
│   │   │   ├── dateUtils.ts    # Multi-tier timeline math & subdivisions
│   │   │   └── treeUtils.ts    # Tree traversal, flattening, ancestors, rollups
│   │   ├── types.ts            # Frontend TypeScript definitions
│   │   ├── App.tsx             # Root state, theme, undo stack, auto-save
│   │   └── main.tsx            # React root & Service Worker registration
│   ├── dist/                   # Compiled client production build
│   └── package.json
│
├── server/                     # Node 22 + Express + TypeScript
│   ├── src/
│   │   ├── index.ts            # Express server (binds 0.0.0.0:PORT), PWA headers, API
│   │   ├── db.ts               # Atomic JSON persistence & OPML/Markdown export/import
│   │   ├── defaultData.ts      # Seeded rich starter project (with timeBlocks)
│   │   └── types.ts            # Server data types
│   ├── dist/                   # Compiled server JS (ES modules)
│   └── package.json            # "type": "module"
│
├── data/                       # Persistent JSON storage (bind-mounted to host)
│   ├── index.json              # Document summaries metadata
│   └── documents/              # <documentId>.json individual document trees
│
├── Dockerfile                  # Multi-stage production container build (Alpine)
├── docker-compose.yml          # Container configuration with volume mount
├── package.json                # Root scripts (npm run dev, npm run build, etc.)
├── README.md                   # User & deployment guide
└── AI_README.md                # This context blueprint
```

---

## 📊 Core Data Models (`types.ts`)

Normalized tree structure for $O(1)$ item updates and clean JSON serialization:

```typescript
export interface TimeBlock {
  id: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  startTime?: string;  // HH:mm (24h format, optional)
  endTime?: string;    // HH:mm (24h format, optional)
  color?: string;
  progress?: number;   // 0 - 100
}

export interface TaskItem {
  id: string;
  content: string;             // Title text (supports markdown, #tags, @mentions, !dates)
  note?: string;               // Optional multiline note description
  completed: boolean;          // Checked status (with confetti animation)
  collapsed: boolean;          // Child visibility in outline view
  parentId: string | null;     // null if top-level root item
  childIds: string[];          // Ordered list of subtask IDs
  startDate?: string;          // YYYY-MM-DD
  endDate?: string;            // YYYY-MM-DD
  startTime?: string;          // HH:mm
  endTime?: string;            // HH:mm
  timeBlocks?: TimeBlock[];    // Multi-interval timeline blocks
  color?: string;              // Accent hex color
  progress?: number;           // 0 to 100 percentage
  createdAt: string;
  updatedAt: string;
}

export interface TaskDocument {
  id: string;
  title: string;
  rootItemIds: string[];       // Top-level task IDs
  items: Record<string, TaskItem>; // Normalized map of all items
  createdAt: string;
  updatedAt: string;
}
```

---

## 🕹️ Key Features & Behaviors

### 1. The Outliner View (`OutlinerTree.tsx`, `OutlinerItem.tsx`)
- **Indentation & Hierarchy**: Infinite nesting using parent-child ID pointers.
- **Drag-to-Reorder (Mouse & Touch)**: Drag bullet handle to reorder before, after, or nest inside another task. Uses `window.document.elementFromPoint` for touch devices.
- **Keyboard Shortcuts**:
  - `Enter`: Insert sibling task below.
  - `Tab` / `Shift + Tab`: Indent / Outdent task.
  - `Ctrl + Enter`: Toggle completed (triggers celebration confetti).
  - `Ctrl + ]` / `Ctrl + [`: Zoom into / Zoom out of focused task.
  - `↑ / ↓ Arrows`: Navigate through visible items.
- **Mobile Menu Visibility**: The `...` action button is persistently accessible (`opacity-60`) on touch devices without needing mouse hover.

### 2. The Hierarchical Gantt View (`GanttChart.tsx`, `GanttTaskBar.tsx`)
- **Multi-Block per Task**: Supports multiple distinct time blocks on a single task row.
- **Mouse & Touch Drag Controls**:
  - Dragging block center: Horizontally shifts start and end dates/times together.
  - Dragging left/right edge handles: Resizes start or end date/time smoothly.
  - `touch-action: none` prevents browser viewport panning during dragging.
  - Live tooltip displays exact dates, times, and duration.
- **Collapsed Color Picker**: Bottom status bar collapses color choices into a single palette button with popover picker.
- **Deselection Safety**: Clicking empty timeline row deselects active blocks. Typing inside task inputs protects against accidental deletion.

### 3. Responsive Engine & Mobile Layouts
- **Portrait Mode (`< 640px`)**: Automatically hides the left task list and allocates 100% of the screen width to the zoomable timeline.
- **Landscape & Desktop Mode (`≥ 640px`)**: Automatically restores the side-by-side split view with a draggable splitter.
- **Compact Viewport Optimization**: Dynamically compresses multi-tier header heights and task row heights (`32px` vs `38px`) when screen height $\le 520px$ (e.g. phones in landscape).
- **Zen / Fullscreen Mode (`isZenMode`)**: Single-tap toggle (`[ ⤢ ]`) collapses the top header to maximize vertical workspace.

### 4. Progressive Web App (PWA)
- **Manifest**: [`manifest.webmanifest`](client/public/manifest.webmanifest) with `"display": "standalone"`, `"orientation": "any"`, and high-res icon set.
- **Service Worker**: [`sw.js`](client/public/sw.js) provides instant boot via precached assets, stale-while-revalidate for static files, and network-first for `/api/`.
- **Install Prompt**: Sidebar intercepts `beforeinstallprompt` to offer a one-click **"Install Web App"** button.

### 5. Storage & Export/Import (`db.ts`, `ExportImportModal.tsx`)
- **Auto-Save**: Debounced (400ms) PUT to `/api/documents/:id`.
- **Atomic Writes**: Temporary file + `renameSync` ensures zero corruption.
- **Formats**: JSON (full fidelity), Markdown (`.md` with checkboxes and dates), and OPML.

---

## ⚡ Useful Terminal Commands

```bash
# 1. Start production server (Listening on http://0.0.0.0:3000)
PORT=3000 node server/dist/index.js

# 2. Build everything (Client bundle into client/dist, server into server/dist)
npm run build

# 3. Build client only
npm run build:client

# 4. Build server only
npm run build:server

# 5. Run development mode (Vite on 5173 + API on 3001)
npm run dev

# 6. Test API endpoints
curl -s http://localhost:3000/api/documents
```

---

## 🚢 Portainer Deployment & Update Instructions

1. **Deployment**:
   - Repository URL: `https://github.com/rszabla/divitask.git`
   - Reference: `refs/heads/main`
   - Compose path: `docker-compose.yml`
   - Persistent volume: `${DATA_PATH:-/docker/divitask/data}:/app/data`
2. **Updating**:
   - Click **Pull and redeploy**.
   - **CRUCIAL**: Leave **"Re-pull image" OFF (unchecked)**. DiviTask builds locally from its Dockerfile; toggling "Re-pull image" will fail because no image exists on Docker Hub.

---

## 🔮 Future Roadmap Items

1. **Gantt Task Dependencies**: Connectors (arrows) between dependent tasks (finish-to-start) with cascading date shifts.
2. **Recurring Tasks**: Daily, weekly, or custom recurrence rules for tasks and timeblocks.
3. **Multi-Task Selection**: Selecting multiple items with `Shift+Click` for bulk operations.
4. **Cloud / WebDAV Sync**: Direct backup/sync to Nextcloud, WebDAV, or S3-compatible object storage.
