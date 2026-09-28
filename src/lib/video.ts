/**
 * Video-lenker fra prosjekter → innebygd avspiller. Kun lenker til én bestemt film
 * (Vimeo eller YouTube) bygges inn; kanal-/profillenker vises som vanlig lenke.
 * Innebygging bruker personvernvennlige varianter (Vimeo dnt=1, youtube-nocookie).
 */
export type VideoEmbed = { provider: "vimeo" | "youtube"; id: string; embedUrl: string; watchUrl: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseVideo(raw: string): VideoEmbed | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    // vimeo.com/123456789, vimeo.com/123456789/abcdef (ulistet), player.vimeo.com/video/123456789?h=abcdef
    const i = host === "player.vimeo.com" ? parts.indexOf("video") + 1 : 0;
    const id = parts[i];
    if (!id || !/^\d+$/.test(id)) return null;
    const hash = url.searchParams.get("h") ?? (host === "vimeo.com" && /^[0-9a-f]{6,}$/i.test(parts[1] ?? "") ? parts[1] : null);
    const q = new URLSearchParams({ dnt: "1" });
    if (hash) q.set("h", hash);
    return { provider: "vimeo", id, embedUrl: `https://player.vimeo.com/video/${id}?${q}`, watchUrl: `https://vimeo.com/${id}${hash ? `/${hash}` : ""}` };
  }

  let yt: string | null = null;
  if (host === "youtu.be") yt = parts[0] ?? null;
  else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") yt = url.searchParams.get("v");
    else if (["embed", "shorts", "live"].includes(parts[0])) yt = parts[1] ?? null;
  }
  if (yt && YT_ID.test(yt)) {
    return { provider: "youtube", id: yt, embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`, watchUrl: `https://www.youtube.com/watch?v=${yt}` };
  }
  return null;
}
