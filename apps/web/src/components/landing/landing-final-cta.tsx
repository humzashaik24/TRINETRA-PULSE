'use client';

import { LandingPrimaryCta } from './landing-cta';
import { LANDING_DISCLAIMER } from './landing-data';

export function LandingFinalCta() {
  return (
    <section
      aria-labelledby="landing-final-cta-title"
      data-testid="landing-final-cta"
      className="relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-64 w-[min(680px,88vw)] rounded-full bg-brand/[0.08] blur-3xl" />
      <div className="relative mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-md sm:px-12">
          <p className="text-overline text-brand">Ready When You Are</p>
          <h2
            id="landing-final-cta-title"
            className="mt-3 text-balance text-display-sm text-foreground sm:text-display-md"
          >
            Step into the investigator-controlled workspace
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-body-lg text-foreground-secondary">
            Sign in to start an investigation, assemble its graph, protect its evidence and
            follow where the connections lead.
          </p>
          <div className="mt-8 flex justify-center">
            <LandingPrimaryCta size="xl" />
          </div>
          <p className="mt-6 text-caption text-foreground-muted">{LANDING_DISCLAIMER}</p>
        </div>
      </div>
    </section>
  );
}