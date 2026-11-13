import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow] duration-150 select-none disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white shadow-xs hover:bg-brand-700 active:bg-brand-800",
        secondary: "border border-line-strong bg-surface text-ink shadow-xs hover:border-ink-3/50 hover:bg-sunken/60",
        ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
        danger: "bg-danger-600 text-white shadow-xs hover:bg-danger-fg",
        "danger-outline": "border border-danger-line bg-surface text-danger-fg hover:bg-danger-bg",
        navy: "bg-navy-800 text-white shadow-xs hover:bg-navy-700",
        link: "h-auto px-0 text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-600",
      },
      size: {
        sm: "h-8 rounded-sm px-3 text-[13px]",
        md: "h-10 rounded-md px-4 text-sm",
        lg: "h-12 rounded-md px-5 text-[15px]",
        icon: "size-10 rounded-md",
        "icon-sm": "size-8 rounded-sm",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: IconName;
  iconRight?: IconName;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild, loading, icon, iconRight, children, disabled, ...props }, ref,
) {
  const Comp = asChild ? Slot : "button";
  const iconSize = size === "sm" || size === "icon-sm" ? 18 : 20;
  if (asChild) {
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, block }), className)} {...props}>{children}</Comp>;
  }
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
});
