export interface Skin {
  seed: number;
  color: string;
  accent: string;
  pattern: "dots" | "stripes" | "hearts";
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
  const colors = [
    "#dda7bd",
    "#9cba9c",
    "#e8c36b",
    "#a6a5cf",
    "#76b8ba",
    "#e6a879",
  ];
  const baseIndex = Math.floor(r() * colors.length);
  const accentIndex =
    (baseIndex + 1 + Math.floor(r() * (colors.length - 1))) % colors.length;
  return {
    seed,
    color: colors[baseIndex],
    accent: colors[accentIndex],
    pattern: (["dots", "stripes", "hearts"] as const)[Math.floor(r() * 3)],
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
