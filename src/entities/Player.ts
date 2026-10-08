/**
 * El jugador: movimiento con aceleración suave, carrera con Shift y colisión
 * que permite deslizarse por paredes y esquinas.
 */
import Phaser from 'phaser';
import { CONFIG } from '../config';
import { moveWithCollision } from '../systems/Collision';
import type { InputController } from '../systems/InputController';
import type { WorldManager } from '../world/WorldManager';
import { PLAYER_APPEARANCE } from './appearance';
import { CharacterSprite } from './CharacterSprite';

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  private facingLeft = false;
  readonly sprite: CharacterSprite;
  private readonly marker: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.sprite = new CharacterSprite(scene, 'player', PLAYER_APPEARANCE);
    // Anillo de color bajo los pies para encontrarse rápido entre la multitud.
    this.marker = scene.add.ellipse(0, 0, 30, 11).setStrokeStyle(2, 0xffffff, 0.9).setFillStyle(0xffffff, 0.12);
    this.sprite.addUnder(this.marker);
    this.sprite.setPosition(x, y);
  }

  setAccent(color: number): void {
    this.marker.setStrokeStyle(2, color, 0.95);
    this.marker.setFillStyle(color, 0.18);
  }

  /** Teletransporta (al cambiar de barrio) y detiene el movimiento. */
  teleport(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.sprite.setPosition(x, y);
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  update(dt: number, input: InputController, world: WorldManager): void {
    const cfg = CONFIG.player;
    const dir = input.direction();
    const max = input.running() ? cfg.runSpeed : cfg.walkSpeed;

    // Aceleración suave: la velocidad se acerca a la objetivo exponencialmente.
    const k = 1 - Math.exp(-cfg.acceleration * dt);
    this.vx += (dir.x * max - this.vx) * k;
    this.vy += (dir.y * max - this.vy) * k;
    if (Math.abs(this.vx) < 1) this.vx = 0;
    if (Math.abs(this.vy) < 1) this.vy = 0;

    const oldX = this.x;
    const oldY = this.y;
    const dx = this.vx * dt;
    const dy = this.vy * dt;
    if (dx !== 0 || dy !== 0) {
      const w = cfg.colliderWidth;
      const h = cfg.colliderHeight;
      const box = { x: this.x - w / 2, y: this.y - h, w, h };
      const area = { x: box.x - Math.abs(dx) - 4, y: box.y - Math.abs(dy) - 4, w: w + Math.abs(dx) * 2 + 8, h: h + Math.abs(dy) * 2 + 8 };
      const result = moveWithCollision(box, dx, dy, world.solidsNear(area), cfg.cornerSlide);
      this.x = result.x + w / 2;
      this.y = result.y + h;
      // Si chocamos de frente, perdemos esa componente de velocidad (sin rebotes raros).
      if (result.blockedX && dir.x === 0) this.vx = 0;
      if (result.blockedY && dir.y === 0) this.vy = 0;
    }

    if (dir.x !== 0) this.facingLeft = dir.x < 0;
    this.sprite.setPosition(this.x, this.y);
    // Animamos con lo que realmente se ha movido (empujar una pared no "anda").
    const moved = dt > 0 ? Math.hypot(this.x - oldX, this.y - oldY) / dt : 0;
    this.sprite.animate(dt, moved, this.facingLeft);
  }
}
