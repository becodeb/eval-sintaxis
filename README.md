# Análisis sintáctico — demo de evaluación interactiva

Demo de una evaluación de Prácticas del Lenguaje que se corrige sola, sin backend.
Seis ejercicios, unos tres minutos, y un tablero final con la vista del docente.

## Cómo levantarla

```bash
python3 -m http.server 4321                  # solo esta máquina
python3 -m http.server 4321 --bind 0.0.0.0   # también desde el celular en la misma red
```

En red local se abre en `http://<ip-de-la-máquina>:4321`, por ejemplo
`http://192.168.1.37:4321`.

Hace falta un servidor (no `file://`) porque el JS usa módulos ES.

## Las cuatro mecánicas

| # | Mecánica | Qué evalúa | Por qué no se puede en papel ni en un Form |
|---|----------|------------|-------------------------------------------|
| 1 | Cortar la oración | Límite sujeto / predicado | El corte es estructural: se valida la posición exacta, no una respuesta teórica |
| 2 | Tocar una palabra | Núcleo del sujeto | Separa núcleo de modificador directo, que es donde se cae media clase |
| 3 | Arrastrar etiquetas | OD, OI, circunstancial | Se asigna función. Van cinco etiquetas mezcladas y solo tres entran: hay tres circunstanciales (tiempo, lugar, modo) y uno solo corresponde |
| 4 | Reescribir la oración | Sustitución pronominal | **La prueba de fuego.** El alumno escribe la oración con el pronombre. Lo difícil no es elegir «la», es saber que va delante del verbo. Corrige la IA |

Se sacaron a propósito dos ejercicios: bimembre/unimembre (es opción múltiple, eso ya
lo hace un Google Form) y el núcleo del predicado (siempre es el verbo conjugado, no
discrimina a nadie).

## La corrección con IA

El paso 4 le manda al router (`https://ai-router.mastropietro.work.gd/chat`) la oración
original, la respuesta modelo y lo que escribió el alumno, y espera un JSON con dos
booleanos y una pista.

**Si el router no responde, la evaluación no se frena.** Cae a un verificador local
por reglas (`revisarLocal` en `js/ai.js`) que comprueba que el pronombre sea el
correcto, que «una bufanda» haya desaparecido y que el pronombre quede inmediatamente
antes del verbo. La pantalla dice siempre cuál de los dos contestó: *revisado por IA* o
*revisión sin conexión*, y mientras está esperando no dice ninguna de las dos.

El router responde en aproximadamente un segundo y da mejores pistas que las reglas:
ante *«Martina regaló la a su abuela»* contesta «el pronombre tiene que ir antes del
verbo» sin regalarle la respuesta escrita.

## Estructura

```
index.html
css/style.css     tokens, pantallas, animaciones
js/data.js        banco de ejercicios y datos de la clase simulada
js/ai.js          cliente SSE del router + verificador local de respaldo
js/app.js         máquina de estados, arrastre y las cuatro pantallas
```

Para cambiar las oraciones o agregar ejercicios alcanza con tocar `js/data.js`.

## Decisiones de diseño

- **La oración es el héroe.** Tipografía enorme, consigna chica, una tarea por pantalla.
- **El color es información.** Cada función gramatical tiene su tinta y es el único
  color de acento de la pantalla: sujeto azul, predicado rojo, OD verde, OI violeta,
  circunstancial mostaza.
- **Notación de corchete**, no píldoras de colores: cada tramo lleva una regla de color
  abajo con su nombre debajo, como se marca en el pizarrón.
- **Arrastre propio con Pointer Events**, un solo camino para dedo y mouse. Un toque
  sin desplazamiento sigue valiendo como «tomar la etiqueta», y así también se resuelve
  con teclado.
- Funciona con teclado, respeta `prefers-reduced-motion` y entra en pantalla de celular.
