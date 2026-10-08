/** Rectángulo alineado con los ejes (AABB) en coordenadas de mundo. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Módulo matemático (el % de JS devuelve negativos con números negativos). */
export function mod(value: number, n: number): number {
  return ((value % n) + n) % n;
}

/** División entera hacia -infinito (para coordenadas negativas). */
export function floorDiv(value: number, n: number): number {
  return Math.floor(value / n);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
