import { afterEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it("tomme variabler regnes som ikke satt, så standardverdiene gjelder", async () => {
    vi.stubEnv("OPENAI_SCOUT_MODEL", "");
    vi.stubEnv("OPENAI_TRANSCRIBE_MODEL", "  ");
    vi.stubEnv("SALES_NOTIFY_EMAIL", "");
    const { env } = await import("@/lib/env");
    expect(env.OPENAI_SCOUT_MODEL).toBe("gpt-5.4-mini");
    expect(env.OPENAI_TRANSCRIBE_MODEL).toBe("gpt-4o-mini-transcribe");
    expect(env.SALES_NOTIFY_EMAIL).toBeUndefined();
  });
});
