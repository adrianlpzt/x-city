/**
 * Elige el proveedor de tweets según la variable de entorno VITE_TWEET_SOURCE.
 *   mock (por defecto) → MockTweetProvider
 *   x                  → XTweetProvider (stub: muestra un aviso)
 */
import { MockTweetProvider } from './MockTweetProvider';
import type { TweetProvider } from './types';
import { XTweetProvider } from './XTweetProvider';

export type TweetSource = 'mock' | 'x';

export function resolveTweetSource(value: string | undefined): TweetSource {
  const v = (value ?? '').trim().toLowerCase();
  if (v === 'x') return 'x';
  if (v !== '' && v !== 'mock') {
    console.warn(`VITE_TWEET_SOURCE="${value}" no es válido (usa mock o x). Se usa "mock".`);
  }
  return 'mock';
}

export function createTweetProvider(source: TweetSource = resolveTweetSource(import.meta.env.VITE_TWEET_SOURCE)): TweetProvider {
  return source === 'x' ? new XTweetProvider() : new MockTweetProvider();
}
