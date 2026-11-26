// Genera js/levels.js: niveles de práctica que presentan los elementos uno a uno
// y luego los combinan. Uso: node tools/make-levels.mjs
import { writeFileSync } from 'node:fs';
import { generate } from '../js/daily.js';
import { verify } from '../js/solver.js';

const BASE = [
  { name: 'Primeros pasos', tip: '', board: [3,1,3,2,1, 1,2,3,3,2, 2,1,2,3,2, 3,3,3,1,2, 3,3,2,3,1] },
  { name: 'Muros', tip: 'Los muros cortan las cadenas.', board: [3,3,2,2,3, 3,-1,3,3,1, 2,1,-1,3,3, 3,1,2,-1,3, 3,1,2,3,3] },
];

const PLAN = [
  { name: 'Hielo', els: { ice: 2 }, par: [4, 7], tip: '🧊 Hielo: el primer impacto solo rompe el hielo; después es una bomba normal.' },
  { name: 'Mucho hielo', els: { ice: 4 }, par: [5, 8], tip: '🧊 Rompe el hielo antes de que la cadena llegue a él.' },
  { name: 'Barril', els: { barrel: 2 }, par: [4, 7], tip: '🛢️ Barril: al explotar alcanza también las diagonales (8 casillas).' },
  { name: 'Barril y hielo', els: { barrel: 2, ice: 2 }, par: [5, 8], tip: '🛢️🧊 Un barril puede romper varios hielos de golpe.' },
  { name: 'Flechas', els: { arrow: 2 }, par: [4, 7], tip: '➡️ Flecha: su explosión recorre toda la línea hasta un muro, cargando cada bomba del camino.' },
  { name: 'Lluvia de flechas', els: { arrow: 3 }, par: [5, 8], tip: '➡️ Las flechas no cargan a sus vecinas de los lados, solo hacia donde apuntan.' },
  { name: 'Muro frágil', els: { fragile: 2 }, par: [5, 8], tip: '🧱 Muro frágil: corta cadenas, pero hay que romperlo con una explosión al lado para ganar.' },
  { name: 'Frágil y flechas', els: { fragile: 2, arrow: 2 }, par: [5, 8], tip: '🧱➡️ Una flecha rompe el primer muro frágil que encuentra y se para ahí.' },
  { name: 'Escudo', els: { shield: 2 }, par: [5, 8], tip: '🛡️ Escudo: aguanta dos impactos antes de empezar a cargarse.' },
  { name: 'Escudo y barril', els: { shield: 2, barrel: 2 }, par: [6, 9], tip: '🛡️🛢️ Cada impacto cuenta: un barril quita una capa de escudo.' },
  { name: 'Temporizador', els: { timer: 1 }, par: [5, 8], tip: '⏱️ Temporizador: suma 1 de carga solo cada 3 toques tuyos, toques donde toques.' },
  { name: 'Contrarreloj', els: { timer: 2, ice: 2 }, par: [5, 9], tip: '⏱️🧊 Los temporizadores también rompen su propio hielo.' },
  { name: 'Todo junto', els: { ice: 1, shield: 1, barrel: 1, arrow: 1, fragile: 1, timer: 1 }, par: [6, 9], tip: '🎇 Un poco de todo. Piensa el orden.' },
  { name: 'Gran final', els: { ice: 2, shield: 1, barrel: 2, arrow: 2, fragile: 2, timer: 1 }, par: [6, 10], tip: '💣 El nivel más duro de la práctica.' },
];

import { solve } from '../js/solver.js';
const levels = BASE.map((l) => ({ ...l, par: solve(l.board).par }));
for (const [n, p] of PLAN.entries()) {
  const t = performance.now();
  const g = generate(`practica-${n}-${p.name}`, { parMin: p.par[0], parMax: p.par[1], elements: p.els, nodes: 3_000_000 });
  if (!verify(g.board, g.solution)) throw new Error('solución inválida en ' + p.name);
  levels.push({ name: p.name, tip: p.tip, board: g.board, par: g.par });
  console.log(p.name.padEnd(20), 'objetivo', g.par, `${Math.round(performance.now() - t)}ms`);
}

const body = levels.map((l) => `  ${JSON.stringify(l)},`).join('\n');
writeFileSync(new URL('../js/levels.js', import.meta.url),
  `// Generado por tools/make-levels.mjs — no editar a mano.\n// Niveles de práctica: presentan cada elemento y luego los combinan.\nexport const LEVELS = [\n${body}\n];\n`);
console.log(levels.length, 'niveles');
