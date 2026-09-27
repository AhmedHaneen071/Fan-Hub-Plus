"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton({ title }: { title: string }) {
  const [pending, setPending] = useState(false);
  async function share() {
    const url = new URL(window.location.pathname, window.location.origin).toString();
    setPending(true);
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied."); }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") toast.error("Could not share this link.");
    } finally { setPending(false); }
  }
  return <Button type="button" variant="outline" onClick={share} disabled={pending} aria-label={`Share ${title}`}><Share2 aria-hidden="true" />Share</Button>;
}
