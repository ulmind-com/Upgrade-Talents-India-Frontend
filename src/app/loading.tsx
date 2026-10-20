/* Rendered the instant a nav link is clicked. Without this boundary every
   navigation waited silently on the API round trip, so the bar felt dead
   and pages appeared seconds later; the skeleton also lets Next prefetch
   the shell of data-driven routes. */
export default function Loading() {
  return (
    <div className="container-x pb-24 pt-28 md:pt-36" aria-busy="true">
      <span className="sr-only" role="status">Loading page</span>
      <div className="h-6 w-32 animate-pulse rounded-full bg-[var(--surface-2)]" />
      <div className="mt-5 h-12 w-full max-w-[620px] animate-pulse rounded-2xl bg-[var(--surface-2)]" />
      <div className="mt-3.5 h-4 w-full max-w-[440px] animate-pulse rounded-full bg-[var(--surface-2)]" />
      <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            <div className="aspect-[4/3] animate-pulse bg-[var(--surface-2)]" />
            <div className="space-y-2.5 p-4">
              <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-[var(--surface-2)]" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-[var(--surface-2)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
