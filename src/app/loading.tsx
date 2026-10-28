/* Top-of-screen elegant loading bar. Eliminates full-page flashing and blinking
   during client-side page transitions while providing instant feedback. */
export default function Loading() {
  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-transparent pointer-events-none" aria-busy="true">
      <span className="sr-only" role="status">Loading page</span>
      <div className="h-full w-full bg-gradient-to-r from-[#BFFF2E]/30 via-[#BFFF2E] to-emerald-400 animate-pulse" />
    </div>
  );
}
