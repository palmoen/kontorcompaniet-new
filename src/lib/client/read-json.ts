/** Leser et API-svar som JSON. Tåler feilsider (f.eks. tidsavbrudd) uten å kaste en uforståelig feil. */
export async function readJson(res: Response): Promise<Record<string, unknown> & { error?: string }> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Noe gikk galt hos oss (feil ${res.status}). Prøv igjen om litt, eller ring oss.` };
  }
}
