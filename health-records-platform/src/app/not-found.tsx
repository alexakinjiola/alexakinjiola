import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <Logo className="justify-center" />
        <p className="mt-10 font-mono text-sm text-ink-3">404</p>
        <h1 className="mt-2 font-display text-3xl font-medium text-ink">We couldn't find that page</h1>
        <p className="mt-3 text-ink-3">It may have moved, or you may not have permission to see it.</p>
        <Button asChild className="mt-8"><Link href="/home">Go to your home page</Link></Button>
      </div>
    </main>
  );
}
