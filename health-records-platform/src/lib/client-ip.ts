/**
 * Client IP from X-Forwarded-For, trusting exactly TRUSTED_PROXY_HOPS proxies.
 * Each trusted proxy APPENDS the address it received the request from, so the
 * real client is the N-th entry from the right. Anything further left is
 * client-supplied and spoofable. With 0 hops, forwarded headers are ignored.
 */
export function clientIpFrom(xff: string | null, realIp: string | null, hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1)) {
  if (!hops || hops < 0) return null;
  const chain = (xff ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip = chain.length >= hops ? chain[chain.length - hops] : chain.length ? null : realIp;
  return ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}
