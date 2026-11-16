import {randomFrom} from '../core/skin';

export const BROW_STYLES = ['classic', 'elegant', 'rounded', 'bold_short'] as const;
export type BrowStyle = typeof BROW_STYLES[number];

/** Appearance-only stream: independent of AI, stable across resets and reloads. */
export function browStyleForSeed(seed: number): BrowStyle {
  return BROW_STYLES[Math.floor(randomFrom(seed ^ 0x42524f57)() * BROW_STYLES.length)];
}
