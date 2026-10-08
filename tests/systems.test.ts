import { describe, expect, it } from 'vitest';
import { appearanceFromSeed } from '../src/entities/appearance';
import { moveWithCollision } from '../src/systems/Collision';
import { chooseDirection, isCrossing } from '../src/systems/NpcPath';
import { hashString } from '../src/utils/random';

describe('colisión', () => {
  const wall = { x: 100, y: 0, w: 50, h: 200 };

  it('bloquea al chocar de frente', () => {
    const r = moveWithCollision({ x: 70, y: 100, w: 20, h: 10 }, 30, 0, [wall], 8);
    expect(r.x).toBe(80); // pegado a la pared
    expect(r.blockedX).toBe(true);
  });

  it('desliza a lo largo de la pared al ir en diagonal', () => {
    const r = moveWithCollision({ x: 80, y: 100, w: 20, h: 10 }, 10, 10, [wall], 8);
    expect(r.x).toBe(80);
    expect(r.y).toBe(110);
  });

  it('empuja en las esquinas cuando el solape es pequeño', () => {
    // La caja asoma sólo 4 px por debajo del borde inferior de la pared
    const r = moveWithCollision({ x: 80, y: 196, w: 20, h: 10 }, 5, 0, [wall], 8);
    expect(r.y).toBeGreaterThan(196);
    expect(r.x).toBe(80);
  });
});

describe('rutas de NPC', () => {
  it('detecta pasos de cebra', () => {
    expect(isCrossing(0, 0, { dx: 1, dy: 0 })).toBe(false); // 0→1 acera
    expect(isCrossing(1, 0, { dx: 1, dy: 0 })).toBe(true); // 1→2 cruza
    expect(isCrossing(0, 0, { dx: -1, dy: 0 })).toBe(true); // 0→-1 cruza
    expect(isCrossing(0, 2, { dx: 0, dy: -1 })).toBe(true);
  });

  it('prefiere seguir recto', () => {
    let straight = 0;
    let seed = 1;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 1000; i++) {
      const d = chooseDirection(0, 0, { dx: 0, dy: 1 }, rand);
      if (d.dx === 0 && d.dy === 1) straight++;
    }
    expect(straight).toBeGreaterThan(350);
  });
});

describe('aspecto de los NPCs', () => {
  it('mismo @ = mismo aspecto; distinto @ = (casi siempre) distinto', () => {
    expect(appearanceFromSeed(hashString('bughuntress'))).toEqual(appearanceFromSeed(hashString('bughuntress')));
    const looks = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((h) => JSON.stringify(appearanceFromSeed(hashString(h)))));
    expect(looks.size).toBeGreaterThan(4);
  });
});
