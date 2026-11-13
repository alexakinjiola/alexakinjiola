"use client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md py-20 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger-bg text-danger-fg"><Icon name="error" size={26} /></span>
      <h1 className="mt-5 text-xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-3">Nothing was changed. Check your connection and try again. If it keeps happening, contact support.</p>
      <Button className="mt-6" icon="refresh" onClick={reset}>Try again</Button>
    </div>
  );
}
