'use client';

import React from 'react';
import {
  motion,
  AnimatePresence,
  type Variants,
  type HTMLMotionProps,
} from 'framer-motion';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { duration, easing, spring, transitions } from '../tokens';

// ============================================================
// FADE
// ============================================================

export interface FadeProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  show?: boolean;
  delay?: number;
}

/**
 * Animates opacity from 0 to 1 (or reverse).
 * Use for appearing/disappearing content without movement.
 */
export function Fade({ children, show = true, delay = 0, ...props }: FadeProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate={show ? 'visible' : 'hidden'}
      variants={{
        visible: { opacity: 1 },
        hidden: { opacity: 0 },
      }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: duration.normal, ease: easing.standard, delay }
      }
      style={{ pointerEvents: show ? 'auto' : 'none' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// SLIDE
// ============================================================

type SlideDirection = 'up' | 'down' | 'left' | 'right';

export interface SlideProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  show?: boolean;
  direction?: SlideDirection;
  distance?: number;
  delay?: number;
}

const slideOffsets: Record<SlideDirection, { x?: number; y?: number }> = {
  up: { y: 16 },
  down: { y: -16 },
  left: { x: 16 },
  right: { x: -16 },
};

/**
 * Animates opacity + directional movement.
 * Use for elements entering/leaving from a specific direction.
 */
export function Slide({
  children,
  show = true,
  direction = 'up',
  distance = 16,
  delay = 0,
  ...props
}: SlideProps) {
  const reduced = useReducedMotion();
  const offset = slideOffsets[direction];
  const scale = distance / 16;

  return (
    <motion.div
      initial={false}
      animate={show ? 'visible' : 'hidden'}
      variants={{
        visible: {
          opacity: 1,
          x: offset.x !== undefined ? 0 : undefined,
          y: offset.y !== undefined ? 0 : undefined,
        },
        hidden: {
          opacity: 0,
          x: offset.x !== undefined ? offset.x * scale : undefined,
          y: offset.y !== undefined ? offset.y * scale : undefined,
        },
      }}
      transition={
        reduced
          ? { duration: 0 }
          : { ...transitions.panel, delay }
      }
      style={{ pointerEvents: show ? 'auto' : 'none' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// SCALE
// ============================================================

export interface ScaleProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  show?: boolean;
  origin?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const originMap = {
  center: { x: '50%', y: '50%' },
  top: { x: '50%', y: '0%' },
  bottom: { x: '50%', y: '100%' },
  left: { x: '0%', y: '50%' },
  right: { x: '100%', y: '50%' },
};

/**
 * Animates scale + opacity.
 * Use for modals, popovers, and emphasis.
 */
export function Scale({
  children,
  show = true,
  origin = 'center',
  delay = 0,
  ...props
}: ScaleProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate={show ? 'visible' : 'hidden'}
      variants={{
        visible: { opacity: 1, scale: 1 },
        hidden: { opacity: 0, scale: 0.95 },
      }}
      transition={
        reduced
          ? { duration: 0 }
          : { ...transitions.modal, delay }
      }
      style={{
        transformOrigin: `${originMap[origin].x} ${originMap[origin].y}`,
        pointerEvents: show ? 'auto' : 'none',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// REVEAL
// ============================================================

export interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  delay?: number;
  threshold?: number;
  triggerOnce?: boolean;
}

/**
 * Reveals content when it enters the viewport.
 * Combines fade + slide-up with intersection observer.
 */
export function Reveal({
  children,
  delay = 0,
  threshold = 0.1,
  triggerOnce = true,
  ...props
}: RevealProps) {
  const reduced = useReducedMotion();
  const [isInView, setIsInView] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, triggerOnce]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        visible: { opacity: 1, y: 0 },
        hidden: { opacity: 0, y: 16 },
      }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: duration.normal, ease: easing.emphasized, delay }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// STAGGER
// ============================================================

export interface StaggerProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  staggerInterval?: number;
  delay?: number;
  triggerOnMount?: boolean;
}

/**
 * Orchestrates staggered entrance of child elements.
 * Children must be motion.* elements with variants.
 */
export function Stagger({
  children,
  staggerInterval = 0.05,
  delay = 0,
  triggerOnMount = true,
  ...props
}: StaggerProps) {
  const reduced = useReducedMotion();

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduced ? 0 : staggerInterval,
        delayChildren: reduced ? 0 : delay,
      },
    },
  };

  return (
    <motion.div
      initial={triggerOnMount ? 'hidden' : false}
      animate="visible"
      variants={containerVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Variant to apply on children of a Stagger container.
 * Spread onto motion.div children.
 */
export const staggerChildVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.normal,
      ease: easing.emphasized,
    },
  },
};

// ============================================================
// PAGE TRANSITION
// ============================================================

export interface PageTransitionProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  /** Direction of travel. Defaults to a subtle vertical drift. */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Distance in px to travel on enter/exit. */
  distance?: number;
}

const pageOffset: Record<NonNullable<PageTransitionProps['direction']>, { x?: number; y?: number }> = {
  up: { y: 8 },
  down: { y: -8 },
  left: { x: 12 },
  right: { x: -12 },
  none: {},
};

/**
 * Standardized page-level transition used by the application shell.
 * Subdued fade + short drift so navigation feels continuous without
 * drawing attention away from the content. Honors reduced motion by
 * collapsing to a pure opacity crossfade of 0 duration.
 */
export function PageTransition({
  children,
  direction = 'up',
  distance = 8,
  ...props
}: PageTransitionProps) {
  const reduced = useReducedMotion();
  const from = pageOffset[direction];
  const scale = distance / 8;
  const enterXY = {
    x: from.x !== undefined ? from.x * scale : 0,
    y: from.y !== undefined ? from.y * scale : 0,
  };

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, ...enterXY }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, ...enterXY }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: duration.slow, ease: easing.emphasized }
      }
      className="min-h-full h-full"
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// PRESENCE (AnimatePresence wrapper)
// ============================================================

export interface PresenceProps {
  children: React.ReactNode;
  show: boolean;
  mode?: 'wait' | 'sync' | 'popLayout';
}

/**
 * Wraps AnimatePresence for conditional rendering with exit animations.
 * Children should have exit variants defined.
 */
export function Presence({ children, show, mode = 'wait' }: PresenceProps) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode={reduced ? 'sync' : mode}>
      {show && children}
    </AnimatePresence>
  );
}
