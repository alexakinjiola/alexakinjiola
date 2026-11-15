/**
 * External-provider adapters exercised against local protocol mocks:
 * ClamAV (clamd INSTREAM over TCP), Supabase Storage (REST), Termii and
 * Africa's Talking (HTTP). Proves request shapes, encryption-before-upload and
 * fail-closed behaviour. Real-provider sandbox verification is still required
 * before a pilot (see docs/DEPLOYMENT.md).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { createServer as createTcp, type Server as TcpServer } from "node:net";
import { randomBytes } from "node:crypto";
import { admin, app } from "./helpers";
import { deliverDue } from "@/lib/messaging/delivery";
import { open, parseKeyring, seal, needsRotation, keyIdOf } from "@/lib/keyring";
import { fromFhirBundle } from "@/lib/fhir";

const body = (req: IncomingMessage) => new Promise<Buffer>((r) => { const c: Buffer[] = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
const listen = (s: Server | TcpServer) => new Promise<number>((r) => s.listen(0, "127.0.0.1", () => r((s.address() as { port: number }).port)));

// ── ClamAV ────────────────────────────────────────────────────────────────
let clam: TcpServer;
let clamPort = 0;
const received: Buffer[] = [];
beforeAll(async () => {
  clam = createTcp((sock) => {
    let buf = Buffer.alloc(0);
    sock.on("data", (d) => {
      buf = Buffer.concat([buf, Buffer.from(d)]);
      if (!buf.subarray(0, 10).equals(Buffer.from("zINSTREAM\0"))) return;
      // Parse <len><chunk>... until a zero-length chunk.
      let off = 10; const chunks: Buffer[] = [];
      while (off + 4 <= buf.length) {
        const len = buf.readUInt32BE(off);
        if (len === 0) {
          const data = Buffer.concat(chunks); received.push(data);
          sock.end(data.includes(Buffer.from("MALWARE-MARKER")) ? "stream: Test.Malware FOUND\0" : "stream: OK\0");
          return;
        }
        if (off + 4 + len > buf.length) return;
        chunks.push(buf.subarray(off + 4, off + 4 + len)); off += 4 + len;
      }
    });
  });
  clamPort = await listen(clam);
});
afterAll(() => clam.close());

describe("ClamAV adapter (clamd INSTREAM)", () => {
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF");
  it("streams the file, honours the verdict, and fails closed when the scanner is down", async () => {
    process.env.CLAMAV_ADDRESS = `127.0.0.1:${clamPort}`;
    const { scanFile } = await import("@/lib/files/scan");
    const { env } = await import("@/lib/env");
    expect(env().CLAMAV_ADDRESS).toBe(`127.0.0.1:${clamPort}`);
    const big = Buffer.concat([pdf, randomBytes(200 * 1024)]); // > one 64 KiB chunk
    expect(await scanFile(big, "application/pdf")).toEqual({ status: "clean", detail: "ClamAV: OK" });
    expect(received.at(-1)!.equals(big)).toBe(true);
    expect((await scanFile(Buffer.concat([pdf, Buffer.from("MALWARE-MARKER")]), "application/pdf")).status).toBe("rejected");
    // Scanner unreachable → "failed", which upload intake turns into a refusal (never "clean").
    (env() as { CLAMAV_ADDRESS?: string }).CLAMAV_ADDRESS = "127.0.0.1:1";
    expect((await scanFile(pdf, "application/pdf")).status).toBe("failed");
    (env() as { CLAMAV_ADDRESS?: string }).CLAMAV_ADDRESS = undefined;
  });
});

// ── Supabase Storage ──────────────────────────────────────────────────────
describe("Supabase Storage driver", () => {
  it("authenticates with the service key, uploads ciphertext only, and round-trips", async () => {
    const store = new Map<string, Buffer>();
    const auths: string[] = [];
    let deleted: unknown = null;
    const srv = createServer(async (req, res) => {
      auths.push(`${req.headers.authorization}|${req.headers.apikey}`);
      const path = req.url!.replace("/storage/v1/object/", "");
      if (req.method === "POST") { store.set(path, await body(req)); res.end("{}"); return; }
      if (req.method === "GET") { const b = store.get(path); res.statusCode = b ? 200 : 404; res.end(b ?? ""); return; }
      if (req.method === "DELETE") { deleted = JSON.parse((await body(req)).toString()); res.end("[]"); return; }
    });
    const port = await listen(srv);
    const { SupabaseStorage } = await import("@/lib/storage/supabase");
    const s = new SupabaseStorage(`http://127.0.0.1:${port}`, "service-key-test", "medical-records");
    const key = `records/${crypto.randomUUID()}/${crypto.randomUUID()}`;
    const plain = Buffer.from("%PDF-1.4 Synthetic patient — HbA1c 7.9% %%EOF");
    await s.put(key, plain, "application/pdf");
    const stored = store.get(`medical-records/${key}`)!;
    expect(stored.includes(Buffer.from("HbA1c"))).toBe(false); // encrypted before it leaves the server
    expect((await s.get(key)).equals(plain)).toBe(true);
    await s.remove(key);
    expect(deleted).toEqual({ prefixes: [key] });
    expect(auths.every((a) => a === "Bearer service-key-test|service-key-test")).toBe(true);
    await expect(s.get(`records/${crypto.randomUUID()}/${crypto.randomUUID()}`)).rejects.toThrow(/404/);
    srv.close();
  });
});

// ── SMS providers ─────────────────────────────────────────────────────────
describe("SMS provider adapters", () => {
  async function withMock(handler: (req: IncomingMessage, b: Buffer) => { status?: number; json: unknown }) {
    const calls: { path: string; headers: IncomingMessage["headers"]; body: string }[] = [];
    const srv = createServer(async (req, res) => {
      const b = await body(req);
      calls.push({ path: req.url!, headers: req.headers, body: b.toString() });
      const r = handler(req, b);
      res.statusCode = r.status ?? 200; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(r.json));
    });
    return { calls, port: await listen(srv), close: () => srv.close() };
  }
  const queueSms = async (to: string) => {
    await admin`update message_outbox set status = 'sent' where status = 'queued'`;
    await admin`insert into message_outbox(channel, recipient, template, body) values ('sms', ${to}, 'otp', 'Your code is 123456')`;
  };

  it("Termii: DND route, sender id, international number without +", async () => {
    const m = await withMock(() => ({ json: { code: "ok", message_id: "m1" } }));
    await queueSms("+2348031234567");
    const r = await deliverDue(app, { mailDriver: "outbox", smsDriver: "termii", smsApiKey: "TK", smsSenderId: "Continuum", smsBaseUrl: `http://127.0.0.1:${m.port}` });
    expect(r.sent).toBe(1);
    expect(m.calls[0].path).toBe("/api/sms/send");
    expect(JSON.parse(m.calls[0].body)).toEqual({ api_key: "TK", to: "2348031234567", from: "Continuum", sms: "Your code is 123456", type: "plain", channel: "dnd" });
    m.close();
  });

  it("Africa's Talking: form body, apiKey header; a provider rejection is retried, not marked sent", async () => {
    let ok = false;
    const m = await withMock(() => ({ json: { SMSMessageData: { Recipients: [ok ? { status: "Success", statusCode: 101 } : { status: "InvalidSenderId", statusCode: 404 }] } } }));
    await queueSms("+2348031234567");
    const cfg = { mailDriver: "outbox" as const, smsDriver: "africastalking" as const, smsApiKey: "AK", smsUsername: "sandbox", smsBaseUrl: `http://127.0.0.1:${m.port}` };
    expect(await deliverDue(app, cfg)).toMatchObject({ sent: 0, retried: 1 });
    expect(m.calls[0].path).toBe("/version1/messaging");
    expect(m.calls[0].headers.apikey).toBe("AK");
    expect(Object.fromEntries(new URLSearchParams(m.calls[0].body))).toEqual({ username: "sandbox", to: "+2348031234567", message: "Your code is 123456" });
    ok = true;
    await admin`update message_outbox set next_attempt_at = now() where status = 'queued'`;
    expect(await deliverDue(app, cfg)).toMatchObject({ sent: 1 });
    m.close();
  });
});

// ── Key rotation ──────────────────────────────────────────────────────────
describe("encryption keyring", () => {
  const k1 = randomBytes(32).toString("base64");
  const k2 = randomBytes(32).toString("base64");
  it("reads legacy v1 data, writes with the active key, and refuses unknown keys", () => {
    const legacy = parseKeyring({ APP_ENCRYPTION_KEY: k1 });
    const v2 = seal(legacy, Buffer.from("secret"), "aad");
    expect(keyIdOf(v2)).toBe(1);
    // Hand-built v1 blob (format used before rotation support).
    const v1 = Buffer.concat([Buffer.from([1]), v2.subarray(2)]);
    const rotated = parseKeyring({ APP_ENCRYPTION_KEYS: `2:${k2},1:${k1}` });
    expect(open(rotated, v1, "aad").toString()).toBe("secret");
    expect(needsRotation(rotated, v1)).toBe(true);
    const fresh = seal(rotated, Buffer.from("secret"), "aad");
    expect(keyIdOf(fresh)).toBe(2);
    expect(needsRotation(rotated, fresh)).toBe(false);
    expect(() => open(parseKeyring({ APP_ENCRYPTION_KEYS: `3:${k2}` }), fresh, "aad")).toThrow(/not in the keyring/);
    expect(() => open(rotated, fresh, "other-aad")).toThrow();
  });
});

// ── FHIR attachments ──────────────────────────────────────────────────────
describe("FHIR inline documents", () => {
  it("extracts base64 documents from DocumentReference and DiagnosticReport.presentedForm", () => {
    const data = Buffer.from("%PDF-1.4\n%%EOF").toString("base64");
    const { records } = fromFhirBundle({ resourceType: "Bundle", entry: [
      { resource: { resourceType: "DocumentReference", id: "d1", type: { text: "Discharge summary" }, title: "Discharge letter",
        content: [{ attachment: { contentType: "application/pdf", data, title: "discharge.pdf" } }] } },
      { resource: { resourceType: "DiagnosticReport", id: "r1", code: { text: "Chest X-ray" }, category: [{ text: "Imaging" }],
        presentedForm: [{ contentType: "application/pdf", data }] } },
    ] });
    expect(records.find((r) => r.source_ref === "DocumentReference/d1")).toMatchObject({ category: "discharge_summary", attachments: [{ title: "discharge.pdf", contentType: "application/pdf", data }] });
    expect(records.find((r) => r.source_ref === "DiagnosticReport/r1")!.attachments).toHaveLength(1);
  });
});

describe("client IP attribution", () => {
  it("trusts exactly N proxy hops and ignores spoofed left-most entries", async () => {
    const { clientIpFrom } = await import("@/lib/client-ip");
    expect(clientIpFrom("6.6.6.6, 41.58.1.2", null, 1)).toBe("41.58.1.2");          // client spoofed 6.6.6.6
    expect(clientIpFrom("6.6.6.6, 41.58.1.2, 10.0.0.5", null, 2)).toBe("41.58.1.2"); // CDN + load balancer
    expect(clientIpFrom("41.58.1.2", null, 0)).toBeNull();
    expect(clientIpFrom(null, "41.58.1.9", 1)).toBe("41.58.1.9");
    expect(clientIpFrom("not-an-ip<script>", null, 1)).toBeNull();
  });
});

describe("breached password check (k-anonymity)", () => {
  it("sends only a 5-character hash prefix and matches the suffix", async () => {
    const { createHash } = await import("node:crypto");
    const sha1 = createHash("sha1").update("Password-123456").digest("hex").toUpperCase();
    const paths: string[] = [];
    const srv = createServer((req, res) => { paths.push(req.url!); res.end(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${sha1.slice(5)}:42\r\n`); });
    const port = await listen(srv);
    process.env.PASSWORD_BREACH_CHECK = "hibp";
    process.env.HIBP_BASE_URL = `http://127.0.0.1:${port}`;
    const { isBreachedPassword } = await import("@/lib/auth/breached");
    expect(await isBreachedPassword("Password-123456")).toBe(true);
    expect(await isBreachedPassword("a-genuinely-unusual-passphrase-7731")).toBe(false);
    expect(paths[0]).toBe(`/range/${sha1.slice(0, 5)}`);
    process.env.HIBP_BASE_URL = "http://127.0.0.1:1"; // outage → fail open
    expect(await isBreachedPassword("Password-123456")).toBe(false);
    process.env.PASSWORD_BREACH_CHECK = "off";
    srv.close();
  });
});
