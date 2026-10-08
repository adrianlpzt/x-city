/**
 * Aspecto de un personaje derivado SOLO de una semilla (el hash del @).
 * Mismo @ ⇒ mismo aspecto, en cualquier barrio y en cualquier sesión.
 */
import { Rng } from '../utils/random';

export type HairStyle = 'short' | 'long' | 'bun' | 'bald' | 'mohawk' | 'curly';
export type TopStyle = 'tshirt' | 'hoodie' | 'jacket' | 'dress';
export type Accessory = 'none' | 'glasses' | 'cap' | 'hat' | 'headphones' | 'scarf' | 'beanie' | 'backpack';

export interface Appearance {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  top: number;
  topStyle: TopStyle;
  bottom: number;
  shoes: number;
  accessory: Accessory;
  accessoryColor: number;
}

const SKINS = [0xf9dcc4, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5c3a21, 0xffe0bd];
const HAIRS = [0x1b1b1b, 0x3b2a1a, 0x6b4423, 0xa0522d, 0xd4a017, 0xe8d8a0, 0x9e9e9e, 0xb5442f, 0x5b3fa0, 0x2e86de];
const TOPS = [
  0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0x6a4c93, 0xffffff, 0x222222, 0x8ac926, 0xff595e, 0x1982c4, 0xffca3a, 0x7d8597,
];
const BOTTOMS = [0x1d3557, 0x2b2d42, 0x3d405b, 0x5c4033, 0x6c757d, 0x111111, 0x8d99ae, 0x264653];
const SHOES = [0x111111, 0xffffff, 0x6b4423, 0xd62828, 0x3a86ff];

export function appearanceFromSeed(seed: number): Appearance {
  const rng = new Rng(seed ^ 0x5eed);
  return {
    skin: rng.pick(SKINS),
    hair: rng.pick(HAIRS),
    hairStyle: rng.pick(['short', 'short', 'long', 'bun', 'bald', 'mohawk', 'curly'] as const),
    top: rng.pick(TOPS),
    topStyle: rng.pick(['tshirt', 'tshirt', 'hoodie', 'jacket', 'dress'] as const),
    bottom: rng.pick(BOTTOMS),
    shoes: rng.pick(SHOES),
    accessory: rng.pick([
      'none',
      'none',
      'glasses',
      'cap',
      'hat',
      'headphones',
      'scarf',
      'beanie',
      'backpack',
    ] as const),
    accessoryColor: rng.pick(TOPS),
  };
}

/** Aspecto fijo del jugador: chubasquero amarillo para distinguirlo siempre. */
export const PLAYER_APPEARANCE: Appearance = {
  skin: 0xf1c27d,
  hair: 0x3b2a1a,
  hairStyle: 'short',
  top: 0xffc300,
  topStyle: 'hoodie',
  bottom: 0x1d3557,
  shoes: 0xffffff,
  accessory: 'backpack',
  accessoryColor: 0x2a9d8f,
};
