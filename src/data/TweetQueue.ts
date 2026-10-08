/**
 * Cola de tweets de UN barrio. Los NPCs le piden el siguiente tweet con take();
 * cuando quedan pocos, pide otra página al proveedor en segundo plano.
 *
 * Garantiza que un mismo id no se entrega dos veces en la sesión (`seen`).
 * Si el proveedor falla, espera un rato antes de reintentar y avisa por onError.
 */
import { CONFIG } from '../config';
import type { BarrioId } from '../world/barrios';
import type { Tweet, TweetProvider } from './types';

export interface TweetQueueOptions {
  lowWater?: number;
  retryDelayMs?: number;
  onError?: (error: unknown) => void;
  now?: () => number;
}

export class TweetQueue {
  private readonly buffer: Tweet[] = [];
  private readonly seen = new Set<string>();
  private cursor: string | undefined;
  private fetching: Promise<void> | null = null;
  private exhausted = false;
  private retryAt = 0;
  private readonly lowWater: number;
  private readonly retryDelayMs: number;
  private readonly now: () => number;
  /** Último error (para mostrar en debug/HUD). */
  lastError: unknown = null;
  /** Nº de peticiones hechas al proveedor (debug). */
  requests = 0;

  constructor(
    private readonly provider: TweetProvider,
    readonly barrio: BarrioId,
    private readonly options: TweetQueueOptions = {},
  ) {
    this.lowWater = options.lowWater ?? CONFIG.tweets.lowWater;
    this.retryDelayMs = options.retryDelayMs ?? CONFIG.tweets.retryDelayMs;
    this.now = options.now ?? Date.now;
  }

  get size(): number {
    return this.buffer.length;
  }

  get isFetching(): boolean {
    return this.fetching !== null;
  }

  get isExhausted(): boolean {
    return this.exhausted;
  }

  /** Siguiente tweet, o undefined si la cola está vacía (todavía cargando). */
  take(): Tweet | undefined {
    const tweet = this.buffer.shift();
    if (this.buffer.length < this.lowWater) void this.refill();
    return tweet;
  }

  /**
   * Pide una página más si hace falta. Devuelve la promesa en curso para que
   * quien quiera (tests, carga inicial) pueda esperarla.
   */
  refill(): Promise<void> {
    if (this.fetching) return this.fetching;
    if (this.exhausted || this.now() < this.retryAt) return Promise.resolve();

    this.fetching = (async () => {
      try {
        this.requests++;
        const page = await this.provider.getTweets(this.barrio, this.cursor);
        for (const tweet of page.tweets) {
          if (this.seen.has(tweet.id)) continue; // nunca repetir en la sesión
          this.seen.add(tweet.id);
          this.buffer.push(tweet);
        }
        this.cursor = page.nextCursor;
        if (page.nextCursor === undefined) this.exhausted = true;
        this.lastError = null;
      } catch (error) {
        this.lastError = error;
        this.retryAt = this.now() + this.retryDelayMs;
        this.options.onError?.(error);
      } finally {
        this.fetching = null;
      }
    })();
    return this.fetching;
  }
}
