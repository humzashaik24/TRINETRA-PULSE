/**
 * Trinetra Pulse — Motion Token System
 *
 * Core principle: Animate meaning, not decoration.
 * Every animation communicates state, hierarchy, or relationship.
 */

// ============================================================
// DURATION
// ============================================================

/**
 * Duration tokens — how long an animation takes.
 * Choose based on the visual distance traveled.
 */
export const duration = {
  /** 0ms — Instant. Used for immediate state flips. */
  instant: 0,
  /** 100ms — Micro-interactions. Hover feedback, toggles, opacity fades. */
  fast: 0.1,
  /** 200ms — Standard transitions. Panel slides, modal entrance, list items. */
  normal: 0.2,
  /** 350ms — Emphasized transitions. Page transitions, complex layouts. */
  slow: 0.35,
  /** 500ms — Orchestration pauses. Stagger delays, sequential reveals. */
  deliberate: 0.5,
} as const;

// ============================================================
// SPRING
// ============================================================

/**
 * Spring configurations — physics-based motion.
 * Use for natural, expressive animations.
 *
 * stiffness: how rigid the spring is (higher = faster, snappier)
 * damping:   how much the spring resists oscillation
 * mass:      weight of the animated object
 */
export const spring = {
  /** Quick settle. Buttons, toggles, small elements. */
  snappy: {
    stiffness: 500,
    damping: 30,
    mass: 0.8,
  },
  /** Gentle settle. Panels, cards, medium elements. */
  soft: {
    stiffness: 300,
    damping: 24,
    mass: 1,
  },
  /** Dramatic entrance. Modals, hero content, large reveals. */
  expressive: {
    stiffness: 200,
    damping: 20,
    mass: 1.2,
  },
  /** No bounce. Linear feel for data transitions. */
  steady: {
    stiffness: 300,
    damping: 30,
    mass: 1,
  },
} as const;

// ============================================================
// EASING
// ============================================================

/**
 * Easing functions — how animation speed changes over time.
 * Use for CSS transitions and keyframe-based animations.
 */
export const easing = {
  /** Elements entering the viewport or appearing. */
  enter: [0.0, 0.0, 0.2, 1],
  /** Elements leaving the viewport or disappearing. */
  exit: [0.4, 0.0, 1, 1],
  /** Neutral movement within the viewport. */
  standard: [0.4, 0.0, 0.2, 1],
  /** Emphasized entrance for important content. */
  emphasized: [0.05, 0.7, 0.1, 1.0],
  /** Emphasized exit. */
  'emphasized-decelerate': [0.3, 0.0, 0.8, 0.15],
} as const;

// ============================================================
// TRANSITION PRESETS
// ============================================================

/**
 * Pre-composed transition objects for common use cases.
 * Pass directly to framer-motion `transition` prop.
 */
export const transitions = {
  /** Fast hover response. */
  hoverFast: {
    duration: duration.fast,
    ease: easing.standard,
  },
  /** Standard hover response. */
  hoverNormal: {
    duration: duration.normal,
    ease: easing.standard,
  },
  /** Panel open/close with spring. */
  panel: spring.soft,
  /** Modal entrance with spring. */
  modal: spring.expressive,
  /** Sidebar slide. */
  sidebar: {
    ...spring.soft,
    stiffness: 260,
    damping: 26,
  },
  /** Stagger child entrance. */
  staggerChild: {
    duration: duration.normal,
    ease: easing.emphasized,
  },
  /** Fade only. */
  fade: {
    duration: duration.normal,
    ease: easing.standard,
  },
  /** Quick fade for micro-interactions. */
  fadeFast: {
    duration: duration.fast,
    ease: easing.standard,
  },
  /** Layout animation. */
  layout: spring.steady,
  /** Data value change. */
  dataChange: {
    duration: duration.normal,
    ease: easing.emphasized,
  },
} as const;

// ============================================================
// GRAPH / NETWORK MOTION
// ============================================================

/**
 * Motion presets for future graph/network visualizations.
 */
export const graphMotion = {
  /** Node appearing. */
  nodeEnter: spring.snappy,
  /** Node disappearing. */
  nodeExit: {
    duration: duration.fast,
    ease: easing.exit,
  },
  /** Node selection highlight. */
  nodeSelect: spring.soft,
  /** Edge drawing. */
  edgeDraw: {
    duration: duration.slow,
    ease: easing.emphasized,
  },
  /** Relationship highlight pulse. */
  edgeHighlight: {
    duration: duration.normal,
    ease: easing.standard,
  },
  /** Graph filter transition. */
  filter: spring.soft,
  /** Network zoom/pan. */
  zoom: {
    duration: duration.slow,
    ease: easing.standard,
  },
} as const;

// ============================================================
// REDUCED MOTION PRESETS
// ============================================================

/**
 * When the user prefers reduced motion,
 * all animations collapse to these values.
 */
export const reducedMotion = {
  duration: {
    instant: 0,
    fast: 0,
    normal: 0.01,
    slow: 0.01,
    deliberate: 0.01,
  },
  spring: {
    snappy: { stiffness: 500, damping: 50, mass: 1 },
    soft: { stiffness: 500, damping: 50, mass: 1 },
    expressive: { stiffness: 500, damping: 50, mass: 1 },
    steady: { stiffness: 500, damping: 50, mass: 1 },
  },
  easing: {
    enter: [0, 0, 1, 1],
    exit: [0, 0, 1, 1],
    standard: [0, 0, 1, 1],
    emphasized: [0, 0, 1, 1],
    'emphasized-decelerate': [0, 0, 1, 1],
  },
} as const;

// ============================================================
// TYPE EXPORTS
// ============================================================

export type DurationToken = keyof typeof duration;
export type SpringToken = keyof typeof spring;
export type EasingToken = keyof typeof easing;
export type TransitionPreset = keyof typeof transitions;
export type GraphMotionPreset = keyof typeof graphMotion;
