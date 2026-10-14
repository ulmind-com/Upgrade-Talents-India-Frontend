import Link from "next/link";
import { Button } from "@/components/ui/Primitives";

export default function NotFound() {
  return (
    <section className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-32 noise">
      <div className="relative text-center">
        <p className="font-display text-[clamp(5rem,22vw,14rem)] font-bold leading-none text-gradient">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight md:text-4xl">Off the dance floor</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm text-[var(--fg-muted)]">
          The page you're looking for has moved or never existed. Let's get you back to the stage.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Button href="/" size="lg">Back home</Button>
          <Button href="/events" variant="outline" size="lg">Browse events</Button>
        </div>
      </div>
    </section>
  );
}
