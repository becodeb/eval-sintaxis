// Exercise bank. Every step declares its own mechanic plus the data it needs
// to be corrected on the spot.

export const PASOS = [
  {
    tipo: "corte",
    skill: "Sujeto y predicado",
    skillNucleo: "Núcleo del sujeto",
    color: "--sujeto",
    // El sujeto va al final a propósito: el que busca "las primeras palabras"
    // se equivoca, y lo único que resuelve la duda es la concordancia.
    palabras: ["Ayer", "ganaron", "el", "partido", "los", "chicos", "de", "sexto"],
    corte: 4,
    sujeto: [4, 8],
    nucleo: 5,
    consigna: "Cortá entre el sujeto y el predicado.",
    porque:
      "El sujeto está al final. «Ganaron» es plural, así que concuerda con «los chicos de sexto» y no con «el partido», que es singular.",
    consignaNucleo: "Ahora tocá el núcleo del sujeto.",
    porqueNucleo:
      "«Chicos» es el sustantivo del que se habla. «Los» y «de sexto» solo lo acompañan.",
  },

  {
    tipo: "arreglar",
    skill: "Complementos",
    color: "--oi",
    consigna: "Un compañero analizó así. Algo está mal: arreglalo.",
    // Exactamente uno está mal marcado, y es el que lleva «a» adelante.
    bloques: [
      { texto: "Martina", marcado: "sujeto", label: "sujeto" },
      { texto: "regaló", marcado: "verbo", label: "verbo" },
      { texto: "una bufanda", marcado: "od", label: "Objeto directo" },
      { texto: "a su abuela", marcado: "cc", label: "Circ. de lugar", corregir: "oi" },
      { texto: "en invierno", marcado: "cc", label: "Circ. de tiempo" },
    ],
    etiquetas: [
      { rol: "oi", label: "Objeto indirecto", tinta: "oi" },
      { rol: "od", label: "Objeto directo", tinta: "od" },
      { rol: "cc", label: "Circ. de tiempo", tinta: "cc" },
      { rol: "cc", label: "Circ. de modo", tinta: "cc" },
    ],
    porque:
      "«A su abuela» lleva «a» y eso confunde, pero no dice dónde: dice a quién le llega el regalo. Es objeto indirecto.",
  },

  {
    tipo: "producir",
    skill: "Producción",
    color: "--od",
    consigna: "Escribí una oración con objeto directo y circunstancial de lugar.",
    placeholder: "Escribí acá…",
    requisitos: [
      { id: "oracion", label: "Es una oración" },
      { id: "od", label: "Objeto directo" },
      { id: "lugar", label: "Circ. de lugar" },
    ],
    porque: "Una oración propia analizada de punta a punta: eso es saber, no repetir.",
  },
];

export const COLOR_SKILL = {
  "Sujeto y predicado": "--sujeto",
  "Núcleo del sujeto": "--predicado",
  Complementos: "--oi",
  "Producción": "--od",
};

// Simulated class, so the teacher view has something to show.
export const CLASE = {
  curso: "6.º B",
  alumnos: 24,
  filas: [
    { skill: "Sujeto y predicado", pct: 42 },
    { skill: "Núcleo del sujeto", pct: 58 },
    { skill: "Complementos", pct: 46 },
    { skill: "Producción", pct: 71 },
  ],
  alerta:
    "14 de 24 cortaron después de «Ayer ganaron»: buscan el sujeto al principio en vez de mirar con quién concuerda el verbo.",
};
