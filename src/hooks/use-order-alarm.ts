import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persistent order alarm built on the Web Audio API (no audio files, nothing to
 * fail to load). A looping AudioBuffer keeps ringing in background tabs because
 * the audio graph is not throttled like setInterval.
 */
function buildBuffer(ctx: AudioContext) {
  const sr = ctx.sampleRate;
  const cycle = 2.6; // seconds per ring cycle
  const buf = ctx.createBuffer(1, Math.ceil(sr * cycle), sr);
  const data = buf.getChannelData(0);
  // three quick chirps then a gap — classic quick-commerce buzzer
  const chirps = [
    { at: 0.0, dur: 0.18, f: 990 },
    { at: 0.24, dur: 0.18, f: 1320 },
    { at: 0.48, dur: 0.3, f: 1650 },
  ];
  for (const c of chirps) {
    const start = Math.floor(c.at * sr);
    const len = Math.floor(c.dur * sr);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.008) * Math.exp(-t * 7);
      const s =
        Math.sin(2 * Math.PI * c.f * t) * 0.6 + Math.sin(2 * Math.PI * c.f * 2 * t) * 0.25;
      data[start + i] += s * env * 0.85;
    }
  }
  return buf;
}

export function useOrderAlarm() {
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const [ringing, setRinging] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  const ensureCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  /** Call from any user gesture so browsers allow sound later. */
  const unlock = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    void ctx.resume().then(() => setNeedsUnlock(false));
  }, [ensureCtx]);

  const start = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    setRinging(true);
    void ctx.resume().then(
      () => setNeedsUnlock(false),
      () => setNeedsUnlock(true),
    );
    if (ctx.state !== "running") setNeedsUnlock(true);
    if (srcRef.current) return;
    const src = ctx.createBufferSource();
    src.buffer = buildBuffer(ctx);
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain).connect(ctx.destination);
    src.start();
    srcRef.current = src;
  }, [ensureCtx]);

  const stop = useCallback(() => {
    setRinging(false);
    setNeedsUnlock(false);
    try {
      srcRef.current?.stop();
    } catch {
      /* already stopped */
    }
    srcRef.current?.disconnect();
    srcRef.current = null;
  }, []);

  // If the alarm was blocked by autoplay policy, retry as soon as the user
  // touches anything — but never stop it on interaction.
  useEffect(() => {
    if (!ringing) return;
    const retry = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      void ctx.resume().then(() => setNeedsUnlock(false));
      if (!srcRef.current) start();
    };
    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
    document.addEventListener("visibilitychange", retry);
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      document.removeEventListener("visibilitychange", retry);
    };
  }, [ringing, start]);

  useEffect(() => () => {
    try {
      srcRef.current?.stop();
    } catch {
      /* noop */
    }
    void ctxRef.current?.close();
  }, []);

  return { ringing, needsUnlock, start, stop, unlock };
}
