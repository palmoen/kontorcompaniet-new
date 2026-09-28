import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { parseFrontmatter, type Doc } from "./markdown-parse";

/**
 * Redaksjonelle tekster som markdown-filer i /content/{type}/{slug}.md (v1).
 * Når tekstene flyttes til Supabase (*_md-felt), leses de derfra med samme renderer.
 */
export type ContentType = "losninger" | "produkter" | "merkevarer" | "prosjekter" | "sider" | "inspirasjon";

const ROOT = path.join(process.cwd(), "content");
const SAFE = /^[a-z0-9-]+$/;

export const readDoc = cache(async (type: ContentType, slug: string): Promise<Doc | null> => {
  if (!SAFE.test(slug)) return null;
  try {
    return parseFrontmatter(await readFile(path.join(ROOT, type, `${slug}.md`), "utf8"));
  } catch {
    return null;
  }
});
