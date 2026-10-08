/**
 * Texturas del mobiliario urbano y los coches, dibujadas por código.
 *
 * Cada textura se genera UNA vez (por tipo + barrio + variante) con un
 * Graphics temporal y `generateTexture`; después se reutiliza en todas las
 * imágenes que la necesiten. Todas tienen el "suelo" en el borde inferior,
 * así que se colocan con origen (0.5, 1).
 */
import Phaser from 'phaser';
import { shade } from '../utils/color';
import type { BarrioTheme, DecorKind } from './barrios';

type G = Phaser.GameObjects.Graphics;

interface DecorSpec {
  w: number;
  h: number;
  draw: (g: G, t: BarrioTheme, variant: number, w: number, h: number) => void;
}

const SHADOW = 0x000000;

function groundShadow(g: G, cx: number, by: number, w: number): void {
  g.fillStyle(SHADOW, 0.22);
  g.fillEllipse(cx, by - 2, w, 6);
}

const prop = (t: BarrioTheme, i: number): number => t.props[i % t.props.length] ?? 0xffffff;

const DECOR: Record<DecorKind, DecorSpec> = {
  lamp: {
    w: 18,
    h: 62,
    draw(g, t, _v, w, h) {
      const cx = w / 2;
      groundShadow(g, cx, h, 12);
      g.fillStyle(t.lampColor);
      g.fillRect(cx - 1.5, 12, 3, h - 16);
      g.fillRect(cx - 4, h - 6, 8, 4);
      g.fillRoundedRect(cx - 6, 6, 12, 7, 2);
      // Halo de luz
      g.fillStyle(t.lampLight, 0.25);
      g.fillCircle(cx, 14, 8);
      g.fillStyle(t.lampLight, 0.9);
      g.fillRect(cx - 4, 12, 8, 2);
    },
  },
  tree: {
    w: 46,
    h: 62,
    draw(g, t, v, w, h) {
      const cx = w / 2;
      groundShadow(g, cx, h, 34);
      g.fillStyle(0x6b4a2b);
      g.fillRect(cx - 3, h - 24, 6, 21);
      if (v === 2) {
        // Pino
        g.fillStyle(t.grassDark);
        g.fillTriangle(cx, 2, cx - 18, h - 20, cx + 18, h - 20);
        g.fillStyle(t.grass);
        g.fillTriangle(cx, 4, cx - 12, h - 30, cx + 6, h - 30);
        return;
      }
      const base = v === 0 ? t.grass : shade(t.grass, -0.1);
      g.fillStyle(shade(base, -0.25));
      g.fillCircle(cx, h - 34, 18);
      g.fillStyle(base);
      g.fillCircle(cx - 8, h - 38, 13);
      g.fillCircle(cx + 8, h - 36, 13);
      g.fillCircle(cx, h - 46, 13);
      g.fillStyle(shade(base, 0.2), 0.8);
      g.fillCircle(cx - 5, h - 48, 6);
    },
  },
  bench: {
    w: 34,
    h: 24,
    draw(g, t, _v, w, h) {
      groundShadow(g, w / 2, h, 32);
      const wood = t.dark ? 0x2a3a2f : 0x9a6435;
      g.fillStyle(0x3a3a3a);
      g.fillRect(3, h - 10, 3, 8);
      g.fillRect(w - 6, h - 10, 3, 8);
      g.fillStyle(shade(wood, -0.2));
      g.fillRect(1, 4, w - 2, 4);
      g.fillStyle(wood);
      g.fillRect(1, 9, w - 2, 4);
      g.fillRect(1, h - 12, w - 2, 5);
    },
  },
  bin: {
    w: 14,
    h: 22,
    draw(g, t, _v, w, h) {
      groundShadow(g, w / 2, h, 12);
      g.fillStyle(t.dark ? 0x1f2a24 : 0x4b5563);
      g.fillRoundedRect(1, 5, w - 2, h - 7, 2);
      g.fillStyle(t.dark ? 0x39ff88 : 0x6b7280);
      g.fillRect(0, 3, w, 3);
    },
  },
  planter: {
    w: 30,
    h: 24,
    draw(g, t, _v, w, h) {
      groundShadow(g, w / 2, h, 28);
      g.fillStyle(shade(t.lot, -0.2));
      g.fillRect(2, h - 12, w - 4, 10);
      g.fillStyle(t.grassDark);
      g.fillCircle(9, h - 13, 7);
      g.fillCircle(w - 9, h - 13, 7);
      g.fillStyle(t.grass);
      g.fillCircle(w / 2, h - 16, 8);
      g.fillStyle(prop(t, 2));
      g.fillCircle(w / 2 - 3, h - 19, 2);
      g.fillCircle(w / 2 + 5, h - 15, 2);
    },
  },
  hydrant: {
    w: 12,
    h: 18,
    draw(g, _t, _v, w, h) {
      groundShadow(g, w / 2, h, 10);
      g.fillStyle(0xd62828);
      g.fillRoundedRect(2, 4, w - 4, h - 6, 3);
      g.fillRect(0, 8, w, 3);
      g.fillStyle(0xf77f00);
      g.fillCircle(w / 2, 4, 3);
    },
  },
  flag: {
    w: 28,
    h: 64,
    draw(g, t, v, w, h) {
      groundShadow(g, 4, h, 10);
      g.fillStyle(0x555555);
      g.fillRect(3, 2, 2, h - 4);
      g.fillStyle(0xd4af37);
      g.fillCircle(4, 2, 2);
      const c1 = prop(t, v);
      const c2 = prop(t, v + 2);
      g.fillStyle(c1);
      g.fillRect(5, 5, w - 6, 6);
      g.fillStyle(c2);
      g.fillRect(5, 11, w - 6, 6);
      g.fillStyle(c1);
      g.fillRect(5, 17, w - 6, 6);
    },
  },
  podium: {
    w: 26,
    h: 32,
    draw(g, t, _v, w, h) {
      groundShadow(g, w / 2, h, 24);
      g.fillStyle(0x5a3a28);
      g.fillTriangle(3, 8, w - 3, 8, w / 2, h - 2);
      g.fillRect(6, 8, w - 12, h - 10);
      g.fillStyle(prop(t, 0));
      g.fillRect(2, 6, w - 4, 4);
      g.fillStyle(prop(t, 2));
      g.fillCircle(w / 2, 18, 4);
      g.fillStyle(0x222222);
      g.fillRect(w / 2 - 1, 0, 2, 7);
    },
  },
  pennant: {
    w: 62,
    h: 48,
    draw(g, t, v, w, h) {
      groundShadow(g, 3, h, 8);
      groundShadow(g, w - 3, h, 8);
      g.fillStyle(0x444444);
      g.fillRect(2, 4, 2, h - 6);
      g.fillRect(w - 4, 4, 2, h - 6);
      g.lineStyle(1, 0x333333, 0.8);
      g.lineBetween(3, 6, w / 2, 12);
      g.lineBetween(w / 2, 12, w - 3, 6);
      for (let i = 0; i < 6; i++) {
        const x = 6 + i * 9;
        const y = 7 + (i < 3 ? i * 2 : (5 - i) * 2);
        g.fillStyle(prop(t, i + v));
        g.fillTriangle(x, y, x + 8, y, x + 4, y + 10);
      }
    },
  },
  poster: {
    w: 28,
    h: 50,
    draw(g, t, v, w, h) {
      groundShadow(g, w / 2, h, 24);
      g.fillStyle(t.dark ? 0x101814 : 0x2f3640);
      g.fillRoundedRect(1, 0, w - 2, h - 4, 3);
      const bg = prop(t, v);
      g.fillStyle(bg);
      g.fillRect(4, 4, w - 8, h - 16);
      g.fillStyle(shade(bg, -0.35));
      g.fillCircle(w / 2, 16, 6);
      g.fillStyle(shade(bg, 0.5));
      g.fillRect(7, 26, w - 14, 3);
      g.fillRect(7, 31, w - 18, 2);
    },
  },
  neon: {
    w: 32,
    h: 56,
    draw(g, t, v, w, h) {
      groundShadow(g, w / 2, h, 12);
      g.fillStyle(0x333a44);
      g.fillRect(w / 2 - 1.5, 22, 3, h - 24);
      const c = prop(t, v);
      g.fillStyle(c, 0.25);
      g.fillRoundedRect(0, 0, w, 24, 4);
      g.fillStyle(0x111827);
      g.fillRoundedRect(2, 2, w - 4, 20, 3);
      g.lineStyle(2, c, 1);
      g.strokeRoundedRect(4, 4, w - 8, 16, 3);
      g.lineBetween(9, 12, w - 9, 12);
    },
  },
  screen: {
    w: 42,
    h: 56,
    draw(g, t, v, w, h) {
      groundShadow(g, w / 2, h, 14);
      g.fillStyle(0x2b2f36);
      g.fillRect(w / 2 - 2, 26, 4, h - 28);
      g.fillStyle(0x0b0f14);
      g.fillRoundedRect(0, 0, w, 28, 3);
      const c = prop(t, v);
      if (t.id === 'ciberseguridad') {
        g.fillStyle(c);
        for (let i = 0; i < 5; i++) g.fillRect(4, 4 + i * 4, 6 + ((i * 7 + v * 5) % 26), 2);
      } else {
        g.fillStyle(shade(c, -0.5));
        g.fillRect(3, 3, w - 6, 22);
        g.fillStyle(c);
        for (let i = 0; i < 6; i++) {
          const bh = 4 + ((i * 5 + v * 3) % 14);
          g.fillRect(6 + i * 5, 23 - bh, 3, bh);
        }
      }
    },
  },
  server: {
    w: 24,
    h: 40,
    draw(g, t, v, w, h) {
      groundShadow(g, w / 2, h, 22);
      g.fillStyle(0x0b0f0d);
      g.fillRect(1, 2, w - 2, h - 4);
      g.fillStyle(0x1a2620);
      for (let i = 0; i < 6; i++) g.fillRect(3, 5 + i * 5.5, w - 6, 4);
      for (let i = 0; i < 6; i++) {
        g.fillStyle((i + v) % 4 === 0 ? 0xff3b3b : prop(t, 0));
        g.fillRect(w - 7, 6 + i * 5.5, 2, 2);
        g.fillRect(w - 11, 6 + i * 5.5, 2, 2);
      }
    },
  },
  antenna: {
    w: 20,
    h: 58,
    draw(g, t, _v, w, h) {
      groundShadow(g, w / 2, h, 14);
      g.lineStyle(1.5, t.dark ? 0x4b5f52 : 0x6b7280, 1);
      g.lineBetween(w / 2, 2, 3, h - 3);
      g.lineBetween(w / 2, 2, w - 3, h - 3);
      for (let y = 10; y < h - 4; y += 8) {
        const half = ((y - 2) / (h - 5)) * (w / 2 - 3);
        g.lineBetween(w / 2 - half, y, w / 2 + half, y);
      }
      g.fillStyle(0xff3b3b);
      g.fillCircle(w / 2, 2, 2);
    },
  },
  cctv: {
    w: 20,
    h: 48,
    draw(g, t, _v, _w, h) {
      groundShadow(g, 5, h, 8);
      g.fillStyle(0x3b4a42);
      g.fillRect(4, 6, 2, h - 8);
      g.fillRect(4, 6, 8, 2);
      g.fillStyle(0xdddddd);
      g.fillRoundedRect(8, 4, 11, 7, 2);
      g.fillStyle(t.dark ? 0xff3b3b : 0x222222);
      g.fillCircle(16, 8, 1.5);
    },
  },
  speaker: {
    w: 24,
    h: 34,
    draw(g, t, v, w, h) {
      groundShadow(g, w / 2, h, 22);
      g.fillStyle(0x1b1b22);
      g.fillRoundedRect(1, 2, w - 2, h - 4, 3);
      g.fillStyle(0x3a3a44);
      g.fillCircle(w / 2, 11, 5);
      g.fillCircle(w / 2, 23, 7);
      g.fillStyle(prop(t, v), 0.9);
      g.fillCircle(w / 2, 23, 2);
    },
  },
  spotlight: {
    w: 28,
    h: 46,
    draw(g, t, _v, w, h) {
      g.fillStyle(t.lampLight, 0.18);
      g.fillTriangle(w / 2, h - 16, 0, 0, w, 0);
      groundShadow(g, w / 2, h, 20);
      g.fillStyle(0x2a2a2a);
      g.fillRect(w / 2 - 6, h - 8, 12, 6);
      g.fillStyle(0x444444);
      g.fillRoundedRect(w / 2 - 6, h - 20, 12, 12, 3);
      g.fillStyle(0xfff3c4);
      g.fillCircle(w / 2, h - 17, 3);
    },
  },
  kiosk: {
    w: 44,
    h: 48,
    draw(g, t, v, w, h) {
      groundShadow(g, w / 2, h, 42);
      const c = prop(t, v);
      g.fillStyle(shade(c, -0.3));
      g.fillRect(4, 16, w - 8, h - 18);
      g.fillStyle(0xf5f5f5);
      g.fillRect(7, 20, w - 14, 10);
      for (let i = 0; i < 4; i++) {
        g.fillStyle(prop(t, i + 1));
        g.fillRect(9 + i * 7, 32, 5, 7);
      }
      g.fillStyle(c);
      g.fillTriangle(0, 16, w, 16, w / 2, 2);
      g.fillRect(0, 12, w, 5);
    },
  },
  balloons: {
    w: 28,
    h: 58,
    draw(g, t, v, w, h) {
      groundShadow(g, w / 2, h, 8);
      g.lineStyle(1, 0x666666, 0.8);
      g.lineBetween(w / 2, h - 3, 6, 18);
      g.lineBetween(w / 2, h - 3, w / 2, 12);
      g.lineBetween(w / 2, h - 3, w - 6, 20);
      const pts: [number, number][] = [
        [6, 14],
        [w / 2, 8],
        [w - 6, 16],
      ];
      pts.forEach(([x, y], i) => {
        g.fillStyle(prop(t, i + v));
        g.fillEllipse(x, y, 11, 13);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(x - 2, y - 3, 1.5);
      });
    },
  },
};

/** Devuelve la key de la textura del elemento, generándola si hace falta. */
export function ensureDecorTexture(scene: Phaser.Scene, kind: DecorKind, theme: BarrioTheme, variant: number): string {
  const key = `decor_${kind}_${theme.id}_${variant}`;
  if (scene.textures.exists(key)) return key;
  const spec = DECOR[kind];
  const g = scene.make.graphics({}, false);
  spec.draw(g, theme, variant, spec.w, spec.h);
  g.generateTexture(key, spec.w, spec.h);
  g.destroy();
  return key;
}

/** Coche visto en 3/4. Horizontal: 60x34. Vertical: 30x62. */
export function ensureCarTexture(scene: Phaser.Scene, color: number, vertical: boolean): string {
  const key = `car_${vertical ? 'v' : 'h'}_${color.toString(16)}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  const glass = 0x1f2a36;
  const dark = shade(color, -0.3);
  const light = shade(color, 0.18);
  if (!vertical) {
    const w = 60;
    const h = 34;
    g.fillStyle(SHADOW, 0.25);
    g.fillEllipse(w / 2, h - 4, w - 2, 8);
    g.fillStyle(0x111111);
    g.fillCircle(13, h - 7, 5);
    g.fillCircle(w - 13, h - 7, 5);
    g.fillStyle(dark);
    g.fillRoundedRect(1, 13, w - 2, 15, 4); // lateral
    g.fillStyle(color);
    g.fillRoundedRect(1, 6, w - 2, 12, 4); // capó + techo vistos desde arriba
    g.fillStyle(light);
    g.fillRoundedRect(16, 2, 26, 12, 3); // techo
    g.fillStyle(glass);
    g.fillRect(14, 6, 3, 8);
    g.fillRect(41, 6, 3, 8);
    g.fillRect(17, 16, 24, 6); // ventanilla lateral
    g.fillStyle(0xfff3b0);
    g.fillRect(w - 4, 15, 3, 3);
    g.fillStyle(0xd62828);
    g.fillRect(1, 15, 3, 3);
    g.generateTexture(key, w, h);
  } else {
    const w = 30;
    const h = 62;
    g.fillStyle(SHADOW, 0.25);
    g.fillEllipse(w / 2, h - 5, w - 2, 10);
    g.fillStyle(0x111111);
    g.fillRect(0, 10, 3, 10);
    g.fillRect(w - 3, 10, 3, 10);
    g.fillRect(0, h - 22, 3, 10);
    g.fillRect(w - 3, h - 22, 3, 10);
    g.fillStyle(dark);
    g.fillRoundedRect(2, 4, w - 4, h - 6, 6);
    g.fillStyle(color);
    g.fillRoundedRect(3, 2, w - 6, h - 10, 6);
    g.fillStyle(glass);
    g.fillRoundedRect(6, 14, w - 12, 8, 2); // parabrisas
    g.fillRoundedRect(6, h - 22, w - 12, 6, 2); // luna trasera
    g.fillStyle(light);
    g.fillRoundedRect(6, 23, w - 12, h - 46, 3); // techo
    g.fillStyle(0xfff3b0);
    g.fillRect(5, 2, 4, 2);
    g.fillRect(w - 9, 2, 4, 2);
    g.generateTexture(key, w, h);
  }
  g.destroy();
  return key;
}
