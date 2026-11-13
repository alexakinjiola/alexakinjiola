import { existsSync, readFileSync } from "node:fs";

/** Minimal .env loader for scripts (Next.js loads .env files itself). */
export function loadEnv(file = ".env.local") {
  for (const f of [file, ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
