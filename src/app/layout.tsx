import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, Source_Serif_4 } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

// Selvhostet via next/font (ingen forespørsler til Google fra nettleseren)
// Schibsted Grotesk: norsk avisgrotesk til overskrifter og tekst. Source Serif 4: ingresser og sitater.
const sans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

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
