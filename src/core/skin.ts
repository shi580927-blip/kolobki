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
/** Share the palette family with author previews; never reroll the saved player. */
export function isVividSeed(seed:number){return randomFrom(seed)()<.7;}
export function skinFrom(seed: number): Skin {
  const r = randomFrom(seed);
  const softPalettes = [
    ["#35bec4", "#187e96", "#6ad2d0"],
    ["#59c6a3", "#2c8b76", "#87d6ba"],
    ["#69bde9", "#3b7db7", "#9bd6ef"],
    ["#ac8be0", "#7453a5", "#c0a5e8"],
    ["#ef8ca7", "#bc527e", "#f3acc1"],
    ["#f1b180", "#c17b5f", "#f5c69c"],
    ["#cb7bc8", "#8a519f", "#dda1dc"],
    ["#869fe9", "#566eb8", "#adbbed"],
    ["#a8ce7e", "#70944f", "#c3df9d"],
    ["#edcf99", "#b88b54", "#f5deb5"],
    ["#e49ac9", "#a760a2", "#eeb8db"],
    ["#4dc7b7", "#288d91", "#7ed8cb"],
  ];
  const vividPalettes = [
    ["#05c4d5", "#1655b8", "#25dfe5"],
    ["#e62fb4", "#7424b4", "#f262cb"],
    ["#3158e8", "#16bcd2", "#7386f1"],
    ["#93da19", "#318b54", "#b4ed47"],
    ["#ff694b", "#b92c88", "#ff9875"],
    ["#ff9832", "#d64479", "#ffba57"],
    ["#8f45e8", "#d742bc", "#b577f2"],
    ["#11c999", "#1069a8", "#47e0b3"],
    ["#18a9ef", "#493fc6", "#57cdf9"],
    ["#f54c97", "#8137be", "#fa80bc"],
    ["#5441d8", "#16abbc", "#8675ec"],
    ["#20cebc", "#5157c9", "#56e6d0"],
  ];
  const roll=r(),palettes=roll<.7?vividPalettes:softPalettes;
  const baseIndex = Math.min(palettes.length-1,Math.floor((roll<.7?roll/.7:(roll-.7)/.3)*palettes.length));
  const variant = r();
  const palette = palettes[baseIndex];
  return {
    seed,
    color: palette[0],
    accent: palette[variant < 0.95 ? 1 : 2],
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
