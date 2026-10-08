/**
 * Contrato entre el juego y la fuente de tweets.
 * El resto del juego SOLO conoce estas interfaces: no sabe si los tweets
 * vienen de datos simulados, de tu backend Flask o de cualquier otra cosa.
 */
import type { BarrioId } from '../world/barrios';

export type { BarrioId };

export interface TweetAuthor {
  handle: string; // sin "@"
  name: string;
  verified: boolean;
  /** Hash estable del handle: decide el aspecto del NPC. */
  seed: number;
}

export interface Tweet {
  id: string;
  author: TweetAuthor;
  text: string;
  createdAt: string; // ISO 8601
  likes: number;
  retweets: number;
  media?: 'image' | 'video';
}

export interface TweetPage {
  tweets: Tweet[];
  /** Si no viene, no hay más páginas. */
  nextCursor?: string;
}

export interface TweetProvider {
  /** Nombre legible (para el modo debug). */
  readonly name: string;
  getTweets(barrio: BarrioId, cursor?: string): Promise<TweetPage>;
}

/** Error específico: el proveedor existe pero aún no está implementado. */
export class ProviderNotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderNotImplementedError';
  }
}
