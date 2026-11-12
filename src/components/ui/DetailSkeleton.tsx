/* Shown the instant a card is clicked, so a slow API never looks like a dead
   click. Pure markup — no client JS, so it paints immediately. */
export default function DetailSkeleton() {
  return (
    <div aria-busy="true" className="min-h-dvh">
      <span className="sr-only" role="status">
        Loading details
      </span>

      <div className="fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-transparent pointer-events-none">
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-[#BFFF2E]/30 via-[#BFFF2E] to-emerald-400" />
      </div>

      {/* Hero */}
      <div className="relative h-[46vh] min-h-[320px] w-full overflow-hidden bg-[var(--surface-2)]">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[var(--surface-2)] via-[var(--surface)] to-[var(--surface-2)]" />
        <div className="container-x absolute inset-x-0 bottom-8">
          <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--surface-3)]" />
          <div className="mt-4 h-10 w-[min(560px,80%)] animate-pulse rounded-xl bg-[var(--surface-3)]" />
          <div className="mt-3 h-4 w-[min(360px,60%)] animate-pulse rounded-full bg-[var(--surface-3)]" />
        </div>
      </div>

      {/* Body */}
      <div className="container-x grid gap-6 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]" />
      </div>
    </div>
  );
}
