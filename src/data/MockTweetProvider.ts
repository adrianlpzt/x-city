/**
 * Proveedor de tweets SIMULADO.
 *
 * - Construye los tweets a partir de mockData con fechas, likes y retuits
 *   deterministas (misma sesión = mismos números).
 * - Simula latencia de red y paginación con cursor.
 * - Cuando se agotan los tweets originales, genera "rondas" de retuits:
 *   otro usuario del mismo barrio retuitea un tweet ya existente, con id nuevo.
 *   Así la ciudad nunca se queda vacía y no se repite ningún id.
 *
 * Formato del cursor: "<ronda>:<posición>" (opaco para el resto del juego).
 */
import { CONFIG } from '../config';
import { Rng, hashString } from '../utils/random';
import { truncate } from '../utils/format';
import type { BarrioId } from '../world/barrios';
import { MOCK_TWEETS, MOCK_USERS, type MockUser } from './mockData';
import type { Tweet, TweetAuthor, TweetPage, TweetProvider } from './types';

export interface MockProviderOptions {
  /** Latencia simulada [min, max] en ms. Usa [0, 0] en tests. */
  latency?: readonly [number, number];
  pageSize?: number;
  /** Reloj inyectable (para tests). */
  now?: () => number;
}

const MAX_ROUNDS = 50; // con 26 tweets por barrio da para ~1.300 NPCs distintos

export class MockTweetProvider implements TweetProvider {
  readonly name = 'mock';
  private readonly users = new Map<string, MockUser>();
  private readonly baseCache = new Map<BarrioId, Tweet[]>();
  private readonly latency: readonly [number, number];
  private readonly pageSize: number;
  private readonly now: () => number;
  private readonly createdAt: number;

  constructor(options: MockProviderOptions = {}) {
    this.latency = options.latency ?? [CONFIG.tweets.mockLatencyMin, CONFIG.tweets.mockLatencyMax];
    this.pageSize = options.pageSize ?? CONFIG.tweets.pageSize;
    this.now = options.now ?? Date.now;
    this.createdAt = this.now();
    for (const u of MOCK_USERS) this.users.set(u.handle, u);
  }

  async getTweets(barrio: BarrioId, cursor?: string): Promise<TweetPage> {
    await this.simulateLatency();
    const { round, offset } = parseCursor(cursor);
    const base = this.baseTweets(barrio);
    const roundTweets = round === 0 ? base : this.remixRound(barrio, base, round);

    const tweets = roundTweets.slice(offset, offset + this.pageSize);
    let nextRound = round;
    let nextOffset = offset + this.pageSize;
    if (nextOffset >= roundTweets.length) {
      nextRound = round + 1;
      nextOffset = 0;
    }
    const nextCursor = nextRound < MAX_ROUNDS ? `${nextRound}:${nextOffset}` : undefined;
    return nextCursor === undefined ? { tweets } : { tweets, nextCursor };
  }

  private async simulateLatency(): Promise<void> {
    const [min, max] = this.latency;
    if (max <= 0) return;
    const ms = min + Math.random() * (max - min);
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private author(handle: string): TweetAuthor {
    const u = this.users.get(handle);
    if (!u) throw new Error(`mockData: usuario desconocido @${handle}`);
    return { handle: u.handle, name: u.name, verified: u.verified, seed: hashString(u.handle) };
  }

  /** Tweets originales del barrio, ordenados del más reciente al más antiguo. */
  private baseTweets(barrio: BarrioId): Tweet[] {
    const cached = this.baseCache.get(barrio);
    if (cached) return cached;
    const rng = new Rng(hashString(`mock-${barrio}`));
    let ageMinutes = rng.int(1, 6);
    const tweets = MOCK_TWEETS[barrio].map(([handle, text, media], i): Tweet => {
      // Cada tweet algo más antiguo que el anterior (de minutos a días).
      ageMinutes += rng.int(3, 25) + Math.floor(i * i * 0.6);
      const popularity = rng.next() ** 3; // la mayoría tiene pocos likes, unos pocos muchísimos
      const likes = Math.round(5 + popularity * 48_000);
      const tweet: Tweet = {
        id: `${barrio}-${i}`,
        author: this.author(handle),
        text,
        createdAt: new Date(this.createdAt - ageMinutes * 60_000).toISOString(),
        likes,
        retweets: Math.round(likes * rng.range(0.05, 0.35)),
      };
      if (media) tweet.media = media;
      return tweet;
    });
    this.baseCache.set(barrio, tweets);
    return tweets;
  }

  /** Ronda n: los mismos tweets, barajados y retuiteados por otro usuario del barrio. */
  private remixRound(barrio: BarrioId, base: Tweet[], round: number): Tweet[] {
    const rng = new Rng(hashString(`remix-${barrio}-${round}`));
    const handles = [...new Set(base.map((t) => t.author.handle))];
    return rng.shuffle(base).map((original, i): Tweet => {
      const others = handles.filter((h) => h !== original.author.handle);
      const retweeter = this.author(others.length > 0 ? rng.pick(others) : original.author.handle);
      const text = truncate(`🔁 RT @${original.author.handle}: ${original.text}`, 280);
      const tweet: Tweet = {
        id: `${original.id}~r${round}`,
        author: retweeter,
        text,
        createdAt: new Date(this.now() - (round * 7 + i) * 60_000).toISOString(),
        likes: Math.round(original.likes * rng.range(0.01, 0.2)),
        retweets: Math.round(original.retweets * rng.range(0.01, 0.2)),
      };
      if (original.media) tweet.media = original.media;
      return tweet;
    });
  }
}

function parseCursor(cursor?: string): { round: number; offset: number } {
  if (!cursor) return { round: 0, offset: 0 };
  const match = /^(\d+):(\d+)$/.exec(cursor);
  if (!match) return { round: 0, offset: 0 };
  return { round: Number(match[1]), offset: Number(match[2]) };
}
