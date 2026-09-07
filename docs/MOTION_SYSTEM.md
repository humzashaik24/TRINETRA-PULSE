# Trinetra Pulse — Motion System

## Core Principle

**Animate meaning, not decoration.**

Every animation communicates:
- **State** — what is happening right now
- **Hierarchy** — what is important
- **Relationship** — how things connect
- **Navigation** — where you are going
- **Transformation** — how data changes
- **Feedback** — what your actions do

If an animation doesn't serve one of these purposes, remove it.

---

## 1. Motion Tokens

### Duration

| Token | Value | CSS | Use |
|---|---|---|---|
| `instant` | 0ms | `--motion-instant` | Immediate state flips |
| `fast` | 100ms | `--motion-fast` | Hover feedback, toggles, opacity fades |
| `normal` | 200ms | `--motion-normal` | Panel slides, modal entrance, list items |
| `slow` | 350ms | `--motion-slow` | Page transitions, complex layouts |
| `deliberate` | 500ms | `--motion-deliberate` | Stagger pauses, sequential reveals |

**Rule:** Shorter distance = shorter duration.

### Spring

| Token | Stiffness | Damping | Mass | Use |
|---|---|---|---|---|
| `snappy` | 500 | 30 | 0.8 | Buttons, toggles, small elements |
| `soft` | 300 | 24 | 1 | Panels, cards, medium elements |
| `expressive` | 200 | 20 | 1.2 | Modals, hero content, large reveals |
| `steady` | 300 | 30 | 1 | Data transitions, layout changes |

**Rule:** Larger elements = softer spring.

### Easing

| Token | Curve | Use |
|---|---|---|
| `enter` | `[0, 0, 0.2, 1]` | Elements appearing |
| `exit` | `[0.4, 0, 1, 1]` | Elements disappearing |
| `standard` | `[0.4, 0, 0.2, 1]` | Neutral movement |
| `emphasized` | `[0.05, 0.7, 0.1, 1.0]` | Important entrances |

---

## 2. Motion Primitives

### Fade

Simple opacity animation.

```tsx
import { Fade } from '@trinetra-pulse/ui';

<Fade show={isVisible}>
  <p>This fades in and out</p>
</Fade>

<Fade show={isVisible} delay={0.1}>
  <p>Delayed fade</p>
</Fade>
```

### Slide

Opacity + directional movement.

```tsx
import { Slide } from '@trinetra-pulse/ui';

<Slide show={isOpen} direction="down">
  <DropdownMenu />
</Slide>

<Slide show={isVisible} direction="left" distance={24}>
  <Panel />
</Slide>
```

**Directions:** `up` (default), `down`, `left`, `right`

### Scale

Scale + opacity animation.

```tsx
import { Scale } from '@trinetra-pulse/ui';

<Scale show={isModalOpen} origin="center">
  <Dialog />
</Scale>

<Scale show={showPopover} origin="top">
  <Popover />
</Scale>
```

**Origins:** `center`, `top`, `bottom`, `left`, `right`

### Reveal

Viewport-triggered fade + slide-up.

```tsx
import { Reveal } from '@trinetra-pulse/ui';

<Reveal threshold={0.3} triggerOnce>
  <StatsGrid />
</Reveal>
```

### Stagger

Orchestrated child entrance.

```tsx
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';

<Stagger staggerInterval={0.05}>
  {items.map((item) => (
    <motion.div key={item.id} variants={staggerChildVariants}>
      {item.name}
    </motion.div>
  ))}
</Stagger>
```

### Presence

Conditional rendering with exit animations.

```tsx
import { Presence } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';

<Presence show={isVisible}>
  <motion.div
    key="content"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
  >
    Content here
  </motion.div>
</Presence>
```

---

## 3. Interaction Components

### HoverLift

Subtle lift on hover. Cards, panels, interactive containers.

```tsx
import { HoverLift } from '@trinetra-pulse/ui';

<HoverLift intensity="subtle">
  <Card>Hover to lift</Card>
</HoverLift>

<HoverLift intensity="medium">
  <Card>More pronounced lift</Card>
</HoverLift>
```

**Intensities:** `subtle` (1px), `medium` (2px), `strong` (4px)

### HoverScale

Subtle scale on hover. Buttons, icons, compact elements.

```tsx
import { HoverScale } from '@trinetra-pulse/ui';

<HoverScale scale={1.02}>
  <Button>Hover me</Button>
</HoverScale>
```

### PressScale

Press feedback. Tactile response on mousedown/touch.

```tsx
import { PressScale } from '@trinetra-pulse/ui';

<PressScale scale={0.97}>
  <Button>Press me</Button>
</PressScale>
```

### FocusRing

Animated focus ring indicator.

```tsx
import { FocusRing } from '@trinetra-pulse/ui';

<FocusRing visible={isFocused}>
  <Input />
</FocusRing>
```

### Collapse

Animated height/width collapse.

```tsx
import { Collapse } from '@trinetra-pulse/ui';

<Collapse open={isExpanded}>
  <div>Detailed content</div>
</Collapse>
```

### Expand

Expand-to-fill animation for workspace panels.

```tsx
import { Expand } from '@trinetra-pulse/ui';

<Expand expanded={showDetails} maxHeight={600}>
  <DetailsPanel />
</Expand>
```

---

## 4. Layout Transitions

### PanelTransition

Spring-based panel slide in/out.

```tsx
import { PanelTransition } from '@trinetra-pulse/ui';

<PanelTransition open={showPanel} side="right">
  <div className="w-80 p-4">Panel content</div>
</PanelTransition>
```

### ModalTransition

Scale + opacity modal entrance with backdrop.

```tsx
import { ModalTransition } from '@trinetra-pulse/ui';

<ModalTransition open={isModalOpen}>
  <Dialog>Modal content</Dialog>
</ModalTransition>
```

### SidebarTransition

Smooth sidebar open/close.

```tsx
import { SidebarTransition } from '@trinetra-pulse/ui';

<SidebarTransition open={sidebarOpen} width={240}>
  <Navigation />
</SidebarTransition>
```

### LayoutItem

Automatic layout animation for reordering.

```tsx
import { LayoutItem } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';

<LayoutItem layoutId="card-1">
  <Card>Animated position</Card>
</LayoutItem>
```

---

## 5. Graph Motion

### Node Variants

```tsx
import { nodeVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';

<motion.g
  variants={nodeVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
>
  <circle />
</motion.g>
```

**States:** `hidden`, `visible`, `exit`, `selected`, `dimmed`

### Edge Variants

```tsx
import { edgeVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';

<motion.path
  variants={edgeVariants}
  initial="hidden"
  animate="visible"
/>
```

**States:** `hidden`, `visible`, `exit`, `highlighted`, `dimmed`

### Helper Functions

```tsx
import { getNodeVariant, getEdgeVariant, getNodeStaggerDelay } from '@trinetra-pulse/ui';

// Get variant based on state
const variant = getNodeVariant({
  isSelected: true,
  isFiltered: false,
  isVisible: true,
});
// Returns: 'selected'

// Stagger delay for position in list
const delay = getNodeStaggerDelay(3, 10);
// Returns: 0.1 (seconds)
```

### Graph Transitions

```tsx
import { nodePositionTransition, zoomTransition, selectionTransition } from '@trinetra-pulse/ui';

<motion.g
  transition={nodePositionTransition}
  // Spring-based position change
/>
```

---

## 6. Hooks

### useReducedMotion

Detects user's reduced motion preference.

```tsx
import { useReducedMotion } from '@trinetra-pulse/ui';

const prefersReduced = useReducedMotion();

// All primitives automatically respect this
// But you can use it for custom logic:
if (prefersReduced) {
  // Skip animation
}
```

### useHover

Tracks hover state with handlers.

```tsx
import { useHover } from '@trinetra-pulse/ui';

const { isHovered, ...hoverHandlers } = useHover();
<div {...hoverHandlers}>
  {isHovered ? 'Hovered!' : 'Not hovered'}
</div>
```

### usePress

Tracks press/active state.

```tsx
import { usePress } from '@trinetra-pulse/ui';

const { isPressed, ...pressHandlers } = usePress();
<button {...pressHandlers}>
  {isPressed ? 'Pressed!' : 'Not pressed'}
</button>
```

### useInView

Detects when element enters viewport.

```tsx
import { useInView } from '@trinetra-pulse/ui';

const { isInView, ref } = useInView({ threshold: 0.2, triggerOnce: true });
<div ref={ref}>
  {isInView && <AnimatedContent />}
</div>
```

### useElementSize

Tracks element dimensions.

```tsx
import { useElementSize } from '@trinetra-pulse/ui';

const { ref, size } = useElementSize();
<div ref={ref}>Width: {size.width}px</div>
```

---

## 7. CSS Transition Utilities

Utility classes for non-JS transitions:

```html
<!-- Instant (no animation) -->
<div class="tp-transition-instant">...</div>

<!-- Fast (100ms) -->
<div class="tp-transition-fast">...</div>

<!-- Normal (200ms) -->
<div class="tp-transition">...</div>

<!-- Slow (350ms) -->
<div class="tp-transition-slow">...</div>

<!-- Spring easing -->
<div class="tp-transition-spring">...</div>

<!-- Enter easing -->
<div class="tp-transition-enter">...</div>

<!-- Exit easing -->
<div class="tp-transition-exit">...</div>
```

---

## 8. Reduced Motion

### Automatic Support

All motion primitives automatically detect `prefers-reduced-motion: reduce` and:
- Set durations to 0
- Disable spring physics
- Remove transform animations
- Preserve opacity changes for state communication

### CSS Support

The CSS defines tokens that collapse under reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 0ms;
    --motion-normal: 1ms;
    --motion-slow: 1ms;
  }
}
```

### Manual Override

For custom animations, use the hook:

```tsx
const reduced = useReducedMotion();

<motion.div
  animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
  transition={reduced ? { duration: 0 } : spring.soft}
/>
```

---

## 9. Performance Guidelines

### Do

- Use `transform` and `opacity` for animations (GPU-accelerated)
- Use `will-change: transform` sparingly for known animations
- Use Framer Motion's `layout` for automatic layout animations
- Prefer springs over keyframes for interactive animations
- Use `useReducedMotion()` to skip expensive calculations

### Don't

- Animate `width`, `height`, `top`, `left` directly (causes layout thrashing)
- Use `requestAnimationFrame` loops when Framer Motion handles it
- Stack multiple animations on the same element
- Run continuous animations when not visible
- Animate more than 3 elements simultaneously in a stagger

### Bundle Size

Framer Motion is tree-shakeable. Only import what you use:
```tsx
// Good — only imports what's needed
import { motion, AnimatePresence } from 'framer-motion';

// Good — motion tokens have zero bundle cost
import { duration, spring } from '@trinetra-pulse/ui';
```

---

## 10. When to Use What

| Scenario | Primitive | Duration | Spring |
|---|---|---|---|
| Hover feedback | HoverLift | fast | snappy |
| Button press | PressScale | fast | snappy |
| Dropdown open | Slide + Presence | normal | soft |
| Modal open | ModalTransition | — | expressive |
| Sidebar toggle | SidebarTransition | — | soft |
| Content appear | Fade | normal | — |
| Content slide in | Slide | normal | soft |
| List item reveal | Reveal | normal | — |
| Staggered list | Stagger | normal | — |
| Card hover | HoverLift | fast | snappy |
| Tab switch | Fade | normal | — |
| Data value change | motion.div layout | — | steady |
| Graph node enter | nodeVariants | — | snappy |
| Graph edge draw | edgeVariants | slow | — |
| Panel expand | Collapse | — | soft |

---

## 11. File Structure

```
packages/ui/src/motion/
├── index.ts              # Main exports
├── tokens/
│   └── index.ts          # Duration, spring, easing tokens
├── primitives/
│   └── index.ts          # Fade, Slide, Scale, Reveal, Stagger, Presence
├── interactions/
│   └── index.ts          # HoverLift, HoverScale, PressScale, FocusRing, Collapse, Expand
├── layout/
│   └── index.ts          # PanelTransition, ModalTransition, SidebarTransition, LayoutItem
├── graph/
│   └── index.ts          # Node/edge variants, graph transitions
└── hooks/
    ├── index.ts           # Hook exports
    ├── use-reduced-motion.ts
    ├── use-hover.ts
    ├── use-press.ts
    ├── use-focus.ts
    ├── use-in-view.ts
    └── use-element-size.ts
```

---

## Phase 2 Deliverables Summary

| # | Deliverable | Status |
|---|---|---|
| 1 | Motion token system (5 durations, 4 springs, 5 easings) | Complete |
| 2 | Motion primitives (Fade, Slide, Scale, Reveal, Stagger, Presence) | Complete |
| 3 | Interaction components (HoverLift, HoverScale, PressScale, FocusRing, Collapse, Expand) | Complete |
| 4 | Layout transitions (PanelTransition, ModalTransition, SidebarTransition, LayoutItem, LayoutGroup) | Complete |
| 5 | Graph motion utilities (node/edge variants, transitions, helpers) | Complete |
| 6 | Hooks (useReducedMotion, useHover, usePress, useFocus, useInView, useElementSize) | Complete |
| 7 | CSS motion tokens and transition utilities | Complete |
| 8 | Reduced motion support (automatic + manual) | Complete |
| 9 | Performance guidance | Complete |
| 10 | Usage documentation | Complete |

**Stopped after Phase 2 as requested. Awaiting Phase 3 instructions.**

---

## Phase 6 Entity Intelligence Motion

Phase 6 applies the established tokens to the entity intelligence workflow:

### Patterns

| Pattern | Where | Token |
|---|---|---|
| Summary strip entrance | `SummaryStrip` KPIs on `/entities` | normal fade, slight stagger (0.05s) |
| Tab switching | `/entity-intelligence` tabs | fast fade via `Fade` |
| Table row hover | `EntityTable`, candidates, resolutions, audit | fast ease with subtle background lift (`HoverLift`-style, 100ms) |
| Data value changes | Confidence/similarity updates in review panels | `steady` spring on `motion.div layout` |
| Panel content swap | Entity detail tabs | normal fade-out/fade-in |

### Rules Re-Applied

- List rows animate **on hover only**, never continuously — respects the performance guidelines.
- Review actions (confirm/reject/merge) give immediate press feedback (`PressScale`, fast/snappy).
- All Phase 6 screens go through the shell's route transition (200ms, standard easing), so page-level motion is inherited automatically.
- Reduced motion is respected: fetches/toggles flip instantly, opacity-only changes preserve state communication.

## Phase 6 Deliverables Summary

| # | Deliverable | Status |
|---|---|---|
| 1 | Summary strip entrance motion | Complete |
| 2 | Table row hover feedback | Complete |
| 3 | Tab switch transitions | Complete |
| 4 | Review action press feedback | Complete |
| 5 | Inherited shell route transitions | Complete |
| 6 | Reduced-motion compliance | Complete |

---

## Phase 7 Network Intelligence Motion

Phase 7 applies the established motion tokens to the interactive graph workspace:

### Patterns

| Pattern | Where | Token |
|---|---|---|
| Control cluster entrance | `GraphControls` slide-up | fast rise (0.18s), disabled under reduced motion |
| Floating panels (filters / timeline / path / legend) | open/close | fast fade + rise (0.14–0.18s) via `AnimatePresence`, gated by `useReducedMotion` |
| Network listing cards | `/networks` grid | stagger entrance (0.05s per card) |
| Node/edge emphasis | selection / focus | opacity-only (no translation) to preserve context under reduced motion |
| List view rows | hover/active | fast ease background lift only, never continuous animation |

### Rules Re-Applied

- All transient workspace panels use `useReducedMotion()` and fall back to opacity-only or instant when reduce is preferred.
- Selections and dimming are communicated through **opacity changes** (never colour alone), so state remains legible with motion disabled.
- The graph workspace inherits the shell's 200ms route transition, so page-level motion is automatic.
- No continuous ambient animation (e.g. non-stop node pulsing) — performance guidelines hold.

## Phase 7 Deliverables Summary

| # | Deliverable | Status |
|---|---|---|
| 1 | Graph controls entrance motion | Complete |
| 2 | Floating panel open/close transitions | Complete |
| 3 | Network listing card stagger | Complete |
| 4 | Opacity-only selection emphasis | Complete |
| 5 | Reduced-motion compliance | Complete |
