# DiviTask

<div align="center">
  <img src="client/public/logo.png" alt="DiviTask Logo" width="80" height="80" />
  <p>An infinitely nested task outliner integrated with an interactive, zoomable timeline.</p>
</div>

---

## 🚢 Deploy with Portainer

1. In Portainer, go to **Stacks** ➔ click **+ Add stack**.
2. Name the stack: `divitask`
3. Under **Build method**, select **Repository**:
   - **Repository URL**: `https://github.com/rszabla/divitask.git`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `docker-compose.yml`
4. *(Optional)* Under **Environment variables**, customize settings:
   - `HOST_PORT`: Server port (default: `3000`)
   - `DATA_PATH`: Host folder for tasks (default: `/docker/divitask/data`)
5. *(Optional)* Turn on **Automatic updates** (polling or webhook).
6. Click **Deploy the stack**.

### 🔄 Updating the Stack in Portainer
1. Go to **Stacks** ➔ click **divitask**.
2. Click **Pull and redeploy**.
3. **Important**: Leave **"Re-pull image" OFF (unchecked)** so Docker builds from the updated `Dockerfile` rather than attempting to pull a non-existent image from Docker Hub.
4. Click **Update**.

---

## 📱 Progressive Web App (PWA) & Mobile

DiviTask is built mobile-first and installable as a standalone PWA:
- **Zero Browser Chrome**: Runs in standalone full-screen mode, reclaiming ~20% of vertical screen space on mobile phones.
- **Offline Capable**: Pre-caches application bundles via Service Worker for instant offline loading.
- **Adaptive Layout**:
  - **Portrait Mode (`< 640px`)**: Automatically hides the left task table and dedicates 100% of the screen width to the zoomable timeline.
  - **Landscape & Desktop (`≥ 640px`)**: Automatically displays the interactive task hierarchy alongside the timeline with a resizable splitter.
- **Touch Drag Controls**: Touch and drag selected timeblocks to move them, drag edge handles to adjust start/end times, and drag task bullets to reorder or nest.
- **Installation**:
  - **Android (Chrome/Firefox)**: Tap **"Install Web App"** in the sidebar or select **Install / Add to Home screen** from the browser menu (HTTPS recommended).
  - **iOS (Safari)**: Tap the Share button (⎋) ➔ **Add to Home Screen** (⊕).

---

## 🐳 Docker Compose (CLI)

```yaml
version: '3.8'

services:
  divitask:
    build:
      context: .
      dockerfile: Dockerfile
    image: divitask:latest
    container_name: divitask
    restart: unless-stopped
    ports:
      - "${HOST_PORT:-3000}:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - DATA_DIR=/app/data
    volumes:
      - ${DATA_PATH:-/docker/divitask/data}:/app/data
```

Start the container:
```bash
docker compose up -d
```
Open **http://localhost:3000** in your browser.

---

## 💻 Local Development

```bash
# Install dependencies
npm install && npm install --prefix server && npm install --prefix client

# Start development servers (API on 3001, Client on 5173)
npm run dev
```

---

## ⌨️ Essential Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Create new task below |
| `Tab` / `Shift + Tab` | Indent / Unindent task |
| `Ctrl + Enter` | Toggle task completed |
| `Ctrl + ]` / `Ctrl + [` | Focus on task / Unfocus to parent |
| `Alt + G` | Toggle Outline ⟷ Timeline view |
| `Drag bullet` | Reorder or nest tasks |
| `Ctrl + F` | Search document |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo |
