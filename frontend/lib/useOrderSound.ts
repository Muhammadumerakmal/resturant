"use client";

import { useCallback, useEffect, useRef } from "react";

// Plays a short chime via the Web Audio API (no asset file needed). Used by the
// kitchen board to announce newly arrived orders. Browsers block audio until a
// user gesture, so the first play may be silent — that's fine for our use.
export function useOrderSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  return useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = (ctxRef.current ??= new AudioCtx());
      if (ctx.state === "suspended") void ctx.resume();

      const now = ctx.currentTime;
      // Two quick rising notes — a friendly "ding-dong".
      [
        { f: 660, t: 0 },
        { f: 880, t: 0.14 },
      ].forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.exponentialRampToValueAtTime(0.2, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.24);
      });
    } catch {
      // Audio is a nice-to-have; never let it break the board.
    }
  }, []);
}
