import type { Metadata, Viewport } from "next";
import { DM_Sans, Lora } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

// Selvhostet via next/font (ingen forespørsler til Google fra nettleseren)
// DM Sans: tekst, navigasjon og skjema. Lora: overskrifter, ingresser og sitater.
const sans = DM_Sans({ subsets: ["latin"], axes: ["opsz"], variable: "--font-sans", display: "swap" });
const serif = Lora({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Kontorcompaniet",
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = { themeColor: "#FBFAF7", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
