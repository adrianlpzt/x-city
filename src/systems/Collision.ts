/**
 * Colisión AABB sencilla y "amable" (lógica pura, testeable).
 *
 * Se mueve primero en X y luego en Y: si un eje choca, el otro sigue libre,
 * y así el personaje se desliza a lo largo de las paredes en vez de quedarse
 * pegado. Además, si choca de refilón con una esquina (solape pequeño), se le
 * empuja lateralmente para que la rodee sin que el jugador tenga que corregir.
 */
import { rectsOverlap, type Rect } from '../utils/geometry';

export interface MoveResult {
  x: number;
  y: number;
  blockedX: boolean;
  blockedY: boolean;
}

export function moveWithCollision(box: Rect, dx: number, dy: number, solids: readonly Rect[], cornerSlide: number): MoveResult {
  let { x, y } = box;
  const { w, h } = box;
  let blockedX = false;
  let blockedY = false;
  let nudgeY = 0;
  let nudgeX = 0;

  // ---- Eje X ----
  if (dx !== 0) {
    const nx = x + dx;
    let resolvedX = nx;
    for (const s of solids) {
      if (!rectsOverlap({ x: resolvedX, y, w, h }, s)) continue;
      const overTop = y + h - s.y; // cuánto se mete por arriba
      const overBottom = s.y + s.h - y; // cuánto se mete por abajo
      const small = Math.min(overTop, overBottom);
      if (dy === 0 && small <= cornerSlide) {
        // Esquina: empujamos en vertical hacia el lado libre.
        nudgeY = (overTop < overBottom ? -1 : 1) * Math.min(small, Math.abs(dx));
        resolvedX = x;
      } else {
        resolvedX = dx > 0 ? Math.min(resolvedX, s.x - w) : Math.max(resolvedX, s.x + s.w);
      }
      blockedX = true;
    }
    x = resolvedX;
  }

  // ---- Eje Y ----
  const totalDy = dy + nudgeY;
  if (totalDy !== 0) {
    let resolvedY = y + totalDy;
    for (const s of solids) {
      if (!rectsOverlap({ x, y: resolvedY, w, h }, s)) continue;
      const overLeft = x + w - s.x;
      const overRight = s.x + s.w - x;
      const small = Math.min(overLeft, overRight);
      if (dx === 0 && nudgeY === 0 && small <= cornerSlide) {
        nudgeX = (overLeft < overRight ? -1 : 1) * Math.min(small, Math.abs(totalDy));
        resolvedY = y;
      } else {
        resolvedY = totalDy > 0 ? Math.min(resolvedY, s.y - h) : Math.max(resolvedY, s.y + s.h);
      }
      blockedY = true;
    }
    y = resolvedY;
  }

  // Empuje lateral (sólo si deja la caja libre).
  if (nudgeX !== 0) {
    const candidate = { x: x + nudgeX, y, w, h };
    if (!solids.some((s) => rectsOverlap(candidate, s))) x += nudgeX;
  }

  return { x, y, blockedX, blockedY };
}
