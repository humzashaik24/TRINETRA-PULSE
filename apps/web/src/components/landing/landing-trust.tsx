'use client';

import { TRUST_ITEMS } from './landing-data';

export function LandingTrust() {
  return (
    <section
      id="trust"
      aria-labelledby="landing-trust-title"
      data-testid="landing-trust"
      className="relative overflow-hidden border-y border-border/60"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-56 w-[min(760px,90vw)] rounded-full bg-evidence/[0.04] blur-3xl" />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-overline text-brand">Security &amp; Trust</p>
          <h2
            id="landing-trust-title"
            className="mt-3 text-balance text-display-sm text-foreground sm:text-display-md"
          >
            Built to support the investigator, not replace them
          </h2>
          <p className="mt-3 text-pretty text-body-lg text-foreground-secondary">
            Integrity, provenance, privacy and grounded assistance are engineering decisions —
            not add-ons.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.id}
                data-testid={`trust-${item.id}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 tp-transition hover:border-border-strong"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-elevated">
                  <Icon size={16} strokeWidth={2} style={{ color: item.accent }} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1.5 text-caption leading-relaxed text-foreground-secondary">
                    {item.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}