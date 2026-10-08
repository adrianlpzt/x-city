/**
 * Generación procedural de un chunk → DATOS puros (sin Phaser).
 *
 * Separar "qué hay" (este archivo) de "cómo se dibuja" (ChunkRenderer.ts)
 * tiene dos ventajas: se puede testear sin navegador y el determinismo es
 * fácil de garantizar: misma semilla + barrio + (cx, cy) ⇒ mismo ChunkData.
 */
import { CHUNK_SIZE, CONFIG } from '../config';
import type { Rect } from '../utils/geometry';
import { Rng, hashInts, hashString } from '../utils/random';
import {
  BARRIOS,
  DECOR_PLACEMENT,
  type BarrioId,
  type BarrioTheme,
  type DecorKind,
  type LandmarkKind,
  type RooftopExtra,
} from './barrios';
import { BLOCK_SIZE, LOCAL, TILE } from './layout';

export type RoofStyle = 'flat' | 'gable' | 'terrace';
export type BlockType = 'buildings' | 'plaza' | 'landmark';

export interface BuildingData {
  /** Esquina izquierda de la fachada, en coordenadas de mundo. */
  x: number;
  w: number;
  /** Línea del suelo de la fachada (la "base" del edificio). */
  baseY: number;
  /** Alto de la fachada visible (paredes). */
  facadeH: number;
  /** Alto del tejado visible encima de la fachada. */
  roofH: number;
  floors: number;
  facade: number;
  roof: number;
  trim: number;
  roofStyle: RoofStyle;
  /** Planta baja con escaparate y puerta a la calle. */
  shopfront: boolean;
  sign?: { text: string; bg: number };
  awning?: number;
  extras: RooftopExtra[];
  /** Semilla para detalles menores (ventanas encendidas, etc.). */
  detailSeed: number;
}

export interface BuildingRow {
  side: 'north' | 'south';
  /** Base común de la fila (para ordenar profundidad con el jugador). */
  baseY: number;
  /** Punto más alto que se dibuja (incluye lo que "asoma" por encima de la manzana). */
  topY: number;
  x: number;
  w: number;
  buildings: BuildingData[];
}

export interface DecorData {
  kind: DecorKind;
  x: number;
  /** Base (los pies) del objeto: se dibuja con origen abajo-centro. */
  y: number;
  variant: number;
}

export interface CarData {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  vertical: boolean;
  /** Mirando hacia la izquierda/arriba. */
  flip: boolean;
}

export interface LandmarkData {
  kind: LandmarkKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Cuánto sobresale por encima de la manzana (efecto altura). */
  poke: number;
  detailSeed: number;
}

export interface PlazaData {
  style: 'fountain' | 'grove' | 'kiosk';
  fountain?: Rect;
  detailSeed: number;
}

export interface ChunkData {
  cx: number;
  cy: number;
  barrio: BarrioId;
  blockType: BlockType;
  rows: BuildingRow[];
  /** Solares vacíos con jardincillo (dentro de manzanas con edificios). */
  gardens: Rect[];
  plaza?: PlazaData;
  landmark?: LandmarkData;
  decor: DecorData[];
  cars: CarData[];
  /** Rectángulos sólidos para la colisión del jugador. */
  solids: Rect[];
}

/** Patrones de reparto de una fila de 8 tiles en solares. */
const LOT_PATTERNS: readonly (readonly number[])[] = [
  [8],
  [4, 4],
  [3, 5],
  [5, 3],
  [2, 3, 3],
  [3, 2, 3],
  [2, 4, 2],
  [3, 3, 2],
  [2, 2, 4],
];

const ROW_DEPTH = BLOCK_SIZE / 2; // 128 px por fila

/** Semilla del barrio: cada barrio tiene su propio trazado de manzanas. */
export function barrioSeed(worldSeed: number, barrio: BarrioId): number {
  return hashInts(worldSeed, hashString(barrio));
}

export function generateChunk(
  cx: number,
  cy: number,
  barrio: BarrioId,
  worldSeed: number = CONFIG.seed,
): ChunkData {
  const theme = BARRIOS[barrio];
  const rng = new Rng(hashInts(barrioSeed(worldSeed, barrio), cx, cy));
  const ox = cx * CHUNK_SIZE;
  const oy = cy * CHUNK_SIZE;

  const data: ChunkData = {
    cx,
    cy,
    barrio,
    blockType: pickBlockType(cx, cy, rng),
    rows: [],
    gardens: [],
    decor: [],
    cars: [],
    solids: [],
  };

  const bx = ox + LOCAL.blockStart;
  const by = oy + LOCAL.blockStart;

  switch (data.blockType) {
    case 'buildings':
      generateBuildings(data, theme, rng, bx, by);
      break;
    case 'plaza':
      generatePlaza(data, theme, rng, bx, by);
      break;
    case 'landmark':
      generateLandmark(data, theme, rng, bx, by);
      break;
  }

  generateSidewalkDecor(data, theme, rng, ox, oy);
  generateCars(data, theme, rng, ox, oy);
  return data;
}

function pickBlockType(cx: number, cy: number, rng: Rng): BlockType {
  const roll = rng.next(); // se consume siempre para no alterar la secuencia
  // El chunk de salida siempre tiene edificios y el de su derecha el edificio
  // emblemático: así al entrar en un barrio se ve su identidad de inmediato.
  if (cx === 0 && cy === 0) return 'buildings';
  if (cx === 1 && cy === 0) return 'landmark';
  if (roll < CONFIG.world.landmarkChance) return 'landmark';
  if (roll < CONFIG.world.landmarkChance + CONFIG.world.plazaChance) return 'plaza';
  return 'buildings';
}

function generateBuildings(data: ChunkData, theme: BarrioTheme, rng: Rng, bx: number, by: number): void {
  // Dos filas: la norte (más alta, puede asomar sobre la acera) y la sur (con tiendas a la calle).
  for (const side of ['north', 'south'] as const) {
    const lotTop = side === 'north' ? by : by + ROW_DEPTH;
    const baseY = lotTop + ROW_DEPTH;
    const row: BuildingRow = { side, baseY, topY: lotTop, x: bx, w: BLOCK_SIZE, buildings: [] };
    const pattern = rng.pick(LOT_PATTERNS);
    let cursor = bx;

    for (const tiles of pattern) {
      const lotW = tiles * TILE;
      const lotX = cursor;
      cursor += lotW;

      // Algún solar vacío convertido en jardín (sólo si no es la única parcela).
      if (pattern.length > 1 && rng.chance(0.1)) {
        data.gardens.push({ x: lotX, y: lotTop, w: lotW, h: ROW_DEPTH });
        data.decor.push({ kind: 'tree', x: lotX + lotW / 2, y: lotTop + ROW_DEPTH - 30, variant: rng.int(0, 2) });
        continue;
      }

      const floors = side === 'north' ? rng.int(2, 5) : rng.int(1, 3);
      // Lo que asoma por encima: sólo en la fila norte y sin tapar del todo la acera.
      const poke = side === 'north' ? rng.int(0, 20) : 0;
      const visualH = ROW_DEPTH + poke;
      const facadeH = Math.max(36, Math.min(visualH - 34, floors * 24 + 12));
      const roofH = visualH - facadeH;
      const shopfront = side === 'south';

      const building: BuildingData = {
        x: lotX + 2,
        w: lotW - 4,
        baseY,
        facadeH,
        roofH,
        floors,
        facade: rng.pick(theme.facades),
        roof: rng.pick(theme.roofs),
        trim: rng.pick(theme.trims),
        roofStyle: rng.pick(['flat', 'flat', 'gable', 'terrace'] as const),
        shopfront,
        extras: [],
        detailSeed: rng.int(0, 2 ** 31),
      };

      if (shopfront && tiles >= 3 && rng.chance(0.75)) {
        building.sign = { text: rng.pick(theme.shopNames), bg: rng.pick(theme.signBg) };
      }
      if (shopfront && rng.chance(0.4)) building.awning = rng.pick(theme.awnings);

      const extraCount = rng.int(0, Math.min(3, tiles));
      for (let i = 0; i < extraCount; i++) {
        const extra = rng.weighted(theme.rooftop);
        if (extra) building.extras.push(extra);
      }

      row.buildings.push(building);
      row.topY = Math.min(row.topY, baseY - facadeH - roofH);
      // Colisión: toda la huella del solar.
      data.solids.push({ x: lotX + 2, y: lotTop, w: lotW - 4, h: ROW_DEPTH });
    }
    data.rows.push(row);
  }
}

function generatePlaza(data: ChunkData, theme: BarrioTheme, rng: Rng, bx: number, by: number): void {
  const style = rng.pick(['fountain', 'grove', 'kiosk'] as const);
  const plaza: PlazaData = { style, detailSeed: rng.int(0, 2 ** 31) };
  const cxp = bx + BLOCK_SIZE / 2;
  const cyp = by + BLOCK_SIZE / 2;

  if (style === 'fountain') {
    plaza.fountain = { x: cxp - 36, y: cyp - 28, w: 72, h: 56 };
    data.solids.push({ ...plaza.fountain });
  } else if (style === 'kiosk') {
    data.decor.push({ kind: 'kiosk', x: cxp, y: cyp + 16, variant: rng.int(0, 2) });
    data.solids.push({ x: cxp - 20, y: cyp, w: 40, h: 16 });
  }

  // Árboles en las esquinas interiores y algunos sueltos.
  const corners: [number, number][] = [
    [bx + 40, by + 56],
    [bx + BLOCK_SIZE - 40, by + 56],
    [bx + 40, by + BLOCK_SIZE - 24],
    [bx + BLOCK_SIZE - 40, by + BLOCK_SIZE - 24],
  ];
  for (const [x, y] of corners) {
    data.decor.push({ kind: 'tree', x, y, variant: rng.int(0, 2) });
    data.solids.push({ x: x - 6, y: y - 6, w: 12, h: 8 });
  }
  if (style === 'grove') {
    for (let i = 0; i < 4; i++) {
      const x = bx + rng.int(80, BLOCK_SIZE - 80);
      const y = by + rng.int(90, BLOCK_SIZE - 50);
      data.decor.push({ kind: 'tree', x, y, variant: rng.int(0, 2) });
      data.solids.push({ x: x - 6, y: y - 6, w: 12, h: 8 });
    }
  }
  // Bancos a los lados del camino central.
  data.decor.push({ kind: 'bench', x: cxp - 70, y: cyp + 50, variant: 0 });
  data.decor.push({ kind: 'bench', x: cxp + 70, y: cyp + 50, variant: 0 });
  const themed = rng.weighted(theme.decor);
  if (themed && themed !== 'tree') data.decor.push({ kind: themed, x: cxp, y: by + 40, variant: rng.int(0, 2) });

  data.plaza = plaza;
}

function generateLandmark(data: ChunkData, theme: BarrioTheme, rng: Rng, bx: number, by: number): void {
  const poke = 40;
  data.landmark = {
    kind: theme.landmark,
    x: bx,
    y: by,
    w: BLOCK_SIZE,
    h: BLOCK_SIZE,
    poke,
    detailSeed: rng.int(0, 2 ** 31),
  };
  // Se deja libre una franja delantera (explanada) por la que se puede pasear.
  data.solids.push({ x: bx + 6, y: by, w: BLOCK_SIZE - 12, h: BLOCK_SIZE - 44 });
}

/**
 * Mobiliario en las cuatro aceras del chunk. Las farolas siguen un ritmo fijo;
 * el resto se elige con los pesos del tema del barrio.
 */
function generateSidewalkDecor(data: ChunkData, theme: BarrioTheme, rng: Rng, ox: number, oy: number): void {
  const slots = [208, 272, 336, 400];
  // Para cada lado: coordenada fija "bordillo" (road) y "fachada" (wall).
  const sides = [
    // Norte: todo junto al bordillo, porque la fila norte de edificios "asoma"
    // sobre la parte interior de esta acera y taparía lo que hubiera pegado a la fachada.
    { axis: 'h', road: 134, wall: 140 }, // norte
    { axis: 'h', road: 508, wall: 458 }, // sur
    { axis: 'v', road: 134, wall: 188 }, // oeste
    { axis: 'v', road: 508, wall: 458 }, // este
  ] as const;

  for (const side of sides) {
    slots.forEach((along, i) => {
      let kind: DecorKind | null = null;
      if (i === 0 || i === 3) {
        if (rng.chance(0.85)) kind = 'lamp';
      } else if (rng.chance(theme.decorDensity)) {
        kind = rng.weighted(theme.decor);
      }
      if (!kind) return;
      const across = DECOR_PLACEMENT[kind] === 'road' ? side.road : side.wall;
      const lx = side.axis === 'h' ? along : across;
      const ly = side.axis === 'h' ? across : along;
      data.decor.push({ kind, x: ox + lx, y: oy + ly, variant: rng.int(0, 2) });
    });
  }
}

/** Coches aparcados en los carriles pegados a la acera (fuera de cruces y pasos de cebra). */
function generateCars(data: ChunkData, theme: BarrioTheme, rng: Rng, ox: number, oy: number): void {
  const slots = [236, 316, 396];
  const lanes = [18, LOCAL.roadEnd - 18];
  for (const lane of lanes) {
    for (const s of slots) {
      // Calzada horizontal (borde superior del chunk).
      if (rng.chance(0.4)) {
        const car = { x: ox + s - 29, y: oy + lane - 13, w: 58, h: 26 };
        data.cars.push({ ...car, color: rng.pick(theme.carColors), vertical: false, flip: lane < LOCAL.roadCenter });
        data.solids.push(car);
      }
      // Calzada vertical (borde izquierdo).
      if (rng.chance(0.4)) {
        const car = { x: ox + lane - 13, y: oy + s - 29, w: 26, h: 58 };
        data.cars.push({ ...car, color: rng.pick(theme.carColors), vertical: true, flip: lane > LOCAL.roadCenter });
        data.solids.push(car);
      }
    }
  }
}
