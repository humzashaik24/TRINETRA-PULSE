'use client';

import React from 'react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { duration, easing, spring } from '../tokens';

// ============================================================
// HOVER LIFT
// ============================================================

export interface HoverLiftProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  intensity?: 'subtle' | 'medium' | 'strong';
}

const liftVariants: Record<string, Variants> = {
  subtle: {
    rest: { y: 0, boxShadow: '0 0 0 0 rgb(0 0 0 / 0)' },
    hover: { y: -1, boxShadow: '0 2px 8px -2px rgb(0 0 0 / 0.1)' },
  },
  medium: {
    rest: { y: 0, boxShadow: '0 0 0 0 rgb(0 0 0 / 0)' },
    hover: { y: -2, boxShadow: '0 4px 12px -4px rgb(0 0 0 / 0.12)' },
  },
  strong: {
    rest: { y: 0, boxShadow: '0 0 0 0 rgb(0 0 0 / 0)' },
    hover: { y: -4, boxShadow: '0 8px 24px -8px rgb(0 0 0 / 0.15)' },
  },
};

/**
 * Subtle lift on hover. Cards, panels, interactive containers.
 */
export function HoverLift({ children, intensity = 'subtle', ...props }: HoverLiftProps) {
  const reduced = useReducedMotion();
  const variants = liftVariants[intensity];

  return (
    <motion.div
      initial="rest"
      whileHover={reduced ? undefined : 'hover'}
      animate="rest"
      variants={variants}
      transition={reduced ? { duration: 0 } : spring.snappy}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// HOVER SCALE
// ============================================================

export interface HoverScaleProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  scale?: number;
}

/**
 * Subtle scale on hover. Buttons, interactive icons, compact elements.
 */
export function HoverScale({
  children,
  scale: hoverScale = 1.02,
  ...props
}: HoverScaleProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      whileHover={reduced ? undefined : { scale: hoverScale }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      transition={spring.snappy}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// PRESS SCALE
// ============================================================

export interface PressScaleProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  scale?: number;
}

/**
 * Press feedback — scale down on mousedown/touch.
 * Use on interactive elements that need tactile response.
 */
export function PressScale({
  children,
  scale: pressScale = 0.97,
  ...props
}: PressScaleProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      whileTap={reduced ? undefined : { scale: pressScale }}
      transition={spring.snappy}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// FOCUS RING
// ============================================================

export interface FocusRingProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  visible?: boolean;
}

/**
 * Animated focus ring indicator.
 */
export function FocusRing({ children, visible = false, ...props }: FocusRingProps) {
  return (
    <motion.div
      animate={
        visible
          ? { boxShadow: '0 0 0 2px hsl(217 91% 60%)' }
          : { boxShadow: '0 0 0 0px hsl(217 91% 60%)' }
      }
      transition={{ duration: 0.15 }}
      style={{ borderRadius: 'inherit' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// COLLAPSE
// ============================================================

export interface CollapseProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  open: boolean;
  axis?: 'vertical' | 'horizontal';
}

/**
 * Animated height/width collapse.
 * Content smoothly expands and contracts.
 */
export function Collapse({
  children,
  open,
  axis = 'vertical',
  ...props
}: CollapseProps) {
  const reduced = useReducedMotion();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = React.useState<number | 'auto'>('auto');

  React.useEffect(() => {
    if (contentRef.current) {
      setMeasuredHeight(contentRef.current.scrollHeight);
    }
  }, [children, open]);

  const animate =
    axis === 'vertical'
      ? {
          height: open ? (measuredHeight === 'auto' ? 'auto' : measuredHeight) : 0,
          opacity: open ? 1 : 0,
        }
      : {
          width: open ? 'auto' : 0,
          opacity: open ? 1 : 0,
        };

  return (
    <motion.div
      animate={animate}
      transition={
        reduced
          ? { duration: 0 }
          : { ...spring.soft, opacity: { duration: duration.fast } }
      }
      style={{
        overflow: 'hidden',
      }}
      {...props}
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}

// ============================================================
// EXPAND
// ============================================================

export interface ExpandProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  expanded: boolean;
  maxHeight?: number;
}

/**
 * Expand-to-fill animation. Used for investigation workspace
 * panels, evidence viewers, and detail panes.
 */
export function Expand({
  children,
  expanded,
  maxHeight = 800,
  ...props
}: ExpandProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      animate={{
        height: expanded ? maxHeight : 0,
        opacity: expanded ? 1 : 0,
      }}
      transition={
        reduced
          ? { duration: 0 }
          : spring.soft
      }
      style={{ overflow: 'hidden' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
