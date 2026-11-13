import "server-only";
import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended argon2id baseline (19 MiB, 2 iterations).
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, OPTS);

export async function verifyPassword(hashed: string, password: string) {
  try {
    return await verify(hashed, password);
  } catch {
    return false;
  }
}

// Used to keep response timing similar when the account does not exist.
let dummy: string | null = null;
export async function burnPasswordCheck(password: string) {
  dummy ??= await hashPassword("continuum-timing-equaliser");
  await verifyPassword(dummy, password);
}
