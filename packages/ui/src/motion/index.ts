// ============================================================
// Trinetra Pulse — Motion System
// ============================================================
// Core principle: Animate meaning, not decoration.
// ============================================================

// --- Tokens ---
export {
  duration,
  spring,
  easing,
  transitions,
  graphMotion,
  reducedMotion,
} from './tokens';
export type {
  DurationToken,
  SpringToken,
  EasingToken,
  TransitionPreset,
  GraphMotionPreset,
} from './tokens';

// --- Primitives ---
export {
  Fade,
  Slide,
  Scale,
  Reveal,
  Stagger,
  Presence,
  PageTransition,
  staggerChildVariants,
} from './primitives';
export type {
  FadeProps,
  SlideProps,
  ScaleProps,
  RevealProps,
  StaggerProps,
  PresenceProps,
  PageTransitionProps,
} from './primitives';

// --- Interactions ---
export {
  HoverLift,
  HoverScale,
  PressScale,
  FocusRing,
  Collapse,
  Expand,
} from './interactions';
export type {
  HoverLiftProps,
  HoverScaleProps,
  PressScaleProps,
  FocusRingProps,
  CollapseProps,
  ExpandProps,
} from './interactions';

// --- Layout ---
export {
  LayoutGroup,
  LayoutItem,
  LayoutTransition,
  PanelTransition,
  ModalTransition,
  SidebarTransition,
} from './layout';
export type {
  LayoutGroupProps,
  LayoutItemProps,
  LayoutTransitionProps,
  PanelTransitionProps,
  ModalTransitionProps,
  SidebarTransitionProps,
} from './layout';

// --- Graph ---
export {
  nodeVariants,
  edgeVariants,
  graphContainerVariants,
  nodePositionTransition,
  zoomTransition,
  selectionTransition,
  getNodeVariant,
  getEdgeVariant,
  getNodeStaggerDelay,
  getFilterTransition,
} from './graph';

// --- Hooks ---
export {
  useReducedMotion,
  useHover,
  usePress,
  useFocus,
  useInView,
  useElementSize,
} from './hooks';
