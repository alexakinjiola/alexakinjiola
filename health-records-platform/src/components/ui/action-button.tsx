"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "./button";
import { toast } from "./toast";
import type { ClientActionResult } from "@/lib/client-action";

/** A button that runs a server action, shows progress and reports the outcome. */
export function ActionButton({ action, children, refresh = true, onDone, ...props }: Omit<ButtonProps, "onClick"> & {
  action: () => Promise<ClientActionResult>; refresh?: boolean; onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      {...props}
      loading={pending}
      onClick={() => start(async () => {
        const res = await action();
        if (res.ok) { if (res.message) toast.success(res.message); onDone?.(); if (refresh) router.refresh(); }
        else toast.error(res.error);
      })}
    >
      {children}
    </Button>
  );
}
