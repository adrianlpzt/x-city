# 🏙️ X City

Una forma curiosa de leer X (Twitter): caminas por una ciudad infinita generada por código y los tweets de tu feed pasean por la calle como vecinos. Cada vecino es el **autor** del tweet; acércate y te lo "cuenta" en un bocadillo.

Es una **experiencia de lectura**, no un juego: no hay likes, respuestas ni publicación. Solo leer.

---

## 1. Arrancar

Requisitos: **Node.js 22.12 o superior** (lo exige Vite 7) y npm.

```bash
npm install
npm run dev          # abre http://localhost:5173
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm test` | Tests unitarios (determinismo del mundo, datos mock, proveedores, colisión…) |
| `npm run typecheck` | Comprobación de tipos de TypeScript |
| `npm run build` | Comprueba tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` para probar el build |

Truco: puedes entrar directamente en un barrio con `http://localhost:5173/?barrio=futbol`
(ids: `politica`, `futbol`, `tecnologia`, `ciberseguridad`, `musica`, `cine`, `humor`, `noticias`).

### Controles

| Tecla | Acción |
|---|---|
| WASD / flechas | Caminar |
| Shift | Correr |
| M | Menú de barrios (↑/↓ + Enter, o números 1-8; Esc cierra) |
| H | Mostrar/ocultar la ayuda |
| F3 | Modo debug (FPS, chunks, NPCs, cola de tweets, cajas de colisión) |

---

## 2. Cómo está organizado

```
src/
├── config.ts              ← TODOS los parámetros afinables (empieza aquí)
├── main.ts                ← crea el juego de Phaser
├── scenes/CityScene.ts    ← "director de orquesta": une todo y gestiona el cambio de barrio
├── world/                 ← la ciudad
│   ├── layout.ts          ← trazado de calles y red de aceras (lógica pura)
│   ├── barrios.ts         ← temas visuales de cada barrio
│   ├── ChunkGenerator.ts  ← qué hay en cada chunk (DATOS puros, deterministas)
│   ├── ChunkRenderer.ts   ← cómo se dibuja un chunk (Phaser)
│   ├── landmarks.ts       ← edificios emblemáticos (estadio, parlamento…)
│   ├── decorTextures.ts   ← farolas, árboles, bancos, coches… dibujados por código
│   └── WorldManager.ts    ← carga/descarga chunks y responde a colisiones
├── entities/              ← personajes
│   ├── appearance.ts      ← aspecto a partir del hash del @
│   ├── characterTextures.ts / CharacterSprite.ts ← dibujo y animación
│   ├── Player.ts
│   └── Npc.ts
├── systems/               ← lógica que mueve el mundo
│   ├── NpcManager.ts      ← spawn/despawn, pooling y qué bocadillos abrir
│   ├── NpcPath.ts         ← decisiones de ruta en las esquinas
│   ├── Collision.ts       ← colisión AABB con deslizamiento
│   └── InputController.ts
├── data/                  ← tweets
│   ├── types.ts           ← interfaces Tweet / TweetProvider
│   ├── mockData.ts        ← 40 usuarios y ~26 tweets por barrio (ficticios)
│   ├── MockTweetProvider.ts
│   ├── XTweetProvider.ts  ← stub del proveedor real (desactivado)
│   ├── providerFactory.ts ← elige proveedor según VITE_TWEET_SOURCE
│   └── TweetQueue.ts      ← cola por barrio, sin repetidos
└── ui/                    ← capa HTML encima del canvas
    ├── Menu.ts, Hud.ts, DebugOverlay.ts
    ├── BubbleLayer.ts     ← bocadillos (texto plano, nunca HTML)
    └── styles.css
tests/                     ← tests con Vitest (no necesitan navegador)
```

### Flujo de un frame

```
teclado → Player (velocidad + colisión) → WorldManager (carga chunks que faltan,
descarga lejanos, oculta los que no se ven) → NpcManager (mueve NPCs, recicla
los lejanos, crea nuevos delante, decide bocadillos) → HUD / debug
```

### Ideas clave (por si vienes de Python)

- **Separar datos de dibujo.** `ChunkGenerator` es una función pura: recibe `(cx, cy, barrio, semilla)` y devuelve un objeto con edificios, mobiliario, coches y rectángulos de colisión. No sabe nada de Phaser. Por eso se puede testear con Vitest como testearías una función con pytest. `ChunkRenderer` solo convierte esos datos en imágenes.
- **Determinismo.** Nunca se usa `Math.random()` para el mundo: se usa `mulberry32` sembrado con `hash(semilla, barrio, cx, cy)`. Mismo chunk ⇒ misma calle, aunque lo descargues y vuelvas.
- **"Hornear" en texturas.** El suelo de cada chunk y cada fila de edificios se dibujan una vez en una `RenderTexture`. Phaser luego pinta unas pocas imágenes por chunk en vez de miles de rectángulos por frame.
- **Profundidad 3/4.** Todo lo que está de pie usa `depth = y de su base`. Quien está más abajo en pantalla tapa a quien está detrás. Si caminas por detrás de un edificio, este se vuelve semitransparente.
- **Object pooling.** Los NPCs no se crean ni destruyen: se activan con un tweet nuevo y vuelven al pool cuando quedan lejos.

---

## 3. El mundo

Cada **chunk** mide 16×16 tiles de 32 px (512 px). Todos tienen la misma estructura, lo que hace que las calles encajen solas al ponerlos juntos:

```
tiles 0-3   calzada (con su paso de cebra en la prolongación de cada acera)
tiles 4-5   acera
tiles 6-13  manzana: edificios (~78%), plaza (~14%) o edificio emblemático (~8%)
tiles 14-15 acera
```

- El chunk `(0,0)` siempre tiene edificios (ahí apareces) y el `(1,0)` siempre el edificio emblemático del barrio, para que su identidad se vea nada más entrar.
- Los chunks se cargan con un margen de 1 alrededor de la cámara (máx. 1 por frame) y se descargan a 2 de distancia (histéresis para no cargar/descargar en bucle).
- **Colisión**: edificios, coches aparcados, fuentes, árboles de plaza y el edificio emblemático. Te deslizas por las paredes y, si rozas una esquina, el juego te empuja para rodearla.

### Barrios

| Barrio | Identidad | Emblemático |
|---|---|---|
| 🏛️ Política | piedra y tejas, banderas, atriles | Parlamento con cúpula |
| ⚽ Fútbol | banderines, bares de peña, tonos verdes | Estadio con focos |
| 💻 Tecnología | cristal, neones, pantallas | Torre de cristal |
| 🛡️ Ciberseguridad | oscuro, verde terminal, racks y cámaras | Data center |
| 🎵 Música | colores vivos, altavoces, carteles | Auditorio de cubierta ondulada |
| 🎬 Cine | rojos y dorados, focos, mupis | Cine art déco con marquesina |
| 😂 Humor | pasteles, globos | Carpa de circo |
| 📰 Noticias | grises editoriales, quioscos, pantallas | Televisión con antena |

---

## 4. Tweets: proveedor y cola

El juego solo conoce esta interfaz (`src/data/types.ts`):

```ts
interface TweetProvider {
  getTweets(barrio: BarrioId, cursor?: string): Promise<{ tweets: Tweet[]; nextCursor?: string }>;
}
```

- **`MockTweetProvider`** (por defecto): 40 usuarios inventados y ~26 tweets por barrio en español. Simula latencia (200-600 ms) y paginación. Cuando se acaban los originales genera "rondas" de **retuits** de otros vecinos del barrio (con id nuevo), así la ciudad nunca se vacía y ningún id se repite.
- **`XTweetProvider`** (stub): el código de la llamada a `/api/timeline` y la validación de la respuesta ya están escritos, pero lanza `ProviderNotImplementedError` mientras `IMPLEMENTED = false`.
- **`TweetQueue`**: una por barrio (se conservan al cambiar). Cada NPC hace `take()`. Si quedan menos de `lowWater`, pide otra página. Lleva un `Set` de ids vistos: **un tweet no se muestra dos veces en la sesión**. Si el proveedor falla, avisa al HUD y reintenta a los 5 s.

Cambiar de fuente: copia `.env.example` a `.env` y pon `VITE_TWEET_SOURCE=x`. La ciudad funciona igual, sin vecinos, y aparece un aviso claro arriba.

**Seguridad:** el texto de los tweets se pinta siempre con `textContent` (nunca `innerHTML`), y `parseTimelineResponse` valida tipos y longitudes de lo que llegue del backend. Un tweet con `<img onerror=…>` se ve literalmente. Hay un test que lo comprueba.

---

## 5. Backend futuro (Python/Flask)

El navegador **nunca** debe tener el token de X: cualquiera lo sacaría de las DevTools. El backend hace de proxy:

```
navegador ──GET /api/timeline?barrio=futbol&cursor=…──▶ Flask ──(token)──▶ API de X
          ◀────────────── JSON ya normalizado ───────── caché por barrio
```

### Contrato que espera el frontend

`GET /api/timeline?barrio=<id>&cursor=<opaco>` → `200 application/json`

```json
{
  "tweets": [
    {
      "id": "1849…",
      "author": { "handle": "usuario", "name": "Nombre", "verified": true },
      "text": "texto plano",
      "createdAt": "2026-10-08T10:00:00Z",
      "likes": 12,
      "retweets": 3,
      "media": "image"
    }
  ],
  "nextCursor": "token-de-paginación-o-ausente"
}
```

`media` es opcional (`"image"` | `"video"`). Si falta `nextCursor`, el frontend entiende que no hay más páginas.

### Esqueleto orientativo

```python
# app.py — boceto, no probado contra la API real
import os, time
from flask import Flask, jsonify, request, abort

app = Flask(__name__)
BEARER = os.environ["X_BEARER_TOKEN"]          # nunca en el repo ni en el frontend
CACHE_TTL = 300                                 # 5 min: cada lectura a X cuesta dinero
BARRIOS = {"futbol": "<id de Lista de X>", "politica": "<id>", ...}
_cache: dict[tuple[str, str], tuple[float, dict]] = {}

@app.get("/api/timeline")
def timeline():
    barrio = request.args.get("barrio", "")
    cursor = request.args.get("cursor", "")[:512]
    if barrio not in BARRIOS:                   # lista blanca: nada de ids arbitrarios
        abort(400)
    key = (barrio, cursor)
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_TTL:
        return jsonify(hit[1])
    data = fetch_from_x(BARRIOS[barrio], cursor)   # TODO: requests + normalizar al contrato
    _cache[key] = (time.time(), data)
    return jsonify(data)
```

Recomendaciones:

- **Caché en servidor** con TTL de varios minutos por `(barrio, cursor)`; con varios usuarios, todos comparten la misma lectura. En producción, Redis en vez de un `dict`.
- **Barrio → Lista de X** es lo más natural (una Lista curada por tema). Revisa en la documentación actual de la API de X qué endpoints, límites y precios aplican a tu plan antes de diseñar el mapeo.
- **Rate limit propio** (p. ej. `flask-limiter`) para que nadie vacíe tu saldo de la API martilleando `/api/timeline`.
- **Normaliza y sanea en el servidor** (solo los campos del contrato) y vuelve a validar en el cliente (ya hecho en `parseTimelineResponse`).
- En desarrollo, descomenta el `proxy` de `vite.config.ts` para que `/api` vaya a `http://127.0.0.1:5000` sin CORS. En producción, sirve `dist/` y la API desde el mismo dominio.

Para activar el proveedor real: `IMPLEMENTED = true` en `src/data/XTweetProvider.ts` y `VITE_TWEET_SOURCE=x`.

---

## 6. Despliegue (Railway)

En producción: **https://web-production-47aa4.up.railway.app**

- Railway está conectado al repo `adrianlpzt/x-city`: **cada push a `main` se despliega solo**.
- `railway.json` define build (`npm run build`), arranque (`npm start` → `server.mjs`) y healthcheck (`/healthz`).
- `server.mjs` es un servidor estático sin dependencias: gzip, caché larga para `/assets/*` (llevan hash), protección contra path traversal y cabeceras de seguridad (CSP estricta, `nosniff`, `DENY` en iframes, `no-referrer`).
- Cuando exista el backend Flask, lo natural es un segundo servicio en el mismo proyecto de Railway con el token de X como variable de entorno, y `connect-src` de la CSP ampliado a su dominio (o servido bajo el mismo).

## 7. Cómo modificar cosas

| Quiero… | Dónde |
|---|---|
| Más/menos NPCs, radios, velocidades, semilla | `src/config.ts` |
| Cambiar colores, rótulos o mobiliario de un barrio | `BARRIOS` en `src/world/barrios.ts` |
| Añadir un barrio | id en `BARRIO_IDS`, tema en `BARRIOS`, tweets en `mockData.ts` (TypeScript avisa de lo que falta) |
| Añadir un tipo de mobiliario | `DecorKind` + `DECOR_PLACEMENT` (barrios.ts) y su dibujo en `decorTextures.ts` |
| Cambiar un edificio emblemático | `landmarks.ts` |
| Más frecuencia de plazas o emblemáticos | `plazaChance` / `landmarkChance` en `config.ts` |
| Cambiar los tweets simulados | `src/data/mockData.ts` (formato `[handle, texto, media?]`) |
| Cambiar el aspecto de los bocadillos | `src/ui/styles.css` (sección Bocadillos) |
| Cambiar cómo eligen ruta los NPCs | `src/systems/NpcPath.ts` |

En el navegador tienes `window.__XCITY__` (el objeto `Phaser.Game`) para trastear desde la consola.

---

## 8. Decisiones tomadas

1. **Ciudad en cuadrícula** (una manzana por chunk) en vez de una sola calle: cumple "caminar en cualquier dirección" y garantiza que las calles conectan siempre. La variedad viene de los edificios, plazas y emblemáticos.
2. **Barrios en "dimensiones" separadas**: cada barrio tiene su propia semilla (`hash(seed, barrio)`) y al cambiar apareces en la misma esquina de partida. No están conectados físicamente (lo permitía el enunciado).
3. **Phaser 3.90** fijado (la última versión de Phaser es la 4; el enunciado pide la 3).
4. **Vite 7 y Vitest 5**: Vite 6 + Vitest 3 traían vulnerabilidades conocidas en dependencias de desarrollo (`npm audit`); con estas versiones el audit sale limpio. Por eso hace falta Node 22.12+.
5. **Bocadillos en HTML, etiquetas en canvas**: los bocadillos (máx. 3 abiertos) ganan nitidez, emojis y animación CSS; las etiquetas de nombre (hasta 40) van en Phaser por rendimiento.
6. **Placement de bocadillos**: si se solapan, se colocan al lado (el pico sigue apuntando al NPC) y, si no cabe, se apilan. Siempre dentro de la pantalla.
7. **"Tweet leído"** = su bocadillo completo se ha abierto al menos una vez.
8. **Retuits como relleno**: el mock, al agotarse, genera retuits con id nuevo en vez de repetir ids, para respetar a la vez "no repetir" y "que la ciudad no se vacíe".
9. **Sin física de Phaser**: colisión AABB propia (más ligera y con el deslizamiento a medida). Los NPCs no colisionan: siguen la red de aceras, que por construcción nunca atraviesa edificios (hay un test).
10. **NPCs con aspecto solo dependiente del @**: así el mismo autor es reconocible en cualquier barrio.
11. **Los nodos de paso** están en el centro de las aceras y los cruces van por los pasos de cebra; los NPCs cruzan algo más deprisa.
12. **Sin audio** en v1 (`noAudio`), lo que además evita avisos del navegador sobre `AudioContext`.
13. Usuarios, ciudades (Villaalegre, Pozoalto), clubes, grupos y películas **inventados**. Los @ son inventados, aunque no puedo garantizar que alguno no coincida por casualidad con una cuenta real.

## 9. Rendimiento

- Culling: los chunks y NPCs fuera de cámara se ocultan; los chunks lejanos se destruyen (texturas incluidas).
- La lógica por frame es barata: en las pruebas la actualización de la escena tarda ~0,2 ms de mediana.
- El coste puntual es generar un chunk (dibujarlo en texturas); por eso se limita a 1 por frame y se cargan con un chunk de margen.
- Medido en el navegador del escritorio con GPU a 1440×900, caminando y generando chunks: **144 FPS** (el límite del monitor) y el peor frame en 7 ms. Si en un equipo modesto no llegas a 60, baja `npc.target` o `world.loadMargin`.

## 10. Ideas para una v2

- **Backend real** en Flask con caché (sección 5) y Listas de X por barrio.
- **Avatares reales**: foto de perfil como "cara" del NPC (vía el backend, para no exponer URLs con tracking).
- **Paseo automático**: el personaje camina solo y se para ante cada vecino; modo "lectura relajada".
- **Sonido ambiente** por barrio (estadio, teclados, vinilos…) y un "pop" suave al abrir bocadillo.
- **Barrios conectados**: transición física entre barrios en lugar de fundido.
- **Hilos**: los tweets de un mismo hilo caminan juntos en fila.
- **Ciclo día/noche** con farolas y ventanas encendidas.
- **Minimapa** y "brújula" hacia el tweet más popular cercano.
- **Accesibilidad**: modo lista alternativo para lectores de pantalla y control por ratón (clic para ir).
- **Móvil**: joystick táctil y bocadillos a pantalla completa.
- **Pixel ratio alto**: render a resolución nativa en pantallas retina (ahora el canvas se ve algo suave en ellas).
