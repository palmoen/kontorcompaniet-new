"use client";

import { useState } from "react";
import type { VideoEmbed } from "@/lib/video";

const NAMES = { vimeo: "Vimeo", youtube: "YouTube" } as const;

/**
 * Filmen lastes først når besøkende trykker «Spill av»: ingen tredjepartskall
 * (og ingen informasjonskapsler fra Vimeo/YouTube) før det, og raskere side.
 */
export function VideoPlayer({ video, title }: { video: VideoEmbed; title: string }) {
  const [playing, setPlaying] = useState(false);
  const src = `${video.embedUrl}${video.embedUrl.includes("?") ? "&" : "?"}autoplay=1`;
  return (
    <figure className="video">
      <div className="video-frame">
        {playing ? (
          <iframe src={src} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
        ) : (
          <button type="button" className="video-play" onClick={() => setPlaying(true)}>
            <span className="video-icon" aria-hidden="true" />
            <span>Spill av film</span>
          </button>
        )}
      </div>
      <figcaption>
        {title}. Filmen lastes fra {NAMES[video.provider]} når du trykker spill av.{" "}
        <a className="textlink" href={video.watchUrl} rel="noopener">Se på {NAMES[video.provider]}</a>
      </figcaption>
    </figure>
  );
}
