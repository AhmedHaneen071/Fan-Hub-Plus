"use client";

import { useEffect } from "react";

export function MerchViewTracker({ itemId }: { itemId: string }) {
  useEffect(() => {
    const key = `fanhub:merch-view:${itemId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch(`/api/merch/${encodeURIComponent(itemId)}/view`, { method: "POST" });
  }, [itemId]);
  return null;
}
