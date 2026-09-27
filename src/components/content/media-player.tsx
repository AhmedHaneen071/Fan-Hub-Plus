// ---------------------------------------------------------------------------
// Fan Hub Plus — multimedia player (client)  (Phase 4)
// A YouTube Single offer: an embedded, privacy-enhanced player with a "watch
// on YouTube" escape hatch. Shows a static fallback when no usable video id
// exists, so the detail page always renders something meaningful.
// ---------------------------------------------------------------------------

"use client";

import { ExternalLink, Clapperboard } from "lucide-react";
import { extractYouTubeId, youTubeEmbedUrl, youTubeWatchUrl } from "@/lib/youtube";
import { Badge } from "@/components/ui/badge";

type MediaPlayerProps = {
  trailerUrl: string | null;
  title: string;
  poster?: string | null;
};

export function AudioPlayer({ src, title }: { src: string; title: string }) {
  return <div className="space-y-2 rounded-2xl border bg-card p-5">
    <p className="font-medium">Listen: {title}</p>
    <audio controls preload="none" className="w-full" aria-label={`Audio player for ${title}`}>
      <source src={src} />
      Your browser does not support audio playback.
    </audio>
  </div>;
}

export function MediaPlayer({ trailerUrl, title, poster }: MediaPlayerProps) {
  const videoId = extractYouTubeId(trailerUrl);

  if (!videoId) {
    return (
      <div
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-muted"
        role="img"
        aria-label={`No video offer for ${title}`}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        ) : null}
        <div className="relative z-10 flex flex-col items-center gap-2 text-center text-muted-foreground">
          <Clapperboard className="size-8" aria-hidden="true" />
          <p className="max-w-xs px-4 text-sm">No video offer for this item yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-black shadow-sm">
        <iframe
          src={`${youTubeEmbedUrl(videoId)}?rel=0&color=white`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="gap-1 px-2 py-0 text-[0.65rem] tracking-wide uppercase">
          <ExternalLink className="size-3" aria-hidden="true" />
          Stream
        </Badge>
        <a
          href={youTubeWatchUrl(videoId)}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary hover:underline"
        >
          Watch on YouTube ↗
        </a>
      </p>
    </div>
  );
}
