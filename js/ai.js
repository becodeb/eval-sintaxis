// Live correction for the rewriting step.
//
// First choice is the AI router. If it is unreachable or answers with
// something that is not the JSON we asked for, we fall back to a local
// rule-based check so the assessment never stalls. The UI always says which
// of the two answered.

const ENDPOINT = "https://ai-router.mastropietro.work.gd/chat";
const TIMEOUT = 12000;

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

// ----------------------------------------------------------------- local ---

const sinTildes = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const enPalabras = (texto) =>
  sinTildes(texto)
    .replace(/[.,;:!?¡¿«»"'()]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

function revisarLocal(texto, esp) {
  const palabras = enPalabras(texto);
  const quitado = !palabras.includes(esp.quitar);
  const tienePronombre = palabras.includes(esp.pronombre);
  const equivocado = esp.confusos.find((p) => palabras.includes(p));

  const pronombre = tienePronombre && quitado;
  const iPron = palabras.indexOf(esp.pronombre);
  const iVerbo = palabras.indexOf(esp.verbo);
  const posicion = pronombre && iPron >= 0 && iVerbo === iPron + 1;

  let pista = "Así es: reemplaza a «una bufanda» y va delante del verbo.";
  if (palabras.length < 3) pista = "Escribí la oración entera, empezando por «Martina».";
  else if (!quitado) pista = "«Una bufanda» tiene que desaparecer: el pronombre ocupa su lugar.";
  else if (!tienePronombre && equivocado)
    pista = `«${equivocado}» no va. Fijate si «una bufanda» es masculino o femenino, uno o varios.`;
  else if (!tienePronombre) pista = "Te falta el pronombre que reemplaza a «una bufanda».";
  else if (!posicion) pista = "El pronombre va antes del verbo: «la regaló», no «regaló la».";

  return { pronombre, posicion, pista, fuente: "local" };
}

// ------------------------------------------------------------------ api ----

export async function revisarReescritura(texto, esp, original, signal) {
  const local = revisarLocal(texto, esp);
  if (enPalabras(texto).length < 3) return local;

  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), TIMEOUT);
  if (signal) signal.addEventListener("abort", () => corte.abort(), { once: true });

  const sistema = `Sos un docente de Prácticas del Lenguaje que corrige a chicos de 10 a 13 años, en español rioplatense.
La oración original es: "${original}"
La consigna fue reescribirla reemplazando "una bufanda" por su pronombre. La respuesta modelo es: "${esp.modelo}"
Recibís lo que escribió el alumno y respondés SOLO con un objeto JSON, sin texto alrededor y sin markdown.
Formato exacto:
{"pronombre":true,"posicion":true,"pista":"..."}
- "pronombre": true si usó el pronombre correcto ("la") y ya no aparece "una bufanda".
- "posicion": true si el pronombre quedó delante del verbo conjugado.
- "pista": una sola frase corta en voseo, máximo 90 caracteres, que diga qué le falta. Si está todo bien, confirmalo en pocas palabras. No le des la respuesta escrita si todavía se equivoca.`;

  try {
    const crudo = await pedirAlRouter(
      [
        { role: "system", content: sistema },
        { role: "user", content: texto.trim() },
      ],
      corte.signal
    );
    const json = extraerJSON(crudo);
    if (!json || typeof json.pronombre !== "boolean") throw new Error("respuesta no parseable");
    return {
      pronombre: !!json.pronombre,
      posicion: !!json.posicion,
      pista: String(json.pista ?? "").slice(0, 140) || local.pista,
      fuente: "ia",
    };
  } catch {
    return local;
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
