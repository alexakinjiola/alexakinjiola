import * as React from "react";
import { cn } from "@/lib/cn";

export function Table({ className, caption, children }: { className?: string; caption: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
export const THead = ({ children }: { children: React.ReactNode }) => (
  <thead className="border-b border-line bg-canvas/60 text-xs font-medium text-ink-3">{children}</thead>
);
export const Th = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th scope="col" className={cn("whitespace-nowrap px-4 py-2.5 font-medium first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6", className)}>{children}</th>
);
export const TBody = ({ children }: { children: React.ReactNode }) => <tbody className="divide-y divide-line">{children}</tbody>;
export const Tr = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <tr className={cn("align-top transition-colors hover:bg-canvas/50", className)}>{children}</tr>
);
export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn("px-4 py-3.5 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6", className)}>{children}</td>
);
