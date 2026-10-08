import { describe, expect, it } from 'vitest';
import { MOCK_TWEETS, MOCK_USERS } from '../src/data/mockData';
import { MockTweetProvider } from '../src/data/MockTweetProvider';
import { TweetQueue } from '../src/data/TweetQueue';
import { XTweetProvider, parseTimelineResponse } from '../src/data/XTweetProvider';
import { resolveTweetSource } from '../src/data/providerFactory';
import { ProviderNotImplementedError, type Tweet, type TweetProvider } from '../src/data/types';
import { BARRIO_IDS } from '../src/world/barrios';
import { compactNumber, relativeTime } from '../src/utils/format';

describe('mockData', () => {
  it('tiene ~40 usuarios con handles únicos y válidos', () => {
    expect(MOCK_USERS.length).toBeGreaterThanOrEqual(40);
    const handles = MOCK_USERS.map((u) => u.handle);
    expect(new Set(handles).size).toBe(handles.length);
    for (const h of handles) expect(h).toMatch(/^[A-Za-z0-9_]{1,15}$/); // reglas de X
  });

  it('tiene al menos 25 tweets por barrio, de ≤280 caracteres y autores existentes', () => {
    const handles = new Set(MOCK_USERS.map((u) => u.handle));
    for (const barrio of BARRIO_IDS) {
      const tweets = MOCK_TWEETS[barrio];
      expect(tweets.length).toBeGreaterThanOrEqual(25);
      for (const [handle, text] of tweets) {
        expect(handles.has(handle), `@${handle} no existe`).toBe(true);
        expect([...text].length, text).toBeLessThanOrEqual(280);
      }
    }
  });

  it('incluye tweets largos, con medios, hashtags e hilos', () => {
    const all = BARRIO_IDS.flatMap((b) => MOCK_TWEETS[b]);
    expect(all.some(([, t]) => [...t].length > 240)).toBe(true);
    expect(all.some(([, , m]) => m === 'image')).toBe(true);
    expect(all.some(([, , m]) => m === 'video')).toBe(true);
    expect(all.some(([, t]) => t.includes('#'))).toBe(true);
    expect(all.some(([, t]) => t.startsWith('2/3'))).toBe(true);
  });
});

describe('MockTweetProvider', () => {
  const provider = () => new MockTweetProvider({ latency: [0, 0], pageSize: 10, now: () => Date.parse('2026-10-08T12:00:00Z') });

  it('pagina con cursor y nunca se queda sin tweets', async () => {
    const p = provider();
    const ids = new Set<string>();
    let cursor: string | undefined;
    for (let i = 0; i < 12; i++) {
      const page = await p.getTweets('futbol', cursor);
      expect(page.tweets.length).toBeGreaterThan(0);
      for (const t of page.tweets) {
        expect(ids.has(t.id)).toBe(false); // ids únicos entre páginas y rondas
        ids.add(t.id);
      }
      cursor = page.nextCursor;
      expect(cursor).toBeDefined();
    }
    // Pasada la ronda inicial aparecen retuits
    expect([...ids].some((id) => id.includes('~r'))).toBe(true);
  });

  it('los retuits respetan los 280 caracteres y el barrio', async () => {
    const p = provider();
    const page = await p.getTweets('cine', '3:0');
    for (const t of page.tweets) {
      expect([...t.text].length).toBeLessThanOrEqual(280);
      expect(t.id.startsWith('cine-')).toBe(true);
      expect(t.text.startsWith('🔁 RT @')).toBe(true);
    }
  });

  it('genera datos coherentes (fechas ISO pasadas, contadores ≥ 0, seed estable)', async () => {
    const p = provider();
    const { tweets } = await p.getTweets('humor');
    for (const t of tweets) {
      expect(Date.parse(t.createdAt)).toBeLessThan(Date.parse('2026-10-08T12:00:00Z'));
      expect(t.likes).toBeGreaterThanOrEqual(0);
      expect(t.retweets).toBeGreaterThanOrEqual(0);
    }
    const again = await provider().getTweets('humor');
    expect(again.tweets[0]?.author.seed).toBe(tweets[0]?.author.seed);
  });
});

describe('TweetQueue', () => {
  it('no entrega dos veces el mismo id aunque el proveedor lo repita', async () => {
    const dup: Tweet = {
      id: 'same',
      author: { handle: 'a', name: 'A', verified: false, seed: 1 },
      text: 'hola',
      createdAt: new Date().toISOString(),
      likes: 0,
      retweets: 0,
    };
    const fake: TweetProvider = { name: 'fake', getTweets: async () => ({ tweets: [dup, dup], nextCursor: 'x' }) };
    const q = new TweetQueue(fake, 'humor', { lowWater: 0 });
    await q.refill();
    await q.refill();
    expect(q.size).toBe(1);
  });

  it('avisa del error y espera antes de reintentar', async () => {
    let now = 1000;
    let calls = 0;
    const errors: unknown[] = [];
    const broken: TweetProvider = {
      name: 'broken',
      getTweets: async () => {
        calls++;
        throw new Error('boom');
      },
    };
    const q = new TweetQueue(broken, 'humor', { retryDelayMs: 5000, now: () => now, onError: (e) => errors.push(e) });
    await q.refill();
    await q.refill(); // dentro del periodo de espera: no llama
    expect(calls).toBe(1);
    expect(errors).toHaveLength(1);
    now += 6000;
    await q.refill();
    expect(calls).toBe(2);
  });

  it('se rellena sola al bajar del umbral', async () => {
    const q = new TweetQueue(new MockTweetProvider({ latency: [0, 0], pageSize: 5 }), 'musica', { lowWater: 3 });
    await q.refill();
    expect(q.size).toBe(5);
    q.take();
    q.take();
    q.take(); // queda 2 < 3 → pide otra página
    await q.refill();
    expect(q.size).toBe(7);
  });
});

describe('XTweetProvider (stub)', () => {
  it('lanza un error claro mientras no esté implementado', async () => {
    await expect(new XTweetProvider('').getTweets('politica')).rejects.toBeInstanceOf(ProviderNotImplementedError);
  });

  it('valida y sanea la respuesta del backend', () => {
    const page = parseTimelineResponse({
      tweets: [
        {
          id: '1',
          author: { handle: 'ok', name: 'Ok', verified: true },
          text: '<img src=x onerror=alert(1)>',
          createdAt: '2026-10-08T10:00:00Z',
          likes: 5,
          retweets: -3,
          media: 'gif',
        },
        { id: 2, author: {}, text: 'inválido' },
        'basura',
      ],
      nextCursor: 'abc',
    });
    expect(page.tweets).toHaveLength(1);
    const t = page.tweets[0] as Tweet;
    expect(t.text).toBe('<img src=x onerror=alert(1)>'); // se conserva como texto plano
    expect(t.retweets).toBe(0);
    expect(t.media).toBeUndefined();
    expect(page.nextCursor).toBe('abc');
    expect(() => parseTimelineResponse({ nope: true })).toThrow();
  });

  it('VITE_TWEET_SOURCE elige proveedor (mock por defecto)', () => {
    expect(resolveTweetSource(undefined)).toBe('mock');
    expect(resolveTweetSource('X')).toBe('x');
    expect(resolveTweetSource('mock')).toBe('mock');
  });
});

describe('formato', () => {
  it('fechas relativas y números compactos en español', () => {
    const now = Date.parse('2026-10-08T12:00:00Z');
    expect(relativeTime('2026-10-08T11:59:50Z', now)).toBe('ahora');
    expect(relativeTime('2026-10-08T11:55:00Z', now)).toBe('hace 5 min');
    expect(relativeTime('2026-10-08T09:00:00Z', now)).toBe('hace 3 h');
    expect(relativeTime('2026-10-06T12:00:00Z', now)).toBe('hace 2 d');
    expect(compactNumber(950)).toBe('950');
    expect(compactNumber(1234)).toBe('1,2 mil');
    expect(compactNumber(2_500_000)).toBe('2,5 M');
  });
});
