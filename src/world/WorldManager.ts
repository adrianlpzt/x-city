/**
 * Gestiona qué chunks existen: los genera bajo demanda alrededor de la cámara,
 * los descarga cuando quedan lejos y responde a consultas de colisión.
 */
import type Phaser from 'phaser';
import { CONFIG } from '../config';
import { rectsOverlap, type Rect } from '../utils/geometry';
import type { BarrioId } from './barrios';
import { generateChunk, type ChunkData } from './ChunkGenerator';
import { ChunkView } from './ChunkRenderer';
import { chunkCoord, chunkKey } from './layout';

/** Máximo de ChunkData (datos puros) cacheados para colisiones sin dibujar. */
const DATA_CACHE_LIMIT = 256;

export class WorldManager {
  private readonly views = new Map<string, ChunkView>();
  private readonly dataCache = new Map<string, ChunkData>();
  private barrio: BarrioId;

  constructor(
    private readonly scene: Phaser.Scene,
    barrio: BarrioId,
    private readonly seed: number = CONFIG.seed,
  ) {
    this.barrio = barrio;
  }

  get currentBarrio(): BarrioId {
    return this.barrio;
  }

  get loadedChunks(): number {
    return this.views.size;
  }

  /** Cambia de barrio: descarta todo lo cargado (se regenerará con el nuevo tema). */
  setBarrio(barrio: BarrioId): void {
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
    this.dataCache.clear();
    this.barrio = barrio;
  }

  /** Datos de un chunk (generados al vuelo y cacheados). */
  getData(cx: number, cy: number): ChunkData {
    const key = chunkKey(cx, cy);
    let data = this.dataCache.get(key);
    if (!data) {
      data = generateChunk(cx, cy, this.barrio, this.seed);
      this.dataCache.set(key, data);
      if (this.dataCache.size > DATA_CACHE_LIMIT) {
        // Map mantiene orden de inserción: el primero es el más antiguo.
        const oldest = this.dataCache.keys().next().value;
        if (oldest !== undefined && !this.views.has(oldest)) this.dataCache.delete(oldest);
      }
    }
    return data;
  }

  /**
   * Llamar cada frame. Carga (con límite por frame) los chunks que faltan,
   * descarga los lejanos y oculta los que no se ven.
   * @param immediate true = cargar todo ya (p. ej. detrás del fundido al cambiar de barrio).
   */
  update(view: Phaser.Geom.Rectangle, immediate = false): void {
    const margin = CONFIG.world.loadMargin;
    const minCx = chunkCoord(view.x) - margin;
    const maxCx = chunkCoord(view.right) + margin;
    const minCy = chunkCoord(view.y) - margin;
    const maxCy = chunkCoord(view.bottom) + margin;

    // 1) Cargar los que faltan, empezando por los más cercanos al centro.
    const missing: { cx: number; cy: number; d: number }[] = [];
    const centerCx = chunkCoord(view.centerX);
    const centerCy = chunkCoord(view.centerY);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        if (!this.views.has(chunkKey(cx, cy))) {
          missing.push({ cx, cy, d: Math.abs(cx - centerCx) + Math.abs(cy - centerCy) });
        }
      }
    }
    missing.sort((a, b) => a.d - b.d);
    const budget = immediate ? missing.length : CONFIG.world.maxBuildsPerFrame;
    for (const m of missing.slice(0, budget)) {
      this.views.set(chunkKey(m.cx, m.cy), new ChunkView(this.scene, this.getData(m.cx, m.cy)));
    }

    // 2) Descargar los lejanos y 3) ocultar los que no están en cámara (culling).
    const unload = CONFIG.world.unloadMargin;
    const viewRect: Rect = { x: view.x - 64, y: view.y - 64, w: view.width + 128, h: view.height + 128 };
    for (const [key, chunkView] of this.views) {
      const { cx, cy } = chunkView.data;
      if (cx < minCx - unload || cx > maxCx + unload || cy < minCy - unload || cy > maxCy + unload) {
        chunkView.destroy();
        this.views.delete(key);
        continue;
      }
      chunkView.setVisible(rectsOverlap(chunkView.bounds, viewRect));
    }
  }

  /**
   * Hace semitransparentes los edificios que tapan al jugador
   * (cuando camina "por detrás" de ellos en la perspectiva 3/4).
   */
  updateOcclusion(px: number, py: number): void {
    const cx = chunkCoord(px);
    const cy = chunkCoord(py);
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const view = this.views.get(chunkKey(cx + dx, cy + dy));
        if (!view) continue;
        for (const occ of view.occluders) {
          const a = occ.area;
          const behind = px > a.x - 8 && px < a.x + a.w + 8 && py > a.y && py < a.y + a.h;
          const alpha = behind ? 0.55 : 1;
          if (occ.image.alpha !== alpha) occ.image.setAlpha(alpha);
        }
      }
    }
  }

  /** Rectángulos sólidos que pueden tocar el área dada. */
  solidsNear(area: Rect): Rect[] {
    const result: Rect[] = [];
    // Los sólidos nunca cruzan el borde de su chunk, así que basta con
    // mirar los chunks que toca el área.
    const minCx = chunkCoord(area.x);
    const maxCx = chunkCoord(area.x + area.w);
    const minCy = chunkCoord(area.y);
    const maxCy = chunkCoord(area.y + area.h);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        for (const solid of this.getData(cx, cy).solids) {
          if (rectsOverlap(solid, area)) result.push(solid);
        }
      }
    }
    return result;
  }

  /** Todos los sólidos de los chunks cargados (sólo para el modo debug). */
  debugSolids(view: Rect): Rect[] {
    const out: Rect[] = [];
    for (const v of this.views.values()) for (const s of v.data.solids) if (rectsOverlap(s, view)) out.push(s);
    return out;
  }

  destroy(): void {
    this.setBarrio(this.barrio);
  }
}

