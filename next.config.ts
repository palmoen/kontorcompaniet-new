import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avsluttende skråstrek håndteres i src/proxy.ts sammen med migrerings-redirects,
  // slik at gamle WordPress-URL-er (/om-oss/kontakt/) går til endelig mål i ETT hopp.
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 70, 75],
    remotePatterns: [
      // Supabase Storage (prosjektets URL settes via NEXT_PUBLIC_SUPABASE_URL)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
