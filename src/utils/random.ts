/**
 * Utilidades de aleatoriedad DETERMINISTA.
 *
 * Math.random() da resultados distintos cada vez; aquí necesitamos lo contrario:
 * que la misma semilla produzca siempre la misma secuencia, para que un chunk
 * concreto (semilla + coordenadas) se genere idéntico cada vez que se visita.
 */

/** PRNG mulberry32: rápido, 32 bits y suficiente para generación procedural. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash FNV-1a de 32 bits de un string (p. ej. el @ de un usuario). */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Combina varios enteros (semilla, cx, cy...) en un único hash bien mezclado.
 * Funciona con negativos, que es importante porque el mundo es infinito en
 * todas direcciones.
 */
export function hashInts(...values: number[]): number {
  let h = 0x9e3779b9;
  for (const v of values) {
    h ^= v | 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** Envoltorio cómodo sobre mulberry32 con helpers habituales. */
export class Rng {
  private readonly nextFn: () => number;

  constructor(seed: number) {
    this.nextFn = mulberry32(seed);
  }

  /** Número en [0, 1). */
  next(): number {
    return this.nextFn();
  }

  /** Decimal en [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.nextFn();
  }

  /** Entero en [min, max] (ambos incluidos). */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** true con probabilidad p. */
  chance(p: number): boolean {
    return this.nextFn() < p;
  }

  /** Elemento aleatorio de un array no vacío. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: array vacío');
    return items[Math.floor(this.nextFn() * items.length)] as T;
  }

  /** Elige una clave según pesos: { a: 3, b: 1 } -> 'a' el 75% de las veces. */
  weighted<K extends string>(weights: Partial<Record<K, number>>): K | null {
    const entries = Object.entries(weights) as [K, number][];
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    if (total <= 0) return null;
    let r = this.nextFn() * total;
    for (const [key, w] of entries) {
      r -= w;
      if (r < 0) return key;
    }
    return entries[entries.length - 1]?.[0] ?? null;
  }

  /** Baraja una copia del array (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.nextFn() * (i + 1));
      const tmp = copy[i] as T;
      copy[i] = copy[j] as T;
      copy[j] = tmp;
    }
    return copy;
  }
}
