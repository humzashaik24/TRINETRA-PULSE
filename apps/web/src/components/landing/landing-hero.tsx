'use client';

import { Cable } from 'lucide-react';
import { LANDING_HERO_ATTRIBUTES } from './landing-data';
import { LandingPrimaryCta } from './landing-cta';

export function LandingHero() {
  return (
    <header className="relative overflow-hidden" data-testid="landing-hero">
      <div className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[420px] w-[min(920px,92vw)] rounded-full bg-brand/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-72 w-72 rounded-full bg-network/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-1/2 h-72 w-72 rounded-full bg-ai/[0.05] blur-3xl" />

      <div className="relative mx-auto w-full max-w-5xl px-5 pb-16 pt-12 text-center sm:px-6 sm:pt-16 lg:pb-24 lg:pt-20">
        <div className="mx-auto flex w-fit flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/20">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <circle cx="5" cy="8" r="2" />
              <circle cx="19" cy="8" r="2" />
            </svg>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-foreground-secondary">
            Trinetra Pulse
          </p>
        </div>

        <p className="mt-8 text-overline text-brand">Criminal Network Intelligence &amp; Investigation Platform</p>

        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-display-sm font-bold text-foreground sm:text-display-md lg:text-display-lg">
          Connect the dots.
          <br />
          Preserve the evidence.
          <br />
          Investigate with intelligence.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-body-lg leading-relaxed text-foreground-secondary">
          Trinetra Pulse connects fragmented investigation data, network intelligence, evidence
          integrity, provenance, multimedia intelligence and grounded AI into one
          investigator-controlled workspace.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <LandingPrimaryCta size="xl" />
          <a
            href="#capabilities"
            data-testid="landing-secondary-cta"
            className="tp-transition inline-flex h-10 select-none items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-5 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-border-strong hover:bg-surface-hover active:bg-surface-active"
          >
            <Cable size={14} aria-hidden="true" />
            Explore Capabilities
          </a>
        </div>

        <ul
          className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          aria-label="Platform principles"
        >
          {LANDING_HERO_ATTRIBUTES.map((attr) => (
            <li key={attr} className="flex items-center gap-1.5 text-caption text-foreground-muted">
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                className="shrink-0 text-evidence"
              >
                <circle cx="6" cy="6" r="5" fill="currentColor" opacity="0.25" />
                <path
                  d="M3.6 6.2l1.7 1.7 3-3.4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              {attr}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}