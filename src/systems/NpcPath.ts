/**
 * Decisiones de ruta de los NPCs sobre la red de aceras (lógica pura).
 * Ver la explicación de la red de nodos en world/layout.ts.
 */
import { CONFIG } from '../config';
import { isSidewalkSegment } from '../world/layout';

export interface Dir {
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
}

export const DIRS: readonly Dir[] = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

/** ¿El tramo que sale del nodo (ix, iy) en dirección `d` es un paso de cebra? */
export function isCrossing(ix: number, iy: number, d: Dir): boolean {
  if (d.dx !== 0) return !isSidewalkSegment(d.dx > 0 ? ix : ix - 1);
  return !isSidewalkSegment(d.dy > 0 ? iy : iy - 1);
}

/**
 * Elige la siguiente dirección en una esquina.
 * Pesos: seguir recto > girar > dar media vuelta; cruzar la calle pesa menos.
 */
export function chooseDirection(ix: number, iy: number, current: Dir | null, random: () => number = Math.random): Dir {
  const weights = DIRS.map((d) => {
    let w: number;
    if (!current) w = 1;
    else if (d.dx === current.dx && d.dy === current.dy) w = 3;
    else if (d.dx === -current.dx && d.dy === -current.dy) w = 0.25;
    else w = 1.5;
    if (isCrossing(ix, iy, d)) w *= CONFIG.npc.crossingWeight;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < DIRS.length; i++) {
    r -= weights[i] ?? 0;
    if (r < 0) return DIRS[i] as Dir;
  }
  return DIRS[0] as Dir;
}
