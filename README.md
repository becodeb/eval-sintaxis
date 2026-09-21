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

## Los tres ejercicios

| # | Mecánica | Qué evalúa | Por qué no se puede en papel ni en un Form |
|---|----------|------------|-------------------------------------------|
| 1 | Cortar la oración, y después tocar el núcleo | Sujeto y predicado | El sujeto va **al final** (*«Ayer ganaron el partido los chicos de sexto»*). El que lo busca al principio se cae; lo único que resuelve la duda es con quién concuerda el verbo |
| 2 | Arreglar un análisis ajeno, arrastrando | Complementos | «Un compañero analizó así, algo está mal». Detectar el error es un nivel más alto que aplicar la regla. El tramo mal marcado es *«a su abuela»*, que lleva «a» y parece circunstancial |
| 3 | Escribir una oración propia | Producción | La IA **analiza la oración que el alumno acaba de inventar** y dibuja el análisis en vivo, con los mismos colores del resto. Ningún examen en papel puede corregir una oración que nadie escribió de antemano |

## La corrección con IA

El paso 3 le manda al router (`https://ai-router.becode.com.ar/chat`) la oración
del alumno y espera un JSON con el sujeto, el predicado, los núcleos y cada complemento
con su tramo exacto. Esos tramos se vuelven a ubicar sobre el texto original —exigiendo
límites de palabra, para que «le» no caiga dentro de «Ángeles»— y se dibujan como
bloques.

**Si el router no responde, la evaluación no se frena.** Cae a un verificador local por
reglas (`revisarLocal` en `js/ai.js`) que decide si la oración cumple la consigna,
aunque sin el dibujo del análisis. La pantalla dice siempre cuál de los dos contestó:
*analizado por IA* o *revisión sin conexión*, y mientras espera no dice ninguna de las
dos.

### Lo que el modelo no hace bien

Es un modelo gratuito y en los casos finos se equivoca: *«juegan al fútbol»* a veces lo
marca como objeto directo cuando en rigor es complemento de régimen. Acierta la gran
mayoría de las oraciones que escribe un chico de esa edad, pero para una evaluación de
verdad convendría un modelo mejor, que es cambiar una línea en `js/ai.js`.

## Estructura

```
index.html
css/style.css     tokens, pantallas, animaciones
js/data.js        banco de ejercicios y datos de la clase simulada
js/ai.js          cliente SSE del router + verificador local de respaldo
js/app.js         máquina de estados, arrastre y las tres pantallas
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
