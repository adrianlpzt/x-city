/**
 * Todos los parámetros "afinables" del proyecto en un único sitio.
 * Si quieres cambiar el comportamiento del juego, empieza por aquí.
 */
export const CONFIG = {
  /** Semilla global del mundo. Misma semilla = misma ciudad. */
  seed: 20261008,

  world: {
    /** Tamaño de un tile en píxeles. */
    tileSize: 32,
    /** Tiles por lado de cada chunk (16x16 tiles de 32px = 512px). */
    chunkTiles: 16,
    /** Chunks extra que se cargan alrededor de lo que ve la cámara. */
    loadMargin: 1,
    /** A partir de cuántos chunks fuera de la vista se descarga uno (> loadMargin, para no cargar/descargar en bucle). */
    unloadMargin: 2,
    /** Máximo de chunks que se generan por frame (evita tirones al caminar rápido). */
    maxBuildsPerFrame: 1,
    /** Probabilidad de que una manzana sea una plaza/parque. */
    plazaChance: 0.14,
    /** Probabilidad de que una manzana sea el edificio emblemático del barrio. */
    landmarkChance: 0.08,
  },

  player: {
    walkSpeed: 150, // px/s
    runSpeed: 270, // px/s con Shift
    /** Cuánto tarda en alcanzar la velocidad objetivo (mayor = más brusco). */
    acceleration: 12,
    /** Caja de colisión en los pies del personaje. */
    colliderWidth: 18,
    colliderHeight: 10,
    /** Si choca con una esquina y el solape es menor que esto, lo "empuja" para que se deslice. */
    cornerSlide: 10,
  },

  camera: {
    /** Suavizado del seguimiento (0..1, menor = más suave). */
    lerp: 0.12,
  },

  npc: {
    /** NPCs que se intentan mantener vivos a la vez. */
    target: 30,
    /** Tamaño del pool (máximo absoluto de NPCs). */
    max: 40,
    speedMin: 28,
    speedMax: 72,
    /** Radio alrededor del jugador donde pueden aparecer NPCs. */
    spawnRadius: 1100,
    /** Distancia a partir de la cual un NPC fuera de cámara se recicla. */
    despawnRadius: 1450,
    /** Margen fuera de cámara (px) para considerar "fuera de pantalla" al aparecer/desaparecer. */
    offscreenMargin: 80,
    /** Cada cuántos ms se revisa el spawn/despawn (no hace falta cada frame). */
    managerIntervalMs: 250,
    /** Probabilidad de pararse al llegar a una esquina. */
    idleChanceAtNode: 0.25,
    /** Probabilidad (por segundo) de pararse en mitad de la acera. */
    idleChancePerSecond: 0.04,
    /** Probabilidad de cruzar la calle cuando la opción existe (relativa). */
    crossingWeight: 0.55,
    /** Probabilidad de ponerse a charlar con un vecino cercano al pararse. */
    chatChance: 0.5,
  },

  bubble: {
    /** Radio al que se abre el bocadillo. */
    openRadius: 120,
    /** Radio al que se cierra (algo mayor que el de apertura para evitar parpadeos). */
    closeRadius: 145,
    /** Bocadillos completos abiertos a la vez. */
    maxOpen: 3,
    /** Burbujas minimizadas ("…") como máximo. */
    maxMinimized: 8,
    /** Radio en el que se muestran burbujas minimizadas. */
    minimizedRadius: 260,
    /** Ancho máximo del bocadillo en px. */
    maxWidth: 290,
  },

  tweets: {
    /** Si la cola baja de este número, se piden más al proveedor. */
    lowWater: 12,
    /** Tweets por página en el proveedor simulado. */
    pageSize: 20,
    /** Latencia simulada del proveedor mock (ms). */
    mockLatencyMin: 200,
    mockLatencyMax: 600,
    /** Espera antes de reintentar si el proveedor falla. */
    retryDelayMs: 5000,
  },

  ui: {
    /** Tiempo que la ayuda de controles permanece visible al empezar. */
    helpVisibleMs: 7000,
    /** Duración del fundido al cambiar de barrio. */
    transitionMs: 350,
  },
} as const;

/** Tamaño de un chunk en píxeles (derivado). */
export const CHUNK_SIZE = CONFIG.world.tileSize * CONFIG.world.chunkTiles;
