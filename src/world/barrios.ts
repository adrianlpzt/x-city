/**
 * Barrios = timelines temáticos. Cada barrio define su identidad visual:
 * paleta, rótulos de tiendas, mobiliario urbano y edificio emblemático.
 *
 * Para añadir un barrio nuevo:
 *  1. Añade su id a BARRIO_IDS.
 *  2. Añade su tema en BARRIOS (TypeScript te avisará si falta).
 *  3. Añade sus tweets en src/data/mockData.ts.
 */

export const BARRIO_IDS = [
  'politica',
  'futbol',
  'tecnologia',
  'ciberseguridad',
  'musica',
  'cine',
  'humor',
  'noticias',
] as const;

export type BarrioId = (typeof BARRIO_IDS)[number];

export function isBarrioId(value: string): value is BarrioId {
  return (BARRIO_IDS as readonly string[]).includes(value);
}

/** Mobiliario urbano disponible. Se dibuja por código en world/decorTextures.ts. */
export type DecorKind =
  | 'lamp'
  | 'tree'
  | 'bench'
  | 'bin'
  | 'planter'
  | 'hydrant'
  | 'flag'
  | 'podium'
  | 'pennant'
  | 'poster'
  | 'neon'
  | 'screen'
  | 'server'
  | 'antenna'
  | 'cctv'
  | 'speaker'
  | 'spotlight'
  | 'kiosk'
  | 'balloons';

/**
 * Dónde se coloca cada elemento en la acera:
 *  - 'road': en el bordillo, junto a la calzada (farolas, árboles...).
 *  - 'wall': pegado a la fachada (bancos, papeleras, quioscos...).
 */
export const DECOR_PLACEMENT: Record<DecorKind, 'road' | 'wall'> = {
  lamp: 'road',
  tree: 'road',
  hydrant: 'road',
  flag: 'road',
  pennant: 'road',
  poster: 'road',
  neon: 'road',
  screen: 'road',
  antenna: 'road',
  cctv: 'road',
  spotlight: 'road',
  balloons: 'road',
  bench: 'wall',
  bin: 'wall',
  planter: 'wall',
  podium: 'wall',
  server: 'wall',
  speaker: 'wall',
  kiosk: 'wall',
};

export type LandmarkKind =
  | 'parlamento'
  | 'estadio'
  | 'torre'
  | 'datacenter'
  | 'auditorio'
  | 'cine'
  | 'carpa'
  | 'televisora';

export type RooftopExtra = 'ac' | 'antenna' | 'solar' | 'dish' | 'flagpole' | 'tank' | 'garden';

export interface BarrioTheme {
  id: BarrioId;
  name: string;
  icon: string;
  /** Color característico (menú, HUD, marcador del jugador). */
  accent: number;
  /** Fondo de la cámara (lo que se ve mientras se generan chunks). */
  background: number;
  dark: boolean;

  ground: number;
  road: number;
  roadLine: number;
  crosswalk: number;
  sidewalk: number;
  sidewalkLine: number;
  curb: number;
  lot: number;
  grass: number;
  grassDark: number;
  path: number;

  facades: number[];
  roofs: number[];
  trims: number[];
  window: number;
  windowLit: number;
  /** Probabilidad de ventana iluminada. */
  litChance: number;
  door: number;

  signBg: number[];
  signText: string;
  shopNames: string[];
  awnings: number[];

  decor: Partial<Record<DecorKind, number>>;
  decorDensity: number;
  lampColor: number;
  lampLight: number;
  /** Colores "temáticos" para banderas, carteles, neones, etc. */
  props: number[];

  rooftop: Partial<Record<RooftopExtra, number>>;
  landmark: LandmarkKind;
  landmarkName: string;
  carColors: number[];
}

const COMMON_CARS = [0xd94848, 0x3b82f6, 0xf2f2f2, 0x2b2b2b, 0x9ca3af, 0x16a34a, 0xf59e0b];

export const BARRIOS: Record<BarrioId, BarrioTheme> = {
  politica: {
    id: 'politica',
    name: 'Política',
    icon: '🏛️',
    accent: 0x3b6fd8,
    background: 0x58544c,
    dark: false,
    ground: 0x9a9384,
    road: 0x4a4a50,
    roadLine: 0xf2f2f2,
    crosswalk: 0xf4f4f4,
    sidewalk: 0xcfc8b8,
    sidewalkLine: 0xb9b19f,
    curb: 0x8f887a,
    lot: 0xb5ad9c,
    grass: 0x6f9a52,
    grassDark: 0x5c8444,
    path: 0xd8cfb9,
    facades: [0xe8dcc4, 0xd9c7a3, 0xc9b28a, 0xe3d5b8, 0xbfae95, 0xf0e6d2],
    roofs: [0x8a5a44, 0x6e4a3a, 0x9c6b4e, 0x5b5e66],
    trims: [0xf7f1e3, 0x8c7b62, 0x5a4a3a],
    window: 0x3f5468,
    windowLit: 0xf1d58a,
    litChance: 0.15,
    door: 0x5a3a28,
    signBg: [0x1f3a5f, 0x7a1f2b, 0x2e4d2e],
    signText: '#f7f1e3',
    shopNames: [
      'Café Escaño',
      'Imprenta El Decreto',
      'Bar La Moción',
      'Papelería El Voto',
      'Gestoría Urna',
      'Librería Debate',
      'Bar Hemiciclo',
      'Asesoría Pacto',
    ],
    awnings: [0x1f3a5f, 0x7a1f2b, 0x2e4d2e],
    decor: { tree: 3, bench: 2, bin: 1, flag: 3, podium: 1, planter: 2, hydrant: 1 },
    decorDensity: 0.6,
    lampColor: 0x2b2b2b,
    lampLight: 0xffe6a0,
    props: [0x1f3a5f, 0x7a1f2b, 0xe8c547, 0xf7f1e3],
    rooftop: { flagpole: 2, ac: 2, tank: 1 },
    landmark: 'parlamento',
    landmarkName: 'PARLAMENTO',
    carColors: [0x1f2937, 0x111111, 0x374151, 0xe5e7eb, 0x7a1f2b],
  },

  futbol: {
    id: 'futbol',
    name: 'Fútbol',
    icon: '⚽',
    accent: 0x22a55a,
    background: 0x4d6b3b,
    dark: false,
    ground: 0x7aa35a,
    road: 0x3d4148,
    roadLine: 0xffffff,
    crosswalk: 0xffffff,
    sidewalk: 0xd6d2c8,
    sidewalkLine: 0xbfbab0,
    curb: 0x8e8a80,
    lot: 0xb8b29f,
    grass: 0x4caf50,
    grassDark: 0x3f9643,
    path: 0xe7dfc8,
    facades: [0xf3e6c8, 0xe9b872, 0xf0d9a4, 0xd8a47f, 0xfafafa, 0xe7c9a0],
    roofs: [0xb5452f, 0xa13d2a, 0x8c3a2a, 0x6b4f3a],
    trims: [0xffffff, 0x0b6e3a, 0xc8102e],
    window: 0x35556b,
    windowLit: 0xffe08a,
    litChance: 0.2,
    door: 0x6b3d24,
    signBg: [0x0b6e3a, 0xc8102e, 0x1d3f8f],
    signText: '#ffffff',
    shopNames: [
      'Bar El Larguero',
      'Peña Los Almendros',
      'Deportes Gol',
      'Taberna Prórroga',
      'Bar El Córner',
      'Asador El Penalti',
      'Cervecería VAR',
      'Kiosco Fichaje',
    ],
    awnings: [0x0b6e3a, 0xc8102e, 0xf5c518],
    decor: { pennant: 3, bench: 2, bin: 2, tree: 2, poster: 2, kiosk: 1, hydrant: 1 },
    decorDensity: 0.6,
    lampColor: 0x2f3b2f,
    lampLight: 0xfff3b0,
    props: [0x0b6e3a, 0xc8102e, 0xf5c518, 0xffffff, 0x1d3f8f],
    rooftop: { ac: 2, antenna: 2, flagpole: 1, tank: 1 },
    landmark: 'estadio',
    landmarkName: 'ESTADIO',
    carColors: COMMON_CARS,
  },

  tecnologia: {
    id: 'tecnologia',
    name: 'Tecnología',
    icon: '💻',
    accent: 0x00b8ff,
    background: 0x2a3140,
    dark: false,
    ground: 0x5d6675,
    road: 0x2a2e36,
    roadLine: 0x7dd3fc,
    crosswalk: 0xe0f2fe,
    sidewalk: 0xb7c0cc,
    sidewalkLine: 0xa3adbb,
    curb: 0x6b7480,
    lot: 0x8792a2,
    grass: 0x5fae7a,
    grassDark: 0x4d9667,
    path: 0xcfd7e1,
    facades: [0x8fb8d8, 0x6fa3c7, 0xa9c9e2, 0xd9e4ee, 0x7f93a8, 0xbcd4e6],
    roofs: [0x4d5866, 0x3f4a57, 0x5f6b7a, 0x2f3a46],
    trims: [0xe2e8f0, 0x94a3b8, 0x334155],
    window: 0x2a4d6e,
    windowLit: 0x9ff3ff,
    litChance: 0.35,
    door: 0x1e293b,
    signBg: [0x111827, 0x6d28d9, 0x0ea5e9],
    signText: '#a5f3fc',
    shopNames: [
      'Café Bytes',
      'Coworking Nube',
      'Repara-Móvil',
      'Startup & Co',
      'Bar Kernel',
      'Hub 404',
      'Tienda Píxel',
      'Laboratorio IA',
    ],
    awnings: [0x0ea5e9, 0x6d28d9, 0x111827],
    decor: { neon: 2, screen: 3, bench: 1, planter: 2, bin: 1, tree: 1 },
    decorDensity: 0.6,
    lampColor: 0xcbd5e1,
    lampLight: 0xbff7ff,
    props: [0x00e5ff, 0xff2bd6, 0x8b5cf6, 0x22d3ee, 0xfacc15],
    rooftop: { solar: 3, antenna: 2, ac: 2 },
    landmark: 'torre',
    landmarkName: 'TORRE NUBE',
    carColors: [0xf8fafc, 0x0f172a, 0x64748b, 0x38bdf8, 0xe2e8f0],
  },

  ciberseguridad: {
    id: 'ciberseguridad',
    name: 'Ciberseguridad',
    icon: '🛡️',
    accent: 0x39ff88,
    background: 0x050806,
    dark: true,
    ground: 0x0d1410,
    road: 0x111a14,
    roadLine: 0x2bff88,
    crosswalk: 0x1f6b3f,
    sidewalk: 0x1e2a22,
    sidewalkLine: 0x2a3a2f,
    curb: 0x0a0f0c,
    lot: 0x141c17,
    grass: 0x16351f,
    grassDark: 0x112a18,
    path: 0x23332a,
    facades: [0x1b2620, 0x22302a, 0x18201c, 0x2a3530, 0x202b26],
    roofs: [0x0f1612, 0x121b16, 0x19231d, 0x0b100d],
    trims: [0x39ff88, 0x1f6b3f, 0x0a0f0c],
    window: 0x0c2416,
    windowLit: 0x39ff88,
    litChance: 0.4,
    door: 0x060a08,
    signBg: [0x000000, 0x07140c],
    signText: '#39ff88',
    shopNames: [
      'root@bar',
      'Café Hash',
      'SOC 24/7',
      'Ciber-Kebab',
      'Bar Firewall',
      '0day Copias',
      'Tienda Honeypot',
      'Cerrajería SSH',
    ],
    awnings: [0x07140c, 0x1f6b3f],
    decor: { server: 3, screen: 2, antenna: 1, cctv: 3, bin: 1 },
    decorDensity: 0.55,
    lampColor: 0x1a2a20,
    lampLight: 0x39ff88,
    props: [0x39ff88, 0x00ff41, 0x1f6b3f, 0xff3b3b],
    rooftop: { dish: 3, antenna: 3, ac: 1 },
    landmark: 'datacenter',
    landmarkName: 'DATA CENTER',
    carColors: [0x0a0a0a, 0x1f2937, 0x14532d, 0x111827],
  },

  musica: {
    id: 'musica',
    name: 'Música',
    icon: '🎵',
    accent: 0xf15bb5,
    background: 0x3a2b40,
    dark: false,
    ground: 0x6b4e71,
    road: 0x2f2a3a,
    roadLine: 0xffe066,
    crosswalk: 0xfff3c4,
    sidewalk: 0xd8c8e0,
    sidewalkLine: 0xc3b2cc,
    curb: 0x7f6a8a,
    lot: 0x9f88a8,
    grass: 0x6aa86b,
    grassDark: 0x58925a,
    path: 0xe9dcef,
    facades: [0xf2a65a, 0xe76f51, 0xf4d35e, 0x9b5de5, 0xf15bb5, 0x00bbf9],
    roofs: [0x3d2c4f, 0x5a3e6e, 0x2b2440, 0x4a3060],
    trims: [0xffffff, 0x2b2440, 0xffe066],
    window: 0x2b2440,
    windowLit: 0xffe066,
    litChance: 0.3,
    door: 0x2b2440,
    signBg: [0x2b2440, 0xf15bb5, 0x00bbf9],
    signText: '#ffe066',
    shopNames: [
      'Discos Mandarina',
      'Sala El Sótano',
      'Guitarras Paco',
      'Bar La Corchea',
      'Ensayos 24h',
      'Vinilos Lola',
      'Karaoke El Gallo',
      'Escuela Do Re Mi',
    ],
    awnings: [0xf15bb5, 0x00bbf9, 0xffe066, 0x9b5de5],
    decor: { speaker: 3, poster: 3, tree: 2, bench: 1, bin: 1 },
    decorDensity: 0.6,
    lampColor: 0x2b2440,
    lampLight: 0xffd6f0,
    props: [0xf15bb5, 0x00bbf9, 0xffe066, 0x9b5de5, 0xf2a65a],
    rooftop: { ac: 2, antenna: 1, garden: 1, tank: 1 },
    landmark: 'auditorio',
    landmarkName: 'AUDITORIO',
    carColors: [0x9b5de5, 0xf15bb5, 0x00bbf9, 0x2b2440, 0xf4d35e],
  },

  cine: {
    id: 'cine',
    name: 'Cine',
    icon: '🎬',
    accent: 0xffc145,
    background: 0x221a1a,
    dark: false,
    ground: 0x3b3030,
    road: 0x262222,
    roadLine: 0xffd27a,
    crosswalk: 0xf5e6c8,
    sidewalk: 0xc9b9a6,
    sidewalkLine: 0xb3a28e,
    curb: 0x6e5f50,
    lot: 0x7a6656,
    grass: 0x5f7f4a,
    grassDark: 0x4f6c3c,
    path: 0xdccbb6,
    facades: [0x8b2f2f, 0xc79b5b, 0x5b3a29, 0xe3c58e, 0x6d2e46, 0xa8553a],
    roofs: [0x2a1d1d, 0x3a2626, 0x4a2f2f, 0x1f1717],
    trims: [0xffd27a, 0x1a1010, 0xf5e6c8],
    window: 0x2a1d1d,
    windowLit: 0xffd27a,
    litChance: 0.3,
    door: 0x1a1010,
    signBg: [0x1a1010, 0xb3261e, 0x2a1d1d],
    signText: '#ffd27a',
    shopNames: [
      'Videoclub Rebobina',
      'Palomitas Sol',
      'Bar Claqueta',
      'Cineclub Fotograma',
      'Tienda Póster',
      'Bar El Guion',
      'Café Tráiler',
      'Atrezzo Martín',
    ],
    awnings: [0xb3261e, 0x1a1010, 0xffc145],
    decor: { poster: 3, spotlight: 2, kiosk: 1, bench: 2, bin: 1 },
    decorDensity: 0.55,
    lampColor: 0x1a1010,
    lampLight: 0xffe2a8,
    props: [0xffc145, 0xb3261e, 0xf5e6c8, 0x1a1010],
    rooftop: { ac: 2, antenna: 1, tank: 2 },
    landmark: 'cine',
    landmarkName: 'CINE ODEÓN',
    carColors: [0x1a1010, 0xb3261e, 0xe3c58e, 0x5b3a29, 0xf5e6c8],
  },

  humor: {
    id: 'humor',
    name: 'Humor',
    icon: '😂',
    accent: 0xffd93d,
    background: 0x5fa597,
    dark: false,
    ground: 0x8fd1c2,
    road: 0x4a4f63,
    roadLine: 0xffd93d,
    crosswalk: 0xffffff,
    sidewalk: 0xfff1d6,
    sidewalkLine: 0xf1dfbd,
    curb: 0xc9b48c,
    lot: 0xe8d9b5,
    grass: 0x7bd389,
    grassDark: 0x66c174,
    path: 0xfff6e4,
    facades: [0xffd6e0, 0xffef9f, 0xc1fba4, 0x9bf6ff, 0xbdb2ff, 0xffc6ff],
    roofs: [0xff6b6b, 0x4d96ff, 0xffd93d, 0x6bcb77],
    trims: [0xffffff, 0xff6b6b, 0x4d96ff],
    window: 0x4d96ff,
    windowLit: 0xfff3a8,
    litChance: 0.2,
    door: 0xff6b6b,
    signBg: [0xff6b6b, 0x4d96ff, 0x6bcb77],
    signText: '#ffffff',
    shopNames: [
      'Chistes al Peso',
      'Bar Chascarrillo',
      'Tienda de Bromas',
      'Club de la Risa',
      'Pelucas Locas',
      'Café Ja Ja',
      'Globos Pepe',
      'Academia del Meme',
    ],
    awnings: [0xff6b6b, 0x4d96ff, 0xffd93d, 0x6bcb77],
    decor: { balloons: 3, poster: 2, bench: 2, tree: 2, hydrant: 1 },
    decorDensity: 0.6,
    lampColor: 0x4d96ff,
    lampLight: 0xfff3a8,
    props: [0xff6b6b, 0x4d96ff, 0xffd93d, 0x6bcb77, 0xbdb2ff],
    rooftop: { ac: 1, garden: 2, tank: 1 },
    landmark: 'carpa',
    landmarkName: 'CARPA DE LA RISA',
    carColors: [0xff6b6b, 0x4d96ff, 0xffd93d, 0x6bcb77, 0xbdb2ff],
  },

  noticias: {
    id: 'noticias',
    name: 'Noticias',
    icon: '📰',
    accent: 0xef233c,
    background: 0x5d6678,
    dark: false,
    ground: 0x8d99ae,
    road: 0x3a3f4b,
    roadLine: 0xffffff,
    crosswalk: 0xf8f9fa,
    sidewalk: 0xdfe3ea,
    sidewalkLine: 0xc9ced8,
    curb: 0x8a92a0,
    lot: 0xb5bdca,
    grass: 0x74a57f,
    grassDark: 0x62916d,
    path: 0xedf0f4,
    facades: [0xedf2f4, 0xd5dbe3, 0xbcc6d3, 0xf4efe6, 0xa9b5c4],
    roofs: [0x2b2d42, 0x3d405b, 0x4a4e69, 0x22223b],
    trims: [0xffffff, 0xef233c, 0x2b2d42],
    window: 0x3d405b,
    windowLit: 0xfff1c1,
    litChance: 0.25,
    door: 0x2b2d42,
    signBg: [0xd90429, 0x2b2d42, 0x1d4ed8],
    signText: '#ffffff',
    shopNames: [
      'Quiosco Portada',
      'Imprenta Rotativa',
      'Bar La Exclusiva',
      'Café Titular',
      'Prensa y Revistas',
      'Agencia Teletipo',
      'Bar El Directo',
      'Copias Boletín',
    ],
    awnings: [0xd90429, 0x2b2d42, 0x1d4ed8],
    decor: { kiosk: 3, screen: 2, bench: 2, bin: 2, tree: 2 },
    decorDensity: 0.6,
    lampColor: 0x2b2d42,
    lampLight: 0xfff1c1,
    props: [0xef233c, 0x2b2d42, 0xffffff, 0x1d4ed8],
    rooftop: { antenna: 2, dish: 2, ac: 2 },
    landmark: 'televisora',
    landmarkName: 'CANAL 24H',
    carColors: COMMON_CARS,
  },
};
