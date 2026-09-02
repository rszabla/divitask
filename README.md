# DiviTask

<div align="center">
  <img src="client/public/logo.png" alt="DiviTask Logo" width="80" height="80" />
  <p>An infinitely nested task outliner integrated with an interactive, zoomable timeline.</p>
</div>

---

## 🚀 Quick Start (Docker / Portainer)

### Docker Compose
Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  divitask:
    image: divitask:latest
    container_name: divitask
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
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
