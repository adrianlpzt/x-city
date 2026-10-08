/**
 * NpcManager: mantiene ~30 NPCs vivos alrededor del jugador.
 *
 *  - Spawn: por delante del jugador (según hacia dónde camina) y FUERA de
 *    cámara, sobre tramos de acera. Cada NPC consume un tweet de la cola.
 *  - Despawn: los que quedan muy lejos y fuera de cámara vuelven al pool.
 *  - Bocadillos: decide qué NPCs muestran el tweet completo (2-3 más
 *    cercanos) y cuáles una burbuja minimizada.
 */
import type Phaser from 'phaser';
import { CONFIG } from '../config';
import type { TweetQueue } from '../data/TweetQueue';
import { LABEL_OFFSET_Y, Npc } from '../entities/Npc';
import type { BubbleLayer, BubbleTarget } from '../ui/BubbleLayer';
import { nearestNodeIndex, nodeCoord } from '../world/layout';
import { DIRS, type Dir } from './NpcPath';

interface SpawnPoint {
  ix: number;
  iy: number;
  dir: Dir;
  t: number;
  x: number;
  y: number;
}

/** Altura sobre los pies a la que apunta el pico del bocadillo. */
const BUBBLE_ANCHOR_Y = LABEL_OFFSET_Y + 30;

export class NpcManager {
  private readonly pool: Npc[] = [];
  private readonly active: Npc[] = [];
  private queue: TweetQueue | null = null;
  private tickTimer = 0;
  private readonly openKeys = new Set<number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bubbles: BubbleLayer,
  ) {}

  get activeCount(): number {
    return this.active.length;
  }

  get queueSize(): number {
    return this.queue?.size ?? 0;
  }

  /** Descarta todos los NPCs (cambio de barrio) y usa una nueva cola. */
  reset(queue: TweetQueue): void {
    for (const npc of this.active) this.release(npc, false);
    this.active.length = 0;
    this.queue = queue;
    this.openKeys.clear();
    this.bubbles.clear();
  }

  /**
   * Relleno inicial (con la pantalla en negro durante el fundido): aquí sí se
   * permite aparecer dentro de la cámara para que la calle no empiece vacía.
   */
  populate(player: { x: number; y: number }, view: Phaser.Geom.Rectangle): void {
    for (let i = 0; i < CONFIG.npc.target * 2 && this.active.length < CONFIG.npc.target; i++) {
      if (!this.spawnOne(player, view, true, { x: 0, y: 0 }, false)) break;
    }
  }

  update(
    dt: number,
    player: { x: number; y: number; vx: number; vy: number },
    view: Phaser.Geom.Rectangle,
    camera: Phaser.Cameras.Scene2D.Camera,
  ): void {
    // 1) Lógica y visibilidad de cada NPC
    const margin = CONFIG.npc.offscreenMargin;
    const vx0 = view.x - margin;
    const vy0 = view.y - margin;
    const vx1 = view.right + margin;
    const vy1 = view.bottom + margin + 60;
    for (const npc of this.active) {
      const { becameIdle } = npc.updateLogic(dt);
      if (becameIdle && Math.random() < CONFIG.npc.chatChance) this.tryStartChat(npc);
      npc.distToPlayer = Math.hypot(npc.x - player.x, npc.y - player.y);
      const onScreen = npc.x > vx0 && npc.x < vx1 && npc.y > vy0 && npc.y < vy1;
      if (onScreen !== npc.onScreen) {
        npc.onScreen = onScreen;
        npc.setVisible(onScreen);
      }
      if (onScreen) {
        // Etiquetas lejanas algo más tenues para no saturar.
        const labelAlpha = npc.distToPlayer < 450 ? 1 : 0.65;
        npc.updateVisuals(dt, labelAlpha);
      }
    }

    // 2) Spawn / despawn (no hace falta cada frame)
    this.tickTimer -= dt * 1000;
    if (this.tickTimer <= 0) {
      this.tickTimer = CONFIG.npc.managerIntervalMs;
      this.manage(player, view);
    }

    // 3) Bocadillos
    this.updateBubbles(view, camera);
  }

  private manage(player: { x: number; y: number; vx: number; vy: number }, view: Phaser.Geom.Rectangle): void {
    // Despawn: lejos Y fuera de cámara (nunca desaparecen a la vista).
    for (let i = this.active.length - 1; i >= 0; i--) {
      const npc = this.active[i] as Npc;
      if (npc.distToPlayer > CONFIG.npc.despawnRadius && !npc.onScreen) {
        this.active.splice(i, 1);
        this.release(npc, true);
      }
    }

    // Spawn hasta el objetivo (unos pocos por tick para repartir el trabajo).
    const speed = Math.hypot(player.vx, player.vy);
    const moveDir = speed > 10 ? { x: player.vx / speed, y: player.vy / speed } : { x: 0, y: 0 };
    let budget = 4;
    while (this.active.length < CONFIG.npc.target && budget-- > 0) {
      if (!this.spawnOne(player, view, false, moveDir, true)) break;
    }
    if (this.queue && this.queue.size < CONFIG.tweets.lowWater) void this.queue.refill();
  }

  private spawnOne(
    player: { x: number; y: number },
    view: Phaser.Geom.Rectangle,
    allowOnScreen: boolean,
    moveDir: { x: number; y: number },
    fadeIn: boolean,
  ): boolean {
    if (!this.queue || this.queue.size === 0) {
      void this.queue?.refill();
      return false;
    }
    if (this.active.length >= CONFIG.npc.max) return false;
    const point = this.findSpawnPoint(player, view, allowOnScreen, moveDir);
    if (!point) return false;
    const tweet = this.queue.take();
    if (!tweet) return false;

    const npc = this.pool.pop() ?? new Npc(this.scene);
    npc.activate(tweet, point.ix, point.iy, point.dir, point.t, fadeIn);
    npc.onScreen = false;
    npc.setVisible(false);
    this.active.push(npc);
    return true;
  }

  /**
   * Busca un punto de acera dentro del radio de spawn. Fuera de cámara salvo
   * en la carga inicial, y preferiblemente en la dirección en la que camina
   * el jugador (así los NPCs "aparecen por delante").
   */
  private findSpawnPoint(
    player: { x: number; y: number },
    view: Phaser.Geom.Rectangle,
    allowOnScreen: boolean,
    moveDir: { x: number; y: number },
  ): SpawnPoint | null {
    const pix = nearestNodeIndex(player.x);
    const piy = nearestNodeIndex(player.y);
    const margin = CONFIG.npc.offscreenMargin + 40;
    const radius = CONFIG.npc.spawnRadius;
    let best: SpawnPoint | null = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 14; attempt++) {
      const horizontal = Math.random() < 0.5;
      let ix = pix + Math.floor(Math.random() * 11) - 5;
      let iy = piy + Math.floor(Math.random() * 11) - 5;
      // Los tramos de acera empiezan en índice par (ver layout.ts).
      if (horizontal && ix % 2 !== 0) ix -= 1;
      if (!horizontal && iy % 2 !== 0) iy -= 1;
      const forward: Dir = horizontal ? { dx: 1, dy: 0 } : { dx: 0, dy: 1 };
      const t = 0.1 + Math.random() * 0.8;
      const x = nodeCoord(ix) + (horizontal ? (nodeCoord(ix + 1) - nodeCoord(ix)) * t : 0);
      const y = nodeCoord(iy) + (horizontal ? 0 : (nodeCoord(iy + 1) - nodeCoord(iy)) * t);

      const dx = x - player.x;
      const dy = y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius || dist < 60) continue;
      const inView = x > view.x - margin && x < view.right + margin && y > view.y - margin && y < view.bottom + margin + 60;
      if (inView && !allowOnScreen) continue;
      if (this.active.some((n) => Math.abs(n.x - x) < 28 && Math.abs(n.y - y) < 28)) continue;

      // Puntuación: delante del jugador + algo de azar.
      const forwardness = moveDir.x === 0 && moveDir.y === 0 ? 0 : (dx * moveDir.x + dy * moveDir.y) / dist;
      const score = forwardness * 2 + Math.random();
      if (score > bestScore) {
        bestScore = score;
        // Dirección inicial aleatoria a lo largo del tramo.
        const dir = Math.random() < 0.5 ? forward : (DIRS.find((d) => d.dx === -forward.dx && d.dy === -forward.dy) as Dir);
        const startIx = dir.dx < 0 ? ix + 1 : ix;
        const startIy = dir.dy < 0 ? iy + 1 : iy;
        best = { ix: startIx, iy: startIy, dir, t: dir === forward ? t : 1 - t, x, y };
      }
    }
    return best;
  }

  private tryStartChat(npc: Npc): void {
    for (const other of this.active) {
      if (other === npc || other.state === 'chat' || other.partner) continue;
      if (Math.abs(other.x - npc.x) < 46 && Math.abs(other.y - npc.y) < 30) {
        const seconds = 3 + Math.random() * 4;
        npc.startChat(other, seconds);
        other.startChat(npc, seconds);
        return;
      }
    }
  }

  private release(npc: Npc, toPool: boolean): void {
    npc.deactivate();
    npc.onScreen = false;
    if (toPool || this.pool.length < CONFIG.npc.max) this.pool.push(npc);
  }

  private updateBubbles(view: Phaser.Geom.Rectangle, camera: Phaser.Cameras.Scene2D.Camera): void {
    const cfg = CONFIG.bubble;
    const candidates = this.active
      .filter((n) => n.onScreen && n.tweet && n.distToPlayer < cfg.minimizedRadius)
      // Los ya abiertos tienen ventaja: evita que se intercambien a cada paso.
      .map((n) => ({ n, score: n.distToPlayer - (this.openKeys.has(n.id) ? 25 : 0) }))
      .sort((a, b) => a.score - b.score);

    const targets: BubbleTarget[] = [];
    const nextOpen = new Set<number>();
    let minis = 0;
    const zoom = camera.zoom;
    for (const { n } of candidates) {
      const tweet = n.tweet;
      if (!tweet) continue;
      const limit = this.openKeys.has(n.id) ? cfg.closeRadius : cfg.openRadius;
      const x = (n.x - view.x) * zoom;
      const y = (n.y - BUBBLE_ANCHOR_Y - view.y) * zoom;
      if (nextOpen.size < cfg.maxOpen && n.distToPlayer <= limit) {
        nextOpen.add(n.id);
        targets.push({ key: n.id, tweet, mode: 'full', x, y });
      } else if (minis < cfg.maxMinimized) {
        minis++;
        targets.push({ key: n.id, tweet, mode: 'mini', x, y });
      }
    }
    this.openKeys.clear();
    for (const k of nextOpen) this.openKeys.add(k);
    this.bubbles.update(targets);
  }

  destroy(): void {
    for (const npc of [...this.active, ...this.pool]) npc.destroy();
    this.active.length = 0;
    this.pool.length = 0;
  }
}
