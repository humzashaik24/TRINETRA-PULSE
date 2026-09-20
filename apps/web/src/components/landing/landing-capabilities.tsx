'use client';

import { ArrowRight, Check } from 'lucide-react';
import { CAPABILITIES } from './landing-data';

export function LandingCapabilities() {
  return (
    <section
      id="capabilities"
      className="relative"
      aria-labelledby="landing-capabilities-title"
      data-testid="landing-capabilities"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-overline text-brand">Capability Showcase</p>
          <h2
            id="landing-capabilities-title"
            className="mt-3 text-balance text-display-sm text-foreground sm:text-display-md"
          >
            Built for serious, structured investigation
          </h2>
          <p className="mt-3 text-pretty text-body-lg text-foreground-secondary">
            Every capability is a layer of the same connected workspace — intelligence,
            evidence and analysis working from one source of truth.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((capability, index) => {
            const Icon = capability.icon;
            return (
              <article
                key={capability.id}
                data-testid={`capability-${capability.id}`}
                className="group flex flex-col rounded-xl border border-border bg-surface p-5 tp-transition hover:border-border-strong hover:bg-surface-elevated"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated tp-transition group-hover:border-border-strong">
                    <Icon size={17} strokeWidth={2} style={{ color: capability.accent }} aria-hidden="true" />
                  </div>
                  <h3 className="min-w-0 text-sm font-semibold tracking-tight text-foreground">
                    {capability.title}
                  </h3>
                </div>

                <p className="mt-3 text-body-sm leading-relaxed text-foreground-secondary">
                  {capability.description}
                </p>

                <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-3.5">
                  {capability.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-caption text-foreground-muted">
                      <Check
                        size={13}
                        strokeWidth={2.5}
                        className="mt-0.5 shrink-0"
                        style={{ color: capability.accent }}
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {capability.footnote ? (
                  <p className="mt-auto pt-3.5 text-caption text-foreground-muted">
                    {capability.footnote}
                  </p>
                ) : (
                  <div className="mt-auto pt-3.5">
                    <span className="inline-flex items-center gap-1.5 text-overline text-brand opacity-0 tp-transition group-hover:opacity-100">
                      Explore
                      <ArrowRight size={11} aria-hidden="true" />
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}