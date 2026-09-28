/**
 * Sentral firma-/kontaktkonfigurasjon. Kilden i produksjon er content.site_settings
 * (redigeres i admin). Verdiene under er typet standard og fallback.
 * Ingen komponent skal hardkode kontaktdata – bruk getSiteSettings().
 */
export type OpeningHours = { days: string; opens: string; closes: string; label?: string };

export type SiteSettings = {
  companyName: string;
  legalName: string;
  orgNumber: string | null;
  streetAddress: string;
  addressNote: string | null;
  postalCode: string;
  city: string;
  country: string;
  geo: { lat: number; lng: number } | null;
  phone: string;
  emailGeneral: string;
  openingHours: OpeningHours[];
  social: Partial<Record<"linkedin" | "instagram" | "facebook" | "vimeo", string>>;
  foundedYear: number;
  certifications: string[];
};

export const defaultSiteSettings: SiteSettings = {
  companyName: "Kontorcompaniet",
  legalName: "Kontorcompaniet AS",
  orgNumber: null,
  streetAddress: "Tollbugata 115",
  addressNote: "Inngang A, 2. etg.",
  postalCode: "3041",
  city: "Drammen",
  country: "NO",
  geo: null,
  phone: "+47 32 88 20 20",
  emailGeneral: "post@kontorcompaniet.no",
  openingHours: [{ days: "Mo-Fr", opens: "08:00", closes: "16:00", label: "Showroom" }],
  social: {
    linkedin: "https://www.linkedin.com/company/kontorcompaniet-as/",
    instagram: "https://www.instagram.com/kontorcompaniet/",
    facebook: "https://www.facebook.com/kontorcompaniet/",
    vimeo: "https://vimeo.com/kontorcompaniet",
  },
  foundedYear: 1981,
  certifications: ["Miljøfyrtårn", "Grønt Punkt"],
};

/** «+47 32 88 20 20» → «32 88 20 20» for visning */
export function displayPhone(phone: string): string {
  return phone.replace(/^\+47\s*/, "");
}
