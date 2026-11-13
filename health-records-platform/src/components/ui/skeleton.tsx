import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-sm bg-sunken", className)} />;
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading…</span>
      <div className="space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-80 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="space-y-2 rounded-lg border border-line bg-surface p-5">
        {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    </div>
  );
}
