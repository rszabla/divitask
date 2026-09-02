# DiviTask — Project Blueprint & Context Reference

> **Context Restoration Note for AI Assistants**: This document was written specifically to provide complete context, architecture details, design decisions, and operating instructions for this codebase when starting a fresh session. Read this file first to resume work seamlessly.

---

## 📌 Project Overview & Purpose

**DiviTask** is a full-featured web application featuring an infinitely nested outliner/task list, integrated with a **hierarchically nested, zoomable Timeline chart**.

- **Workspace Path**: `/work/2026-09-01_diy_task_manager` (bind-mounted from the host Windows machine).
- **Host Access**: Available at `http://localhost:3000` on Windows (container runs with `-p 3000:3000`).
- **Data Persistence**: Stored on disk in `/work/2026-09-01_diy_task_manager/data/` as atomic JSON documents.

---

## 🎯 Key Requirements & Evolution

### Core Requirements
1. Create a task manager webapp featuring an infinitely nested outliner.
2. Add a hierarchically nested Gantt/Timeline chart zoomable along the x-axis (time), with collapsible/expandable subtasks and interactively editable task bar positions (start/end dates) and widths (duration).
3. Dockerizable for eventual server deployment.

### UX Evolution & Design Refinements
- **Unified Navigation & View Sync**: Rather than forcing Gantt mode on "Zoom In", the app has an **Outline View** and a **Gantt View**, toggled via top bar buttons (`Outline` ⟷ `Gantt`) or `Alt + G`.
- **Shared Zoom State (`zoomItemId`)**: The active task zoom is shared across views:
  - In **Outline View**: Clicking a task's bullet dot (or `Ctrl + ]`) zooms into that task, showing it as a prominent header with its subtasks listed beneath it.
  - Clicking **Gantt View**: Shows the interactive Gantt timeline for that *exact same zoomed task and its subtasks*.
  - Navigating up or down in the **Breadcrumb path** (`Document > Project > Task`) is mirrored in both views.

---

## 🏗️ Architecture & Technology Stack

```
/work/2026-09-01_diy_task_manager/
├── client/                     # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Markdown & tag rendering
│   │   │   │   └── MarkdownText.tsx
│   │   │   ├── outliner/       # Recursive outliner
│   │   │   │   ├── BreadcrumbNav.tsx
│   │   │   │   ├── OutlinerTree.tsx
│   │   │   │   ├── OutlinerItem.tsx
│   │   │   │   ├── ItemMenu.tsx
│   │   │   │   └── DatePickerPopover.tsx
│   │   │   ├── gantt/          # Hierarchical nested Gantt chart
│   │   │   │   ├── GanttChart.tsx
│   │   │   │   ├── GanttHeader.tsx
│   │   │   │   ├── GanttTimeline.tsx
│   │   │   │   ├── GanttTaskBar.tsx
│   │   │   │   └── TaskDetailModal.tsx
│   │   │   └── layout/         # Shell, navigation, modals
│   │   │       ├── Sidebar.tsx
│   │   │       ├── Header.tsx
│   │   │       ├── SearchModal.tsx
│   │   │       ├── KeyboardShortcutsModal.tsx
│   │   │       └── ExportImportModal.tsx
│   │   ├── utils/
│   │   │   ├── api.ts          # Backend API client
│   │   │   ├── dateUtils.ts    # Gantt coordinate math & date math (date-fns)
│   │   │   └── treeUtils.ts    # Tree traversal, flattening, ancestors, summary spans
│   │   ├── types.ts            # Frontend TypeScript definitions
│   │   ├── App.tsx             # Root state, theme, view switcher, auto-save
│   │   └── main.tsx
│   ├── dist/                   # Production build output
│   └── package.json
│
├── server/                     # Node 22 + Express + TypeScript
│   ├── src/
│   │   ├── index.ts            # Express server (binds 0.0.0.0:3000), serves API & client/dist
│   │   ├── db.ts               # Atomic JSON persistence & OPML/Markdown export/import
│   │   ├── defaultData.ts      # Seeded rich starter project
│   │   └── types.ts            # Server data types
│   ├── dist/                   # Compiled server JS (ES modules)
│   └── package.json            # "type": "module"
│
├── data/                       # Persistent JSON storage (bind-mounted to host)
│   ├── index.json              # Document summaries metadata
│   └── documents/              # <documentId>.json individual document trees
│
├── Dockerfile                  # Multi-stage production container build
├── docker-compose.yml          # Container configuration with volume mount
├── package.json                # Root scripts (npm run dev, npm run build, npm start)
└── README.md                   # Full user documentation
```

---

## 📊 Core Data Models (`types.ts`)

Normalized tree structure for $O(1)$ item updates and clean serialization:

```typescript
export interface TaskItem {
  id: string;
  content: string;             // Title text (supports markdown, #tags, @mentions, !dates)
  note?: string;               // Optional multiline note description
  completed: boolean;          // Checked status (with confetti animation on check)
  collapsed: boolean;          // Child visibility in outline view
  parentId: string | null;     // null if top-level root item
  childIds: string[];          // Ordered list of subtask IDs
  startDate?: string;          // ISO Date: YYYY-MM-DD
  endDate?: string;            // ISO Date: YYYY-MM-DD
  color?: string;              // Accent hex color (default #3b82f6)
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
- **Indentation & Hierarchy**: Infinite nesting using parent-child IDs.
- **Outliner Keyboard Shortcuts**:
  - `Enter`: Insert sibling task below.
  - `Tab`: Indent (make subtask of preceding sibling).
  - `Shift + Tab`: Unindent (move up to parent's level).
  - `Backspace`: Delete empty task and focus previous item.
  - `Ctrl + Enter`: Toggle completed (with celebration confetti).
  - `Ctrl + ]` or `Alt + →`: **Zoom in** to focused task.
  - `Ctrl + [` or `Alt + ←`: **Zoom out** to parent task.
  - `↑ / ↓ Arrows`: Linear cursor navigation through visible tasks.
- **Bullet Click Navigation**: Clicking any bullet dot zooms into that task. Right-click opens the context menu (`ItemMenu`).
- **Markdown & Inline Triggers**: Bold `**text**`, Italic `*text*`, Code `` `text` ``, Strikethrough `~~text~~`, Links `[text](url)`, `#tags` (clickable to filter), `@mentions`, `!YYYY-MM-DD` (date chips).
- **When Zoomed In**:
  - Top header displays the zoomed task title (editable in-place), its notes, date chips, and completion checkbox.
  - Direct children (`childIds`) are listed beneath it.

### 2. The Hierarchical Gantt View (`GanttChart.tsx`, `GanttTaskBar.tsx`)
- **Split Pane Layout**: Left table (task name, duration, collapse chevrons, quick add, details button) + Right timeline. Pane width is resizable via a draggable splitter bar.
- **Hierarchical Collapse Sync**: Collapsing a parent row in the table collapses its subtask bars from the timeline too.
- **Interactive Dragging & Resizing**:
  - Dragging the middle of a task bar: Horizontally shifts `startDate` and `endDate` simultaneously, preserving duration.
  - Dragging the left edge: Resizes `startDate`.
  - Dragging the right edge: Resizes `endDate`.
  - Live floating tooltip displays exact formatted dates and duration in days during drag.
- **Time Zoom along X-Axis**: Segmented buttons for `Day` (~84px/day), `Week` (~42px/day), `Month` (~18px/day), and `Quarter` (~6px/day), plus mouse wheel zoom.
- **Today Guideline**: Vertical blue marker line with "Today" badge and a quick "Today" center-scroll button.
- **Unscheduled Tasks**: Clicking anywhere on an empty timeline row automatically schedules that task at the clicked date.

### 3. Navigation & Breadcrumbs (`BreadcrumbNav.tsx`, `Header.tsx`)
- Top breadcrumbs bar shows: `[Up Button] [Home Icon] Document Name > Parent > ... > Zoomed Task`.
- Breadcrumb navigation is active in **both views**.
- Top view switch (`Outline` ⟷ `Gantt`) or `Alt + G` toggles between views without losing your place.

### 4. Storage & Export/Import (`db.ts`, `ExportImportModal.tsx`)
- **Auto-Save**: Debounced (400ms) PUT to `/api/documents/:id`.
- **Atomic File Writes**: Temporary file + `renameSync` ensures zero corruption on abrupt shutdown.
- **Export formats**:
  - **JSON**: Full-fidelity export with dates, colors, notes, and progress.
  - **Markdown Outline (`.md`)**: Standard nested markdown bullets with `[ ]` / `[x]` checkboxes and dates.
  - **OPML (`.opml`)**: Standard XML outline format.
- **Import**: Supports importing JSON documents and Markdown bullet lists.

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

## 📋 Docker Container Environment Details

- **Host Environment**: Windows machine running Docker Desktop (WSL2 backend).
- **Container Startup**: Launched via user's PowerShell function `slopmachine`:
  - Working directory `/work/2026-09-01_diy_task_manager` is mapped to Windows host directory.
  - Ports forwarded: `-p 3000:3000` (and `-p 5173:5173`).
  - Server binds explicitly to `0.0.0.0:3000` so it responds to requests coming across the Docker NAT bridge from the Windows host browser.

---

## 🔮 Potential Enhancements / What to Iron Out Next

1. **Drag-and-Drop Reordering in Outline**: Dragging a bullet up/down to reorder siblings or drop onto another item to nest.
2. **Gantt Task Dependencies**: Connectors (arrows) between dependent tasks (finish-to-start) that shift downstream tasks when an upstream task is delayed.
3. **Undo / Redo (`Ctrl+Z` / `Ctrl+Y`)**: In-memory history stack for task edits and deletions.
4. **Multi-Selection**: Selecting multiple tasks with `Shift+Click` to indent/delete/schedule in bulk.
5. **Color Customization in Gantt**: Custom color palette per project/tag.
