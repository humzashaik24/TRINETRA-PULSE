import React from 'react';

/**
 * framer-motion test double.
 *
 * `motion.<tag>` renders a plain DOM element of that tag. Framer-only
 * props (initial/animate/transition/variants/layout/…, gesture hooks)
 * are stripped so they never reach the DOM. Style, className, event
 * handlers and standard HTML/aria props pass through.
 */

const FRAMER_ONLY_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'layout',
  'layoutId',
  'layoutDependency',
  'onLayoutAnimationStart',
  'onLayoutAnimationComplete',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileInView',
  'whileDrag',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragDirectionLock',
  'dragPropagation',
  'dragControls',
  'dragListener',
  'dragSnapToOrigin',
  'onDrag',
  'onDragStart',
  'onDragEnd',
  'onDragTransitionEnd',
  'viewport',
  'staggerChildren',
  'stagger',
  'delayChildren',
  'repeat',
  'repeatType',
  'repeatDelay',
  'custom',
  'onAnimationStart',
  'onAnimationComplete',
  'onAnimationRepeat',
  'animateIfNotOnScreen',
  'initialClassName',
  'innerHeight',
]);

const motionFactory = (tag: string) => {
  const Comp = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    (props, ref) => {
      const domProps: Record<string, unknown> = { ref };
      for (const [key, value] of Object.entries(props ?? {})) {
        if (key === 'style') {
          domProps.style = value as React.CSSProperties;
        } else if (!FRAMER_ONLY_PROPS.has(key)) {
          domProps[key] = value;
        }
      }
      return React.createElement(tag, domProps);
    }
  );
  Comp.displayName = `motion.${tag}`;
  return Comp;
};

const motion = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (typeof prop === 'string') return motionFactory(prop);
      return undefined;
    },
  }
) as unknown as {
  div: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement>>;
  [key: string]: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLElement>>;
};

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children);
};

export const useReducedMotion = (): boolean => false;

export const LayoutGroup = ({ children }: { children?: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children);
};

export { motion };
export default motion;