import * as React from "react";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { SkipLink } from "./skip-link";
import { SyntheticBanner } from "./synthetic-banner";
import { BottomNav, SideNav, type NavItem } from "./nav";
import { MobileDrawer } from "./mobile-drawer";

/**
 * One shell, three moods: the patient app is light and spacious; provider and
 * admin workspaces use a navy sidebar to signal a professional, accountable space.
 */
export function AppShell({
  variant, nav, topRight, sidebarTop, sidebarFooter, synthetic, children, bottomNav, logoSuffix, banner,
}: {
  variant: "patient" | "provider" | "admin";
  nav: NavItem[];
  topRight: React.ReactNode;
  sidebarTop?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  synthetic?: boolean;
  bottomNav?: NavItem[];
  logoSuffix?: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const dark = variant !== "patient";
  const home = variant === "patient" ? "/dashboard" : variant === "provider" ? "/provider" : "/admin";
  return (
    <div className="min-h-dvh">
      <SkipLink />
      {synthetic && <SyntheticBanner />}
      {banner}
      <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className={cn("no-print sticky top-0 hidden h-dvh flex-col px-4 py-5 lg:flex", dark ? "bg-navy-900" : "border-r border-line bg-canvas")}>
          <Logo href={home} inverted={dark} suffix={logoSuffix} className="px-2" />
          {sidebarTop && <div className="mt-6">{sidebarTop}</div>}
          <nav aria-label="Main" className="mt-6 flex-1 overflow-y-auto"><SideNav items={nav} dark={dark} /></nav>
          {sidebarFooter && <div className="mt-4">{sidebarFooter}</div>}
        </aside>
        <div className="min-w-0">
          <header className={"no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur sm:px-6 lg:px-10"}>
            <MobileDrawer items={nav} dark={dark} header={<Logo href={home} inverted={dark} suffix={logoSuffix} />} footer={sidebarTop} />
            <div className="lg:hidden"><Logo href={home} suffix={logoSuffix} /></div>
            <div className="ml-auto flex items-center gap-1.5">{topRight}</div>
          </header>
          <main id="main" tabIndex={-1} className={cn("mx-auto w-full max-w-[1240px] px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-10", bottomNav && "pb-28 lg:pb-10")}>
            {children}
          </main>
        </div>
      </div>
      {bottomNav && <BottomNav items={bottomNav} />}
    </div>
  );
}
