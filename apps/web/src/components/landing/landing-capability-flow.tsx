'use client';

import { CAPABILITY_FLOW } from './landing-data';

export function LandingCapabilityFlow() {
  return (
    <section
      id="capability-flow"
      aria-labelledby="landing-flow-title"
      data-testid="landing-capability-flow"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div className="lg:max-w-md lg:pt-6">
            <p className="text-overline text-brand">From Data to Decision</p>
            <h2
              id="landing-flow-title"
              className="mt-3 text-balance text-display-sm text-foreground sm:text-display-md"
            >
              How a connected investigation comes together
            </h2>
            <p className="mt-4 text-pretty text-body-lg text-foreground-secondary">
              Fragmented records become a navigable graph, evidence stays shielded by integrity
              controls, and grounded analysis sharpens the next line of inquiry — the investigator
              keeps the final call.
            </p>

            <div className="mt-8 hidden items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 lg:flex">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-evidence"
                aria-hidden="true"
              />
              <p className="text-caption text-foreground-muted">
                The platform assists with structure and analysis. Judgment remains with the
                investigating team.
              </p>
            </div>
          </div>

          <ol className="relative space-y-0" data-testid="capability-flow-steps">
            {CAPABILITY_FLOW.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === CAPABILITY_FLOW.length - 1;
              return (
                <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast && (
                    <span
                      className="absolute left-[17px] top-9 bottom-0 w-px bg-border"
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-surface ${
                      index === CAPABILITY_FLOW.length - 1
                        ? 'border-brand/50 text-brand'
                        : 'border-border text-foreground-muted'
                    }`}
                  >
                    <Icon size={15} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 pt-1">
                    <p className="text-[13px] font-semibold text-foreground">{step.title}</p>
                    <p className="mt-0.5 text-caption leading-relaxed text-foreground-muted">
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}