import { dailyPuzzle, randomPractice } from './daily.js';

// { key } -> reto del día; { seed } -> tablero aleatorio de práctica con elementos
self.onmessage = (e) => {
  try {
    const { key, seed } = e.data;
    const puzzle = key ? dailyPuzzle(key) : randomPractice(seed);
    self.postMessage({ ok: true, puzzle });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
