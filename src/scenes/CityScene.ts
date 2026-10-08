/**
 * Escena principal: une mundo, jugador, NPCs, tweets e interfaz.
 *
 * Flujo de cada frame (update):
 *   input → jugador (con colisiones) → mundo (cargar/descargar chunks)
 *   → NPCs (movimiento, spawn, bocadillos) → HUD/debug
 */
import Phaser from 'phaser';
import { CHUNK_SIZE, CONFIG } from '../config';
import { createTweetProvider } from '../data/providerFactory';
import { TweetQueue } from '../data/TweetQueue';
import { ProviderNotImplementedError, type TweetProvider } from '../data/types';
import { Player } from '../entities/Player';
import { InputController } from '../systems/InputController';
import { NpcManager } from '../systems/NpcManager';
import { BubbleLayer } from '../ui/BubbleLayer';
import { DebugOverlay } from '../ui/DebugOverlay';
import { Hud } from '../ui/Hud';
import { Menu } from '../ui/Menu';
import { BARRIOS, isBarrioId, type BarrioId } from '../world/barrios';
import { PLAYER_SPAWN, chunkCoord } from '../world/layout';
import { WorldManager } from '../world/WorldManager';

/** Barrio inicial: ?barrio=futbol en la URL, o Tecnología por defecto. */
function initialBarrio(): BarrioId {
  const fromUrl = new URLSearchParams(window.location.search).get('barrio');
  return fromUrl && isBarrioId(fromUrl) ? fromUrl : 'tecnologia';
}
/** Máximo que se espera a la primera página de tweets antes de mostrar el barrio. */
const FIRST_PAGE_TIMEOUT_MS = 1500;

export class CityScene extends Phaser.Scene {
  private world!: WorldManager;
  private player!: Player;
  private input2!: InputController;
  private npcs!: NpcManager;
  private provider!: TweetProvider;
  private readonly queues = new Map<BarrioId, TweetQueue>();
  private barrio: BarrioId = initialBarrio();
  private transitioning = false;
  private noticeShown = false;

  private hud!: Hud;
  private menu!: Menu;
  private debug!: DebugOverlay;
  private bubbles!: BubbleLayer;
  private debugGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('City');
  }

  create(): void {
    const uiRoot = document.getElementById('ui');
    if (!uiRoot) throw new Error('Falta #ui en index.html');

    // --- UI HTML ---
    this.bubbles = new BubbleLayer(uiRoot);
    this.hud = new Hud(uiRoot);
    this.menu = new Menu(uiRoot, this.barrio);
    this.debug = new DebugOverlay(uiRoot);
    this.bubbles.onFirstOpen = () => this.hud.incrementRead();
    this.menu.onSelect = (id) => void this.switchBarrio(id);
    this.menu.onToggle = (open) => {
      this.input2.enabled = !open;
    };

    // --- Datos ---
    this.provider = createTweetProvider();

    // --- Mundo y personajes ---
    this.world = new WorldManager(this, this.barrio);
    this.player = new Player(this, PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    this.input2 = new InputController(this);
    this.npcs = new NpcManager(this, this.bubbles);

    const cam = this.cameras.main;
    cam.startFollow(this.player.sprite.container, true, CONFIG.camera.lerp, CONFIG.camera.lerp);
    cam.setRoundPixels(true);

    this.debugGfx = this.add.graphics().setDepth(1_000_000);
    this.debug.onToggle = (visible) => {
      if (!visible) this.debugGfx.clear();
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.npcs.destroy());

    void this.enterBarrio(this.barrio, true);
  }

  private queueFor(barrio: BarrioId): TweetQueue {
    let q = this.queues.get(barrio);
    if (!q) {
      q = new TweetQueue(this.provider, barrio, { onError: (e) => this.onProviderError(e) });
      this.queues.set(barrio, q);
    }
    return q;
  }

  private onProviderError(error: unknown): void {
    if (this.noticeShown) return;
    this.noticeShown = true;
    if (error instanceof ProviderNotImplementedError) {
      this.hud.showNotice(
        'El proveedor real de X (VITE_TWEET_SOURCE=x) aún no está implementado. La ciudad funciona, pero sin vecinos. Usa VITE_TWEET_SOURCE=mock o mira el README para conectar tu backend.',
      );
    } else {
      const msg = error instanceof Error ? error.message : String(error);
      this.hud.showNotice(`No se han podido cargar tweets: ${msg}. Se reintentará en unos segundos.`);
    }
    if (error instanceof ProviderNotImplementedError) console.info(`[X City] ${error.message}`);
    else console.warn('[X City] Error del proveedor de tweets:', error);
  }

  /** Cambio de barrio con fundido. */
  async switchBarrio(id: BarrioId): Promise<void> {
    if (this.transitioning || id === this.barrio) return;
    this.transitioning = true;
    this.hud.setFade(true);
    this.bubbles.clear();
    await new Promise<void>((resolve) => {
      this.cameras.main.fadeOut(CONFIG.ui.transitionMs, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve());
    });
    await this.enterBarrio(id, false);
  }

  /** Prepara el barrio detrás del fundido y vuelve a mostrar la escena. */
  private async enterBarrio(id: BarrioId, first: boolean): Promise<void> {
    this.transitioning = true;
    if (first) {
      this.hud.setFade(true);
      this.cameras.main.fadeOut(0);
    }
    this.barrio = id;
    const theme = BARRIOS[id];
    this.cameras.main.setBackgroundColor(theme.background);
    this.world.setBarrio(id);
    this.player.teleport(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    this.player.setAccent(theme.accent);
    this.hud.setBarrio(id);
    this.menu.setCurrent(id);

    const queue = this.queueFor(id);
    this.npcs.reset(queue);

    // Esperamos (con límite) a la primera página para no mostrar la calle vacía.
    if (queue.size < CONFIG.npc.target) {
      await Promise.race([queue.refill(), delay(FIRST_PAGE_TIMEOUT_MS)]);
    }

    const cam = this.cameras.main;
    cam.centerOn(this.player.x, this.player.y);
    cam.preRender(); // recalcula worldView con la nueva posición
    this.world.update(cam.worldView, true);
    this.npcs.populate(this.player, cam.worldView);

    cam.fadeIn(CONFIG.ui.transitionMs, 0, 0, 0);
    this.hud.setFade(false);
    this.transitioning = false;
  }

  override update(_time: number, deltaMs: number): void {
    // Limitamos dt por si la pestaña estuvo en segundo plano (evita "teletransportes").
    const dt = Math.min(deltaMs, 50) / 1000;
    const cam = this.cameras.main;

    if (!this.transitioning) {
      this.player.update(dt, this.input2, this.world);
    }
    this.world.update(cam.worldView);
    this.world.updateOcclusion(this.player.x, this.player.y);

    if (!this.transitioning) {
      this.npcs.update(dt, this.player, cam.worldView, cam);
    }

    this.debug.update(() => {
      const q = this.queues.get(this.barrio);
      const err = q?.lastError;
      return {
        fps: this.game.loop.actualFps,
        chunks: this.world.loadedChunks,
        npcs: this.npcs.activeCount,
        queue: this.npcs.queueSize,
        fetching: q?.isFetching ?? false,
        provider: this.provider.name,
        barrio: BARRIOS[this.barrio].name,
        player: { x: this.player.x, y: this.player.y },
        chunk: { cx: chunkCoord(this.player.x), cy: chunkCoord(this.player.y) },
        renderer: this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
        lastError: err ? (err instanceof Error ? err.name : String(err)) : null,
      };
    });
    if (this.debug.isVisible) this.drawDebug(cam.worldView);
  }

  /** En modo debug: cajas de colisión, bordes de chunk y caja del jugador. */
  private drawDebug(view: Phaser.Geom.Rectangle): void {
    const g = this.debugGfx;
    g.clear();
    g.lineStyle(1, 0xff3b3b, 0.8);
    for (const s of this.world.debugSolids({ x: view.x, y: view.y, w: view.width, h: view.height })) {
      g.strokeRect(s.x, s.y, s.w, s.h);
    }
    g.lineStyle(1, 0x00e5ff, 0.5);
    const x0 = Math.floor(view.x / CHUNK_SIZE) * CHUNK_SIZE;
    const y0 = Math.floor(view.y / CHUNK_SIZE) * CHUNK_SIZE;
    for (let x = x0; x < view.right; x += CHUNK_SIZE) g.lineBetween(x, view.y, x, view.bottom);
    for (let y = y0; y < view.bottom; y += CHUNK_SIZE) g.lineBetween(view.x, y, view.right, y);
    const p = CONFIG.player;
    g.lineStyle(1, 0x39ff88, 1);
    g.strokeRect(this.player.x - p.colliderWidth / 2, this.player.y - p.colliderHeight, p.colliderWidth, p.colliderHeight);
    g.lineStyle(1, 0xffffff, 0.35);
    g.strokeCircle(this.player.x, this.player.y, CONFIG.bubble.openRadius);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
