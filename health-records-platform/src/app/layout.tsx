import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/public-sans";
import "@fontsource-variable/newsreader";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

const name = process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Continuum";

export const metadata: Metadata = {
  title: { default: `${name} — Personal health records`, template: `%s · ${name}` },
  description: "Your health records, wherever you receive care. You decide who sees them.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f6f4ef", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the nonce makes every page dynamic, which per-request CSP nonces require.
  await headers();
  return (
    <html lang="en-NG">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
