import { describe, expect, it } from "vitest";
import { parseVideo } from "@/lib/video";

describe("parseVideo", () => {
  it("Vimeo: vanlig, ulistet og player-lenke", () => {
    expect(parseVideo("https://vimeo.com/123456789")).toMatchObject({ provider: "vimeo", id: "123456789", embedUrl: "https://player.vimeo.com/video/123456789?dnt=1" });
    expect(parseVideo("https://vimeo.com/123456789/abc123def0")?.embedUrl).toBe("https://player.vimeo.com/video/123456789?dnt=1&h=abc123def0");
    expect(parseVideo("https://player.vimeo.com/video/42?h=ff00ff")?.watchUrl).toBe("https://vimeo.com/42/ff00ff");
  });

  it("YouTube: watch, youtu.be, embed og shorts → youtube-nocookie", () => {
    for (const u of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10", "https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ"]) {
      expect(parseVideo(u)).toMatchObject({ provider: "youtube", id: "dQw4w9WgXcQ", embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
    }
  });

  it("kanal-/profillenker, ukjente verter og http bygges ikke inn", () => {
    for (const u of ["https://vimeo.com/kontorcompaniet", "https://www.youtube.com/@kontorcompaniet", "https://example.com/video/1", "http://vimeo.com/123", "ikke en url", "https://youtu.be/kort"]) {
      expect(parseVideo(u), u).toBeNull();
    }
  });
});
