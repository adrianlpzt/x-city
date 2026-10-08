/**
 * Trazado de calles de la ciudad (lógica pura, sin Phaser → se puede testear).
 *
 * La ciudad es una cuadrícula infinita: cada chunk de 16x16 tiles contiene
 * una manzana rodeada de acera, con la calzada en su borde superior e izquierdo.
 * Así, al poner chunks uno al lado de otro, las calles encajan solas:
 *
 *   tiles locales (0..15) en cada eje:
 *     0..3   calzada (4 tiles = 2 carriles)
 *     4..5   acera
 *     6..13  manzana (edificios, plaza o edificio emblemático)
 *     14..15 acera
 *
 *   x→  0   4 6        14 16
 *   y↓  ┌───┬─┬─────────┬─┐
 *       │cruce│  calzada  │
 *     4 ├───┼─┴─────────┴─┤
 *       │cal│ ┌─acera───┐ │
 *     6 │za │ │ manzana │ │
 *       │da │ │         │ │
 *    14 │   │ └─────────┘ │
 *       └───┴─────────────┘
 */
import { CHUNK_SIZE, CONFIG } from '../config';
import { floorDiv, mod } from '../utils/geometry';

export const TILE = CONFIG.world.tileSize;
export const CHUNK_TILES = CONFIG.world.chunkTiles;

/** Posiciones clave dentro de un chunk, en píxeles locales. */
export const LOCAL = {
  /** Fin de la calzada (donde empieza la acera). */
  roadEnd: 4 * TILE, // 128
  /** Inicio de la manzana (fin de la acera interior). */
  blockStart: 6 * TILE, // 192
  /** Fin de la manzana. */
  blockEnd: 14 * TILE, // 448
  /** Línea central de la acera cercana (norte/oeste). */
  pathNear: 5 * TILE, // 160
  /** Línea central de la acera lejana (sur/este). */
  pathFar: 15 * TILE, // 480
  /** Mitad de la calzada (línea discontinua). */
  roadCenter: 2 * TILE, // 64
} as const;

export const BLOCK_SIZE = LOCAL.blockEnd - LOCAL.blockStart; // 256

export type TileKind = 'road' | 'intersection' | 'crosswalk' | 'sidewalk' | 'block';

const isSidewalkLine = (l: number): boolean => l === 4 || l === 5 || l === 14 || l === 15;

/** Tipo de terreno de un tile en coordenadas globales de tile. */
export function tileKind(tx: number, ty: number): TileKind {
  const lx = mod(tx, CHUNK_TILES);
  const ly = mod(ty, CHUNK_TILES);
  const roadCol = lx < 4; // calzada vertical
  const roadRow = ly < 4; // calzada horizontal
  if (roadCol && roadRow) return 'intersection';
  if (roadRow) return isSidewalkLine(lx) ? 'crosswalk' : 'road';
  if (roadCol) return isSidewalkLine(ly) ? 'crosswalk' : 'road';
  if (isSidewalkLine(lx) || isSidewalkLine(ly)) return 'sidewalk';
  return 'block';
}

export function tileKindAt(worldX: number, worldY: number): TileKind {
  return tileKind(Math.floor(worldX / TILE), Math.floor(worldY / TILE));
}

export function chunkCoord(world: number): number {
  return floorDiv(world, CHUNK_SIZE);
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

/* ------------------------------------------------------------------------
 * Red de caminos peatonales para los NPCs.
 *
 * Los NPCs caminan por la línea central de las aceras. Las esquinas de cada
 * manzana son "nodos"; en cada eje los nodos se suceden así:
 *   ... 160 ──acera(320px)── 480 ──paso de cebra(192px)── 672 ── 992 ...
 * Índice de nodo i → chunk = floor(i/2); i par = acera cercana, impar = lejana.
 * ---------------------------------------------------------------------- */

/** Coordenada en píxeles del nodo con índice i (vale para x o y). */
export function nodeCoord(i: number): number {
  const chunk = floorDiv(i, 2);
  return chunk * CHUNK_SIZE + (mod(i, 2) === 0 ? LOCAL.pathNear : LOCAL.pathFar);
}

/** Índice del nodo más cercano a una coordenada (aprox. suficiente para elegir spawns). */
export function nearestNodeIndex(coord: number): number {
  const chunk = floorDiv(coord, CHUNK_SIZE);
  const local = coord - chunk * CHUNK_SIZE;
  if (local < (LOCAL.pathNear + LOCAL.pathFar) / 2) return chunk * 2;
  if (local > (LOCAL.pathFar + CHUNK_SIZE + LOCAL.pathNear) / 2) return chunk * 2 + 2;
  return chunk * 2 + 1;
}

/**
 * El tramo entre el nodo i y el i+1 es acera si i es par (dentro del mismo chunk)
 * y paso de cebra (cruza la calzada) si i es impar.
 */
export function isSidewalkSegment(i: number): boolean {
  return mod(i, 2) === 0;
}

/** Punto de aparición del jugador al entrar en un barrio (acera norte del chunk 0,0). */
export const PLAYER_SPAWN = { x: (LOCAL.pathNear + LOCAL.pathFar) / 2, y: LOCAL.pathNear } as const;
