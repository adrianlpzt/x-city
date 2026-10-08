/**
 * Convierte un ChunkData en objetos de Phaser.
 *
 * Para rendimiento, lo estático se "hornea" en RenderTextures: el suelo de todo
 * el chunk es UNA textura, y cada fila de edificios otra. Así Phaser dibuja
 * unas pocas imágenes por chunk en lugar de cientos de rectángulos cada frame.
 *
 * Profundidad (qué tapa a qué): todo lo que está "de pie" usa depth = y de su
 * base. El jugador y los NPCs hacen lo mismo con la y de sus pies, de modo que
 * quien está más abajo en pantalla se dibuja delante (perspectiva 3/4).
 */
import Phaser from 'phaser';
import { CHUNK_SIZE } from '../config';
import { shade } from '../utils/color';
import type { Rect } from '../utils/geometry';
import { Rng, hashInts } from '../utils/random';
import { BARRIOS, type BarrioTheme } from './barrios';
import type { BuildingData, BuildingRow, ChunkData, LandmarkData } from './ChunkGenerator';
import { ensureCarTexture, ensureDecorTexture } from './decorTextures';
import { drawLandmark } from './landmarks';
import { BLOCK_SIZE, LOCAL } from './layout';

type G = Phaser.GameObjects.Graphics;

export const GROUND_DEPTH = -1_000_000;

/** Fuente usada en rótulos dibujados dentro del canvas. */
export const CANVAS_FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export interface OccluderView {
  image: Phaser.GameObjects.RenderTexture;
  /** Área (mundo) en la que, si está el jugador, el objeto se vuelve semitransparente. */
  area: Rect;
}

export class ChunkView {
  readonly objects: Phaser.GameObjects.GameObject[] = [];
  readonly occluders: OccluderView[] = [];
  /** Área total que ocupa lo dibujado (incluye lo que asoma por arriba). */
  readonly bounds: Rect;
  private visible = true;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly data: ChunkData,
  ) {
    const theme = BARRIOS[data.barrio];
    const ox = data.cx * CHUNK_SIZE;
    const oy = data.cy * CHUNK_SIZE;
    this.bounds = { x: ox, y: oy - 80, w: CHUNK_SIZE + 8, h: CHUNK_SIZE + 80 };

    this.buildGround(theme, ox, oy);
    for (const row of data.rows) this.buildRow(theme, row);
    if (data.landmark) this.buildLandmark(theme, data.landmark);
    this.buildDecor(theme);
    this.buildCars();
  }

  setVisible(visible: boolean): void {
    if (visible === this.visible) return;
    this.visible = visible;
    for (const obj of this.objects) (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible);
  }

  destroy(): void {
    for (const obj of this.objects) obj.destroy();
    this.objects.length = 0;
    this.occluders.length = 0;
  }

  /* ---------------------------- Suelo ---------------------------- */

  private buildGround(theme: BarrioTheme, ox: number, oy: number): void {
    const g = this.scene.make.graphics({}, false);
    const rng = new Rng(hashInts(this.data.cx, this.data.cy, 0x51de));
    const S = CHUNK_SIZE;
    const R = LOCAL.roadEnd;
    const B0 = LOCAL.blockStart;
    const B1 = LOCAL.blockEnd;

    g.fillStyle(theme.ground);
    g.fillRect(0, 0, S, S);

    // Acera (anillo alrededor de la manzana) con dibujo de baldosas.
    g.fillStyle(theme.sidewalk);
    g.fillRect(R, R, S - R, S - R);
    g.lineStyle(1, theme.sidewalkLine, 0.7);
    for (let p = R + 32; p < S; p += 32) {
      g.lineBetween(p, R, p, S);
      g.lineBetween(R, p, S, p);
    }
    // Bordillo
    g.fillStyle(theme.curb);
    g.fillRect(R, R, S - R, 3);
    g.fillRect(R, R, 3, S - R);
    g.fillRect(R, S - 3, S - R, 3);
    g.fillRect(S - 3, R, 3, S - R);

    // Interior de la manzana
    this.drawBlockGround(g, theme, rng, B0);

    // Calzadas
    g.fillStyle(theme.road);
    g.fillRect(0, 0, S, R);
    g.fillRect(0, 0, R, S);
    // Parches de asfalto para que no sea todo plano
    for (let i = 0; i < 4; i++) {
      g.fillStyle(shade(theme.road, rng.chance(0.5) ? 0.06 : -0.08), 0.6);
      const horizontal = rng.chance(0.5);
      const px = horizontal ? rng.int(R, S - 60) : rng.int(8, R - 40);
      const py = horizontal ? rng.int(8, R - 30) : rng.int(R, S - 60);
      g.fillRoundedRect(px, py, rng.int(20, 50), rng.int(10, 26), 5);
    }
    // Alcantarilla en el cruce
    g.fillStyle(shade(theme.road, -0.25));
    g.fillCircle(rng.int(30, 98), rng.int(30, 98), 7);

    // Línea discontinua central (fuera de pasos de cebra)
    g.fillStyle(theme.roadLine, 0.9);
    const c = LOCAL.roadCenter;
    for (let p = B0 + 6; p < B1 - 10; p += 36) {
      g.fillRect(p, c - 2, 20, 4);
      g.fillRect(c - 2, p, 4, 20);
    }
    // Líneas de detención antes del cruce
    g.fillStyle(theme.roadLine, 0.8);
    g.fillRect(R + 68, 4, 3, R - 8);
    g.fillRect(4, R + 68, R - 8, 3);

    // Pasos de cebra: en la prolongación de las aceras (tiles 4-5 y 14-15)
    g.fillStyle(theme.crosswalk, 0.95);
    for (const start of [R, B1]) {
      // Sobre la calzada horizontal: franjas verticales
      for (let x = start + 4; x < start + 64 - 4; x += 12) g.fillRect(x, 8, 7, R - 16);
      // Sobre la calzada vertical: franjas horizontales
      for (let y = start + 4; y < start + 64 - 4; y += 12) g.fillRect(8, y, R - 16, 7);
    }

    const rt = this.scene.add.renderTexture(ox, oy, S, S).setOrigin(0, 0).setDepth(GROUND_DEPTH);
    rt.draw(g, 0, 0);
    g.destroy();
    this.objects.push(rt);
  }

  private drawBlockGround(g: G, theme: BarrioTheme, rng: Rng, b0: number): void {
    const data = this.data;
    const ox = data.cx * CHUNK_SIZE;
    const oy = data.cy * CHUNK_SIZE;

    if (data.blockType === 'plaza') {
      g.fillStyle(theme.grass);
      g.fillRect(b0, b0, BLOCK_SIZE, BLOCK_SIZE);
      // Manchas de hierba
      for (let i = 0; i < 14; i++) {
        g.fillStyle(theme.grassDark, 0.6);
        g.fillCircle(b0 + rng.int(8, BLOCK_SIZE - 8), b0 + rng.int(8, BLOCK_SIZE - 8), rng.int(3, 7));
      }
      // Caminos en cruz
      const mid = b0 + BLOCK_SIZE / 2;
      g.fillStyle(theme.path);
      g.fillRect(b0, mid - 16, BLOCK_SIZE, 32);
      g.fillRect(mid - 16, b0, 32, BLOCK_SIZE);
      g.fillCircle(mid, mid, 50);
      const f = data.plaza?.fountain;
      if (f) {
        const fx = f.x - ox + f.w / 2;
        const fy = f.y - oy + f.h / 2;
        g.fillStyle(0x000000, 0.2);
        g.fillEllipse(fx + 3, fy + 6, f.w + 6, f.h + 6);
        g.fillStyle(shade(theme.path, -0.3));
        g.fillEllipse(fx, fy, f.w + 4, f.h + 4);
        g.fillStyle(theme.dark ? 0x0f5132 : 0x4fa3d9);
        g.fillEllipse(fx, fy, f.w - 8, f.h - 10);
        g.fillStyle(0xffffff, 0.6);
        g.fillEllipse(fx - 8, fy - 6, 14, 5);
        g.fillStyle(shade(theme.path, -0.4));
        g.fillCircle(fx, fy, 7);
        g.fillStyle(0xd6f1ff, 0.9);
        g.fillCircle(fx, fy - 3, 4);
      }
      return;
    }

    g.fillStyle(theme.lot);
    g.fillRect(b0, b0, BLOCK_SIZE, BLOCK_SIZE);
    // Patio interior un poco más oscuro
    g.fillStyle(shade(theme.lot, -0.08));
    g.fillRect(b0 + 6, b0 + 6, BLOCK_SIZE - 12, BLOCK_SIZE - 12);

    for (const garden of data.gardens) {
      g.fillStyle(theme.grass);
      g.fillRect(garden.x - ox + 3, garden.y - oy + 3, garden.w - 6, garden.h - 6);
      g.fillStyle(theme.grassDark, 0.6);
      g.fillCircle(garden.x - ox + garden.w / 2 - 14, garden.y - oy + garden.h / 2, 6);
      g.fillCircle(garden.x - ox + garden.w / 2 + 16, garden.y - oy + garden.h / 2 + 18, 5);
    }
  }

  /* -------------------------- Edificios -------------------------- */

  private buildRow(theme: BarrioTheme, row: BuildingRow): void {
    if (row.buildings.length === 0) return;
    const pad = 8; // sitio para la sombra lateral
    const width = row.w + pad;
    const height = row.baseY - row.topY + 2;
    const g = this.scene.make.graphics({}, false);
    const texts: { text: Phaser.GameObjects.Text; x: number; y: number }[] = [];

    for (const b of row.buildings) {
      this.drawBuilding(g, theme, b, b.x - row.x, b.baseY - row.topY, texts);
    }

    const rt = this.scene.add
      .renderTexture(row.x, row.topY, width, height)
      .setOrigin(0, 0)
      .setDepth(row.baseY);
    rt.draw(g, 0, 0);
    for (const t of texts) {
      rt.draw(t.text, t.x, t.y);
      t.text.destroy();
    }
    g.destroy();
    this.objects.push(rt);
    this.occluders.push({ image: rt, area: { x: row.x, y: row.topY, w: row.w, h: row.baseY - row.topY } });
  }

  private drawBuilding(
    g: G,
    theme: BarrioTheme,
    b: BuildingData,
    lx: number,
    base: number,
    texts: { text: Phaser.GameObjects.Text; x: number; y: number }[],
  ): void {
    const rng = new Rng(b.detailSeed);
    const top = base - b.facadeH - b.roofH;
    const facadeTop = base - b.facadeH;
    const w = b.w;

    // Sombra a la derecha
    g.fillStyle(0x000000, 0.18);
    g.fillRect(lx + w, top + 10, 6, b.facadeH + b.roofH - 10);

    // ---- Tejado ----
    this.drawRoof(g, theme, b, lx, top, rng);

    // ---- Fachada ----
    g.fillStyle(b.facade);
    g.fillRect(lx, facadeTop, w, b.facadeH);
    g.fillStyle(shade(b.facade, -0.15));
    g.fillRect(lx + w - 4, facadeTop, 4, b.facadeH); // canto en sombra
    g.fillStyle(b.trim);
    g.fillRect(lx, facadeTop, w, 3); // cornisa
    g.fillStyle(shade(b.facade, -0.3));
    g.fillRect(lx, base - 3, w, 3); // zócalo

    const groundH = b.shopfront ? Math.min(30, b.facadeH - 8) : 0;
    const upperFloors = b.shopfront ? b.floors - 1 : b.floors;
    const upperH = b.facadeH - groundH - 6;
    const floorH = upperFloors > 0 ? upperH / upperFloors : 0;

    // Ventanas de las plantas superiores
    const cols = Math.max(1, Math.floor((w - 8) / 18));
    const colGap = (w - cols * 10) / (cols + 1);
    for (let f = 0; f < upperFloors; f++) {
      const wy = facadeTop + 7 + f * floorH;
      const wh = Math.min(13, floorH - 7);
      if (wh < 5) continue;
      for (let c = 0; c < cols; c++) {
        const wx = lx + colGap + c * (10 + colGap);
        const lit = rng.chance(theme.litChance);
        g.fillStyle(shade(b.facade, -0.35));
        g.fillRect(wx - 1, wy - 1, 12, wh + 2);
        g.fillStyle(lit ? theme.windowLit : theme.window);
        g.fillRect(wx, wy, 10, wh);
        if (!lit) {
          g.fillStyle(0xffffff, 0.18);
          g.fillRect(wx + 1, wy + 1, 3, wh - 2);
        }
      }
    }

    // Planta baja
    if (b.shopfront && groundH > 10) {
      const gy = base - groundH;
      g.fillStyle(theme.window, 0.9);
      g.fillRect(lx + 4, gy + 6, w - 8, groundH - 9);
      g.fillStyle(0xffffff, 0.15);
      g.fillRect(lx + 6, gy + 8, (w - 12) / 3, groundH - 13);
      // Puerta
      const dx = lx + (rng.chance(0.5) ? 8 : w - 22);
      g.fillStyle(theme.door);
      g.fillRect(dx, gy + 8, 13, groundH - 11);
      g.fillStyle(0xd4af37);
      g.fillCircle(dx + 10, gy + groundH / 2 + 3, 1.2);
      // Toldo a rayas
      if (b.awning !== undefined) {
        for (let x = lx + 2; x < lx + w - 2; x += 8) {
          g.fillStyle(((x - lx) / 8) % 2 < 1 ? b.awning : 0xf5f5f5);
          g.fillRect(x, gy + 1, Math.min(8, lx + w - 2 - x), 7);
        }
        g.fillStyle(0x000000, 0.18);
        g.fillRect(lx + 2, gy + 8, w - 4, 3);
      }
      // Rótulo
      if (b.sign) {
        const label = this.scene.make.text(
          {
            text: b.sign.text,
            style: {
              fontFamily: CANVAS_FONT,
              fontSize: '10px',
              fontStyle: 'bold',
              color: theme.signText,
              resolution: 2,
            },
          },
          false,
        );
        const maxW = w - 14;
        const scale = Math.min(1, maxW / label.width);
        label.setScale(scale);
        const sw = label.width * scale + 10;
        const sh = 14;
        const sx = lx + (w - sw) / 2;
        const sy = gy - sh - 2;
        g.fillStyle(0x000000, 0.25);
        g.fillRect(sx + 2, sy + 2, sw, sh);
        g.fillStyle(b.sign.bg);
        g.fillRect(sx, sy, sw, sh);
        g.lineStyle(1, shade(b.sign.bg, 0.35), 1);
        g.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
        texts.push({ text: label, x: sx + 5, y: sy + (sh - label.height * scale) / 2 });
      }
    } else {
      // Portal residencial
      const dw = Math.min(16, w / 3);
      const dx = lx + (w - dw) / 2;
      g.fillStyle(shade(b.trim, -0.1));
      g.fillRect(dx - 2, base - 22, dw + 4, 19);
      g.fillStyle(theme.door);
      g.fillRect(dx, base - 20, dw, 17);
    }
  }

  private drawRoof(g: G, theme: BarrioTheme, b: BuildingData, lx: number, top: number, rng: Rng): void {
    const w = b.w;
    const h = b.roofH;
    if (b.roofStyle === 'gable') {
      g.fillStyle(shade(b.roof, 0.12));
      g.fillRect(lx, top, w, h / 2);
      g.fillStyle(shade(b.roof, -0.08));
      g.fillRect(lx, top + h / 2, w, h / 2);
      g.lineStyle(1, shade(b.roof, -0.3), 0.5);
      for (let y = top + 5; y < top + h; y += 6) g.lineBetween(lx, y, lx + w, y);
      g.fillStyle(shade(b.roof, -0.35));
      g.fillRect(lx, top + h / 2 - 1, w, 2); // cumbrera
    } else {
      g.fillStyle(b.roof);
      g.fillRect(lx, top, w, h);
      g.fillStyle(shade(b.roof, 0.18));
      g.fillRect(lx, top, w, 3);
      g.fillRect(lx, top, 3, h);
      g.fillStyle(shade(b.roof, -0.2));
      g.fillRect(lx + w - 3, top, 3, h);
      if (b.roofStyle === 'terrace') {
        g.fillStyle(theme.grassDark);
        for (let x = lx + 8; x < lx + w - 14; x += 22) g.fillRect(x, top + 6, 12, 8);
        g.fillStyle(theme.props[0] ?? 0xffffff, 0.9);
        g.fillCircle(lx + w / 2, top + h / 2 + 4, 9);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(lx + w / 2 - 3, top + h / 2 + 1, 3);
      }
    }

    // Elementos en la azotea
    b.extras.forEach((extra, i) => {
      const ex = lx + 10 + ((i * 37 + rng.int(0, 20)) % Math.max(10, w - 30));
      const ey = top + 8 + rng.int(0, Math.max(0, h - 30));
      switch (extra) {
        case 'ac':
          g.fillStyle(0x9ca3af);
          g.fillRect(ex, ey, 16, 12);
          g.fillStyle(0x6b7280);
          g.fillCircle(ex + 8, ey + 6, 4);
          break;
        case 'antenna':
          g.lineStyle(1.5, 0x4b5563, 1);
          g.lineBetween(ex + 6, ey + 14, ex + 6, ey - 8);
          g.lineBetween(ex, ey - 4, ex + 12, ey - 4);
          g.lineBetween(ex + 2, ey, ex + 10, ey);
          break;
        case 'solar':
          g.fillStyle(0x1e3a8a);
          g.fillRect(ex, ey, 22, 12);
          g.lineStyle(1, 0x93c5fd, 0.6);
          g.lineBetween(ex + 7, ey, ex + 7, ey + 12);
          g.lineBetween(ex + 14, ey, ex + 14, ey + 12);
          g.lineBetween(ex, ey + 6, ex + 22, ey + 6);
          break;
        case 'dish':
          g.fillStyle(0xe5e7eb);
          g.fillEllipse(ex + 8, ey + 6, 16, 12);
          g.fillStyle(0x9ca3af);
          g.fillCircle(ex + 8, ey + 6, 2);
          break;
        case 'flagpole':
          g.fillStyle(0x4b5563);
          g.fillRect(ex + 2, ey - 14, 2, 22);
          g.fillStyle(theme.props[0] ?? 0xffffff);
          g.fillRect(ex + 4, ey - 14, 12, 4);
          g.fillStyle(theme.props[1] ?? 0xffffff);
          g.fillRect(ex + 4, ey - 10, 12, 4);
          break;
        case 'tank':
          g.fillStyle(0x6b7280);
          g.fillRect(ex, ey, 14, 12);
          g.fillStyle(0x9ca3af);
          g.fillEllipse(ex + 7, ey, 14, 6);
          break;
        case 'garden':
          g.fillStyle(theme.grass);
          g.fillCircle(ex + 5, ey + 5, 6);
          g.fillCircle(ex + 14, ey + 7, 5);
          break;
      }
    });
  }

  /* ---------------------- Edificio emblemático ---------------------- */

  private buildLandmark(theme: BarrioTheme, lm: LandmarkData): void {
    const width = lm.w + 8;
    const height = lm.h + lm.poke;
    const g = this.scene.make.graphics({}, false);
    const texts: { text: Phaser.GameObjects.Text; x: number; y: number }[] = [];
    const makeText = (text: string, x: number, y: number, size: number, color: string, center = true): void => {
      const t = this.scene.make.text(
        {
          text,
          style: { fontFamily: CANVAS_FONT, fontSize: `${size}px`, fontStyle: 'bold', color, resolution: 2 },
        },
        false,
      );
      texts.push({ text: t, x: center ? x - t.width / 2 : x, y });
    };
    drawLandmark(g, theme, lm, lm.poke, makeText);

    // La explanada delantera (sin colisión) queda por debajo de la base de profundidad.
    const depthBase = lm.y + lm.h - 44;
    const rt = this.scene.add
      .renderTexture(lm.x, lm.y - lm.poke, width, height)
      .setOrigin(0, 0)
      .setDepth(depthBase);
    rt.draw(g, 0, 0);
    for (const t of texts) {
      rt.draw(t.text, t.x, t.y);
      t.text.destroy();
    }
    g.destroy();
    this.objects.push(rt);
    this.occluders.push({ image: rt, area: { x: lm.x, y: lm.y - lm.poke, w: lm.w, h: lm.h + lm.poke - 44 } });
  }

  /* ---------------------- Mobiliario y coches ---------------------- */

  private buildDecor(theme: BarrioTheme): void {
    for (const d of this.data.decor) {
      const key = ensureDecorTexture(this.scene, d.kind, theme, d.variant);
      const img = this.scene.add.image(d.x, d.y, key).setOrigin(0.5, 1).setDepth(d.y);
      this.objects.push(img);
    }
  }

  private buildCars(): void {
    for (const car of this.data.cars) {
      const key = ensureCarTexture(this.scene, car.color, car.vertical);
      const img = this.scene.add
        .image(car.x + car.w / 2, car.y + car.h + 4, key)
        .setOrigin(0.5, 1)
        .setDepth(car.y + car.h);
      // Sólo volteamos los horizontales (en los verticales la sombra quedaría arriba).
      if (!car.vertical) img.setFlipX(car.flip);
      this.objects.push(img);
    }
  }
}
