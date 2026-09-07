export { cn } from './lib/utils';

// Core components
export { Button, buttonVariants } from './components/button';
export type { ButtonProps } from './components/button';
export { IconButton, iconButtonVariants } from './components/icon-button';
export type { IconButtonProps } from './components/icon-button';
export { Badge, badgeVariants } from './components/badge';
export type { BadgeProps } from './components/badge';
export { Avatar, avatarVariants } from './components/avatar';
export type { AvatarProps } from './components/avatar';
export { Input } from './components/input';
export type { InputProps } from './components/input';
export { Search } from './components/search';
export type { SearchProps } from './components/search';
export { Select } from './components/select';
export type { SelectProps, SelectOption } from './components/select';
export { Checkbox } from './components/checkbox';
export type { CheckboxProps } from './components/checkbox';
export { Switch } from './components/switch';
export type { SwitchProps } from './components/switch';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/card';
export { Panel } from './components/panel';
export { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from './components/dialog';
export { Drawer, DrawerHeader, DrawerContent, DrawerFooter } from './components/drawer';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs';
export { Tooltip } from './components/tooltip';
export { Dropdown } from './components/dropdown';
export type { DropdownItem } from './components/dropdown';
export { Table } from './components/table';
export type { Column, TableProps } from './components/table';
export { Timeline } from './components/timeline';
export type { TimelineItem } from './components/timeline';
export { EmptyState, LoadingState, ErrorState, Skeleton } from './components/feedback';
export { Label } from './components/label';

// Intelligence components
export {
  ConfidenceIndicator,
  EvidenceBadge,
  RelationshipBadge,
  StatusIndicator,
  RiskIndicator,
  SourceBadge,
  IntelligenceFinding,
  NetworkStat,
} from './components/intelligence/domain-components';

export { EntityBadge, EntityTypeIcon, ENTITY_TYPE_CONFIG } from './components/intelligence/entity-badge';
export type { EntityTypeValue } from './components/intelligence/entity-badge';

// Data visualization
export { ChartCard, StatCard, MiniBar, DotIndicator } from './components/dataviz/chart-card';

// ============================================================
// Motion System
// ============================================================

// Tokens
export {
  duration,
  spring,
  easing,
  transitions,
  graphMotion,
  reducedMotion,
} from './motion/tokens';
export type {
  DurationToken,
  SpringToken,
  EasingToken,
  TransitionPreset,
  GraphMotionPreset,
} from './motion/tokens';

// Primitives
export {
  Fade,
  Slide,
  Scale,
  Reveal,
  Stagger,
  Presence,
  PageTransition,
  staggerChildVariants,
} from './motion/primitives';
export type {
  FadeProps,
  SlideProps,
  ScaleProps,
  RevealProps,
  StaggerProps,
  PresenceProps,
  PageTransitionProps,
} from './motion/primitives';

// Interactions
export {
  HoverLift,
  HoverScale,
  PressScale,
  FocusRing,
  Collapse,
  Expand,
} from './motion/interactions';
export type {
  HoverLiftProps,
  HoverScaleProps,
  PressScaleProps,
  FocusRingProps,
  CollapseProps,
  ExpandProps,
} from './motion/interactions';

// Layout
export {
  LayoutGroup,
  LayoutItem,
  LayoutTransition,
  PanelTransition,
  ModalTransition,
  SidebarTransition,
} from './motion/layout';
export type {
  LayoutGroupProps,
  LayoutItemProps,
  LayoutTransitionProps,
  PanelTransitionProps,
  ModalTransitionProps,
  SidebarTransitionProps,
} from './motion/layout';

// Graph
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
} from './motion/graph';

// Hooks
export {
  useReducedMotion,
  useHover,
  usePress,
  useFocus,
  useInView,
  useElementSize,
} from './motion/hooks';
