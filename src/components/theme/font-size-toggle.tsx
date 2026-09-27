"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const SIZES = ["16px", "18px", "20px"] as const;

export function FontSizeToggle() {
  useEffect(() => {
    const saved = localStorage.getItem("fan-hub-font-size");
    if (saved && SIZES.includes(saved as (typeof SIZES)[number])) document.documentElement.style.fontSize = saved;
  }, []);

  function changeSize(direction: -1 | 1) {
    const saved = localStorage.getItem("fan-hub-font-size");
    const current = SIZES.includes(saved as (typeof SIZES)[number]) ? saved as (typeof SIZES)[number] : SIZES[0];
    const next = SIZES[Math.max(0, Math.min(SIZES.length - 1, SIZES.indexOf(current) + direction))];
    localStorage.setItem("fan-hub-font-size", next);
    document.documentElement.style.fontSize = next;
  }

  return <div className="flex items-center" role="group" aria-label="Text size">
    <Button type="button" variant="ghost" size="icon" aria-label="Decrease text size" onClick={() => changeSize(-1)}>A−</Button>
    <Button type="button" variant="ghost" size="icon" aria-label="Increase text size" onClick={() => changeSize(1)}>A+</Button>
  </div>;
}
