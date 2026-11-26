# Fuse 💣

Puzle web diario en español. Vacía el tablero de bombas con el menor número de toques.
PWA para móvil, sin servidor, sin dependencias ni paso de compilación.

## Reglas
- Tablero 5×5; cada bomba tiene carga 1–3. Tocar una bomba suma 1.
- Al llegar a 4 explota: queda vacía y suma 1 a sus vecinas ocupadas (arriba, abajo, izquierda, derecha).
- Las cadenas se resuelven por oleadas (todas las que llegan a 4 explotan a la vez).
- Vacías y muros no reciben carga. Se gana al vaciar el tablero.

## Elementos (en la práctica)
- 🧊 **Hielo**: el primer impacto solo rompe el hielo.
- 🛡️ **Escudo**: aguanta dos impactos antes de cargarse.
- 🛢️ **Barril**: su explosión alcanza las 8 casillas de alrededor.
- ➡️ **Flecha**: su explosión recorre la línea hasta un muro, cargando cada bomba.
- 🧱 **Muro frágil**: corta cadenas; hay que romperlo con una explosión para ganar.
- ⏱️ **Temporizador**: suma 1 de carga cada 3 toques.

Los retos diarios solo usan bombas normales y muros (así no cambian para nadie).
Los niveles de práctica están en `js/levels.js`, generados con `node tools/make-levels.mjs`.

## Estructura
| Archivo | Qué hace |
|---|---|
| `js/engine.js` | Reglas (toque, oleadas, victoria) |
| `js/solver.js` | Solver óptimo IDA* que calcula el par y una solución |
| `js/daily.js` | Semilla por fecha (`AAAA-MM-DD` local), generador con par 6–9 |
| `js/stats.js` | Racha/estadísticas en `localStorage` y texto para compartir |
| `js/app.js` | Interfaz, animaciones, modos diario y práctica |
| `js/worker.js` | Genera el reto en segundo plano |
| `sw.js`, `manifest.webmanifest` | PWA y modo sin conexión |

## Tests
Requiere Node 18+:

```
npm test
```

## Publicar en GitHub Pages
1. Sube el contenido de esta carpeta a un repositorio.
2. *Settings → Pages → Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. Tras cada cambio, sube la versión de `CACHE` en `sw.js` para que los móviles se actualicen.
   Si cambias el generador, sube también `GEN_VERSION` en `js/app.js` (todos verán el nuevo tablero).

El reto #1 es el 26/11/2026 (`EPOCH` en `js/daily.js`).
