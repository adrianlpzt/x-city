/**
 * Proveedor REAL (preparado, pero DESACTIVADO en esta versión).
 *
 * Nunca llama a la API de X desde el navegador: llama a TU backend
 * (`/api/timeline`), que es quien guarda el token y cachea las respuestas.
 * Ver la sección "Backend futuro" del README.
 *
 * Para activarlo cuando tengas el backend:
 *   1. Pon IMPLEMENTED = true (abajo).
 *   2. Arranca el juego con VITE_TWEET_SOURCE=x (en .env).
 *   3. En desarrollo, activa el proxy de /api en vite.config.ts.
 */
import { hashString } from '../utils/random';
import type { BarrioId } from '../world/barrios';
import { ProviderNotImplementedError, type Tweet, type TweetPage, type TweetProvider } from './types';

// TODO(backend): cambiar a true cuando /api/timeline exista.
const IMPLEMENTED = false;

export class XTweetProvider implements TweetProvider {
  readonly name = 'x';

  constructor(private readonly baseUrl: string = import.meta.env.VITE_API_BASE ?? '') {}

  async getTweets(barrio: BarrioId, cursor?: string): Promise<TweetPage> {
    if (!IMPLEMENTED) {
      throw new ProviderNotImplementedError(
        'El proveedor real de X todavía no está implementado. Usa VITE_TWEET_SOURCE=mock o termina el backend (ver README).',
      );
    }

    const params = new URLSearchParams({ barrio });
    if (cursor) params.set('cursor', cursor);

    // TODO(backend): si el backend usa sesión/cookie, añadir `credentials: 'include'`.
    const res = await fetch(`${this.baseUrl}/api/timeline?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Backend respondió ${res.status} ${res.statusText}`);
    const json: unknown = await res.json();
    return parseTimelineResponse(json);
  }
}

/* ------------------------------------------------------------------------
 * Validación de la respuesta del backend.
 * Nunca confiamos ciegamente en datos externos: si algo no tiene la forma
 * esperada, se descarta ese tweet en vez de romper el juego. El texto se
 * trata siempre como texto plano (la UI usa textContent, nunca innerHTML).
 * ---------------------------------------------------------------------- */

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length <= max ? v : null);
const nonNeg = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

export function parseTimelineResponse(json: unknown): TweetPage {
  if (!isObj(json) || !Array.isArray(json['tweets'])) throw new Error('Respuesta del backend con formato inesperado');
  const tweets: Tweet[] = [];
  for (const raw of json['tweets']) {
    const t = parseTweet(raw);
    if (t) tweets.push(t);
  }
  const nextCursor = str(json['nextCursor'], 512);
  return nextCursor ? { tweets, nextCursor } : { tweets };
}

function parseTweet(raw: unknown): Tweet | null {
  if (!isObj(raw) || !isObj(raw['author'])) return null;
  const a = raw['author'];
  const id = str(raw['id'], 64);
  const handle = str(a['handle'], 50);
  const name = str(a['name'], 100);
  // 280 "caracteres" de X pueden ser más unidades UTF-16 (emojis): margen generoso.
  const text = str(raw['text'], 1200);
  const createdAt = str(raw['createdAt'], 40);
  if (!id || !handle || !name || text === null || !createdAt || Number.isNaN(Date.parse(createdAt))) return null;
  const tweet: Tweet = {
    id,
    author: { handle, name, verified: a['verified'] === true, seed: hashString(handle) },
    text,
    createdAt,
    likes: nonNeg(raw['likes']),
    retweets: nonNeg(raw['retweets']),
  };
  if (raw['media'] === 'image' || raw['media'] === 'video') tweet.media = raw['media'];
  return tweet;
}
