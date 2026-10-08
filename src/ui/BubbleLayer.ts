/**
 * Bocadillos de conversación en HTML sobre el canvas.
 *
 * ¿Por qué HTML y no texto de Phaser? Texto más nítido, saltos de línea y
 * emojis bien resueltos por el navegador y animaciones CSS gratis.
 *
 * SEGURIDAD: el texto de los tweets se asigna SIEMPRE con `textContent`,
 * nunca con `innerHTML`, así que un tweet con "<img onerror=...>" se muestra
 * literalmente y no se ejecuta nada (sin XSS).
 */
import { CONFIG } from '../config';
import type { Tweet } from '../data/types';
import { compactNumber, relativeTime } from '../utils/format';

export type BubbleMode = 'full' | 'mini';

export interface BubbleTarget {
  /** Identifica al NPC (un mismo NPC conserva su bocadillo entre frames). */
  key: number;
  tweet: Tweet;
  mode: BubbleMode;
  /** Posición en pantalla (px CSS) del punto donde apunta el pico. */
  x: number;
  y: number;
}

interface PlacedRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const overlaps = (a: PlacedRect, b: PlacedRect): boolean =>
  a.left < b.right + 6 && a.right + 6 > b.left && a.top < b.bottom + 6 && a.bottom + 6 > b.top;

interface BubbleEl {
  key: number;
  mode: BubbleMode;
  tweetId: string;
  root: HTMLDivElement;
  inner: HTMLDivElement;
  width: number;
  height: number;
  /** Desplazamiento lateral usado en el frame anterior (se prueba primero para que no "salte"). */
  lastDx: number;
  closing: boolean;
  closeTimer: number;
}

const CLOSE_MS = 170;

export class BubbleLayer {
  private readonly root: HTMLDivElement;
  private readonly live = new Map<string, BubbleEl>();
  private readonly fullPool: BubbleEl[] = [];
  private readonly miniPool: BubbleEl[] = [];
  private readonly openedIds = new Set<string>();

  /** Se llama la primera vez que se abre del todo el bocadillo de un tweet. */
  onFirstOpen: ((tweet: Tweet) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'bubble-layer';
    parent.appendChild(this.root);
  }

  /** Sincroniza los bocadillos visibles con la lista deseada para este frame. */
  update(targets: BubbleTarget[]): void {
    const wanted = new Set<string>();

    // Colocamos de abajo a arriba para apilar los que se solapen.
    const fulls = targets.filter((t) => t.mode === 'full').sort((a, b) => b.y - a.y);
    const placed: PlacedRect[] = [];

    for (const t of targets) {
      const id = `${t.mode}:${t.key}`;
      wanted.add(id);
      let el = this.live.get(id);
      if (!el || el.tweetId !== t.tweet.id) {
        if (el) this.close(id, el);
        el = this.acquire(t);
        this.live.set(id, el);
      } else if (el.closing) {
        // Se estaba cerrando y vuelve a hacer falta: lo reabrimos.
        window.clearTimeout(el.closeTimer);
        el.closing = false;
        el.inner.classList.add('open');
      }
      if (t.mode === 'mini') this.position(el, t.x, t.y);
    }

    const screenW = this.root.clientWidth || window.innerWidth;
    for (const t of fulls) {
      const el = this.live.get(`full:${t.key}`);
      if (!el) continue;
      const rect = this.placeFull(el, t, placed, screenW);
      placed.push(rect);
      // El pico sigue apuntando al NPC aunque el bocadillo se haya desplazado.
      const cx = (rect.left + rect.right) / 2;
      const tail = Math.max(-(el.width / 2 - 18), Math.min(el.width / 2 - 18, t.x - cx));
      el.inner.style.setProperty('--tail-x', `${Math.round(tail)}px`);
      this.position(el, cx, rect.bottom);
    }

    for (const [id, el] of this.live) {
      if (!wanted.has(id) && !el.closing) this.close(id, el);
    }
  }

  clear(): void {
    this.update([]);
  }

  /**
   * Busca hueco para un bocadillo: encima del NPC; si choca con otro, prueba
   * a los lados y, si tampoco cabe, lo apila por encima. Siempre dentro de pantalla.
   */
  private placeFull(el: BubbleEl, t: BubbleTarget, placed: PlacedRect[], screenW: number): PlacedRect {
    const w = el.width || CONFIG.bubble.maxWidth;
    const h = el.height;
    const clampX = (x: number): number => Math.max(w / 2 + 8, Math.min(screenW - w / 2 - 8, x));
    const rectAt = (cx: number, bottom: number): PlacedRect => ({ left: cx - w / 2, right: cx + w / 2, top: bottom - h, bottom });
    // Candidatos: donde estaba el frame anterior, justo encima, y pegado a
    // izquierda/derecha de cada bocadillo ya colocado (el más cercano primero).
    const centers = [t.x + el.lastDx, t.x];
    const beside = placed
      .flatMap((p) => [p.right + 10 + w / 2, p.left - 10 - w / 2])
      .filter((c) => Math.abs(c - t.x) <= w * 1.6)
      .sort((a, b) => Math.abs(a - t.x) - Math.abs(b - t.x));
    for (const c of [...centers, ...beside]) {
      const r = rectAt(clampX(c), t.y);
      if (!placed.some((p) => overlaps(p, r))) {
        el.lastDx = c - t.x;
        return r;
      }
    }
    el.lastDx = 0;
    let r = rectAt(clampX(t.x), t.y);
    for (let i = 0; i < placed.length && placed.some((p) => overlaps(p, r)); i++) {
      const top = Math.min(...placed.filter((p) => overlaps(p, r)).map((p) => p.top));
      r = rectAt(r.left + w / 2, top - 8);
    }
    return r;
  }

  private position(el: BubbleEl, x: number, y: number): void {
    // Redondeo para que el texto no se vea borroso.
    el.root.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  }

  private acquire(t: BubbleTarget): BubbleEl {
    const pool = t.mode === 'full' ? this.fullPool : this.miniPool;
    const el = pool.pop() ?? this.create(t.mode);
    el.key = t.key;
    el.tweetId = t.tweet.id;
    el.closing = false;
    el.lastDx = 0;
    if (t.mode === 'full') this.fill(el, t.tweet);
    el.root.style.display = '';
    this.position(el, t.x, t.y);
    if (t.mode === 'full') {
      el.width = el.inner.offsetWidth;
      el.height = el.inner.offsetHeight + 12; // + hueco del pico
    }
    // Doble rAF: asegura que el navegador pinta el estado inicial antes de animar.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!el.closing) el.inner.classList.add('open');
      }),
    );
    if (t.mode === 'full' && !this.openedIds.has(t.tweet.id)) {
      this.openedIds.add(t.tweet.id);
      this.onFirstOpen?.(t.tweet);
    }
    return el;
  }

  private close(id: string, el: BubbleEl): void {
    el.closing = true;
    el.inner.classList.remove('open');
    el.closeTimer = window.setTimeout(() => {
      if (!el.closing) return;
      el.root.style.display = 'none';
      if (this.live.get(id) === el) this.live.delete(id);
      (el.mode === 'full' ? this.fullPool : this.miniPool).push(el);
    }, CLOSE_MS);
  }

  private create(mode: BubbleMode): BubbleEl {
    const root = document.createElement('div');
    // Los completos por encima de las burbujas minimizadas.
    root.className = mode === 'full' ? 'bubble-anchor bubble-anchor-full' : 'bubble-anchor';
    const inner = document.createElement('div');
    inner.className = mode === 'full' ? 'bubble' : 'bubble bubble-mini';
    if (mode === 'mini') {
      inner.textContent = '💬 …';
    } else {
      // Estructura fija; el contenido se rellena con textContent en fill().
      inner.innerHTML =
        '<div class="b-head"><span class="b-name"></span><span class="b-verified" title="Cuenta verificada">✔</span>' +
        '<span class="b-handle"></span><span class="b-time"></span></div>' +
        '<div class="b-text"></div><div class="b-media"></div>' +
        '<div class="b-foot"><span class="b-likes"></span><span class="b-rts"></span></div>';
    }
    root.appendChild(inner);
    this.root.appendChild(root);
    return { key: -1, mode, tweetId: '', root, inner, width: 0, height: 0, lastDx: 0, closing: false, closeTimer: 0 };
  }

  private fill(el: BubbleEl, tweet: Tweet): void {
    const q = <T extends HTMLElement>(sel: string): T => el.inner.querySelector(sel) as T;
    q('.b-name').textContent = tweet.author.name;
    q('.b-verified').style.display = tweet.author.verified ? '' : 'none';
    q('.b-handle').textContent = `@${tweet.author.handle}`;
    q('.b-time').textContent = `· ${relativeTime(tweet.createdAt)}`;
    q('.b-text').textContent = tweet.text; // ← texto plano, nunca HTML
    const media = q('.b-media');
    media.textContent = tweet.media === 'image' ? '🖼 imagen' : tweet.media === 'video' ? '🎬 vídeo' : '';
    media.style.display = tweet.media ? '' : 'none';
    q('.b-likes').textContent = `♥ ${compactNumber(tweet.likes)}`;
    q('.b-rts').textContent = `🔁 ${compactNumber(tweet.retweets)}`;
  }
}
