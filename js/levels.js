// Generado por tools/make-levels.mjs — no editar a mano.
// Niveles de práctica: presentan cada elemento y luego los combinan.
export const LEVELS = [
  {"name":"Primeros pasos","tip":"","board":[3,1,3,2,1,1,2,3,3,2,2,1,2,3,2,3,3,3,1,2,3,3,2,3,1],"par":6},
  {"name":"Muros","tip":"Los muros cortan las cadenas.","board":[3,3,2,2,3,3,-1,3,3,1,2,1,-1,3,3,3,1,2,-1,3,3,1,2,3,3],"par":7},
  {"name":"Hielo","tip":"🧊 Hielo: el primer impacto solo rompe el hielo; después es una bomba normal.","board":[2,1,3,2,2,2,3,3,2,3,2,3,-1,2,3,1,3,3,3,3,3,35,3,34,2],"par":4},
  {"name":"Mucho hielo","tip":"🧊 Rompe el hielo antes de que la cadena llegue a él.","board":[2,35,3,3,2,34,1,3,2,3,35,3,2,2,34,1,3,1,3,2,3,2,2,2,2],"par":7},
  {"name":"Barril","tip":"🛢️ Barril: al explotar alcanza también las diagonales (8 casillas).","board":[1,3,130,-1,-1,1,3,3,130,3,2,2,-1,1,3,2,3,3,3,3,-1,-1,2,1,2],"par":6},
  {"name":"Barril y hielo","tip":"🛢️🧊 Un barril puede romper varios hielos de golpe.","board":[2,3,2,-1,-1,3,130,3,3,3,35,2,3,3,129,35,2,1,1,2,-1,-1,2,3,2],"par":5},
  {"name":"Flechas","tip":"➡️ Flecha: su explosión recorre toda la línea hasta un muro, cargando cada bomba del camino.","board":[3,258,2,1,2,2,3,3,3,3,2,643,-1,1,3,2,3,1,3,1,2,3,3,3,3],"par":5},
  {"name":"Lluvia de flechas","tip":"➡️ Las flechas no cargan a sus vecinas de los lados, solo hacia donde apuntan.","board":[2,643,3,3,3,3,2,642,3,3,3,641,-1,1,2,2,3,2,1,3,2,2,2,1,3],"par":6},
  {"name":"Muro frágil","tip":"🧱 Muro frágil: corta cadenas, pero hay que romperlo con una explosión al lado para ganar.","board":[2,3,-1,3,3,1,3,3,3,3,1,2,3,3,3,3,1,3,2,1,3,-2,-1,3,-2],"par":5},
  {"name":"Frágil y flechas","tip":"🧱➡️ Una flecha rompe el primer muro frágil que encuentra y se para ahí.","board":[3,3,2,-1,-2,2,2,3,2,3,3,514,-1,3,1,3,2,-2,1,2,2,-1,3,641,3],"par":8},
  {"name":"Escudo","tip":"🛡️ Escudo: aguanta dos impactos antes de empezar a cargarse.","board":[1091,3,1091,3,-1,1,1,2,3,1,3,2,2,3,1,3,1,3,3,2,-1,3,2,2,2],"par":8},
  {"name":"Escudo y barril","tip":"🛡️🛢️ Cada impacto cuenta: un barril quita una capa de escudo.","board":[2,2,2,2,2,1090,2,130,2,3,2,3,3,2,130,2,1,3,1089,3,2,3,3,2,1],"par":7},
  {"name":"Temporizador","tip":"⏱️ Temporizador: suma 1 de carga solo cada 3 toques tuyos, toques donde toques.","board":[2,3,3,3,3,2,1,2,770,3,2,2,-1,3,2,1,3,2,2,2,3,2,3,3,1],"par":5},
  {"name":"Contrarreloj","tip":"⏱️🧊 Los temporizadores también rompen su propio hielo.","board":[2,2,3,1,769,2,-1,3,3,-1,3,2,3,33,3,-1,770,2,-1,3,2,1,35,2,2],"par":9},
  {"name":"Todo junto","tip":"🎇 Un poco de todo. Piensa el orden.","board":[1,2,2,1,1,2,3,3,258,3,-2,3,3,2,3,3,3,2,2,770,3,1091,2,35,130],"par":6},
  {"name":"Gran final","tip":"💣 El nivel más duro de la práctica.","board":[-2,2,3,642,3,3,1,131,1,-1,-2,1,3,35,131,-1,3,1,258,1,1090,770,3,2,34],"par":9},
];
