export interface Skin {
  seed: number;
  color: string;
  accent: string;
  pattern: "dots" | "petals" | "hearts";
  mood: "sly" | "grumpy" | "worried";
}
export function randomFrom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function skinFrom(seed: number): Skin {
  const r = randomFrom(seed);
  const palettes = [
    ["#d76aab", "#8e377f", "#f2b4d6"],
    ["#48b49b", "#21796b", "#98d9ba"],
    ["#6b9fd6", "#355f96", "#b0d2ed"],
    ["#9874c4", "#593783", "#d6b3e5"],
    ["#389fae", "#1d647a", "#99d2d5"],
    ["#b665a2", "#693a77", "#e9b1d4"],
  ];
  const baseIndex = Math.floor(r() * palettes.length);
  const variant = r();
  const palette = palettes[baseIndex];
  return {
    seed,
    color: palette[0],
    accent: palette[variant < 0.65 ? 1 : 2],
    pattern: (["dots", "petals", "hearts"] as const)[Math.floor(r() * 3)],
    mood: (["sly", "grumpy", "worried"] as const)[Math.floor(r() * 3)],
  };
}
export function loadSkin(
  storage: Pick<Storage, "getItem" | "setItem">,
  generate: () => number,
): Skin {
  let seed: number;
  try {
    const saved = storage.getItem("sharobesy.skin.v1");
    const parsed = saved === null ? NaN : Number(saved);
    seed =
      Number.isInteger(parsed) && parsed >= 0 && parsed <= 0xffffffff
        ? parsed
        : generate() >>> 0;
    storage.setItem("sharobesy.skin.v1", String(seed));
  } catch {
    seed = generate() >>> 0;
  }
  return skinFrom(seed);
}
