# Trinetra Pulse — Design System

## Overview

The Trinetra Pulse Design System establishes the visual language for the entire platform. It is built around these principles:

- **Premium** — refined, not generic
- **Minimal** — every element earns its place
- **Technical** — built for data-heavy investigation workflows
- **Calm** — reduces cognitive load, never overstimulating
- **Trustworthy** — professional authority without heaviness

---

## 1. Design Tokens

All visual properties are defined as CSS custom properties in `globals.css` and mapped to Tailwind utilities. This ensures consistency across all components and themes.

### Token Hierarchy

```
CSS Custom Properties → Tailwind Config → Component Classes → Application
```

### Accessing Tokens

**In CSS:**
```css
background-color: hsl(var(--color-surface));
```

**In Tailwind/JSX:**
```tsx
<div className="bg-surface text-foreground border-border">
```

**In TypeScript (JSX):**
```tsx
import { cn } from '@trinetra-pulse/ui';
```

> The design tokens are consumed exclusively through CSS custom properties and
> Tailwind utilities. There is no TypeScript token package — the legacy
> `@trinetra-pulse/config` package (which previously shipped `SPACING`,
> `RADIUS`, `SHADOWS`) has been removed as part of Phase 14 cleanup. Theme
> values live in `tailwind.config.js` and `src/styles/globals.css`.

---

## 2. Color System

### Surfaces

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--color-background` | Very dark blue-gray | Near-white | Page background |
| `--color-surface` | Slightly lighter | White | Cards, panels |
| `--color-surface-elevated` | Lighter still | White with shadow | Dropdowns, popovers |
| `--color-surface-hover` | Subtle highlight | Subtle highlight | Hover states |
| `--color-surface-active` | More prominent | More prominent | Active/pressed states |

### Text

| Token | Usage |
|---|---|
| `--color-text-primary` | Headings, primary content |
| `--color-text-secondary` | Descriptions, supporting text |
| `--color-text-muted` | Labels, timestamps, metadata |
| `--color-text-disabled` | Disabled elements |

### Status

| Token | Usage |
|---|---|
| `--color-success` | Confirmed, resolved, positive |
| `--color-warning` | Pending, needs attention |
| `--color-danger` | Critical, errors, high risk |
| `--color-info` | Informational, neutral |

### Intelligence Domain

| Token | Color | Usage |
|---|---|---|
| `--color-entity` | Blue | Entity-related elements |
| `--color-network` | Purple | Network/graph elements |
| `--color-evidence` | Green | Evidence items |
| `--color-ai` | Cyan | AI-generated content |
| `--color-anomaly` | Orange | Anomalies, warnings |

### Entity Type Colors

Each entity type has a dedicated color for consistent visual encoding:

| Type | Color |
|---|---|
| Person | Blue |
| Phone | Green |
| Vehicle | Amber |
| Location | Purple |
| Organization | Red |
| Account | Cyan |
| Transaction | Orange |
| Event | Pink |
| Document | Gray |

---

## 3. Typography

### Font Families

- **Sans:** Inter — used for all UI text
- **Mono:** JetBrains Mono — used for data values, code, IDs
- **Display:** Inter (bold weights) — used for large headings

### Type Scale

| Class | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `text-display-lg` | 48px | 700 | 1.1 | -0.025em | Hero headings |
| `text-display-md` | 36px | 700 | 1.15 | -0.02em | Page titles |
| `text-display-sm` | 30px | 600 | 1.2 | -0.015em | Section titles |
| `text-heading-lg` | 24px | 600 | 1.25 | -0.015em | Card titles |
| `text-heading-md` | 20px | 600 | 1.3 | -0.01em | Dialog titles |
| `text-heading-sm` | 18px | 600 | 1.35 | -0.005em | Subsection titles |
| `text-subheading` | 15px | 500 | 1.4 | -0.005em | Labels, subheadings |
| `text-body-lg` | 16px | 400 | 1.6 | — | Large body text |
| `text-body` | 14px | 400 | 1.5 | — | Default body text |
| `text-body-sm` | 13px | 400 | 1.5 | — | Small body text |
| `text-caption` | 12px | 400 | 1.4 | — | Captions, metadata |
| `text-label` | 12px | 500 | 1 | 0.03em | Uppercase labels |
| `text-code` | 13px | — | 1.5 | — | Code, monospace data |
| `text-overline` | 11px | 600 | 1 | 0.06em | Table headers |

### Usage Guidelines

- Data-heavy screens: use `font-mono` for values, IDs, scores
- Table headers: use `text-overline` for column labels
- Always maintain clear hierarchy — never have two adjacent text elements at the same size/weight
- Maximum 3 type sizes per screen section

---

## 4. Spacing

The spacing scale is built on a 4px base unit:

| Token | Value | Tailwind |
|---|---|---|
| `--space-1` | 4px | `p-1`, `m-1`, `gap-1` |
| `--space-2` | 8px | `p-2`, `m-2`, `gap-2` |
| `--space-3` | 12px | `p-3`, `m-3`, `gap-3` |
| `--space-4` | 16px | `p-4`, `m-4`, `gap-4` |
| `--space-5` | 20px | `p-5`, `m-5`, `gap-5` |
| `--space-6` | 24px | `p-6`, `m-6`, `gap-6` |
| `--space-8` | 32px | `p-8`, `m-8`, `gap-8` |
| `--space-10` | 40px | `p-10`, `m-10`, `gap-10` |
| `--space-12` | 48px | `p-12`, `m-12`, `gap-12` |
| `--space-16` | 64px | `p-16`, `m-16`, `gap-16` |

### Guidelines

- Components use `p-4` internally
- Sections use `gap-6` to `gap-8`
- Page margins use `p-6` to `p-8`
- Never use arbitrary values like `p-[13px]`

---

## 5. Border Radius

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `--radius-sm` | 4px | `rounded-sm` | Small elements (badges, dots) |
| `--radius-md` | 6px | `rounded-md` | Buttons, inputs, cards |
| `--radius-lg` | 8px | `rounded-lg` | Panels, dialogs |
| `--radius-xl` | 12px | `rounded-xl` | Large containers |
| `--radius-pill` | 9999px | `rounded-pill` | Avatars, status dots |

---

## 6. Borders

Use borders as the primary visual separator. Avoid heavy shadows.

| Class | Usage |
|---|---|
| `border-border` | Standard borders |
| `border-border-subtle` | Subtle separators (table rows) |
| `border-border-strong` | Emphasized borders (focused inputs) |

### Guidelines

- Cards and panels: always use `border border-border`
- Table rows: use `border-border-subtle`
- Active/focused inputs: use `border-border-strong` or `ring-ring`
- Avoid combining borders and shadows on the same element

---

## 7. Elevation

Use sparingly. Borders are preferred over shadows.

| Token | Usage |
|---|---|
| `shadow-xs` | Barely visible lift |
| `shadow-sm` | Subtle cards |
| `shadow-md` | Dropdowns, popovers |
| `shadow-lg` | Dialogs |
| `shadow-overlay` | Modal overlays |

### Guidelines

- Default state: no shadow, use border
- Hover state: add `shadow-xs` or `shadow-sm`
- Elevated surfaces (dialogs, drawers): use `shadow-overlay`
- Never stack multiple shadows

---

## 8. Component Reference

### Button

```tsx
import { Button } from '@trinetra-pulse/ui';

// Variants
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="danger-ghost">Danger Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// Loading state
<Button loading>Processing...</Button>

// Icon button
<IconButton aria-label="Delete" variant="ghost" size="md">
  <TrashIcon />
</IconButton>
```

### Badge

```tsx
<Badge variant="default">Default</Badge>
<Badge variant="secondary" dot>With Dot</Badge>
<Badge variant="success" dot>Confirmed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Critical</Badge>
<Badge variant="entity">Entity</Badge>
<Badge variant="network">Network</Badge>
<Badge variant="ai">AI Generated</Badge>
```

### Input / Search

```tsx
<Input placeholder="Enter name..." />
<Input icon={<SearchIcon />} placeholder="Search..." />
<Input error placeholder="Invalid input" />

<Search placeholder="Search entities..." onClear={() => {}} />
```

### Card / Panel

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>

<Panel
  header={<span className="text-subheading">Panel Header</span>}
  footer={<Button size="sm">Save</Button>}
>
  Panel content
</Panel>
```

### Dialog

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent onClose={() => setIsOpen(false)}>
    <DialogTitle>Confirm Action</DialogTitle>
    <DialogDescription>Are you sure?</DialogDescription>
    <DialogFooter>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button variant="primary">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Tabs

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="network">Network</TabsTrigger>
    <TabsTrigger value="timeline">Timeline</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Overview content</TabsContent>
  <TabsContent value="network">Network content</TabsContent>
</Tabs>
```

### Table

```tsx
const columns = [
  { key: 'name', header: 'Name' },
  { key: 'type', header: 'Type', render: (v) => <Badge>{v}</Badge> },
  { key: 'risk', header: 'Risk', align: 'right', mono: true },
];

<Table columns={columns} data={entities} onRowClick={(row) => navigate(row.id)} />
```

### Tooltip

```tsx
<Tooltip content="Delete this entity" side="top">
  <IconButton aria-label="Delete"><TrashIcon /></IconButton>
</Tooltip>
```

### Dropdown

```tsx
<Dropdown
  trigger={<Button variant="ghost" size="sm">Actions</Button>}
  items={[
    { label: 'Edit', icon: <EditIcon /> },
    { label: 'Duplicate', icon: <CopyIcon /> },
    { separator: true, label: '' },
    { label: 'Delete', icon: <TrashIcon />, danger: true },
  ]}
  onSelect={(item) => handleAction(item)}
/>
```

### Feedback States

```tsx
<EmptyState
  icon={<UsersIcon />}
  title="No entities found"
  description="Create your first entity to get started"
  action={<Button>Create Entity</Button>}
/>

<LoadingState message="Loading network..." />

<ErrorState message="Failed to load data" retry={() => refetch()} />

<Skeleton variant="text" lines={3} />
<Skeleton variant="circular" width={32} height={32} />
<Skeleton variant="rectangular" width="100%" height={200} />
```

---

## 9. Intelligence Components

### EntityBadge

Displays an entity with its type icon, name, and status indicators.

```tsx
<EntityBadge
  name="Rajesh Kumar"
  type="person"
  riskScore={0.85}
  isVerified={true}
  onClick={() => navigateToEntity(id)}
/>
```

### EntityTypeIcon

Compact entity type indicator.

```tsx
<EntityTypeIcon type="phone" size="sm" showLabel />
```

### ConfidenceIndicator

Visual confidence meter with color-coded levels.

```tsx
<ConfidenceIndicator value={0.73} showValue showLabel size="md" />
```

### EvidenceBadge

Shows evidence count with type.

```tsx
<EvidenceBadge count={5} type="document" />
```

### RelationshipBadge

Displays relationship type.

```tsx
<RelationshipBadge type="known_associate" verified={true} />
```

### StatusIndicator

Status with colored dot.

```tsx
<StatusIndicator status="active" />
```

### RiskIndicator

Risk score display.

```tsx
<RiskIndicator score={0.82} showLabel size="md" />
```

### SourceBadge

Data provenance indicator.

```tsx
<SourceBadge source="FIR-2024-001" method="manual" />
```

### IntelligenceFinding

Complete finding card with severity, confidence, and metadata.

```tsx
<IntelligenceFinding
  title="Communication pattern detected"
  description="Unusual frequency of calls between suspect and unknown numbers"
  confidence={0.78}
  severity="high"
  source="AI Analysis"
  timestamp="2 hours ago"
  onNavigate={() => openFinding(id)}
/>
```

### NetworkStat

Stat display for network metrics.

```tsx
<NetworkStat label="Connected Entities" value={47} change={12} icon={<NetworkIcon />} />
```

---

## 10. Data Visualization

### ChartCard

Container for charts with title and optional action.

```tsx
<ChartCard title="Entity Growth" subtitle="Last 30 days" action={<Button size="sm" variant="ghost">Export</Button>}>
  <div className="h-48"><!-- chart --></div>
</ChartCard>
```

### StatCard

Prominent metric display.

```tsx
<StatCard label="Total Entities" value={1247} change={8.3} trend="up" icon={<EntityIcon />} />
```

### MiniBar

Inline mini bar chart.

```tsx
<MiniBar data={[12, 19, 8, 15, 22, 14, 18]} height={32} />
```

---

## 11. Responsive Design

### Breakpoints

| Name | Min Width | Target |
|---|---|---|
| Tablet | 768px | Tablet landscape |
| Laptop | 1024px | Small laptop |
| Desktop | 1280px | Primary target |
| Wide | 1536px | Ultra-wide |

### Grid System

Use Tailwind's grid utilities with consistent breakpoints:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
```

### Layout Guidelines

- **Desktop (primary):** Full investigation workspace with sidebar + main content
- **Laptop:** Collapsed sidebar, still functional
- **Tablet:** Mobile-like layout, focus on single-task workflows
- Sidebar collapses at `< 1024px`
- Content area uses `max-w-7xl` on large screens

### Component Responsiveness

- Tables: horizontal scroll on small screens
- Dialogs: full-width on mobile, max-w-lg on desktop
- Drawers: full-width on mobile, max-w-md on desktop
- Cards: stack vertically on small screens

---

## 12. Accessibility

### Requirements

Every component must include:

1. **Keyboard Support**
   - All interactive elements focusable with Tab
   - Enter/Space activates buttons
   - Escape closes dialogs/drawers/dropdowns
   - Arrow keys navigate within groups (tabs, dropdowns)

2. **Focus States**
   - Visible focus ring using `focus-visible:ring-2 ring-ring`
   - Focus ring offset for clarity on dark backgrounds
   - Skip-no-outline for mouse users

3. **Labels**
   - All buttons have `aria-label` (especially icon buttons)
   - Form inputs have associated labels
   - Decorative elements use `aria-hidden="true"`

4. **Contrast**
   - Text on background: minimum 4.5:1
   - Text on interactive: minimum 3:1
   - Status colors tested for colorblind accessibility

5. **Reduced Motion**
   - All animations respect `prefers-reduced-motion`
   - Transitions use `var(--duration-fast)` as minimum
   - No essential information conveyed by animation alone

6. **Screen Readers**
   - Semantic HTML throughout
   - ARIA roles for custom components
   - Live regions for dynamic content

### Common Patterns

```tsx
// Icon button — always needs aria-label
<IconButton aria-label="Delete entity">
  <TrashIcon />
</IconButton>

// Loading state
<Button loading aria-busy={true}>Saving...</Button>

// Decorative icon
<span aria-hidden="true"><Icon /></span>

// Tooltip
<Tooltip content="Help text">
  <button aria-describedby="tooltip-1">?</button>
</Tooltip>
```

---

## 13. Theme Architecture

### Dark Theme (Default)

Dark is the primary theme for investigator workflows. It reduces eye strain during extended sessions.

### Light Theme

Available as an alternative. Designed for daytime use and report printing.

### Switching

```tsx
import { useTheme } from '@/components/theme-provider';

const { theme, toggleTheme } = useTheme();
```

### CSS Variables

All colors are defined as CSS custom properties on `[data-theme]`. The theme is set via:
```html
<html data-theme="dark">
```

---

## 14. Animation

### Principles

- Animations should be subtle and purposeful
- Default to 200ms duration
- Use `cubic-bezier(0.4, 0, 0.2, 1)` for standard transitions
- Use spring easing for micro-interactions
- Never block user interaction

### Available Animations

| Class | Effect |
|---|---|
| `animate-fade-in` | Opacity 0 → 1 |
| `animate-slide-up` | Slide up + fade |
| `animate-slide-down` | Slide down + fade |
| `animate-scale-in` | Scale 0.95 → 1 + fade |
| `animate-pulse-subtle` | Subtle opacity pulse |
| `animate-spin` | Continuous rotation |

### Tailwind Utilities

```tsx
<div className="tp-transition">Standard transition</div>
<div className="tp-transition-fast">Fast transition</div>
<div className="tp-transition-slow">Slow transition</div>
```

---

## 15. Project Files

### Key Files

| File | Purpose |
|---|---|
| `apps/web/src/styles/globals.css` | All CSS design tokens |
| `apps/web/tailwind.config.js` | Tailwind theme extension |
| `packages/ui/src/index.ts` | Component exports |
| `packages/config/src/index.ts` | Design constants |
| `packages/config/src/colors.ts` | Color mappings |
| `apps/web/src/components/theme-provider.tsx` | Theme context |

---

## Phase 1 Deliverables Summary

| # | Deliverable | Status |
|---|---|---|
| 1 | Design token system | Complete |
| 2 | Typography system | Complete |
| 3 | Color system | Complete |
| 4 | Component library (22 components) | Complete |
| 5 | Intelligence primitives (10 components) | Complete |
| 6 | Data visualization foundations | Complete |
| 7 | Responsive rules | Complete |
| 8 | Accessibility rules | Complete |
| 9 | Usage documentation | Complete |
| 10 | Component examples | Complete |

**Do NOT build the complete dashboard. Phase 1 stops here.**

---

## 16. Entity Intelligence Components

Phase 6 adds a dedicated component set for the extraction → candidate → resolution → profile workflow, living in `apps/web/src/components/entity-intelligence/` and exported through the `index.ts` barrel.

### Component Set

| Component | Purpose |
|---|---|
| `EntityIntelligenceHeader` | Page title + case context + primary "Extraction Run" action |
| `SummaryStrip` | KPI cards (entities, candidates, pending resolutions, running jobs) with per-item details |
| `EntityTable` | Searchable/filterable/sortable entity list with pagination and row navigation |
| `EntityDetailHeader` | Entity identity header with type badge, resolution state, verification; copyable canonical id |
| `EntityDetail` | Assembles the per-entity tabbed workspace (overview, relationships, evidence, events, activity, sources) |
| `EntityOverview`, `EntityRelationships`, `EntityEvidence`, `EntityEvents`, `EntityActivity`, `EntitySources` | Detail tab panels |
| `ExtractionJobs` | Job list with status badges and run/cancel controls |
| `CandidateReview` | Candidate inspection with normalization comparison and "resolve now" path |
| `ResolutionReview` | Signal-by-signal similarity evidence, recommendation, confirm/reject/merge actions (note: uses a local `TextAreaLocal` — the UI kit has no `TextArea`) |
| `AuditTrail` | Immutable action log (create/review/resolve/merge/confirm/reject) with tone-colored badges |
| `Pagination` | Page controls shared by list views |
| `Badges` | Resolution-state and entity-type badges shared by list/detail views |

### Resolution State Encoding

| State | Tone |
|---|---|
| `CONFIRMED` | success |
| `PROBABLE` | info (entity) |
| `POSSIBLE` | warning |
| `REJECTED` | danger |
| `NEEDS_REVIEW` | warning |

### Table Conventions (Phase 6)

- The shared `Table`'s `Column.header` is a plain `string` and its row type is bounded by `Record<string, unknown>` — complex headers and per-column sort controls are **not** supported.
- Entity lists therefore place sorting in the toolbar as a **"Sort by" Select + direction toggle** (`SORT_OPTIONS` constant in `entity-table.tsx`), keeping column headers clean text labels.
- Row click navigates to the entity detail route.

### Typography & Layout Notes

- Confidence/similarity percentages render in `font-mono` per the type scale.
- Detail headers use `text-heading-lg` for the name and `text-caption` for canonical ids and timestamps.
- Action buttons in review panels use `size="sm"`.

---

## Phase 6 Deliverables Summary

| # | Deliverable | Status |
|---|---|---|
| 1 | Entity Intelligence component set (16 components) | Complete |
| 2 | Shared list/detail patterns (header, summary strip, table, tabs) | Complete |
| 3 | Resolution state encoding | Complete |
| 4 | Signal/evidence presentation in resolution review | Complete |
| 5 | Audit trail presentation | Complete |
| 6 | Jest unit tests for resolution/normalization/search logic | Complete |
