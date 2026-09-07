# Trinetra Pulse — Application Shell

## Overview

The Application Shell is the persistent workspace that wraps all intelligence modules. It provides navigation, search, notifications, and page transitions using the Motion System.

### Current status (Phase 14)

The live shell chrome is the **Command Rail + Command Bar** architecture:

| Component | File | Purpose |
|---|---|---|
| **AppShell** | `shell/app-shell.tsx` | Root layout wrapper |
| **WorkspaceShell** | `shell/workspace-shell.tsx` | Rail + command bar + workspace + inspector + AI |
| **CommandRail** | `shell/command-rail.tsx` | Primary navigation rail |
| **CommandBar** | `shell/command-bar.tsx` | Top bar (breadcrumbs, context, search, AI, notifications, user) |
| **CommandPalette** | `search/command-palette.tsx` | Cmd+K / `/` command interface |
| **ContextInspector** | `shell/inspector/context-inspector.tsx` | Selection inspector |

The older **Sidebar / Header / GlobalSearch** chrome and the legacy
`navigation/config.ts` (with `NAVIGATION_ITEMS`) were **removed in Phase 14**
as dead/duplicate architecture. Navigation now runs entirely off
`navigation/rail-config.ts`. The sections below are largely historical
development notes for that removed chrome and are retained for reference only.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    HEADER                        │
│  [Breadcrumbs] [Context] [Search] [AI] [🔔] [👤] │
├──────┬──────────────────────────────────────────┤
│      │                                          │
│  S   │              MAIN CONTENT                │
│  I   │                                          │
│  D   │    (Page transitions via Motion)         │
│  E   │                                          │
│  B   │                                          │
│  A   │                                          │
│  R   │                                          │
│      │                                          │
├──────┴──────────────────────────────────────────┤
```

### Components

| Component | File | Purpose |
|---|---|---|
| **AppShell** | `shell/app-shell.tsx` | Root layout wrapper |
| **CommandPalette** | `search/command-palette.tsx` | Cmd+K command interface |

---

## Sidebar

### Features
- Expandable/collapsible (240px ↔ 64px)
- Active route highlighting
- Expandable subsections with animation
- Tooltips when collapsed
- Lucide icons for all items
- Collapse toggle at bottom

### Navigation Items

| Item | Route | Icon |
|---|---|---|
| Overview | `/overview` | LayoutDashboard |
| Investigations | `/investigations` | FolderSearch |
| Data Intelligence | `/data-intelligence` | Database |
| Entities | `/entities` | Users |
| Entity Intelligence | `/entity-intelligence` | ScanSearch |
| Networks | `/networks` | Network |
| Evidence | `/evidence` | FileSearch |
| Analytics | `/analytics` | BarChart3 |
| Patterns | `/patterns` | Sparkles |
| AI Assistant | `/ai-assistant` | BrainCircuit |
| Reports | `/reports` | FileText |

The **Entity Intelligence** entry (icon `ScanSearch`, added to `sidebar.tsx`'s `ICON_MAP`) is registered both as a group action under **Entities** and as a top-level navigation item in `navigation/config.ts`.

### Responsive Behavior
- **Desktop (≥1024px):** Full sidebar with labels
- **Tablet (<1024px):** Collapsed to icon-only with tooltips

### Animation
- Width transition: 200ms ease-out
- Sub-menu expand: height + opacity animation
- Collapse toggle: icon rotation

---

## Header

### Elements

1. **Breadcrumbs** — Current route path
2. **Context Indicator** — Active case/entity context
3. **Search Trigger** — Opens global search
4. **AI Assistant** — Quick access to AI
5. **Theme Toggle** — Dark/light switch
6. **Notifications** — Bell with unread count
7. **User Profile** — Avatar + dropdown menu

### Notification System
- Unread count badge
- Dropdown with notification list
- Mark all as read
- Notification types: entity matches, analysis results, evidence uploads

### Profile Dropdown
- User info
- Profile settings
- Preferences
- Sign out

---

## Global Search

### Search Categories

| Category | Icon | Search Scope |
|---|---|---|
| All | Search | Everything |
| Persons | User | People, suspects, witnesses |
| Phones | Phone | Phone numbers |
| Vehicles | Car | Vehicle registrations |
| Locations | MapPin | Addresses, areas |
| Organizations | Building2 | Companies, groups |
| Accounts | CreditCard | Financial accounts |
| Transactions | Hash | Financial transactions |
| Events | Calendar | Time-based events |
| Cases | FolderSearch | Investigation cases |
| Documents | FileText | Evidence documents |

### Features
- Category filtering with tab bar
- Keyboard navigation (↑↓ to select, Enter to open)
- Recent searches (stored locally)
- Result type icons with color coding
- ESC to close

### Keyboard Shortcuts
- `Ctrl+K` / `⌘K` — Open search
- `↑↓` — Navigate results
- `Enter` — Select result
- `ESC` — Close

---

## Command Palette

### Available Commands

| Command | Category | Action |
|---|---|---|
| Find Entity | Search | Opens entity search |
| Open Case | Navigation | → /investigations |
| View Network | Navigation | → /networks |
| Run Analysis | Actions | Triggers analysis |
| Open AI Assistant | Navigation | → /ai-assistant |
| View Evidence | Navigation | → /evidence |
| Create Entity | Actions | Opens entity form |
| Generate Report | Actions | Opens report builder |

### Features
- Fuzzy search across commands
- Category labels
- Keyboard navigation
- Direct execution on Enter

---

## Page Transitions

### Implementation

Uses Framer Motion's `AnimatePresence` with route-based keys:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

### Characteristics
- Subtle 4px vertical slide
- 200ms duration
- Standard easing curve
- Fast, professional feel
- Respects `prefers-reduced-motion`

---

## Routing Structure

```
/                          → Redirects to /overview
/overview                  → Dashboard overview
/investigations            → Case management
/data-intelligence         → Data pipeline
/entities                  → Entity database
/entities/:id              → Entity detail (workspace)
/entity-intelligence       → Extraction/candidates/resolutions/audit workflow
/networks                  → Network graphs
/evidence                  → Evidence repository
/analytics                 → Analytics dashboard
/patterns                  → Pattern detection
/ai-assistant              → AI chat
/reports                   → Report generator
```

The **Entity Intelligence** pages set a header context label via `setContextLabel` from `@/state/app.store`, consistent with the rest of the shell.

### Route Groups
All dashboard pages use the `(dashboard)` route group, which applies the `AppShell` layout.

---

## State Management

### App Store (Zustand)

```ts
{
  sidebarExpanded: boolean,      // Sidebar expanded state
  sidebarHovered: boolean,       // Sidebar hover state
  searchOpen: boolean,           // Global search modal
  commandOpen: boolean,          // Command palette
  notificationsOpen: boolean,    // Notifications dropdown
  profileOpen: boolean,          // Profile dropdown
  activeCaseId: string | null,   // Current case context
  contextLabel: string | null,   // Header context text
  notifications: Notification[], // Notification list
}
```

---

## File Structure

```
apps/web/src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Redirect → /overview
│   └── (dashboard)/
│       ├── layout.tsx                # AppShell wrapper
│       ├── overview/page.tsx
│       ├── investigations/page.tsx
│       ├── data-intelligence/page.tsx
│       ├── entities/page.tsx
│       ├── entities/[id]/page.tsx
│       ├── entity-intelligence/page.tsx
│       ├── networks/page.tsx
│       ├── evidence/page.tsx
│       ├── analytics/page.tsx
│       ├── patterns/page.tsx
│       ├── ai-assistant/page.tsx
│       └── reports/page.tsx
├── components/
│   ├── shell/
│   │   ├── app-shell.tsx
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── index.ts
│   ├── search/
│   │   ├── global-search.tsx
│   │   └── command-palette.tsx
│   └── navigation/
│       └── config.ts
└── state/
    └── app.store.ts
```

---

## Phase 3 Deliverables Summary

| # | Deliverable | Status |
|---|---|---|
| 1 | Application shell layout | Complete |
| 2 | Sidebar with navigation | Complete |
| 3 | Header with all elements | Complete |
| 4 | Global search UI | Complete |
| 5 | Command palette | Complete |
| 6 | Page transition system | Complete |
| 7 | Responsive shell | Complete |
| 8 | All page stubs | Complete |
| 9 | State management | Complete |
| 10 | Routing structure | Complete |

**Stopped after Phase 3 as requested. Awaiting Phase 4 instructions.**

---

## Phase 6 Entity Intelligence Integrations

Phase 6 adds three routes under the existing shell:

| Route | Page | Notes |
|---|---|---|
| `/entities` | Rewritten entity list | `EntityIntelligenceHeader` + `SummaryStrip` + `EntityTable` in a `Panel`; navigates to detail on row click |
| `/entities/[id]` | Entity detail (dynamic) | `fetchEntityDetailBundle(id)` → `EntityDetailHeader` + `EntityDetail` in a `Panel` |
| `/entity-intelligence` | Pipeline workspace | Tabs: Extraction / Candidates / Resolutions / Audit Trail, each wrapped in a `Panel` via a local `PanelHeader` helper |

All three pages call `setContextLabel(...)` to drive the header context indicator. Entity Intelligence is additionally reachable from the sidebar (top-level item + Entities group action) under the Entity Intelligence heading, using the `ScanSearch` icon.

## Phase 6 Deliverables Summary

| # | Deliverable | Status |
|---|---|---|
| 1 | Entity list page (`/entities`) | Complete |
| 2 | Entity detail page (`/entities/[id]`) | Complete |
| 3 | Entity Intelligence workspace (`/entity-intelligence`) | Complete |
| 4 | Sidebar navigation integration | Complete |
| 5 | Context label integration | Complete |
| 6 | Build/typecheck/lint/jest verification | Complete |

---

## Phase 7 Network Intelligence Integrations

Phase 7 adds the interactive knowledge-graph workspace under the existing shell:

| Route | Page | Notes |
|---|---|---|
| `/networks` | Network listing | `getNetworks()` → cards linking to `/networks/:id` |
| `/networks/[id]` | Graph workspace (dynamic) | `loadNetwork(id)` → summary + toolbar + graph/list view |

The graph workspace lives inside the app shell and integrates with the Context Inspector: selecting a node/edge routes its graph element to `graph-inspector.ts` (`graphNodeToContext` / `graphEdgeToContext`) and calls the shell's `selectContext(...)`, which auto-opens the inspector. `inspector.service.resolveInspectorContext` uses graph-hint fallbacks (`hasGraphEntityHints` / `hasGraphRelationshipHints`) so nodes without a canonical Phase 6 profile still render.

The dashboard `NetworkOverview` external link now points to `/networks/NET-001`.

## Phase 7 Deliverables Summary

| # | Deliverable | Status |
|---|---|---|
| 1 | Concrete React Flow graph engine (`@xyflow/react`) | Complete |
| 2 | `/networks` listing page | Complete |
| 3 | `/networks/[id]` graph workspace | Complete |
| 4 | Graph chrome (controls, stats, search, filters, timeline, path, depth, list, legend) | Complete |
| 5 | Inspector integration + graph-hint fallback | Complete |
| 6 | Reduced motion + accessibility | Complete |
| 7 | Tests + typecheck/lint/build verification | Complete |
