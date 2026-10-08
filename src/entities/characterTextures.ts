/**
 * Dibuja por código los fotogramas de un personaje (3: quieto, paso A, paso B).
 * Se generan una vez por aspecto y se cachean en el TextureManager de Phaser.
 * El personaje "mira" a la derecha; para la izquierda se usa flipX.
 */
import type Phaser from 'phaser';
import { shade } from '../utils/color';
import type { Appearance } from './appearance';

export const CHAR_W = 28;
export const CHAR_H = 46;
export const CHAR_FRAMES = 3;

type G = Phaser.GameObjects.Graphics;

/** Genera (si no existen) las texturas y devuelve sus keys [quieto, pasoA, pasoB]. */
export function ensureCharacterTextures(scene: Phaser.Scene, id: string, look: Appearance): string[] {
  const keys: string[] = [];
  for (let frame = 0; frame < CHAR_FRAMES; frame++) {
    const key = `char_${id}_${frame}`;
    keys.push(key);
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({}, false);
    drawCharacter(g, look, frame);
    g.generateTexture(key, CHAR_W, CHAR_H);
    g.destroy();
  }
  return keys;
}

function drawCharacter(g: G, a: Appearance, frame: number): void {
  const cx = CHAR_W / 2;
  const legSwing = frame === 0 ? 0 : frame === 1 ? 1 : -1;

  // Mochila (detrás del cuerpo)
  if (a.accessory === 'backpack') {
    g.fillStyle(shade(a.accessoryColor, -0.1));
    g.fillRoundedRect(cx - 11, 20, 7, 13, 2);
  }
  // Capucha (detrás de la cabeza)
  if (a.topStyle === 'hoodie') {
    g.fillStyle(shade(a.top, -0.2));
    g.fillCircle(cx - 1, 16, 8);
  }

  // Piernas
  g.fillStyle(a.bottom);
  g.fillRect(cx - 5 + legSwing * 2, 32, 4, 10 - Math.max(0, legSwing));
  g.fillRect(cx + 1 - legSwing * 2, 32, 4, 10 - Math.max(0, -legSwing));
  g.fillStyle(a.shoes);
  g.fillRect(cx - 6 + legSwing * 2, 41 - Math.max(0, legSwing), 6, 3);
  g.fillRect(cx + 1 - legSwing * 2, 41 - Math.max(0, -legSwing), 6, 3);

  // Torso
  g.fillStyle(a.top);
  if (a.topStyle === 'dress') {
    g.fillTriangle(cx - 10, 37, cx + 10, 37, cx, 19);
    g.fillRoundedRect(cx - 7, 19, 14, 12, 3);
  } else {
    g.fillRoundedRect(cx - 7, 19, 14, 15, 3);
  }
  if (a.topStyle === 'jacket') {
    g.fillStyle(shade(a.top, 0.45));
    g.fillRect(cx - 1, 20, 2, 13);
  } else if (a.topStyle === 'hoodie') {
    g.fillStyle(shade(a.top, -0.15));
    g.fillRect(cx - 4, 28, 8, 4);
  }

  // Brazos (balanceo opuesto a las piernas)
  const armTone = shade(a.top, -0.12);
  g.fillStyle(armTone);
  g.fillRect(cx - 10, 20 - legSwing, 3, 11);
  g.fillRect(cx + 7, 20 + legSwing, 3, 11);
  g.fillStyle(a.skin);
  g.fillCircle(cx - 8.5, 32 - legSwing, 2);
  g.fillCircle(cx + 8.5, 32 + legSwing, 2);

  // Bufanda
  if (a.accessory === 'scarf') {
    g.fillStyle(a.accessoryColor);
    g.fillRect(cx - 7, 18, 14, 4);
    g.fillRect(cx + 2, 20, 4, 8);
    g.fillStyle(0xffffff);
    g.fillRect(cx - 3, 18, 3, 4);
  }

  // Cabeza
  g.fillStyle(a.skin);
  g.fillCircle(cx, 12, 7);
  drawHair(g, a, cx);
  // Ojos (ligeramente a la derecha: mira hacia donde camina)
  g.fillStyle(0x1b1b1b);
  g.fillRect(cx - 1, 11, 1.6, 2.4);
  g.fillRect(cx + 3, 11, 1.6, 2.4);

  // Accesorios de cabeza
  switch (a.accessory) {
    case 'glasses':
      g.lineStyle(1, 0x111111, 1);
      g.strokeRect(cx - 2.5, 10, 4, 3.5);
      g.strokeRect(cx + 2, 10, 4, 3.5);
      break;
    case 'cap':
      g.fillStyle(a.accessoryColor);
      g.fillRoundedRect(cx - 7, 4, 14, 6, { tl: 6, tr: 6, bl: 0, br: 0 });
      g.fillRect(cx + 2, 8, 9, 2);
      break;
    case 'hat':
      g.fillStyle(shade(a.accessoryColor, -0.3));
      g.fillRect(cx - 10, 7, 20, 2);
      g.fillRect(cx - 6, 1, 12, 7);
      g.fillStyle(a.accessoryColor);
      g.fillRect(cx - 6, 5, 12, 2);
      break;
    case 'beanie':
      g.fillStyle(a.accessoryColor);
      g.fillRoundedRect(cx - 7, 3, 14, 7, { tl: 7, tr: 7, bl: 0, br: 0 });
      g.fillStyle(0xffffff);
      g.fillCircle(cx, 3, 2);
      break;
    case 'headphones':
      g.lineStyle(2, 0x222222, 1);
      g.beginPath();
      g.arc(cx, 12, 8, Math.PI, 0);
      g.strokePath();
      g.fillStyle(a.accessoryColor);
      g.fillRect(cx - 9, 10, 3, 6);
      g.fillRect(cx + 6, 10, 3, 6);
      break;
    default:
      break;
  }
}

function drawHair(g: G, a: Appearance, cx: number): void {
  g.fillStyle(a.hair);
  switch (a.hairStyle) {
    case 'short':
      g.fillRoundedRect(cx - 7, 4, 14, 5, { tl: 6, tr: 6, bl: 0, br: 0 });
      g.fillRect(cx - 7, 7, 3, 4);
      break;
    case 'long':
      g.fillRoundedRect(cx - 8, 4, 16, 6, { tl: 7, tr: 7, bl: 0, br: 0 });
      g.fillRect(cx - 8, 8, 4, 12);
      g.fillRect(cx + 5, 8, 3, 9);
      break;
    case 'bun':
      g.fillCircle(cx - 1, 2.5, 3.5);
      g.fillRoundedRect(cx - 7, 4, 14, 5, { tl: 6, tr: 6, bl: 0, br: 0 });
      break;
    case 'mohawk':
      g.fillRect(cx - 1.5, 1, 3, 7);
      break;
    case 'curly':
      for (let i = 0; i < 5; i++) g.fillCircle(cx - 6 + i * 3, 5 + (i % 2), 3);
      g.fillCircle(cx - 6, 9, 2.5);
      break;
    case 'bald':
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(cx - 2, 8, 2);
      break;
  }
}
