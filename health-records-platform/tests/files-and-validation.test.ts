import { describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sniffMime, validateFile, safeFileName } from "@/lib/files/validate";
import { scanFile } from "@/lib/files/scan";
import { LocalEncryptedStorage } from "@/lib/storage/local";
import { healthIdIsValid, normalisePhone } from "@/lib/validation/common";
import { admin } from "./helpers";

const PDF = Buffer.from("%PDF-1.7\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);

describe("file validation", () => {
  it("identifies types by content, not by name", () => {
    expect(sniffMime(PDF)).toBe("application/pdf");
    expect(sniffMime(PNG)).toBe("image/png");
    expect(sniffMime(JPG)).toBe("image/jpeg");
    expect(sniffMime(Buffer.from("MZ\x90\x00 executable"))).toBeNull();
    expect(sniffMime(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
  });
  it("rejects disguised, empty and oversized files", () => {
    expect(validateFile("report.pdf", PNG.length, PNG)).toMatchObject({ ok: false, reason: "extension_mismatch" });
    expect(validateFile("evil.pdf", 10, Buffer.from("MZ\x90\x00"))).toMatchObject({ ok: false, reason: "unsupported_type" });
    expect(validateFile("a.pdf", 0, PDF)).toMatchObject({ ok: false, reason: "empty" });
    expect(validateFile("a.pdf", 11 * 1024 * 1024, PDF)).toMatchObject({ ok: false, reason: "too_large" });
    expect(validateFile("Scan.JPEG", JPG.length, JPG)).toEqual({ ok: true, mime: "image/jpeg" });
  });
  it("sanitises file names", () => {
    expect(safeFileName("../../etc/passwd")).not.toContain("/");
    expect(safeFileName("<script>.pdf")).toBe("_script_.pdf");
  });
});

describe("file scanning", () => {
  it("rejects PDFs with active content and the EICAR signature", async () => {
    const js = Buffer.from("%PDF-1.4\n1 0 obj<</OpenAction<</S/JavaScript/JS(app.alert(1))>>>>endobj\n%%EOF");
    expect((await scanFile(js, "application/pdf")).status).toBe("rejected");
    const eicar = Buffer.from(["X5O!P%@AP[4\\PZX54(P^)7CC)7}$", "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"].join(""));
    expect((await scanFile(eicar, "image/png")).status).toBe("rejected");
    expect((await scanFile(PDF, "application/pdf")).status).toBe("clean");
  });
});

describe("14. private encrypted storage", () => {
  it("stores ciphertext only, binds key as AAD, and refuses path traversal", async () => {
    const dir = join(tmpdir(), `continuum-test-${Date.now()}`);
    const s = new LocalEncryptedStorage(dir);
    const key = `records/${crypto.randomUUID()}/${crypto.randomUUID()}`;
    const secret = Buffer.from("%PDF-1.4 Patient: Synthetic Person — HbA1c 7.9% %%EOF");
    await s.put(key, secret);
    const [scope] = await readdir(dir);
    const files = await readdir(join(dir, scope), { recursive: true });
    const onDisk = await readFile(join(dir, scope, files.find((f) => String(f).endsWith(".enc")) as string));
    expect(onDisk.includes(Buffer.from("HbA1c"))).toBe(false);
    expect((await s.get(key)).equals(secret)).toBe(true);
    await expect(s.get("records/../../etc/passwd")).rejects.toThrow();
    // Swapping a blob to a different key fails authentication (AAD binding).
    const other = `records/${crypto.randomUUID()}/${crypto.randomUUID()}`;
    await s.put(other, Buffer.from("other"));
    const { writeFile } = await import("node:fs/promises");
    const p1 = join(dir, `${key}.enc`);
    const p2 = join(dir, `${other}.enc`);
    await writeFile(p2, await readFile(p1));
    await expect(s.get(other)).rejects.toThrow();
  });
  it("storage lives outside the public web root", async () => {
    const { env } = await import("@/lib/env");
    expect(env().STORAGE_LOCAL_DIR.startsWith("public")).toBe(false);
  });
});

describe("identifier validation", () => {
  it("TypeScript and SQL Health ID check digits agree", async () => {
    const ids = await admin<{ v: string }[]>`select app.generate_health_id() v from generate_series(1, 25)`;
    for (const { v } of ids) expect(healthIdIsValid(v)).toBe(true);
    const bad = ids[0].v.slice(0, 11) + ((Number(ids[0].v[11]) + 1) % 10);
    expect(healthIdIsValid(bad)).toBe(false);
    const [{ ok }] = await admin`select app.is_valid_health_id(${bad}) ok`;
    expect(ok).toBe(false);
  });
  it("normalises Nigerian phone numbers", () => {
    expect(normalisePhone("0803 123 4567")).toBe("+2348031234567");
    expect(normalisePhone("+234 803 123 4567")).toBe("+2348031234567");
    expect(normalisePhone("12345")).toBeNull();
  });
});
