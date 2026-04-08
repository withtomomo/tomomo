import type { CharacterData } from "../types";

// 8 vibrant, maximally distinct colors. Every pair is instantly
// distinguishable at a glance. High saturation, medium lightness,
// works on both light and dark backgrounds.
export const CHARACTER_PALETTE: string[] = [
  "#FF5555", // Red
  "#FF9922", // Orange
  "#DDBB00", // Gold
  "#44CC44", // Green
  "#00BBAA", // Teal
  "#5B6CFF", // Indigo (brand accent)
  "#8844EE", // Purple
  "#FF4488", // Pink
];

// The fixed trio shown on the onboarding starter pick, ordered
// left-to-right as they appear in the UI. Indigo sits at index 1 so
// it lands in the center slot that the StarterPick defaults to
// (selectedIndex = 1), giving the brand accent the hero position and
// providing visual continuity from the indigo Tomo narrator. Red and
// Green flank as the other two legs of the RGB primary triad, giving
// the most hue-distinct trio the 8-color palette can produce and
// matching the classic fire / water / grass starter parallel.
// Keep in sync with STARTER_COLORS references in @tomomo/ui onboarding.
export const STARTER_COLORS: readonly string[] = [
  "#FF5555", // Red (left)
  "#5B6CFF", // Indigo (center, brand accent, default-selected)
  "#44CC44", // Green (right)
] as const;

export interface GenCharacterOptions {
  // When provided, overrides the random palette pick without changing the grid shape.
  color?: string;
}

// Seeded PRNG using FNV-1a hash for uniform distribution.
// This is the canonical character generation algorithm.
function seededRng(seed: string): () => number {
  let s = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    s ^= seed.charCodeAt(i);
    s = Math.imul(s, 0x01000193);
  }
  s |= 0;
  return function () {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return ((s < 0 ? ~s + 1 : s) % 10000) / 10000;
  };
}

// Helper to set a value in a 2D array with known bounds.
function set(arr: number[][], y: number, x: number, v: number): void {
  arr[y]![x] = v;
}

// Helper to get a value from a 2D array with known bounds.
function get(arr: number[][], y: number, x: number): number {
  return arr[y]![x]!;
}

export function genCharacter(
  seed: string,
  options?: GenCharacterOptions
): CharacterData {
  const S = 18;
  const rng = seededRng(seed);
  const r = () => rng();
  const ri = (a: number, b: number) => Math.floor(r() * (b - a + 1)) + a;
  const pick = <T>(arr: T[]): T => {
    const idx = Math.floor(r() * arr.length);
    // arr is always non-empty in this algorithm
    return arr[idx] as T;
  };
  // Always call pick(CHARACTER_PALETTE) so the RNG sequence stays byte-stable
  // for existing agents even when an override is provided.
  const paletteColor = pick(CHARACTER_PALETTE);
  const color = options?.color ?? paletteColor;

  const TMP = 28;
  const TH = 14;
  // Initialize working canvas
  const tmp: number[][] = [];
  for (let i = 0; i < TMP; i++) {
    tmp[i] = [];
    for (let j = 0; j < TMP; j++) set(tmp, i, j, 0);
  }

  // Build body - elliptical blob rows 8-16
  const bTop = 8,
    bBot = 16,
    bH = bBot - bTop,
    maxW = 6;
  for (let y = bTop; y <= bBot; y++) {
    const t = (y - bTop) / bH;
    const curve = Math.sin(t * Math.PI);
    const topHeavy = 1.0 - t * 0.15;
    const w = Math.max(3, Math.round(maxW * Math.sqrt(curve) * topHeavy));
    for (let x = TH - w; x < TH + w; x++) set(tmp, y, x, 1);
  }

  // Eyes - 1x2 vertical negative space, symmetrical
  const eyeY = bTop + ri(1, 2);
  const eyeSpread = ri(2, 3);
  for (let dy = 0; dy < 2; dy++) {
    set(tmp, eyeY + dy, TH - eyeSpread, 2);
    set(tmp, eyeY + dy, TH + eyeSpread - 1, 2);
  }

  // Optional cheeks (60% chance)
  if (r() > 0.4) {
    const chY = eyeY + 3;
    if (chY <= bBot - 1) {
      const cs = eyeSpread + 1;
      const lc = TH - cs;
      const rc = TH + cs - 1;
      if (
        lc >= 0 &&
        rc < TMP &&
        get(tmp, chY, lc) !== 0 &&
        get(tmp, chY, lc) !== 2 &&
        get(tmp, chY, rc) !== 0 &&
        get(tmp, chY, rc) !== 2
      ) {
        set(tmp, chY, lc, 2);
        set(tmp, chY, rc, 2);
      }
    }
  }

  // Legs - 1-2 pairs, 1-2px long
  const legPairs = pick([1, 2]);
  const legLen = pick([1, 2]);
  const innerSpread = ri(1, 2);
  for (let dy2 = 1; dy2 <= legLen; dy2++) {
    const ly = bBot + dy2;
    if (ly < TMP) {
      set(tmp, ly, TH - innerSpread, 1);
      set(tmp, ly, TH + innerSpread - 1, 1);
    }
  }
  if (legPairs === 2) {
    const os = ri(3, 4);
    for (let dy3 = 1; dy3 <= legLen; dy3++) {
      const ly2 = bBot + dy3;
      if (ly2 < TMP) {
        set(tmp, ly2, TH - os, 1);
        set(tmp, ly2, TH + os - 1, 1);
      }
    }
  }

  // Top feature
  const tf = pick([
    "none",
    "none",
    "ears",
    "horns",
    "bump",
    "antenna",
    "round",
  ]);
  if (tf === "ears") {
    const es = ri(3, maxW - 1);
    set(tmp, bTop, TH - es, 1);
    set(tmp, bTop, TH + es - 1, 1);
    set(tmp, bTop - 1, TH - es, 1);
    set(tmp, bTop - 1, TH + es - 1, 1);
    if (r() > 0.5 && bTop - 2 >= 0) {
      set(tmp, bTop - 2, TH - es, 1);
      set(tmp, bTop - 2, TH + es - 1, 1);
    }
  } else if (tf === "horns") {
    const hs = ri(2, 3);
    set(tmp, bTop, TH - hs, 1);
    set(tmp, bTop, TH + hs - 1, 1);
    if (bTop - 1 >= 0) {
      set(tmp, bTop - 1, TH - hs, 1);
      set(tmp, bTop - 1, TH + hs - 1, 1);
    }
    if (bTop - 2 >= 0) {
      set(tmp, bTop - 2, TH - hs, 1);
      set(tmp, bTop - 2, TH + hs - 1, 1);
    }
  } else if (tf === "bump") {
    set(tmp, bTop, TH - 1, 1);
    set(tmp, bTop, TH, 1);
    set(tmp, bTop, TH + 1, 1);
    if (bTop - 1 >= 0) {
      set(tmp, bTop - 1, TH - 1, 1);
      set(tmp, bTop - 1, TH, 1);
      set(tmp, bTop - 1, TH + 1, 1);
    }
    if (bTop - 2 >= 0) {
      set(tmp, bTop - 2, TH, 1);
    }
  } else if (tf === "antenna") {
    set(tmp, bTop, TH, 1);
    if (bTop - 1 >= 0) set(tmp, bTop - 1, TH, 1);
    if (bTop - 2 >= 0) set(tmp, bTop - 2, TH, 1);
    if (bTop - 3 >= 0) {
      set(tmp, bTop - 3, TH - 1, 1);
      set(tmp, bTop - 3, TH, 1);
      set(tmp, bTop - 3, TH + 1, 1);
    }
  } else if (tf === "round") {
    const rw = Math.max(2, maxW - ri(1, 2));
    if (bTop - 1 >= 0) {
      for (let x2 = TH - rw; x2 < TH + rw; x2++) {
        if (x2 >= 0 && x2 < TMP) set(tmp, bTop - 1, x2, 1);
      }
    }
    if (bTop - 2 >= 0) {
      const rw2 = Math.max(1, rw - 1);
      for (let x3 = TH - rw2; x3 < TH + rw2; x3++) {
        if (x3 >= 0 && x3 < TMP) set(tmp, bTop - 2, x3, 1);
      }
    }
  }

  // Optional tail (35% chance)
  if (r() > 0.65) {
    const ty2 = bBot - ri(1, 2);
    let re2 = 0;
    for (let x4 = TMP - 1; x4 >= 0; x4--) {
      if (get(tmp, ty2, x4) !== 0 && get(tmp, ty2, x4) !== 2) {
        re2 = x4;
        break;
      }
    }
    if (re2 > 0 && re2 + 1 < TMP) {
      set(tmp, ty2, re2 + 1, 1);
      if (ty2 - 1 >= bTop && get(tmp, ty2 - 1, re2 + 1) === 0)
        set(tmp, ty2 - 1, re2 + 1, 1);
    }
  }

  // Optional side arms (25% chance)
  if (r() > 0.75) {
    const ay = ri(bTop + 3, bBot - 3);
    let le2 = TMP;
    let re3 = 0;
    for (let x5 = 0; x5 < TMP; x5++) {
      if (get(tmp, ay, x5) !== 0 && get(tmp, ay, x5) !== 2) {
        le2 = Math.min(le2, x5);
        re3 = Math.max(re3, x5);
      }
    }
    if (le2 > 0 && re3 < TMP - 1) {
      set(tmp, ay, le2 - 1, 1);
      set(tmp, ay, re3 + 1, 1);
    }
  }

  // Center content into 18x18 final grid
  let minY = TMP,
    maxY2 = 0,
    minX = TMP,
    maxX2 = 0;
  for (let y2 = 0; y2 < TMP; y2++) {
    for (let x6 = 0; x6 < TMP; x6++) {
      if (get(tmp, y2, x6) !== 0) {
        minY = Math.min(minY, y2);
        maxY2 = Math.max(maxY2, y2);
        minX = Math.min(minX, x6);
        maxX2 = Math.max(maxX2, x6);
      }
    }
  }
  const padX = Math.floor((S - (maxX2 - minX + 1)) / 2);
  const padY = Math.floor((S - (maxY2 - minY + 1)) / 2);
  const grid: number[][] = [];
  for (let y3 = 0; y3 < S; y3++) {
    grid[y3] = [];
    for (let x7 = 0; x7 < S; x7++) set(grid, y3, x7, 0);
  }
  for (let y4 = minY; y4 <= maxY2; y4++) {
    for (let x8 = minX; x8 <= maxX2; x8++) {
      const ny = y4 - minY + padY;
      const nx = x8 - minX + padX;
      if (ny >= 0 && ny < S && nx >= 0 && nx < S)
        set(grid, ny, nx, get(tmp, y4, x8));
    }
  }

  return { grid, color, size: S };
}
