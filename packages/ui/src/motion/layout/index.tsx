'use client';

import React from 'react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { duration, easing, spring, transitions } from '../tokens';
import { AnimatePresence } from 'framer-motion';

// ============================================================
// LAYOUT GROUP
// ============================================================

export interface LayoutGroupProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

/**
 * Wraps elements that participate in shared layout animations.
 * Provides layoutId context for smooth transitions between states.
 *
 * @example
 * <LayoutGroup>
 *   {isExpanded ? (
 *     <motion.div layoutId="panel" className="expanded">...</motion.div>
 *   ) : (
 *     <motion.div layoutId="panel" className="collapsed">...</motion.div>
 *   )}
 * </LayoutGroup>
 */
export function LayoutGroup({ children, ...props }: LayoutGroupProps) {
  return (
    <motion.div {...props}>
      {children}
    </motion.div>
  );
}

// ============================================================
// LAYOUT ITEM
// ============================================================

export interface LayoutItemProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  layoutId?: string;
}

/**
 * Item that animates its layout position when siblings change.
 * Automatically applies layout animation with spring physics.
 */
export function LayoutItem({ children, layoutId, ...props }: LayoutItemProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      layout
      layoutId={layoutId}
      transition={reduced ? { duration: 0 } : transitions.layout}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// LAYOUT TRANSITION
// ============================================================

export interface LayoutTransitionProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  show: boolean;
}

/**
 * Animated container that smoothly transitions its children
 * when content changes. Use for card reordering, list updates.
 */
export function LayoutTransition({ children, show, ...props }: LayoutTransitionProps) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key="layout-transition"
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : transitions.layout}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// PANEL TRANSITION
// ============================================================

export interface PanelTransitionProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  open: boolean;
  side?: 'left' | 'right' | 'top' | 'bottom';
}

const panelDirection = {
  left: { x: '-100%', y: '0%' },
  right: { x: '100%', y: '0%' },
  top: { x: '0%', y: '-100%' },
  bottom: { x: '0%', y: '100%' },
};

/**
 * Spring-based panel slide in/out.
 * Use for sidebars, detail panels, settings drawers.
 */
export function PanelTransition({
  children,
  open,
  side = 'right',
  ...props
}: PanelTransitionProps) {
  const reduced = useReducedMotion();
  const dir = panelDirection[side];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: dir.x, y: dir.y, opacity: 0 }}
          animate={{ x: '0%', y: '0%', opacity: 1 }}
          exit={{ x: dir.x, y: dir.y, opacity: 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : { ...transitions.sidebar }
          }
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// MODAL TRANSITION
// ============================================================

export interface ModalTransitionProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  open: boolean;
}

/**
 * Scale + opacity modal entrance.
 * Use for dialogs, confirmations, and floating panels.
 */
export function ModalTransition({ children, open, ...props }: ModalTransitionProps) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? { duration: 0 } : transitions.fade}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'hsl(var(--color-surface-overlay))',
              zIndex: 50,
            }}
          />
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={
              reduced
                ? { duration: 0 }
                : spring.expressive
            }
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 51,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
            {...props}
          >
            <div style={{ pointerEvents: 'auto' }}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// SIDEBAR TRANSITION
// ============================================================

export interface SidebarTransitionProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  open: boolean;
  width?: number;
}

/**
 * Smooth sidebar open/close transition.
 * Collapses to zero width with spring physics.
 */
export function SidebarTransition({
  children,
  open,
  width = 240,
  ...props
}: SidebarTransitionProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      animate={{
        width: open ? width : 0,
        opacity: open ? 1 : 0,
      }}
      transition={
        reduced
          ? { duration: 0 }
          : transitions.sidebar
      }
      style={{
        overflow: 'hidden',
        flexShrink: 0,
      }}
      {...props}
    >
      <div style={{ width, minWidth: width }}>
        {children}
      </div>
    </motion.div>
  );
}
