/** Panel de depuración (F3): FPS, chunks, NPCs, cola de tweets... */

export interface DebugStats {
  fps: number;
  chunks: number;
  npcs: number;
  queue: number;
  fetching: boolean;
  provider: string;
  barrio: string;
  player: { x: number; y: number };
  chunk: { cx: number; cy: number };
  renderer: string;
  lastError: string | null;
}

export class DebugOverlay {
  private readonly el: HTMLPreElement;
  private visible = false;
  private lastRefresh = 0;
  /** Se llama al mostrar/ocultar (para pintar o no las cajas de colisión). */
  onToggle: ((visible: boolean) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('pre');
    this.el.className = 'debug-overlay';
    parent.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault(); // F3 = "buscar siguiente" en algunos navegadores
        if (!e.repeat) this.toggle();
      }
    });
  }

  get isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.classList.toggle('visible', this.visible);
    this.lastRefresh = 0; // refrescar en el siguiente frame
    this.onToggle?.(this.visible);
  }

  /** Refresca el texto como mucho 4 veces por segundo (el DOM no necesita más). */
  update(stats: () => DebugStats): void {
    if (!this.visible) return;
    // Reloj real (no el delta del juego, que Phaser suaviza y limita).
    const now = performance.now();
    if (now - this.lastRefresh < 250) return;
    this.lastRefresh = now;
    const s = stats();
    this.el.textContent = [
      `FPS          ${s.fps.toFixed(0)}`,
      `Render       ${s.renderer}`,
      `Barrio       ${s.barrio}`,
      `Chunks       ${s.chunks}`,
      `NPCs vivos   ${s.npcs}`,
      `Cola tweets  ${s.queue}${s.fetching ? ' (cargando…)' : ''}`,
      `Proveedor    ${s.provider}`,
      `Jugador      ${s.player.x.toFixed(0)}, ${s.player.y.toFixed(0)}`,
      `Chunk        ${s.chunk.cx}, ${s.chunk.cy}`,
      s.lastError ? `Error        ${s.lastError}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
