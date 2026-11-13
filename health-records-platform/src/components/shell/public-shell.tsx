import Link from "next/link";
import { Logo } from "./logo";
import { SkipLink } from "./skip-link";
import { Button } from "@/components/ui/button";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <header className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link href="/sign-in">Sign in</Link></Button>
          <Button asChild size="sm"><Link href="/register">Create account</Link></Button>
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="mt-24 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-ink-3 sm:flex-row sm:justify-between sm:px-8">
          <p>A pilot platform for personal health records in Nigeria.</p>
          <nav aria-label="Footer" className="flex gap-5"><Link href="/privacy" className="hover:text-ink">Privacy</Link><Link href="/register/provider" className="hover:text-ink">For institutions</Link><Link href="/help/account-recovery" className="hover:text-ink">Account help</Link></nav>
        </div>
      </footer>
    </div>
  );
}
