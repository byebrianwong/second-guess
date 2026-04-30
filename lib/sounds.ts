"use client";

/**
 * Tiny Web Audio API synth — no audio files to ship. Each sound is a
 * short envelope on one or more oscillators. Designed to be cheerful and
 * cheap; everything decays in <1s.
 *
 * Browsers gate AudioContext until a user gesture, so the first call may
 * silently fail. By the time players are mid-game (they've tapped at
 * least once) the context is unlocked.
 */

const SOUND_KEY = "second_guess.sounds_on";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function soundsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SOUND_KEY) !== "off";
}

export function setSoundsEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
}

interface NoteOpts {
  type?: OscillatorType;
  attack?: number;
  release?: number;
  /** Seconds from "now" at which the note should start. Default 0. */
  startAt?: number;
  /** Peak gain (0–1). Default 0.18. */
  gain?: number;
  /** Optional pitch slide to this frequency over the duration. */
  glideTo?: number;
}

function note(freq: number, duration: number, opts: NoteOpts = {}) {
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime + (opts.startAt ?? 0);
  const attack = opts.attack ?? 0.01;
  const release = opts.release ?? 0.05;
  const peak = opts.gain ?? 0.18;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.glideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(opts.glideTo, 1),
      start + duration,
    );
  }

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration + release);

  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + release + 0.02);
}

function play(fn: () => void) {
  if (!soundsEnabled()) return;
  fn();
}

// ─────────────────────────────────────────────────────────
// Effects
// ─────────────────────────────────────────────────────────

/** Quick "pop" — emoji reactions. */
export function playReactionPop() {
  play(() => {
    note(820, 0.06, { type: "triangle", gain: 0.12, glideTo: 1100 });
  });
}

/** Subtle ping — a player joins the lobby. */
export function playJoinPing() {
  play(() => {
    note(880, 0.12, { type: "sine", gain: 0.14 });
    note(1320, 0.18, { type: "sine", gain: 0.1, startAt: 0.07 });
  });
}

/** Tabulating "click track" — bar graph spinning up. */
export function playTabulating() {
  play(() => {
    for (let i = 0; i < 6; i++) {
      note(700 + i * 80, 0.04, {
        type: "square",
        gain: 0.06,
        startAt: i * 0.13,
      });
    }
  });
}

/**
 * Per-tier reveal sound.
 *   rank 1 = the obvious answer (collusion fail) — comedic descending wah
 *   rank 2 = "just right" — ascending bell
 *   rank 3 = "so close" — softer bell
 *   rank 4 = "almost" — single note
 *   rank 5+ = soft chime
 */
export function playRevealTier(rank: number) {
  play(() => {
    if (rank === 1) {
      // Two short same-pitch "boops" — neutral, slightly comic.
      // Conveys "yep, the obvious one" without the sad-trombone melodrama.
      note(660, 0.09, { type: "triangle", gain: 0.14 });
      note(660, 0.09, { type: "triangle", gain: 0.14, startAt: 0.13 });
      return;
    }
    if (rank === 2) {
      // celebratory C-E-G arpeggio
      note(523, 0.12, { type: "sine", gain: 0.16 });
      note(659, 0.12, { type: "sine", gain: 0.16, startAt: 0.08 });
      note(784, 0.18, { type: "sine", gain: 0.18, startAt: 0.16 });
      return;
    }
    if (rank === 3) {
      // gentle two-note ping
      note(587, 0.14, { type: "sine", gain: 0.14 });
      note(784, 0.16, { type: "sine", gain: 0.14, startAt: 0.1 });
      return;
    }
    if (rank === 4) {
      note(659, 0.14, { type: "sine", gain: 0.13 });
      return;
    }
    note(523, 0.12, { type: "sine", gain: 0.1 });
  });
}

/** Game over — winner fanfare. */
export function playFanfare() {
  play(() => {
    // Major arpeggio, then a held high note
    note(523, 0.12, { type: "triangle", gain: 0.18 }); // C5
    note(659, 0.12, { type: "triangle", gain: 0.18, startAt: 0.1 }); // E5
    note(784, 0.12, { type: "triangle", gain: 0.18, startAt: 0.2 }); // G5
    note(1047, 0.45, { type: "triangle", gain: 0.22, startAt: 0.3 }); // C6
    // a sparkle on top
    note(1568, 0.35, { type: "sine", gain: 0.12, startAt: 0.32 }); // G6
  });
}
