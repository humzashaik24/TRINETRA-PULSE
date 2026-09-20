export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="border-t border-border"
      data-testid="landing-footer"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col-reverse items-center justify-between gap-3 px-5 py-6 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
        <p className="flex items-center gap-2 font-mono text-caption text-foreground-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
          Trinetra Pulse · {year}
        </p>
        <p className="text-caption text-foreground-muted">
          Criminal Network Intelligence &amp; Investigation Platform
        </p>
      </div>
    </footer>
  );
}