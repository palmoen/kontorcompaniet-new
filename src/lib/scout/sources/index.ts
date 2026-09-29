import { mockAdapter } from "./mock";
import type { ScoutSourceAdapter } from "./types";
import { webAdapter } from "./web";

/** Registrerte adaptere. Nye kilder (manuell import, eget lager, partner-feed) legges til her. */
export const adapters: Partial<Record<ScoutSourceAdapter["adapter"], ScoutSourceAdapter>> = {
  mock: mockAdapter,
  web: webAdapter,
};
