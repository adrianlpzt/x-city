/**
 * Parte visual común de jugador y NPCs: sombra + cuerpo con animación de
 * caminar (cambio de fotograma + rebote + ligero balanceo).
 * La posición (x, y) es la de los PIES; la profundidad se ordena por y.
 */
import Phaser from 'phaser';
import type { Appearance } from './appearance';
import { ensureCharacterTextures } from './characterTextures';

const SHADOW_KEY = 'char_shadow';

function ensureShadow(scene: Phaser.Scene): void {
  if (scene.textures.exists(SHADOW_KEY)) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(12, 4, 22, 7);
  g.generateTexture(SHADOW_KEY, 24, 8);
  g.destroy();
}

export class CharacterSprite {
  readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private frames: string[] = [];
  private phase = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    id: string,
    look: Appearance,
  ) {
    ensureShadow(scene);
    this.shadow = scene.add.image(0, 0, SHADOW_KEY).setOrigin(0.5, 0.5);
    this.frames = ensureCharacterTextures(scene, id, look);
    this.body = scene.add.image(0, 2, this.frames[0] ?? SHADOW_KEY).setOrigin(0.5, 1);
    this.container = scene.add.container(0, 0, [this.shadow, this.body]);
  }

  /** Cambia el aspecto (al reciclar un NPC del pool para otro autor). */
  setLook(id: string, look: Appearance): void {
    this.frames = ensureCharacterTextures(this.scene, id, look);
    this.body.setTexture(this.frames[0] ?? SHADOW_KEY);
  }

  /** Añade un objeto extra al contenedor por debajo del cuerpo (p. ej. el marcador del jugador). */
  addUnder(obj: Phaser.GameObjects.GameObject): void {
    this.container.addAt(obj, 0);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
    this.container.setDepth(y);
  }

  /**
   * @param speed velocidad actual en px/s (0 = quieto)
   * @param facingLeft hacia dónde mira
   */
  animate(dt: number, speed: number, facingLeft: boolean): void {
    this.body.setFlipX(facingLeft);
    if (speed < 5) {
      // Respiración suave estando quieto
      this.phase = (this.phase + dt * 2) % (Math.PI * 2);
      this.body.setTexture(this.frames[0] ?? SHADOW_KEY);
      this.body.y = 2;
      this.body.scaleY = 1 + Math.sin(this.phase) * 0.012;
      this.body.rotation = 0;
      return;
    }
    // El ciclo avanza proporcional a la velocidad: corriendo, pasos más rápidos.
    this.phase = (this.phase + dt * speed * 0.11) % (Math.PI * 2);
    const s = Math.sin(this.phase);
    const step = Math.floor((this.phase / (Math.PI * 2)) * 4); // 0..3
    const frame = step === 0 ? 1 : step === 2 ? 2 : 0;
    this.body.setTexture(this.frames[frame] ?? SHADOW_KEY);
    this.body.y = 2 - Math.abs(s) * 2.2;
    this.body.scaleY = 1;
    this.body.rotation = s * 0.05;
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  setAlpha(alpha: number): void {
    this.container.setAlpha(alpha);
  }

  destroy(): void {
    this.container.destroy();
  }
}
