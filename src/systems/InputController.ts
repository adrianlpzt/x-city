/**
 * Lee el teclado y lo traduce a una "intención de movimiento".
 * El resto del juego no sabe de teclas: sólo pide `direction()` y `running()`.
 */
import Phaser from 'phaser';

export class InputController {
  private readonly keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'shift', Phaser.Input.Keyboard.Key>;
  /** Cuando un menú está abierto, el jugador no se mueve. */
  enabled = true;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Teclado no disponible');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: kb.addKey(K.UP),
      down: kb.addKey(K.DOWN),
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      w: kb.addKey(K.W),
      a: kb.addKey(K.A),
      s: kb.addKey(K.S),
      d: kb.addKey(K.D),
      shift: kb.addKey(K.SHIFT),
    };
    // Si el foco se va (cambio de pestaña), soltar todo para no quedarse andando solo.
    window.addEventListener('blur', () => kb.resetKeys());
  }

  /** Vector de dirección normalizado (o 0,0). */
  direction(): { x: number; y: number } {
    if (!this.enabled) return { x: 0, y: 0 };
    const k = this.keys;
    const x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    const len = Math.hypot(x, y);
    return len === 0 ? { x: 0, y: 0 } : { x: x / len, y: y / len };
  }

  running(): boolean {
    return this.enabled && this.keys.shift.isDown;
  }
}
