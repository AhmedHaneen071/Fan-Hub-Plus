// ---------------------------------------------------------------------------
// Fan Hub Plus — content media visual
// Shows the media image when one exists, otherwise a gradient placeholder
// with the content-type icon so cards never look half-finished.
// ---------------------------------------------------------------------------

import Image from "next/image";
import { Flame, Film, Headphones, ImageIcon, FileText } from "lucide-react";
import { type ContentTypeValue, CONTENT_TYPE_LABELS } from "@/lib/constants";

const TYPE_ICONS: Record<ContentTypeValue, typeof Film> = {
  ARTICLE: FileText,
  VIDEO: Film,
  AUDIO: Headphones,
  IMAGE: ImageIcon,
};

type ContentMediaProps = {
  src?: string | null;
  type: ContentTypeValue;
  title: string;
};

export function ContentMedia({ src, type, title }: ContentMediaProps) {
  const Icon = TYPE_ICONS[type];

  if (!src) {
    return (
      <div
        aria-hidden="true"
        className="flex size-full items-center justify-center bg-gradient-to-br from-primary/25 via-rose-100 to-accent/25"
      >
        <Icon className="size-10 text-primary/70" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={title}
      fill
      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
    />
  );
}

export function typeLabel(type: ContentTypeValue): string {
  return CONTENT_TYPE_LABELS[type];
}

export function heatLabel(popularity: number): string {
  if (popularity >= 80) return "On fire";
  if (popularity >= 60) return "Hot";
  return "New";
}

export function HeatIcon() {
  return <Flame className="size-3.5 text-orange-500" aria-hidden="true" />;
}