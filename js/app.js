import { PASOS, CLASE, COLOR_SKILL } from "./data.js?v=__V__";
import { analizarOracion, comentarioFinal } from "./ai.js?v=__V__";

const app = document.getElementById("app");

const estado = {
  i: -1, // -1 = portada
  marcas: [], // { skill, acierto }
};

const NOMBRE_ROL = {
  sujeto: "sujeto",
  verbo: "verbo",
  od: "objeto directo",
  oi: "objeto indirecto",
  lugar: "circ. de lugar",
  tiempo: "circ. de tiempo",
  modo: "circ. de modo",
};

// ---------------------------------------------------------------- helpers --

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const mezclar = (xs) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function pantalla({ accent = "--ink", top = "", stage = "", foot = "" }) {
  app.style.setProperty("--accent", `var(${accent})`);
  app.innerHTML = `
    <header class="top">${top}</header>
    <section class="stage">${stage}</section>
    <footer class="foot">${foot}</footer>`;
}

function barraProgreso(indice) {
  const dots = PASOS.map((_, n) => {
    const s = n < indice ? "done" : n === indice ? "now" : "next";
    return `<i data-s="${s}"></i>`;
  }).join("");
  return `<div class="dots" role="img" aria-label="Ejercicio ${indice + 1} de ${PASOS.length}">${dots}</div>
          <span class="top-label">${esc(PASOS[indice].skill)}</span>`;
}

const botonSeguir = (texto = "Seguir") =>
  `<button class="btn" data-tone="accent" data-seguir>${texto}</button>`;

function mostrarFeedback(ok, porque, texto, alSeguir) {
  app.querySelector("[data-hueco]").outerHTML = `
    <div class="feedback" data-r="${ok ? "ok" : "no"}">
      <b>${ok ? "Bien" : "No era esa"}</b>
      <p>${esc(porque)}</p>
    </div>`;
  app.querySelector(".foot").innerHTML = botonSeguir(texto);
  app.querySelector("[data-seguir]").addEventListener("click", alSeguir);
}

function anotar(skill, acierto) {
  estado.marcas.push({ skill, acierto });
}

function avanzar() {
  estado.i += 1;
  if (estado.i >= PASOS.length) return verResultado();
  render();
}

// Los tramos de oración son <span>, no <button>: hay que darles teclado a mano.
function activable(nodo, fn, { unaVez = false } = {}) {
  let usado = false;
  const disparar = (e) => {
    if (unaVez && usado) return;
    usado = true;
    e.preventDefault();
    fn();
  };
  nodo.addEventListener("click", disparar);
  nodo.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") disparar(e);
  });
}

function sacudir(nodo) {
  nodo.classList.remove("shake");
  void nodo.offsetWidth;
  nodo.classList.add("shake");
}

// ---------------------------------------------------------------- portada --

function verPortada() {
  const izq = "Ayer ganaron el partido".split(" ").map((w) => `<span class="p">${w}</span>`).join("");
  const der = "los chicos de sexto".split(" ").map((w) => `<span class="s">${w}</span>`).join("");
  pantalla({
    accent: "--sujeto",
    stage: `
      <div class="cover-oracion">${izq}<span class="hendija"></span>${der}</div>
      <h1 class="titulo">Análisis sintáctico</h1>
      <p class="consigna">Tres ejercicios. Se corrigen solos.</p>`,
    foot: `<button class="btn" data-empezar>Empezar</button>`,
  });
  app.querySelector("[data-empezar]").addEventListener("click", avanzar);
}

// ------------------------------------------------------- oración en tramos --

function palabrasHTML(palabras, { conCortes = false, corte = null, sujeto = null } = {}) {
  if (corte === null) {
    let html = "";
    palabras.forEach((p, n) => {
      if (n > 0) {
        const tocable = conCortes
          ? ` data-pick tabindex="0" role="button" aria-label="Cortar antes de ${esc(p)}"`
          : "";
        html += `<span class="gap" data-g="${n}"${tocable}></span>`;
      }
      html += `<span class="w" data-w="${n}">${esc(p)}</span>`;
    });
    return `<div class="mitad">${html}</div>`;
  }
  // una vez cortada, la oración se abre en dos renglones y cada mitad se nombra
  const [sd, sh] = sujeto;
  const mitad = (desde, hasta) => {
    const half = desde >= sd && desde < sh ? "s" : "p";
    return (
      `<div class="mitad" data-half="${half}"><i class="etiq">${half === "s" ? "sujeto" : "predicado"}</i>` +
      palabras
        .slice(desde, hasta)
        .map((p, k) => `<span class="w" data-w="${desde + k}">${esc(p)}</span>`)
        .join("") +
      `</div>`
    );
  };
  return mitad(0, corte) + mitad(corte, palabras.length);
}

// --------------------------------------- 1. cortar, y después el núcleo ----

function verCorte(paso) {
  const abierta = { corte: paso.corte, sujeto: paso.sujeto };

  const marco = (consigna, cuerpo) => {
    pantalla({
      accent: paso.color,
      top: barraProgreso(estado.i),
      stage: `
        <p class="consigna">${esc(consigna)}</p>
        <div class="palabras">${cuerpo}</div>
        <div data-hueco></div>`,
    });
    return app.querySelector(".palabras");
  };

  // --- primer tiempo: dónde termina el predicado y empieza el sujeto
  const fila = marco(paso.consigna, palabrasHTML(paso.palabras, { conCortes: true }));

  const cortar = (g) => {
    const ok = g === paso.corte;
    fila.querySelectorAll(".gap").forEach((el) => delete el.dataset.pick);
    const abrir = () => {
      fila.innerHTML = palabrasHTML(paso.palabras, abierta);
    };
    if (ok) {
      abrir();
    } else {
      fila.querySelector(`.gap[data-g="${g}"]`).dataset.mal = "";
      sacudir(fila);
      setTimeout(abrir, 750);
    }
    anotar(paso.skill, ok);
    mostrarFeedback(ok, paso.porque, "La siguiente", verNucleo);
  };

  fila.querySelectorAll(".gap[data-pick]").forEach((g) =>
    activable(g, () => cortar(Number(g.dataset.g)), { unaVez: true })
  );

  // --- segundo tiempo: cuál de esas palabras es el núcleo
  function verNucleo() {
    const fila = marco(paso.consignaNucleo, palabrasHTML(paso.palabras, abierta));
    const [sd, sh] = paso.sujeto;

    const elegir = (n) => {
      const ok = n === paso.nucleo;
      fila.querySelectorAll(".w").forEach((w) => delete w.dataset.pick);
      if (!ok) sacudir(fila);
      fila.querySelector(`.w[data-w="${paso.nucleo}"]`).classList.add("nucleo");
      anotar(paso.skillNucleo, ok);
      mostrarFeedback(ok, paso.porqueNucleo, "Seguir", avanzar);
    };

    fila.querySelectorAll(".w").forEach((w) => {
      const n = Number(w.dataset.w);
      if (n >= sd && n < sh) {
        w.dataset.pick = "";
        w.tabIndex = 0;
        w.setAttribute("role", "button");
        activable(w, () => elegir(n), { unaVez: true });
      } else {
        w.dataset.zone = "off";
      }
    });
  }
}

// ------------------------------------------------------------- arrastre ----

// Pointer Events: un solo camino para dedo y mouse. Un toque sin desplazamiento
// sigue valiendo como "tomar la etiqueta", que es lo que la deja usable con
// teclado.
function arrastrable(chip, { soltar, resaltar }) {
  let activo = null;

  const blancoBajo = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest(".bloque[data-pick]") : null;
  };

  chip.addEventListener("pointerdown", (e) => {
    if (chip.dataset.used !== undefined) return;
    e.preventDefault();
    chip.setPointerCapture(e.pointerId);
    const r = chip.getBoundingClientRect();
    activo = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, movio: false, fantasma: null };
  });

  chip.addEventListener("pointermove", (e) => {
    if (!activo) return;
    if (!activo.movio) {
      if (Math.hypot(e.clientX - activo.x0, e.clientY - activo.y0) < 6) return;
      activo.movio = true;
      const f = chip.cloneNode(true);
      f.classList.add("fantasma");
      f.style.width = `${chip.offsetWidth}px`;
      document.body.appendChild(f);
      activo.fantasma = f;
      chip.dataset.llevando = "";
    }
    activo.fantasma.style.transform = `translate(${e.clientX - activo.dx}px, ${e.clientY - activo.dy}px)`;
    resaltar(blancoBajo(e.clientX, e.clientY));
  });

  const terminar = (e) => {
    if (!activo) return;
    const { movio, fantasma } = activo;
    if (fantasma) fantasma.remove();
    delete chip.dataset.llevando;
    activo = null;
    resaltar(null);
    soltar(movio ? blancoBajo(e.clientX, e.clientY) : "toque");
  };

  chip.addEventListener("pointerup", terminar);
  chip.addEventListener("pointercancel", terminar);
}

// ------------------------------- 2. arreglar un análisis mal hecho ---------

function verArreglar(paso) {
  let enMano = null;
  let errores = 0;

  const bloques = paso.bloques
    .map(
      (b, n) =>
        `<span class="bloque" data-b="${n}" data-rol="${b.marcado}" data-pick tabindex="0" role="button">${esc(
          b.texto
        )}<i>${esc(b.label)}</i></span>`
    )
    .join("");

  pantalla({
    accent: paso.color,
    top: barraProgreso(estado.i),
    stage: `
      <p class="consigna">${esc(paso.consigna)}</p>
      <div class="bloques">${bloques}</div>
      <div class="etiquetas">
        ${mezclar(paso.etiquetas)
          .map((e) => `<button class="etiqueta" data-tinta="${e.tinta}" data-rol="${e.rol}">${esc(e.label)}</button>`)
          .join("")}
      </div>
      <div data-hueco></div>`,
  });

  const resaltar = (bloque) => {
    app.querySelectorAll(".bloque[data-sobre]").forEach((b) => delete b.dataset.sobre);
    if (bloque) bloque.dataset.sobre = "";
  };

  const tomar = (chip) => {
    const yaEstaba = enMano === chip;
    app.querySelectorAll(".etiqueta").forEach((e) => delete e.dataset.held);
    enMano = yaEstaba ? null : chip;
    if (enMano) enMano.dataset.held = "";
  };

  const colocar = (chip, bloque) => {
    const destino = paso.bloques[Number(bloque.dataset.b)];
    if (!destino.corregir || chip.dataset.rol !== destino.corregir) {
      errores += 1;
      sacudir(bloque);
      return;
    }
    bloque.dataset.rol = destino.corregir;
    bloque.querySelector("i").textContent = chip.textContent;
    bloque.dataset.arreglado = "";
    delete bloque.dataset.pick;
    app.querySelectorAll(".bloque").forEach((b) => delete b.dataset.pick);
    app.querySelectorAll(".etiqueta").forEach((e) => (e.dataset.used = ""));
    mostrarFeedback(errores === 0, paso.porque, "Seguir", avanzar);
    anotar(paso.skill, errores === 0);
  };

  app.querySelectorAll(".etiqueta").forEach((chip) => {
    arrastrable(chip, {
      resaltar,
      soltar: (destino) => {
        if (destino === "toque") return tomar(chip);
        if (destino) colocar(chip, destino);
      },
    });
    chip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tomar(chip);
      }
    });
  });

  app.querySelectorAll(".bloque[data-pick]").forEach((bloque) =>
    activable(bloque, () => {
      if (enMano) colocar(enMano, bloque);
    })
  );
}

// ----------------- 3. escribir una oración y verla analizada en vivo -------

function verProducir(paso) {
  pantalla({
    accent: paso.color,
    top: barraProgreso(estado.i),
    stage: `
      <p class="consigna">${esc(paso.consigna)}</p>
      <div class="escribir">
        <textarea class="campo" rows="1" placeholder="${esc(paso.placeholder)}"
                  spellcheck="false" autocomplete="off"></textarea>
        <div class="reqs">
          ${paso.requisitos.map((r) => `<span class="req" data-req="${r.id}">${esc(r.label)}</span>`).join("")}
        </div>
      </div>
      <div class="analisis" data-analisis></div>
      <p class="pista"></p>
      <span class="fuente" hidden></span>
      <div data-hueco></div>`,
    foot: botonSeguir("Listo"),
  });

  const campo = app.querySelector(".campo");
  const pista = app.querySelector(".pista");
  const fuente = app.querySelector(".fuente");
  const analisis = app.querySelector("[data-analisis]");
  let ultimo = { oracion: false, od: false, lugar: false };
  let reloj = null;
  let corte = null;

  const crecer = () => {
    campo.style.height = "auto";
    campo.style.height = `${campo.scrollHeight}px`;
  };

  const dibujarAnalisis = (segmentos) => {
    if (!segmentos) {
      analisis.innerHTML = "";
      return;
    }
    analisis.innerHTML = `<div class="bloques">${segmentos
      .map((s) => {
        if (!s.rol) return `<span class="bloque">${esc(s.texto)}</span>`;
        return `<span class="bloque" data-rol="${s.rol}">${esc(s.texto)}<i>${esc(
          NOMBRE_ROL[s.rol] || s.rol
        )}</i></span>`;
      })
      .join("")}</div>`;
  };

  const pintar = (r) => {
    ultimo = r;
    const hayTexto = !!campo.value.trim();
    paso.requisitos.forEach((req) => {
      const chip = app.querySelector(`[data-req="${req.id}"]`);
      if (!hayTexto) delete chip.dataset.s;
      else chip.dataset.s = r[req.id] ? "si" : "no";
    });
    pista.textContent = hayTexto ? r.pista : "";
    dibujarAnalisis(hayTexto ? r.segmentos : null);
    fuente.hidden = !hayTexto;
    fuente.textContent = r.fuente === "ia" ? "analizado por IA" : "revisión sin conexión";
    if (r.fuente === "ia") delete fuente.dataset.off;
    else fuente.dataset.off = "";
  };

  campo.addEventListener("input", () => {
    crecer();
    clearTimeout(reloj);
    if (corte) corte.abort();
    if (!campo.value.trim()) {
      pintar({ oracion: false, od: false, lugar: false, pista: "", segmentos: null, fuente: "local" });
      return;
    }
    // Mientras no haya veredicto, el sello no puede afirmar quién revisó.
    pista.textContent = "Analizando tu oración…";
    fuente.hidden = true;
    reloj = setTimeout(async () => {
      corte = new AbortController();
      pintar(await analizarOracion(campo.value, corte.signal));
    }, 800);
  });

  crecer();
  campo.focus();
  app.querySelector("[data-seguir]").addEventListener("click", () => {
    const ok = !!(ultimo.oracion && ultimo.od && ultimo.lugar);
    campo.disabled = true;
    anotar(paso.skill, ok);
    mostrarFeedback(
      ok,
      ok ? paso.porque : "Te faltó alguna de las dos cosas que pedía la consigna.",
      "Ver resultado",
      avanzar
    );
  });
}

// --------------------------------------------------------------- resultado --

async function verResultado() {
  const bien = estado.marcas.filter((m) => m.acierto).length;
  const filas = estado.marcas
    .map(
      (m) => `<div class="fila" data-r="${m.acierto ? "ok" : "no"}"
                    style="--c: var(${COLOR_SKILL[m.skill] || "--line"})">
                 <span>${esc(m.skill)}</span>
                 <b>${m.acierto ? "Bien" : "A repasar"}</b>
               </div>`
    )
    .join("");

  pantalla({
    accent: bien === estado.marcas.length ? "--od" : "--cc",
    top: `<div class="dots"></div><span class="top-label">Resultado</span>`,
    stage: `
      <div class="puntaje">${bien}<small>/${estado.marcas.length}</small></div>
      <p class="consigna" data-cierre>Escribiendo la devolución…</p>
      <div class="tabla">${filas}</div>`,
    foot: `<button class="btn" data-tablero>Ver el tablero del docente</button>`,
  });

  app.querySelector("[data-tablero]").addEventListener("click", verTablero);
  const cierre = await comentarioFinal(estado.marcas);
  const nodo = app.querySelector("[data-cierre]");
  if (nodo) nodo.textContent = cierre;
}

function verTablero() {
  const filas = CLASE.filas
    .map(
      (f) => `<div class="fila" data-board style="--c: var(${COLOR_SKILL[f.skill] || "--line"})">
                <span>${esc(f.skill)}</span>
                <b>${f.pct}%</b>
                <span class="barra"><i style="--w:${f.pct}%"></i></span>
              </div>`
    )
    .join("");

  pantalla({
    accent: "--predicado",
    top: `<div class="dots"></div><span class="top-label">Vista del docente</span>`,
    stage: `
      <h2 class="titulo">${esc(CLASE.curso)}, ${CLASE.alumnos} alumnos</h2>
      <p class="consigna">Resuelto por la clase, ejercicio por ejercicio.</p>
      <div class="tabla">${filas}</div>
      <p class="alerta"><b>Lo que hay que dar de nuevo.</b> ${esc(CLASE.alerta)}</p>`,
    foot: `<button class="btn" data-ghost data-reiniciar>Volver a empezar</button>`,
  });

  app.querySelector("[data-reiniciar]").addEventListener("click", () => {
    estado.i = -1;
    estado.marcas = [];
    verPortada();
  });
}

// ------------------------------------------------------------------ router --

function render() {
  const paso = PASOS[estado.i];
  ({ corte: verCorte, arreglar: verArreglar, producir: verProducir })[paso.tipo](paso);
}

verPortada();
