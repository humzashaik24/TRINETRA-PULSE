'use client';

import { type Variants, type Transition } from 'framer-motion';
import { duration, easing, spring, graphMotion } from '../tokens';

// ============================================================
// NODE VARIANTS
// ============================================================

/**
 * Variants for graph node entrance/exit.
 * Apply to motion.g or motion.div wrapping node elements.
 */
export const nodeVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: graphMotion.nodeEnter,
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: graphMotion.nodeExit,
  },
  selected: {
    scale: 1.15,
    opacity: 1,
    transition: graphMotion.nodeSelect,
  },
  dimmed: {
    opacity: 0.3,
    scale: 0.95,
    transition: { duration: duration.normal },
  },
};

/**
 * Variants for graph edge entrance/exit.
 */
export const edgeVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: graphMotion.edgeDraw,
  },
  exit: {
    pathLength: 0,
    opacity: 0,
    transition: { duration: duration.fast },
  },
  highlighted: {
    opacity: 1,
    strokeWidth: 3,
    transition: graphMotion.edgeHighlight,
  },
  dimmed: {
    opacity: 0.15,
    strokeWidth: 1,
    transition: { duration: duration.normal },
  },
};

/**
 * Variants for the graph container itself.
 */
export const graphContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1,
    },
  },
  filter: {
    transition: graphMotion.filter,
  },
};

// ============================================================
// GRAPH TRANSITIONS
// ============================================================

/**
 * Transition for node position changes.
 * Use when nodes rearrange (e.g., after layout change).
 */
export const nodePositionTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
  mass: 0.8,
};

/**
 * Transition for zoom/pan operations.
 */
export const zoomTransition: Transition = {
  duration: duration.slow,
  ease: easing.standard,
};

/**
 * Transition for node selection highlight.
 */
export const selectionTransition: Transition = spring.soft;

// ============================================================
// GRAPH ANIMATION HELPERS
// ============================================================

/**
 * Returns the appropriate variant based on node state.
 */
export function getNodeVariant(state: {
  isSelected?: boolean;
  isFiltered?: boolean;
  isVisible?: boolean;
}): string {
  if (!state.isVisible) return 'hidden';
  if (state.isSelected) return 'selected';
  if (state.isFiltered) return 'dimmed';
  return 'visible';
}

/**
 * Returns the appropriate variant based on edge state.
 */
export function getEdgeVariant(state: {
  isHighlighted?: boolean;
  isFiltered?: boolean;
  isVisible?: boolean;
}): string {
  if (!state.isVisible) return 'hidden';
  if (state.isHighlighted) return 'highlighted';
  if (state.isFiltered) return 'dimmed';
  return 'visible';
}

/**
 * Calculates stagger delay for a list of nodes.
 */
export function getNodeStaggerDelay(index: number, total: number): number {
  const maxStagger = 0.3;
  return (index / Math.max(total - 1, 1)) * maxStagger;
}

/**
 * Returns transition config for a filter change.
 */
export function getFilterTransition(count: number): Transition {
  return {
    ...spring.soft,
    delay: getNodeStaggerDelay(0, count),
  };
}
