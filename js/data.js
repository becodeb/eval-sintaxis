// Exercise bank. Every step declares its own mechanic plus the data it needs
// to be corrected on the spot.

export const PASOS = [
  {
    tipo: "corte",
    skill: "Corte sujeto / predicado",
    color: "--sujeto",
    consigna: "Cortá entre el sujeto y el predicado.",
    palabras: ["Los", "chicos", "de", "sexto", "plantaron", "un", "árbol", "en", "el", "patio"],
    corte: 4,
    porque: "El sujeto es «Los chicos de sexto». «De sexto» todavía habla de los chicos, así que entra en el sujeto.",
  },

  {
    tipo: "nucleo",
    skill: "Núcleo del sujeto",
    color: "--sujeto",
    consigna: "Tocá el núcleo del sujeto.",
    palabras: ["Los", "chicos", "de", "sexto", "plantaron", "un", "árbol", "en", "el", "patio"],
    corte: 4,
    correcta: 1,
    zona: "s",
    porque: "«Chicos» es el sustantivo del que se habla. «Los» y «de sexto» solo lo acompañan.",
  },

  {
    tipo: "etiquetas",
    skill: "Complementos",
    color: "--oi",
    consigna: "Arrastrá cada etiqueta a su lugar.",
    bloques: [
      { texto: "Martina", fijo: "sujeto", marca: "sujeto" },
      { texto: "regaló", fijo: "verbo", marca: "verbo" },
      { texto: "una bufanda", rol: "od" },
      { texto: "a su abuela", rol: "oi" },
      { texto: "en invierno", rol: "cc" },
    ],
    // Tres circunstanciales y uno solo entra: hay que saber cuál, no ir en orden.
    etiquetas: [
      { rol: "od", label: "Objeto directo", tinta: "od" },
      { rol: "oi", label: "Objeto indirecto", tinta: "oi" },
      { rol: "cc", label: "Circ. de tiempo", tinta: "cc" },
      { rol: null, label: "Circ. de lugar", tinta: "cc" },
      { rol: null, label: "Circ. de modo", tinta: "cc" },
    ],
    porque: "«En invierno» dice cuándo, no dónde ni cómo. Y «a su abuela» lleva «a» pero no es circunstancial: es a quién le llega el regalo.",
  },

  {
    tipo: "reescribir",
    skill: "Sustitución",
    color: "--od",
    consigna: "Escribila de nuevo, reemplazando «una bufanda» por su pronombre.",
    original: ["Martina", "regaló", "una bufanda", "a su abuela", "en invierno"],
    resalta: 2,
    placeholder: "Martina…",
    // La dificultad real no es elegir «la», es ubicarla antes del verbo.
    esperado: {
      pronombre: "la",
      confusos: ["lo", "los", "las", "le", "les"],
      verbo: "regalo",
      quitar: "bufanda",
      modelo: "Martina la regaló a su abuela en invierno.",
    },
    requisitos: [
      { id: "pronombre", label: "El pronombre correcto" },
      { id: "posicion", label: "En el lugar correcto" },
    ],
    porque: "El pronombre va delante del verbo conjugado: «la regaló», nunca «regaló la».",
  },
];

export const COLOR_SKILL = {
  "Corte sujeto / predicado": "--sujeto",
  "Núcleo del sujeto": "--predicado",
  Complementos: "--oi",
  "Sustitución": "--od",
};

// Simulated class, so the teacher view has something to show.
export const CLASE = {
  curso: "6.º B",
  alumnos: 24,
  filas: [
    { skill: "Corte sujeto / predicado", pct: 79 },
    { skill: "Núcleo del sujeto", pct: 54 },
    { skill: "Complementos", pct: 46 },
    { skill: "Sustitución", pct: 29 },
  ],
  alerta:
    "17 de 24 escribieron el pronombre detrás del verbo («regaló la»). No es un error de distracción: no saben que va adelante.",
};
