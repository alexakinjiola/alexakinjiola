"use client";
import * as React from "react";
import { Input } from "./field";
import { Icon } from "./icon";

export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function PasswordInput(props, ref) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? "text" : "password"} className="pr-12" {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink"
        aria-pressed={show}
      >
        <Icon name={show ? "visibility_off" : "visibility"} size={20} label={show ? "Hide password" : "Show password"} />
      </button>
    </div>
  );
});
