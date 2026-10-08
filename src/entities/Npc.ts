/**
 * Un NPC = el autor de un tweet paseando por la ciudad.
 *
 * Los NPCs se reutilizan (object pooling): en lugar de crear y destruir
 * objetos de Phaser continuamente, NpcManager "activa" uno libre con un
 * tweet nuevo y lo "desactiva" cuando queda lejos.
 */
import Phaser from 'phaser';
import { CONFIG } from '../config';
import type { Tweet } from '../data/types';
import { chooseDirection, isCrossing, type Dir } from '../systems/NpcPath';
import { truncate } from '../utils/format';
import { CANVAS_FONT } from '../world/ChunkRenderer';
import { nodeCoord } from '../world/layout';
import { appearanceFromSeed } from './appearance';
import { CharacterSprite } from './CharacterSprite';

export type NpcState = 'walk' | 'idle' | 'chat';

export const LABEL_DEPTH = 900_000;
/** Altura (px sobre los pies) a la que se pinta la etiqueta de nombre. */
export const LABEL_OFFSET_Y = 50;

let nextNpcId = 1;

export class Npc {
  readonly id = nextNpcId++;
  active = false;
  tweet: Tweet | null = null;
  x = 0;
  y = 0;
  state: NpcState = 'walk';
  /** Distancia al jugador calculada en el último frame (la usa NpcManager). */
  distToPlayer = Infinity;
  onScreen = false;

  private readonly sprite: CharacterSprite;
  private readonly label: Phaser.GameObjects.Text;
  private readonly badge: Phaser.GameObjects.Text;
  private ix = 0;
  private iy = 0;
  private dir: Dir = { dx: 1, dy: 0 };
  private offset = 0;
  private speed = 50;
  private stateTimer = 0;
  private facingLeft = false;
  private fadeIn = 1;
  partner: Npc | null = null;

  constructor(scene: Phaser.Scene) {
    this.sprite = new CharacterSprite(scene, 'npc_blank', appearanceFromSeed(0));
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: CANVAS_FONT,
        fontSize: '11px',
        color: '#ffffff',
        align: 'center',
        backgroundColor: 'rgba(17, 24, 39, 0.78)',
        padding: { x: 5, y: 2 },
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(LABEL_DEPTH);
    this.badge = scene.add
      .text(0, 0, '✔', {
        fontFamily: CANVAS_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1d9bf0',
        padding: { x: 3, y: 1 },
        resolution: 2,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(LABEL_DEPTH + 1);
    this.setVisible(false);
  }

  /**
   * Activa el NPC con un tweet, colocado en el tramo que sale del nodo (ix, iy)
   * en dirección `dir`, a una fracción `t` del recorrido.
   */
  activate(tweet: Tweet, ix: number, iy: number, dir: Dir, t: number, fadeIn: boolean): void {
    this.active = true;
    this.tweet = tweet;
    this.ix = ix;
    this.iy = iy;
    this.dir = dir;
    this.offset = Phaser.Math.Between(-13, 13);
    this.speed = Phaser.Math.Between(CONFIG.npc.speedMin, CONFIG.npc.speedMax);
    this.state = 'walk';
    this.partner = null;
    this.stateTimer = 0;
    this.fadeIn = fadeIn ? 0 : 1;

    const ax = nodeCoord(ix) + this.offset;
    const ay = nodeCoord(iy) + this.offset;
    const bx = nodeCoord(ix + dir.dx) + this.offset;
    const by = nodeCoord(iy + dir.dy) + this.offset;
    this.x = ax + (bx - ax) * t;
    this.y = ay + (by - ay) * t;
    this.facingLeft = dir.dx < 0;

    const a = tweet.author;
    this.sprite.setLook(`a${a.seed}`, appearanceFromSeed(a.seed));
    this.label.setText(`${truncate(a.name, 22)}\n@${truncate(a.handle, 22)}`);
    this.badge.setVisible(a.verified);
    this.sprite.setPosition(this.x, this.y);
  }

  deactivate(): void {
    this.active = false;
    this.tweet = null;
    if (this.partner) {
      this.partner.endChat();
      this.partner = null;
    }
    this.setVisible(false);
  }

  /** Pone a este NPC a charlar con otro durante unos segundos. */
  startChat(other: Npc, seconds: number): void {
    this.state = 'chat';
    this.partner = other;
    this.stateTimer = seconds;
    this.facingLeft = other.x < this.x;
  }

  endChat(): void {
    this.partner = null;
    if (this.state === 'chat') {
      this.state = 'idle';
      this.stateTimer = Phaser.Math.FloatBetween(0.3, 1.2);
    }
  }

  /** Lógica de movimiento (se ejecuta aunque esté fuera de cámara; es barata). */
  updateLogic(dt: number): { becameIdle: boolean } {
    let becameIdle = false;
    if (this.state !== 'walk') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.state === 'chat' && this.partner) {
          const p = this.partner;
          this.partner = null;
          p.endChat();
        }
        this.state = 'walk';
        // A veces, al reanudar, se da la vuelta.
        if (Math.random() < 0.2) this.reverse();
      }
      return { becameIdle };
    }

    // Parada espontánea en mitad de la acera
    if (Math.random() < CONFIG.npc.idleChancePerSecond * dt && !isCrossing(this.ix, this.iy, this.dir)) {
      this.goIdle();
      return { becameIdle: true };
    }

    const crossing = isCrossing(this.ix, this.iy, this.dir);
    const speed = this.speed * (crossing ? 1.3 : 1); // en los pasos de cebra se apresuran
    const tx = nodeCoord(this.ix + this.dir.dx) + this.offset;
    const ty = nodeCoord(this.iy + this.dir.dy) + this.offset;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;

    if (dist <= step) {
      // Llegada a la esquina
      this.x = tx;
      this.y = ty;
      this.ix += this.dir.dx;
      this.iy += this.dir.dy;
      this.dir = chooseDirection(this.ix, this.iy, this.dir);
      if (Math.random() < CONFIG.npc.idleChanceAtNode) {
        this.goIdle();
        becameIdle = true;
      }
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
    if (this.dir.dx !== 0) this.facingLeft = this.dir.dx < 0;
    return { becameIdle };
  }

  private goIdle(): void {
    this.state = 'idle';
    this.stateTimer = Phaser.Math.FloatBetween(1, 4);
    if (Math.random() < 0.4) this.facingLeft = !this.facingLeft; // mira alrededor
  }

  /** Media vuelta: intercambia nodo de origen y destino. */
  private reverse(): void {
    this.ix += this.dir.dx;
    this.iy += this.dir.dy;
    this.dir = { dx: (-this.dir.dx) as Dir['dx'], dy: (-this.dir.dy) as Dir['dy'] };
  }

  /** Actualiza lo visual. Sólo se llama para NPCs en cámara. */
  updateVisuals(dt: number, labelAlpha: number): void {
    if (this.fadeIn < 1) this.fadeIn = Math.min(1, this.fadeIn + dt * 2.5);
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setAlpha(this.fadeIn);
    const moving = this.state === 'walk' ? this.speed : 0;
    this.sprite.animate(dt, moving, this.facingLeft);

    const ly = Math.round(this.y - LABEL_OFFSET_Y);
    const lx = Math.round(this.x);
    this.label.setPosition(lx, ly);
    this.label.setAlpha(labelAlpha * this.fadeIn);
    if (this.badge.visible) {
      this.badge.setPosition(lx + this.label.width / 2 - 2, ly - this.label.height + 1);
      this.badge.setAlpha(labelAlpha * this.fadeIn);
    }
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.label.setVisible(visible);
    this.badge.setVisible(visible && !!this.tweet?.author.verified);
  }

  destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
    this.badge.destroy();
  }
}
