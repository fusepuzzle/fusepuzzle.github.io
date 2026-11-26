// Racha y estadísticas (funciones puras + persistencia en localStorage).
const KEY = 'mecha:stats:v1';

export const emptyStats = () => ({
  played: 0, streak: 0, best: 0, lastDay: null, perfect: 0, history: {},
});

/** Registra la victoria del día `day` (nº de reto). Idempotente por día. */
export function recordWin(stats, day, taps, par, emojis = '') {
  if (stats.history[day]) return stats;
  const s = { ...stats, history: { ...stats.history } };
  s.history[day] = { taps, par, emojis };
  s.played += 1;
  if (taps <= par) s.perfect += 1;
  s.streak = s.lastDay === day - 1 ? s.streak + 1 : 1;
  s.best = Math.max(s.best, s.streak);
  s.lastDay = day;
  return s;
}

/** Racha visible hoy: se rompe si ayer no se jugó. */
export function currentStreak(stats, today) {
  if (stats.lastDay === today || stats.lastDay === today - 1) return stats.streak;
  return 0;
}

export function loadStats(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? { ...emptyStats(), ...JSON.parse(raw) } : emptyStats();
  } catch {
    return emptyStats();
  }
}

export function saveStats(stats, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(stats)); } catch { /* modo privado */ }
}

/** Emoji por toque según el tamaño de la cadena que provocó. */
export function tapEmoji(explosions) {
  if (explosions === 0) return '▫️';
  if (explosions <= 2) return '🟧';
  if (explosions <= 6) return '💥';
  return '🔥';
}

export function shareText({ number, taps, par, emojis, streak, url }) {
  const verdict = taps <= par ? '¡objetivo cumplido! ⭐' : `objetivo ${par}`;
  const lines = [`Fuse #${number} · ${taps} toques (${verdict})`, emojis];
  if (streak > 1) lines.push(`Racha: ${streak} días`);
  if (url) lines.push(url);
  return lines.join('\n');
}
