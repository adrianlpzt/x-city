/**
 * Edificios emblemáticos: uno por barrio, ocupan una manzana entera.
 * Coordenadas locales: (0,0) es la esquina superior izquierda de la textura,
 * la manzana empieza en y = poke y la fachada "toca suelo" en y = H - 44
 * (los 44 px de abajo son una explanada transitable).
 */
import type Phaser from 'phaser';
import { cssColor } from '../utils/format';
import { shade } from '../utils/color';
import { Rng } from '../utils/random';
import type { BarrioTheme } from './barrios';
import type { LandmarkData } from './ChunkGenerator';

type G = Phaser.GameObjects.Graphics;
export type TextFn = (text: string, x: number, y: number, size: number, color: string, center?: boolean) => void;

export function drawLandmark(g: G, t: BarrioTheme, lm: LandmarkData, poke: number, text: TextFn): void {
  const W = lm.w;
  const H = lm.h + poke;
  const base = H - 44;
  const rng = new Rng(lm.detailSeed);

  // Explanada delantera común
  g.fillStyle(shade(t.path, t.dark ? 0.05 : -0.05));
  g.fillRect(0, base, W, 44);
  g.lineStyle(1, shade(t.path, -0.2), 0.6);
  for (let x = 16; x < W; x += 32) g.lineBetween(x, base, x, H);

  // Sombra general
  g.fillStyle(0x000000, 0.2);
  g.fillRect(W - 2, poke + 20, 8, base - poke - 20);

  const p0 = t.props[0] ?? 0xffffff;
  const p1 = t.props[1] ?? 0xffffff;
  const p2 = t.props[2] ?? 0xffffff;

  switch (lm.kind) {
    case 'parlamento': {
      // Cuerpo principal con columnas, frontón y cúpula
      g.fillStyle(0xd9cfb8);
      g.fillRect(14, poke + 40, W - 28, base - poke - 40); // tejado/cubierta
      g.fillStyle(0xbfb399);
      g.fillRect(14, poke + 40, W - 28, 4);
      // Cúpula
      g.fillStyle(0x6f8f9c);
      g.fillCircle(W / 2, poke + 58, 40);
      g.fillStyle(0x86a8b5);
      g.fillCircle(W / 2 - 10, poke + 48, 16);
      g.fillStyle(0xd9cfb8);
      g.fillRect(W / 2 - 46, poke + 58, 92, 22);
      g.fillStyle(0x4b5563);
      g.fillRect(W / 2 - 1, poke + 2, 2, 20);
      g.fillStyle(p0);
      g.fillRect(W / 2 + 1, poke + 2, 16, 5);
      g.fillStyle(p2);
      g.fillRect(W / 2 + 1, poke + 7, 16, 5);
      // Fachada
      const fTop = base - 96;
      g.fillStyle(0xeee6d3);
      g.fillRect(20, fTop, W - 40, 96);
      // Frontón
      g.fillStyle(0xe2d8c0);
      g.fillTriangle(W / 2, fTop - 34, 28, fTop + 2, W - 28, fTop + 2);
      g.fillStyle(shade(0xe2d8c0, -0.15));
      g.fillRect(24, fTop, W - 48, 6);
      // Columnas
      for (let i = 0; i < 9; i++) {
        const cx = 34 + i * ((W - 68) / 8);
        g.fillStyle(0xfaf6ec);
        g.fillRect(cx - 5, fTop + 14, 10, 70);
        g.fillStyle(0xd8cfbb);
        g.fillRect(cx + 2, fTop + 14, 3, 70);
        g.fillRect(cx - 7, fTop + 10, 14, 5);
      }
      // Escalinata
      for (let i = 0; i < 4; i++) {
        g.fillStyle(shade(0xe2d8c0, -0.05 * i));
        g.fillRect(28 - i * 3, base - 12 + i * 3, W - 56 + i * 6, 4);
      }
      // Banderas
      for (const fx of [8, W - 18]) {
        g.fillStyle(0x4b5563);
        g.fillRect(fx, base - 120, 2, 122);
        g.fillStyle(p0);
        g.fillRect(fx + 2, base - 118, 16, 6);
        g.fillStyle(p2);
        g.fillRect(fx + 2, base - 112, 16, 6);
        g.fillStyle(p1);
        g.fillRect(fx + 2, base - 106, 16, 6);
      }
      text(t.landmarkName, W / 2, fTop - 2, 10, '#5a4a3a');
      break;
    }

    case 'estadio': {
      const cx = W / 2;
      const cy = poke + 106;
      // Gradas exteriores
      g.fillStyle(0x9ca3af);
      g.fillEllipse(cx, cy, W - 6, 210);
      const rings = [p0, 0xffffff, p1, p2];
      rings.forEach((c, i) => {
        g.fillStyle(c);
        g.fillEllipse(cx, cy, W - 22 - i * 16, 196 - i * 16);
      });
      // Público (puntitos de colores)
      for (let i = 0; i < 160; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(0.78, 0.97);
        g.fillStyle(rng.pick(t.props), 0.9);
        g.fillRect(cx + Math.cos(a) * ((W - 30) / 2) * r, cy + Math.sin(a) * 92 * r, 2, 2);
      }
      // Césped
      g.fillStyle(0x2e9e45);
      g.fillRoundedRect(cx - 74, cy - 56, 148, 112, 8);
      for (let i = 0; i < 6; i++) {
        g.fillStyle(0x3fb257, 0.8);
        g.fillRect(cx - 74 + i * 25, cy - 56, 12, 112);
      }
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeRect(cx - 66, cy - 48, 132, 96);
      g.lineBetween(cx, cy - 48, cx, cy + 48);
      g.strokeCircle(cx, cy, 14);
      g.strokeRect(cx - 66, cy - 18, 16, 36);
      g.strokeRect(cx + 50, cy - 18, 16, 36);
      // Muro frontal con accesos
      g.fillStyle(0x6b7280);
      g.fillRect(16, base - 26, W - 32, 26);
      for (let x = 30; x < W - 40; x += 34) {
        g.fillStyle(0x1f2937);
        g.fillRoundedRect(x, base - 18, 16, 18, { tl: 8, tr: 8, bl: 0, br: 0 });
      }
      g.fillStyle(p0);
      g.fillRect(16, base - 30, W - 32, 5);
      // Torres de focos
      for (const [fx, fy] of [
        [14, poke + 8],
        [W - 20, poke + 8],
      ] as const) {
        g.fillStyle(0x4b5563);
        g.fillRect(fx + 2, fy + 10, 3, 60);
        g.fillStyle(0xfff9c4);
        g.fillRect(fx - 4, fy, 16, 10);
        g.fillStyle(0xfff9c4, 0.18);
        g.fillTriangle(fx + 4, fy + 6, fx + 40, fy + 70, fx - 30, fy + 70);
      }
      text(t.landmarkName, W / 2, base - 24, 10, '#ffffff');
      break;
    }

    case 'torre': {
      // Torre de cristal con alas bajas
      g.fillStyle(0x7f93a8);
      g.fillRect(10, base - 70, 60, 70);
      g.fillRect(W - 70, base - 60, 60, 60);
      g.fillStyle(0xa9c9e2);
      for (let y = base - 64; y < base - 6; y += 12) {
        g.fillRect(14, y, 52, 7);
        if (y > base - 56) g.fillRect(W - 66, y, 52, 7);
      }
      // Cuerpo principal
      const tx = 70;
      const tw = W - 140;
      g.fillStyle(0x3f6f94);
      g.fillRect(tx, poke - 20 > 0 ? poke - 20 : 0, tw, base - (poke - 20 > 0 ? poke - 20 : 0));
      g.fillStyle(0x5b8db5);
      g.fillRect(tx, 0, tw, 26);
      g.fillStyle(0x23455f);
      g.fillRect(tx + tw - 10, 26, 10, base - 26);
      // Rejilla de vidrio
      g.lineStyle(1, 0xbfe3ff, 0.5);
      for (let y = 34; y < base; y += 10) g.lineBetween(tx, y, tx + tw - 10, y);
      for (let x = tx + 12; x < tx + tw - 10; x += 12) g.lineBetween(x, 26, x, base);
      // Reflejos
      g.fillStyle(0xffffff, 0.12);
      g.fillTriangle(tx, 60, tx + 50, 26, tx, 140);
      g.fillTriangle(tx + 30, base, tx + tw - 10, 120, tx + tw - 10, 170);
      // Pantalla con logo
      g.fillStyle(0x0b0f14);
      g.fillRoundedRect(tx + 14, base - 64, tw - 38, 26, 4);
      g.lineStyle(2, p0, 1);
      g.strokeRoundedRect(tx + 14, base - 64, tw - 38, 26, 4);
      // Entrada
      g.fillStyle(0x0f172a);
      g.fillRect(W / 2 - 18, base - 22, 36, 22);
      g.fillStyle(p0, 0.5);
      g.fillRect(W / 2 - 16, base - 20, 32, 3);
      text(t.landmarkName, tx + 14 + (tw - 38) / 2, base - 58, 11, cssColor(p0));
      break;
    }

    case 'datacenter': {
      // Valla perimetral
      g.lineStyle(1, 0x2f4a3a, 1);
      for (let x = 4; x < W; x += 8) g.lineBetween(x, poke + 4, x, base);
      g.lineBetween(0, poke + 4, W, poke + 4);
      // Nave
      g.fillStyle(0x16201b);
      g.fillRect(18, poke + 24, W - 36, base - poke - 24);
      g.fillStyle(0x1f2b24);
      g.fillRect(18, poke + 24, W - 36, 110);
      // Unidades de refrigeración en cubierta
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * 34;
        g.fillStyle(0x2a3a31);
        g.fillRect(x, poke + 36, 26, 26);
        g.fillStyle(0x0b100d);
        g.fillCircle(x + 13, poke + 49, 10);
        g.lineStyle(1, 0x39ff88, 0.5);
        g.lineBetween(x + 4, poke + 49, x + 22, poke + 49);
        g.lineBetween(x + 13, poke + 40, x + 13, poke + 58);
      }
      // Fachada con racks visibles
      const fTop = base - 84;
      g.fillStyle(0x0d1410);
      g.fillRect(18, fTop, W - 36, 84);
      g.fillStyle(0x39ff88);
      g.fillRect(18, fTop, W - 36, 2);
      for (let i = 0; i < 10; i++) {
        const x = 28 + i * 20;
        g.fillStyle(0x050806);
        g.fillRect(x, fTop + 22, 14, 48);
        for (let j = 0; j < 9; j++) {
          g.fillStyle(rng.chance(0.15) ? 0xff3b3b : rng.chance(0.6) ? 0x39ff88 : 0x0f5132);
          g.fillRect(x + 3, fTop + 26 + j * 5, 2, 2);
          g.fillRect(x + 8, fTop + 26 + j * 5, 2, 2);
        }
      }
      g.fillStyle(0x000000);
      g.fillRect(W / 2 - 14, base - 18, 28, 18);
      text(t.landmarkName, W / 2, fTop + 6, 11, '#39ff88');
      break;
    }

    case 'auditorio': {
      // Cubierta ondulada
      g.fillStyle(shade(p1, -0.2));
      g.fillRect(16, poke + 50, W - 32, base - poke - 50);
      for (let i = 0; i < 4; i++) {
        g.fillStyle(t.props[i % t.props.length] ?? p0);
        g.fillEllipse(48 + i * 54, poke + 56, 70, 50);
      }
      g.fillStyle(0xffffff, 0.25);
      for (let i = 0; i < 4; i++) g.fillEllipse(40 + i * 54, poke + 46, 30, 12);
      // Fachada de cristal
      const fTop = base - 90;
      g.fillStyle(0x2b2440);
      g.fillRect(24, fTop, W - 48, 90);
      g.fillStyle(0x4d3f6e);
      for (let x = 30; x < W - 30; x += 16) g.fillRect(x, fTop + 6, 12, 60);
      // Escenario/cartel
      g.fillStyle(p2);
      g.fillRect(W / 2 - 60, fTop - 6, 120, 18);
      // Notas musicales
      g.fillStyle(p0);
      for (const [nx, ny] of [
        [40, fTop + 30],
        [W - 50, fTop + 22],
      ] as const) {
        g.fillCircle(nx, ny, 5);
        g.fillRect(nx + 4, ny - 18, 2, 18);
        g.fillRect(nx + 4, ny - 18, 8, 3);
      }
      g.fillStyle(0x000000);
      g.fillRect(W / 2 - 16, base - 22, 32, 22);
      text(t.landmarkName, W / 2, fTop - 4, 11, '#2b2440');
      break;
    }

    case 'cine': {
      g.fillStyle(0x2a1d1d);
      g.fillRect(16, poke + 36, W - 32, base - poke - 36);
      g.fillStyle(0x3a2626);
      g.fillRect(16, poke + 36, W - 32, 6);
      // Fachada art déco
      const fTop = base - 110;
      g.fillStyle(0x8b2f2f);
      g.fillRect(24, fTop, W - 48, 110);
      g.fillStyle(0xa8553a);
      for (let x = 34; x < W - 34; x += 20) g.fillRect(x, fTop + 6, 4, 50);
      // Rótulo vertical
      g.fillStyle(0x1a1010);
      g.fillRect(W / 2 - 13, fTop - 48, 26, 70);
      g.lineStyle(2, p0, 1);
      g.strokeRect(W / 2 - 13, fTop - 48, 26, 70);
      // Marquesina con bombillas
      g.fillStyle(0x1a1010);
      g.fillRect(30, base - 52, W - 60, 22);
      g.fillStyle(0xf5e6c8);
      g.fillRect(36, base - 48, W - 72, 14);
      g.fillStyle(p0);
      for (let x = 32; x < W - 30; x += 8) {
        g.fillCircle(x, base - 52, 2);
        g.fillCircle(x, base - 30, 2);
      }
      // Pósters y alfombra roja
      g.fillStyle(0x1a1010);
      g.fillRect(30, base - 26, 22, 24);
      g.fillRect(W - 52, base - 26, 22, 24);
      g.fillStyle(p0);
      g.fillRect(33, base - 23, 16, 18);
      g.fillStyle(p1);
      g.fillRect(W - 49, base - 23, 16, 18);
      g.fillStyle(0x000000);
      g.fillRect(W / 2 - 18, base - 26, 36, 26);
      g.fillStyle(0xb3261e);
      g.fillRect(W / 2 - 12, base, 24, 44);
      text('ODEÓN', W / 2, fTop - 40, 9, cssColor(p0));
      text('★ ESTRENO ★', W / 2, base - 47, 9, '#1a1010');
      break;
    }

    case 'carpa': {
      const cx = W / 2;
      // Carpa a rayas
      const stripes = 10;
      for (let i = 0; i < stripes; i++) {
        const x0 = 20 + ((W - 40) / stripes) * i;
        const x1 = 20 + ((W - 40) / stripes) * (i + 1);
        g.fillStyle(i % 2 === 0 ? 0xff6b6b : 0xffffff);
        g.fillTriangle(cx, poke + 6, x0, base - 70, x1, base - 70);
        g.fillRect(x0, base - 70, x1 - x0, 70);
      }
      g.fillStyle(0x000000, 0.1);
      g.fillRect(20, base - 70, W - 40, 70);
      // Festón
      for (let x = 20; x < W - 20; x += 20) {
        g.fillStyle(0xffd93d);
        g.fillTriangle(x, base - 72, x + 20, base - 72, x + 10, base - 60);
      }
      // Bandera arriba
      g.fillStyle(0x4b5563);
      g.fillRect(cx - 1, poke - 14 < 0 ? 0 : poke - 14, 2, 22);
      g.fillStyle(0x4d96ff);
      g.fillTriangle(cx + 1, poke - 14 < 0 ? 0 : poke - 14, cx + 18, poke - 8, cx + 1, poke - 2);
      // Entrada
      g.fillStyle(0x2b1b3a);
      g.fillTriangle(cx - 24, base, cx + 24, base, cx, base - 44);
      g.fillStyle(0xffd93d);
      g.fillRoundedRect(cx - 70, base - 104, 140, 20, 6);
      text(t.landmarkName, cx, base - 101, 10, '#ff6b6b');
      break;
    }

    case 'televisora': {
      // Torre de antena
      const ax = W - 50;
      g.lineStyle(2, 0xd90429, 1);
      g.lineBetween(ax, 0, ax - 20, base - 60);
      g.lineBetween(ax, 0, ax + 20, base - 60);
      g.lineStyle(1, 0xffffff, 0.8);
      for (let y = 14; y < base - 60; y += 14) {
        const half = (y / (base - 60)) * 20;
        g.lineBetween(ax - half, y, ax + half, y);
      }
      g.fillStyle(0xff3b3b);
      g.fillCircle(ax, 2, 3);
      // Edificio
      g.fillStyle(0x3d405b);
      g.fillRect(16, poke + 40, W - 32, base - poke - 40);
      // Antenas parabólicas en cubierta
      for (const [dx, dy] of [
        [44, poke + 60],
        [96, poke + 70],
        [150, poke + 58],
      ] as const) {
        g.fillStyle(0xe5e7eb);
        g.fillEllipse(dx, dy, 28, 20);
        g.fillStyle(0x9ca3af);
        g.fillCircle(dx, dy, 3);
      }
      const fTop = base - 96;
      g.fillStyle(0xedf2f4);
      g.fillRect(22, fTop, W - 44, 96);
      for (let y = fTop + 40; y < base - 24; y += 14) {
        for (let x = 30; x < W - 30; x += 16) {
          g.fillStyle(0x3d405b);
          g.fillRect(x, y, 10, 9);
        }
      }
      // Pantalla gigante "EN DIRECTO"
      g.fillStyle(0x0b0f14);
      g.fillRect(36, fTop + 8, W - 72, 28);
      g.fillStyle(0xd90429);
      g.fillRect(40, fTop + 12, 64, 20);
      g.fillStyle(0xffffff);
      g.fillCircle(48, fTop + 22, 3);
      g.fillStyle(0x2b2d42);
      g.fillRect(W / 2 - 16, base - 22, 32, 22);
      text('EN DIRECTO', 74, fTop + 16, 8, '#ffffff');
      text(t.landmarkName, 150, fTop + 14, 11, '#ffffff');
      break;
    }
  }
}
