import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, as: As = "section", ...props }: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" | "aside" }) {
  return <As className={cn("rounded-lg border border-line bg-surface shadow-xs", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6", className)} {...props} />;
}
export function CardTitle({ className, as: As = "h2", ...props }: React.HTMLAttributes<HTMLHeadingElement> & { as?: "h2" | "h3" | "h4" }) {
  return <As className={cn("text-[15px] font-semibold leading-6 text-ink", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-0.5 text-sm text-ink-3", className)} {...props} />;
}
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-5 sm:px-6", className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/50 px-5 py-3.5 sm:px-6 rounded-b-lg", className)} {...props} />;
}
