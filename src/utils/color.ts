/**
 * Aclara (amount > 0) u oscurece (amount < 0) un color 0xRRGGBB.
 * amount = 0.2 → 20% hacia el blanco; amount = -0.2 → 20% hacia el negro.
 */
export function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const target = amount >= 0 ? 255 : 0;
  const k = Math.min(1, Math.abs(amount));
  const mix = (c: number): number => Math.round(c + (target - c) * k);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

/** Mezcla lineal entre dos colores (t = 0 → a, t = 1 → b). */
export function lerpColor(a: number, b: number, t: number): number {
  const ch = (c: number, s: number): number => (c >> s) & 0xff;
  const mix = (s: number): number => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

/** Luminancia aproximada (0..1), útil para elegir texto claro u oscuro. */
export function luminance(color: number): number {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
