"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { setSoundsEnabled, soundsEnabled } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export function SoundToggle({ className }: { className?: string }) {
  // Default the icon to "on" before hydration; sync to localStorage on mount
  // so SSR and client agree on the initial render.
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(soundsEnabled());
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    setSoundsEnabled(next);
  }

  return (
    <button
      onClick={toggle}
      type="button"
      aria-label={on ? "Mute sounds" : "Unmute sounds"}
      title={on ? "Mute sounds" : "Unmute sounds"}
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-blush/30 transition shrink-0",
        className,
      )}
    >
      {on ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
