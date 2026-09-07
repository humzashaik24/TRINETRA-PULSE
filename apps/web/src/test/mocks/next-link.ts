import React from 'react';

/** next/link test double — renders a plain anchor. */
type LinkHref = string | { pathname?: string; query?: string };

const Link = React.forwardRef<
  HTMLAnchorElement,
  { href: LinkHref; children?: React.ReactNode } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    'href'
  >
>(({ href, children, ...rest }, ref) => {
  const resolved = typeof href === 'string' ? href : href?.pathname ?? '#';
  return React.createElement('a', { href: resolved, ref, ...rest }, children);
});

Link.displayName = 'Link';

export default Link;