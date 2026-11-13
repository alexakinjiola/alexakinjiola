import "server-only";
import { connect } from "node:net";
import { env } from "../env";

export type ScanResult = { status: "clean" | "rejected" | "failed"; detail: string };

// EICAR standard antivirus test signature (assembled to avoid tripping scanners on this source file).
const EICAR = ["X5O!P%@AP[4\\PZX54(P^)7CC)7}$", "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"].join("");

/**
 * Baseline content checks. These are NOT a substitute for antivirus: set
 * CLAMAV_ADDRESS to scan with ClamAV as well (required before a pilot).
 */
function heuristicScan(buf: Buffer, mime: string): ScanResult {
  const text = buf.toString("latin1");
  if (text.includes(EICAR)) return { status: "rejected", detail: "Malware test signature detected" };
  if (mime === "application/pdf") {
    if (/\/JavaScript|\/JS\s*[(<]|\/Launch|\/EmbeddedFile|\/RichMedia|\/XFA/.test(text)) {
      return { status: "rejected", detail: "PDF contains active or embedded content" };
    }
    if (!text.includes("%%EOF")) return { status: "rejected", detail: "PDF appears incomplete or corrupted" };
  }
  return { status: "clean", detail: "Passed baseline content checks" };
}

function clamScan(address: string, buf: Buffer): Promise<ScanResult> {
  const [host, port] = address.split(":");
  return new Promise((resolve) => {
    const socket = connect({ host, port: Number(port) || 3310 });
    let reply = "";
    socket.setTimeout(15_000, () => { socket.destroy(); resolve({ status: "failed", detail: "Scanner timeout" }); });
    socket.on("error", () => resolve({ status: "failed", detail: "Scanner unavailable" }));
    socket.on("data", (d) => (reply += d.toString()));
    socket.on("end", () => {
      if (/OK\0?$/.test(reply.trim())) resolve({ status: "clean", detail: "ClamAV: OK" });
      else if (/FOUND/.test(reply)) resolve({ status: "rejected", detail: "ClamAV: threat found" });
      else resolve({ status: "failed", detail: "ClamAV: unexpected response" });
    });
    socket.write("zINSTREAM\0");
    for (let i = 0; i < buf.length; i += 64 * 1024) {
      const chunk = buf.subarray(i, i + 64 * 1024);
      const len = Buffer.alloc(4);
      len.writeUInt32BE(chunk.length);
      socket.write(len);
      socket.write(chunk);
    }
    socket.write(Buffer.alloc(4));
  });
}

export async function scanFile(buf: Buffer, mime: string): Promise<ScanResult> {
  const basic = heuristicScan(buf, mime);
  if (basic.status !== "clean") return basic;
  const addr = env().CLAMAV_ADDRESS;
  if (!addr) return basic;
  return clamScan(addr, buf);
}
