// Progreso del modo Niveles: estrellas y desbloqueo (lógica pura, sin DOM).
//  - Objetivo o menos: 3 estrellas · objetivo+1: 2 · objetivo+2: 1 · más: 0 (completado).
//  - Un capítulo se abre al reunir sus estrellas ("need"), contando todos los niveles.
//  - Dentro de un capítulo abierto, cada nivel se abre al completar el anterior.

export function starsFor(taps, par) {
  if (taps <= par) return 3;
  if (taps === par + 1) return 2;
  if (taps === par + 2) return 1;
  return 0;
}

/** best: { [levelId]: mejorNúmeroDeToques } */
export function levelStars(level, best) {
  const b = best[level.id];
  return b == null ? 0 : starsFor(b, level.par);
}

export function totalStars(chapters, best) {
  let s = 0;
  for (const ch of chapters) for (const l of ch.levels) s += levelStars(l, best);
  return s;
}

export function chapterStars(chapter, best) {
  return chapter.levels.reduce((s, l) => s + levelStars(l, best), 0);
}

export const chapterUnlocked = (chapter, chapters, best) => totalStars(chapters, best) >= chapter.need;

export function levelUnlocked(chapters, best, c, n) {
  const ch = chapters[c];
  if (!ch || !chapterUnlocked(ch, chapters, best)) return false;
  return n === 0 || best[ch.levels[n - 1].id] != null;
}

/** Lista plana [{c, n, level, chapter}] para navegar con anterior/siguiente. */
export function flatLevels(chapters) {
  const out = [];
  chapters.forEach((chapter, c) => chapter.levels.forEach((level, n) => out.push({ c, n, level, chapter })));
  return out;
}

/** Capítulos que se abren al pasar de "before" a "after" estrellas. */
export function newlyUnlocked(chapters, before, after) {
  return chapters.filter((ch) => ch.need > before && ch.need <= after);
}
