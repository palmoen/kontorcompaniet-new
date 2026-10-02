import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

// Selvhostet via next/font (ingen forespørsler til Google fra nettleseren)
// Samme profil som Workshop Studio: Playfair Display til overskrifter (med kursiv aksent), Inter til alt annet.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

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
