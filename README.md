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
| `Escape` | Clear selection |
| `Delete` | Delete selected stand(s) |

#### Zoom & Pan Controls

- **Mouse wheel**: Zoom centered on cursor
- **Zoom buttons**: +/- buttons in toolbar
- **Fit to screen**: Button to fit entire floorplan in view
- **Reset zoom**: Return to 100% zoom
- **Space + drag**: Pan around the canvas

#### Multi-Select & Bulk Actions

When multiple stands are selected (Shift+click):
- **Set status**: Apply same status to all selected
- **Snap to grid**: Align all selected to grid
- **Clear exhibitor**: Remove exhibitor links
- **Rotate**: Rotate all selected by 90°
- **Export labels**: Download CSV with stand data

#### Label Generator

Generate sequential labels for stands:

1. Click "Labels" button in toolbar
2. Choose mode:
   - **Prefix + number**: A1, A2, A3... or Hall-001, Hall-002...
   - **Numeric series**: 101, 102, 103...
3. Set start number and padding
4. Apply to selected stands or all stands
5. Duplicates are automatically handled

#### Warnings Engine

The Warnings tab detects issues:
- **Duplicate labels**: Same label used multiple times
- **Out of bounds**: Stands outside floorplan area
- **Overlapping stands**: Stands intersecting each other
- **Missing labels**: Stands without labels

**Fix helpers:**
- "Fix duplicates": Auto-rename with unique suffixes
- "Move into bounds": Clamp stands to valid area

#### Export Options

Export floorplans as PNG or PDF:
- Choose format (PNG/PDF)
- Include/exclude legend
- Include/exclude title and date
- Hide grid lines
- Select quality (1x, 2x, 3x)

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
