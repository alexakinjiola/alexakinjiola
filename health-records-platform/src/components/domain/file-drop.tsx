"use client";
import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { ACCEPT_ATTR, MAX_FILE_BYTES } from "@/lib/files/validate";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/cn";

const OK_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export function checkFileClientSide(f: File): string | null {
  if (f.size === 0) return "This file is empty.";
  if (f.size > MAX_FILE_BYTES) return `This file is ${formatBytes(f.size)}. Files must be 10 MB or smaller.`;
  if (!OK_TYPES.includes(f.type) && !/\.(pdf|jpe?g|png)$/i.test(f.name)) return "Only PDF, JPG and PNG files can be uploaded.";
  return null;
}

/** Accessible file picker with drag-and-drop. The real check happens on the server. */
export function FileDrop({ file, onFile, error, id = "file", disabled }: { file: File | null; onFile: (f: File | null) => void; error?: string | null; id?: string; disabled?: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        className={cn("rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
          over ? "border-brand-600 bg-brand-50" : error ? "border-danger-line bg-danger-bg/40" : "border-line-strong bg-surface")}
      >
        {file ? (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:text-left">
            <span className="grid size-12 place-items-center rounded-md bg-brand-50 text-brand-700"><Icon name={file.type === "application/pdf" ? "picture_as_pdf" : "image"} size={26} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-ink">{file.name}</span>
              <span className="text-sm text-ink-3">{formatBytes(file.size)}</span>
            </span>
            <button type="button" disabled={disabled} className="link text-sm" onClick={() => { onFile(null); if (inputRef.current) inputRef.current.value = ""; }}>Choose a different file</button>
          </div>
        ) : (
          <>
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-canvas text-ink-3 ring-1 ring-line"><Icon name="cloud_upload" size={26} /></span>
            <p className="mt-3 text-[15px] font-medium text-ink">
              <label htmlFor={id} className="link cursor-pointer">Choose a file</label> <span className="font-normal text-ink-3">or drag it here</span>
            </p>
            <p className="mt-1 text-sm text-ink-3">PDF, JPG or PNG, up to 10 MB. A clear photo of a paper result works fine.</p>
          </>
        )}
        <input ref={inputRef} id={id} type="file" accept={ACCEPT_ATTR} className="sr-only" disabled={disabled}
          aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </div>
      {error && <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-danger-600"><Icon name="error" size={16} filled />{error}</p>}
    </div>
  );
}

/** POST multipart with real upload progress (fetch can't report it). */
export function uploadWithProgress(url: string, data: FormData, onProgress: (pct: number) => void) {
  return new Promise<{ status: number; body: { ok: boolean; error?: string; fieldErrors?: Record<string, string>; [k: string]: unknown } }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body;
      try { body = JSON.parse(xhr.responseText); } catch { body = { ok: false, error: "Unexpected response from the server." }; }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => resolve({ status: 0, body: { ok: false, error: "Connection lost. Check your internet and try again — nothing was saved." } });
    xhr.ontimeout = xhr.onerror;
    xhr.timeout = 120_000;
    xhr.send(data);
  });
}
