import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '../src/config';
import { BARRIO_IDS } from '../src/world/barrios';
import { generateChunk } from '../src/world/ChunkGenerator';
import { LOCAL, isSidewalkSegment, nearestNodeIndex, nodeCoord, tileKind, tileKindAt } from '../src/world/layout';
import { hashInts, mulberry32 } from '../src/utils/random';
import { rectsOverlap } from '../src/utils/geometry';

describe('PRNG y hash', () => {
  it('mulberry32 es determinista', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('hashInts distingue coordenadas negativas y su orden', () => {
    expect(hashInts(1, -1, 2)).not.toBe(hashInts(1, 1, -2));
    expect(hashInts(1, 2, 3)).not.toBe(hashInts(1, 3, 2));
    expect(hashInts(7, -5, -9)).toBe(hashInts(7, -5, -9));
  });
});

describe('trazado de calles', () => {
  it('clasifica los tiles de un chunk', () => {
    expect(tileKind(0, 0)).toBe('intersection');
    expect(tileKind(8, 1)).toBe('road');
    expect(tileKind(4, 1)).toBe('crosswalk');
    expect(tileKind(1, 14)).toBe('crosswalk');
    expect(tileKind(8, 4)).toBe('sidewalk');
    expect(tileKind(8, 8)).toBe('block');
    // Se repite igual en chunks negativos
    expect(tileKind(-16 + 8, -16 + 8)).toBe('block');
    expect(tileKind(-16, -16)).toBe('intersection');
  });

  it('los nodos de NPC caen sobre aceras o cruces, nunca dentro de manzanas', () => {
    for (let ix = -6; ix <= 6; ix++) {
      for (let iy = -6; iy <= 6; iy++) {
        const kind = tileKindAt(nodeCoord(ix), nodeCoord(iy));
        expect(['sidewalk', 'crosswalk']).toContain(kind);
      }
    }
  });

  it('los tramos alternan acera / paso de cebra', () => {
    expect(nodeCoord(0)).toBe(LOCAL.pathNear);
    expect(nodeCoord(1)).toBe(LOCAL.pathFar);
    expect(nodeCoord(2)).toBe(CHUNK_SIZE + LOCAL.pathNear);
    expect(nodeCoord(-1)).toBe(-CHUNK_SIZE + LOCAL.pathFar);
    expect(isSidewalkSegment(0)).toBe(true);
    expect(isSidewalkSegment(1)).toBe(false);
    expect(isSidewalkSegment(-2)).toBe(true);
    // El punto medio de un tramo de acera es acera; el de un cruce, paso de cebra.
    const mid = (i: number) => (nodeCoord(i) + nodeCoord(i + 1)) / 2;
    expect(tileKindAt(mid(0), nodeCoord(0))).toBe('sidewalk');
    expect(tileKindAt(mid(1), nodeCoord(0))).toBe('crosswalk');
  });

  it('nearestNodeIndex devuelve un nodo cercano', () => {
    for (const x of [-2000, -513, -1, 0, 100, 300, 500, 700, 5000]) {
      const i = nearestNodeIndex(x);
      expect(Math.abs(nodeCoord(i) - x)).toBeLessThanOrEqual(CHUNK_SIZE / 2);
    }
  });
});

describe('generación de chunks', () => {
  it('es determinista: misma semilla + barrio + coordenadas = mismo chunk', () => {
    for (const barrio of BARRIO_IDS) {
      for (const [cx, cy] of [
        [0, 0],
        [3, -7],
        [-12, 5],
        [100, 100],
      ] as const) {
        expect(generateChunk(cx, cy, barrio, 1234)).toEqual(generateChunk(cx, cy, barrio, 1234));
      }
    }
  });

  it('cambia con la semilla, las coordenadas y el barrio', () => {
    const a = JSON.stringify(generateChunk(5, 5, 'futbol', 1));
    expect(JSON.stringify(generateChunk(5, 5, 'futbol', 2))).not.toBe(a);
    expect(JSON.stringify(generateChunk(5, 6, 'futbol', 1))).not.toBe(a);
    expect(JSON.stringify(generateChunk(5, 5, 'cine', 1))).not.toBe(a);
  });

  it('el chunk de salida tiene edificios y el de su derecha el edificio emblemático', () => {
    for (const barrio of BARRIO_IDS) {
      expect(generateChunk(0, 0, barrio).blockType).toBe('buildings');
      expect(generateChunk(1, 0, barrio).blockType).toBe('landmark');
    }
  });

  it('los sólidos quedan dentro de su chunk y no bloquean las líneas de paseo', () => {
    for (let cx = -4; cx <= 4; cx++) {
      for (let cy = -4; cy <= 4; cy++) {
        const data = generateChunk(cx, cy, 'politica', 99);
        const ox = cx * CHUNK_SIZE;
        const oy = cy * CHUNK_SIZE;
        for (const s of data.solids) {
          expect(s.x).toBeGreaterThanOrEqual(ox);
          expect(s.y).toBeGreaterThanOrEqual(oy);
          expect(s.x + s.w).toBeLessThanOrEqual(ox + CHUNK_SIZE);
          expect(s.y + s.h).toBeLessThanOrEqual(oy + CHUNK_SIZE);
          // Franjas por donde caminan los NPCs (línea central ± 14 px)
          for (const line of [LOCAL.pathNear, LOCAL.pathFar]) {
            const hStrip = { x: ox, y: oy + line - 14, w: CHUNK_SIZE, h: 28 };
            const vStrip = { x: ox + line - 14, y: oy, w: 28, h: CHUNK_SIZE };
            expect(rectsOverlap(s, hStrip)).toBe(false);
            expect(rectsOverlap(s, vStrip)).toBe(false);
          }
        }
      }
    }
  });

  it('cada barrio produce mobiliario propio', () => {
    const kinds = (barrio: (typeof BARRIO_IDS)[number]) => {
      const set = new Set<string>();
      for (let i = 0; i < 20; i++) for (const d of generateChunk(i, i * 3, barrio).decor) set.add(d.kind);
      return set;
    };
    expect(kinds('ciberseguridad').has('server')).toBe(true);
    expect(kinds('futbol').has('pennant')).toBe(true);
    expect(kinds('politica').has('flag')).toBe(true);
    expect(kinds('ciberseguridad').has('pennant')).toBe(false);
  });
});
