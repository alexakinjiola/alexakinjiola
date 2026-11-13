import "server-only";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { decryptString, encryptString } from "../crypto";

const ISSUER = process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Continuum";

export function newTotpSecret() {
  return generateSecret();
}

export async function totpQrDataUrl(secret: string, label: string) {
  const uri = generateURI({ issuer: ISSUER, label, secret });
  return QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: "#13233A", light: "#FFFFFF" } });
}

export async function verifyTotp(encryptedSecret: string, userId: string, code: string) {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  const secret = decryptString(encryptedSecret, `mfa:${userId}`);
  const result = await verify({ secret, token, epochTolerance: 30 });
  return result.valid;
}

export const sealTotpSecret = (secret: string, userId: string) => encryptString(secret, `mfa:${userId}`);
