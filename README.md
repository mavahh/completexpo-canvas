# ComplexExpo - Exhibition Floor Plan Management

Exhibition management platform with an advanced floorplan editor for managing events, stands, and exhibitors.

## Quick Start

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

## Demo Accounts

| Role | Email | Access |
|------|-------|--------|
| Super Admin | Contact administrator | Full system access |
| Account Admin | Via demo request | Account-level management |
| Event User | Invited by admin | Event-specific access |

## Features

### Floorplan Editor

The floorplan editor provides a comprehensive toolset for designing and managing exhibition floor plans.

#### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F` | Toggle fullscreen mode |
| `Space + Drag` | Pan the canvas |
| `Scroll` | Zoom in/out |
| `Shift + Click` | Multi-select stands |
| `Escape` | Clear selection / Exit draw mode |
| `Delete` | Delete selected stand(s) |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + D` | Duplicate selected stand(s) |
| `Arrow keys` | Nudge selected stand(s) by grid step |
| `Shift + Arrow` | Nudge by 5x grid step |
| `Ctrl + Arrow` | Fine nudge (1px) |

#### Tools

- **Select Tool**: Default tool for selecting, moving, and resizing stands
- **Draw Tool**: Click and drag to draw new stands directly on canvas
  - Shift while drawing keeps aspect ratio square
  - Snap-to-grid is automatic

#### Stand Presets

Quick-add stands with preset sizes:
- 3×2m, 3×3m, 4×3m, 4×4m, 6×4m, 6×6m

#### Undo/Redo

Full undo/redo support for:
- Create, delete, move, resize stands
- Status, label, exhibitor changes
- Bulk operations

#### Autosave

- Automatic save with 800ms debounce
- Status indicator: "Saved ✓" / "Saving..." / "Unsaved"
- Confirmation dialog when leaving with unsaved changes

#### Multi-Select & Bulk Actions

When multiple stands are selected (Shift+click):
- **Align**: Left, right, top, bottom, center H/V
- **Distribute**: Horizontal or vertical (requires 3+ stands)
- **Set status**: Apply same status to all selected
- **Snap to grid**: Align all selected to grid
- **Duplicate**: Copy selected stands
- **Clear exhibitor**: Remove exhibitor links
- **Rotate**: Rotate all selected by 90°

#### Soft Locking (Collaboration)

- Shows banner when other users are editing the same floorplan
- Heartbeat system with 2-minute timeout
- Non-blocking: warns but doesn't prevent editing

#### Performance Mode

Toggle to hide background and icons during drag operations for smooth performance with 1000+ stands.

#### Export Options

Export floorplans as PNG or PDF:
- Choose format (PNG/PDF)
- Include/exclude legend
- Include/exclude title and date
- Hide grid lines
- Select quality (1x, 2x, 3x)

#### Tech Sheet Export

Generate technical documentation:
- **CSV**: Full stand data with services (power, water, lights, carpet, construction)
- **PDF Summary**: Totals by power type, water/light counts, area calculations

#### Print Labels

Generate printable label sheets (PDF) with:
- Stand number (large)
- Exhibitor name
- Event/hall info
- Status indicator

### Templates

Save floorplan layouts as reusable templates:

1. Open a floorplan in the editor
2. Click "Save as template" 
3. Enter template name and description
4. Template saves: dimensions, grid, background, stands (without exhibitor links)

**Using templates:**
- Navigate to Templates page
- View, duplicate, or delete templates
- Use templates when creating new events

### Exhibitor Library

Maintain a global database of exhibitors:
- Add companies to library with contact details
- Search and filter library
- Quick-add to events from library
- Link event exhibitors to library profiles

### Audit Log

All changes are logged with:
- Timestamp
- User who made the change
- Action type (create, update, delete)
- Changed fields (before/after)
- Click log entry to navigate to affected stand

## Technologies

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Lovable Cloud (Supabase)
- **Charts**: Recharts
- **PDF**: jsPDF
- **Canvas**: html2canvas

## Architecture

```
src/
├── components/
│   ├── floorplan/      # Floorplan editor components
│   ├── layout/         # App layout (sidebar, header)
│   ├── dashboard/      # Dashboard widgets
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── pages/              # Route pages
├── lib/                # Utilities and auth
└── integrations/       # Backend integrations
```

## Deployment

Click **Share → Publish** in Lovable to deploy.

For custom domains, go to **Project → Settings → Domains**.
