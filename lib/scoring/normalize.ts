import type { Answer, AnswerGroup } from "../types";

const ALIASES: Record<string, string> = {
  legos: "lego",
  stuffies: "stuffed animal",
  stuffy: "stuffed animal",
  plushie: "stuffed animal",
  plushies: "stuffed animal",
  plushy: "stuffed animal",
  teddybear: "teddy bear",
  teddy: "teddy bear",
  blankie: "blanket",
  blanky: "blanket",
  binky: "pacifier",
  paci: "pacifier",
  pacy: "pacifier",
  binki: "pacifier",
  bottle: "bottle",
  doll: "doll",
  bluey: "bluey",
  pawpatrol: "paw patrol",
  cocomelon: "cocomelon",
  daniel: "daniel tiger",
  danieltiger: "daniel tiger",
  sesamestreet: "sesame street",
  ipad: "screen time",
  tv: "screen time",
  tablet: "screen time",
  ice: "ice cream",
  icecream: "ice cream",
  brocolli: "broccoli",
  brusselsprouts: "brussels sprouts",
  brussel: "brussels sprouts",
  sprout: "brussels sprouts",
};

export function normalize(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/[^a-z0-9 \-]/g, "");
  s = s.replace(/[-]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  const collapsed = s.replace(/\s/g, "");
  if (ALIASES[collapsed]) s = ALIASES[collapsed];
  if (ALIASES[s]) s = ALIASES[s];
  if (s.length > 4 && s.endsWith("ies")) {
    s = s.slice(0, -3) + "y";
  } else if (s.length > 4 && s.endsWith("es") && !s.endsWith("ses")) {
    s = s.slice(0, -2);
  } else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) {
    s = s.slice(0, -1);
  }
  return s;
}

export function groupAnswers(answers: Answer[]): AnswerGroup[] {
  const buckets = new Map<string, AnswerGroup>();
  for (const a of answers) {
    const key = a.group_key || a.normalized;
    if (!buckets.has(key)) {
      buckets.set(key, { key, label: a.raw_text, count: 0, rawAnswers: [] });
    }
    const b = buckets.get(key)!;
    b.count += 1;
    b.rawAnswers.push({ playerId: a.player_id, rawText: a.raw_text });
  }
  for (const b of buckets.values()) {
    const tally: Record<string, number> = {};
    for (const r of b.rawAnswers) {
      const t = r.rawText.trim();
      tally[t] = (tally[t] || 0) + 1;
    }
    b.label = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || b.label;
  }
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
}

export function pointsForRank(rank: number): number {
  if (rank === 2) return 3;
  if (rank === 3) return 2;
  if (rank === 4) return 1;
  return 0;
}
