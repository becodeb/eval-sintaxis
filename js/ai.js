// Live analysis for the writing step.
//
// First choice is the AI router: it parses whatever sentence the student
// invented and returns the exact spans, so the screen can draw the analysis.
// If it is unreachable or answers something unusable, a local rule-based check
// still decides whether the sentence meets the brief — without the drawing.
// The UI always says which of the two answered.

const ENDPOINT = "https://ai-router.mastropietro.work.gd/chat";
const TIMEOUT = 22000;

const SISTEMA = `Analizás sintácticamente oraciones simples del español rioplatense para chicos de 10 a 13 años.
Respondés SOLO un objeto JSON, sin texto alrededor y sin markdown.
{"valida":true,"sujeto":"...","predicado":"...","nucleoSujeto":"...","nucleoPredicado":"...","partes":[{"texto":"...","funcion":"od"}],"pista":"..."}
- "valida": false si no es una oración bimembre con verbo conjugado.
- "sujeto" y "predicado": los tramos EXACTOS y COMPLETOS de la oración del alumno, copiados sin cambiar ni una palabra. Si el sujeto es tácito, poné "".
- "nucleoSujeto" y "nucleoPredicado": una sola palabra cada uno, copiada tal cual.
- "partes": solo los complementos que estén dentro del predicado, con el tramo exacto. "funcion" es uno de: "od", "oi", "lugar", "tiempo", "modo". No incluyas el verbo.
- "pista": una sola frase corta en voseo, máximo 80 caracteres, que diga qué le falta para cumplir la consigna. Si cumple, confirmalo en pocas palabras.`;

// ---------------------------------------------------------------- router ---

async function pedirAlRouter(mensajes, signal) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: mensajes }),
    signal,
  });

  const tipo = res.headers.get("content-type") || "";
  if (!res.ok || !tipo.includes("event-stream")) {
    // The router answers plain JSON when every provider is down.
    const cuerpo = await res.text();
    throw new Error(cuerpo.slice(0, 200) || `HTTP ${res.status}`);
  }

  const lector = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let salida = "";
  let abierto = false;

  while (true) {
    const { done, value } = await lector.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lineas = buffer.split("\n");
    buffer = lineas.pop() ?? "";

    for (const linea of lineas) {
      if (linea.startsWith("data: ")) {
        const dato = linea.slice(6);
        if (dato === "[DONE]") return salida;
        if (dato.startsWith('{"error"')) throw new Error(dato.slice(0, 200));
        salida += dato;
        abierto = true;
      } else if (linea === "") {
        abierto = false;
      } else if (abierto) {
        // El router manda el token crudo: si traía un salto de línea, SSE lo
        // partió en dos y esta segunda mitad viene sin el prefijo.
        salida += `\n${linea}`;
      }
    }
  }
  return salida;
}

function extraerJSON(texto) {
  const desde = texto.indexOf("{");
  const hasta = texto.lastIndexOf("}");
  if (desde === -1 || hasta <= desde) return null;
  try {
    return JSON.parse(texto.slice(desde, hasta + 1));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------ segmentación --

const LETRA = /[a-záéíóúüñ0-9]/i;

// Ubica un tramo devuelto por el modelo dentro del texto del alumno, exigiendo
// que caiga en límites de palabra: si no, "le" entraría dentro de "Ángeles".
function ubicar(texto, trozo, desde = 0) {
  const t = (trozo || "").trim();
  if (!t) return null;
  const bajo = texto.toLowerCase();
  let i = bajo.indexOf(t.toLowerCase(), desde);
  while (i !== -1) {
    const antes = i === 0 || !LETRA.test(texto[i - 1]);
    const fin = i + t.length;
    const despues = fin >= texto.length || !LETRA.test(texto[fin]);
    if (antes && despues) return { ini: i, fin };
    i = bajo.indexOf(t.toLowerCase(), i + 1);
  }
  return null;
}

export function segmentar(texto, a) {
  const marcas = [];
  const agregar = (trozo, rol, desde = 0) => {
    const m = ubicar(texto, trozo, desde);
    if (m) marcas.push({ ...m, rol });
  };

  agregar(a.sujeto, "sujeto");
  const pred = ubicar(texto, a.predicado);
  const base = pred ? pred.ini : 0;
  agregar(a.nucleoPredicado, "verbo", base);
  for (const p of a.partes || []) agregar(p.texto, p.funcion, base);

  marcas.sort((x, y) => x.ini - y.ini || y.fin - x.fin);
  const limpias = [];
  let hasta = 0;
  for (const m of marcas) {
    if (m.ini < hasta) continue; // se solapa con una marca ya aceptada
    limpias.push(m);
    hasta = m.fin;
  }

  const segs = [];
  let cursor = 0;
  for (const m of limpias) {
    if (m.ini > cursor) segs.push({ texto: texto.slice(cursor, m.ini), rol: null });
    segs.push({ texto: texto.slice(m.ini, m.fin), rol: m.rol });
    cursor = m.fin;
  }
  if (cursor < texto.length) segs.push({ texto: texto.slice(cursor), rol: null });
  return segs.map((s) => ({ ...s, texto: s.texto.trim() })).filter((s) => s.texto);
}

// ----------------------------------------------------------------- local ---

const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const DETERMINANTES = new Set(
  "el la los las un una unos unas mi mis tu tus su sus este esta estos estas ese esa esos esas aquel aquella dos tres cuatro cinco seis siete ocho nueve diez muchos muchas varios varias todo toda todos todas".split(" ")
);
const PREPOSICIONES = new Set(
  "a ante bajo con contra de desde durante en entre hacia hasta para por segun sin sobre tras".split(" ")
);
const PREP_LUGAR = new Set("en sobre bajo hacia desde hasta entre tras contra".split(" "));
const NOMBRES_TIEMPO = new Set(
  "invierno verano otono primavera enero febrero marzo abril mayo junio julio agosto septiembre setiembre octubre noviembre diciembre lunes martes miercoles jueves viernes sabado domingo manana tarde noche dia dias semana semanas mes meses ano anos rato momento hora horas minuto minutos vacaciones navidad recreo siglo epoca".split(" ")
);
const VERBOS = new Set(
  "es son esta estan era eran hay tiene tienen tengo va van voy fue fueron soy somos hace hacen hizo hicieron dio dieron doy da dan vio vieron ve ven pone ponen puso quiere quieren quiso sabe saben supo puede pueden pudo dice dicen dijo trae traen trajo viene vienen vino sale salen salio oye oyen oyo juega juegan jugo duerme duermen durmio come comen comio corre corren corrio".split(" ")
);
const TERMINACIONES =
  /(o|as|a|amos|an|es|e|emos|en|imos|aba|abas|abamos|aban|ia|ias|iamos|ian|aste|aron|i|iste|io|ieron|are|aras|ara|aran|ere|era|eran|ire|ira|iran)$/;

function pareceVerbo(p) {
  if (VERBOS.has(p)) return true;
  if (p.length < 4 || DETERMINANTES.has(p) || PREPOSICIONES.has(p)) return false;
  return TERMINACIONES.test(p);
}

function revisarLocal(texto) {
  const palabras = texto.trim().replace(/[.,;:!?¡¿«»"']/g, " ").split(/\s+/).filter(Boolean);
  const plano = palabras.map(sinTildes);
  const iVerbo = plano.findIndex((p, i) => i > 0 && pareceVerbo(p));
  const oracion = palabras.length >= 3 && iVerbo > 0;

  let od = false;
  if (oracion) {
    for (let i = iVerbo + 1; i < plano.length; i++) {
      if (PREPOSICIONES.has(plano[i])) {
        i++;
        continue;
      }
      if (DETERMINANTES.has(plano[i]) && plano[i + 1] && !PREPOSICIONES.has(plano[i + 1])) {
        od = true;
        break;
      }
    }
  }

  let lugar = false;
  for (let i = 0; i < plano.length - 1; i++) {
    if (!PREP_LUGAR.has(plano[i])) continue;
    const resto = plano.slice(i + 1, i + 4);
    if (resto.some((w) => NOMBRES_TIEMPO.has(w))) continue;
    if (resto.length) {
      lugar = true;
      break;
    }
  }

  let pista = "Cumple: tiene objeto directo y dice dónde pasa.";
  if (!oracion) pista = "Te falta un verbo conjugado para que sea una oración.";
  else if (!od) pista = "Agregá qué recibe la acción, sin preposición adelante.";
  else if (!lugar) pista = "Decí dónde pasa: en la plaza, sobre la mesa, hacia el río.";

  return { oracion, od, lugar, pista, segmentos: null, fuente: "local" };
}

// ------------------------------------------------------------------ api ----

export async function analizarOracion(texto, signal) {
  if (texto.trim().split(/\s+/).filter(Boolean).length < 3) return revisarLocal(texto);

  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), TIMEOUT);
  if (signal) signal.addEventListener("abort", () => corte.abort(), { once: true });

  try {
    const crudo = await pedirAlRouter(
      [
        { role: "system", content: SISTEMA },
        { role: "user", content: texto.trim() },
      ],
      corte.signal
    );
    const a = extraerJSON(crudo);
    if (!a || typeof a.valida !== "boolean") throw new Error("respuesta no parseable");

    const partes = Array.isArray(a.partes) ? a.partes : [];
    const segmentos = a.valida ? segmentar(texto.trim(), a) : null;
    return {
      oracion: !!a.valida,
      od: partes.some((p) => p.funcion === "od"),
      lugar: partes.some((p) => p.funcion === "lugar"),
      pista: String(a.pista ?? "").slice(0, 140),
      segmentos: segmentos && segmentos.some((s) => s.rol) ? segmentos : null,
      fuente: "ia",
    };
  } catch {
    return revisarLocal(texto);
  } finally {
    clearTimeout(reloj);
  }
}

export async function comentarioFinal(resumen) {
  const fallback = () => {
    const flojas = resumen.filter((r) => !r.acierto).map((r) => r.skill.toLowerCase());
    if (!flojas.length) return "Cerraste todo bien. Podés pasar a oración compuesta.";
    if (flojas.length === 1) return `Repasá ${flojas[0]} y quedás al día.`;
    return `Conviene volver sobre ${flojas.slice(0, 2).join(" y ")}.`;
  };

  try {
    const detalle = resumen.map((r) => `${r.skill}: ${r.acierto ? "bien" : "mal"}`).join(", ");
    const crudo = await pedirAlRouter([
      {
        role: "system",
        content:
          "Sos un docente de Prácticas del Lenguaje. Con el resultado de un alumno, escribí UNA sola frase de devolución en voseo rioplatense, máximo 110 caracteres, concreta y sin felicitaciones vacías. Respondé solo la frase.",
      },
      { role: "user", content: detalle },
    ]);
    const frase = crudo.trim().replace(/^["']|["']$/g, "");
    return frase.length > 8 && frase.length < 200 ? frase : fallback();
  } catch {
    return fallback();
  }
}
