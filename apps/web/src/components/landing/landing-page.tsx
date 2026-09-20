'use client';

import { LandingHero } from './landing-hero';
import { LandingGraphPreview } from './landing-graph-preview';
import { LandingCapabilities } from './landing-capabilities';
import { LandingTrust } from './landing-trust';
import { LandingCapabilityFlow } from './landing-capability-flow';
import { LandingFinalCta } from './landing-final-cta';
import { LandingFooter } from './landing-footer';

// ============================================================
// TRINETRA PULSE — PUBLIC STARTING / LANDING PAGE
//
// A product introduction surface that precedes authentication.
// It communicates capabilities (never fabricated operational
// scale) and hands the visitor to /login — or straight to the
// workspace when an authenticated session already exists.
//
// Lightweight by design: only the UI kit, lucide icons and a
// decorative static SVG. No D3, no React Flow, no AI provider and
// no evidence datasets are initialized here.
// ============================================================

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to content
      </a>

      <main id="landing-main" data-testid="landing-page">
        <LandingHero />

        <section
          id="preview"
          aria-labelledby="landing-preview-title"
          data-testid="landing-preview-section"
        >
          <div className="mx-auto w-full max-w-6xl px-5 pb-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <p className="text-overline text-brand">The Investigation Graph</p>
              <h2
                id="landing-preview-title"
                className="mt-3 text-balance text-display-sm text-foreground sm:text-display-md"
              >
                See the connections before you investigate them
              </h2>
              <p className="mt-3 text-pretty text-body-lg text-foreground-secondary">
                A lightweight preview of how fragmented records assemble into a navigable
                network of persons, organizations, devices, accounts, evidence and findings.
              </p>
            </div>
            <LandingGraphPreview />
          </div>
        </section>

        <LandingCapabilities />
        <LandingTrust />
        <LandingCapabilityFlow />
        <LandingFinalCta />
      </main>

      <LandingFooter />
    </div>
  );
}