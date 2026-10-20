# Prompts RCI · Clase de IA para abogados

Herramienta de apoyo para una clase de inteligencia artificial dirigida a
abogados en la Universidad de La Sabana. Enseña a escribir prompts con la
metodología **Rol · Contexto · Instrucción** aplicada al ejercicio general del
derecho en Colombia. La página es de Next Leap. La universidad se menciona solo
en texto, sin logo ni marca.

**Publicado en:** https://next-leap-s-a-s.github.io/prompts-rci-sabana/

## Qué contiene

- **Biblioteca.** 48 prompts listos para usar, 8 por cada una de las 6 áreas:
  **Litigio civil y procesal**, **Contratos y derecho comercial**, **Laboral y
  seguridad social**, **Penal**, **Administrativo y contratación estatal** y
  **Constitucional** (tutelas, derechos de petición y otras acciones). Cada
  prompt trae un rol detallado, un contexto extenso con los hechos del caso y
  una instrucción con pasos numerados, formato de salida y criterios de
  verificación. Los campos entre corchetes son editables en la propia página.
  Al copiar se copia el texto ya editado. Cada prompt incluye la versión vaga
  de partida, la razón por la que falla y un consejo.
- **Laboratorio.** Constructor con medidor de calidad en vivo sobre 8
  criterios. Incluye un detector de datos personales y de identificadores de
  expediente: cédulas, NIT, radicados judiciales de 23 dígitos, matrículas,
  escrituras, correos y teléfonos.
- **Ejercicio.** Clasificación de fragmentos en Rol, Contexto o Instrucción.
  Tiene cinco rondas con casos de abogados y un temporizador para facilitar en
  sala.

## Cómo está construido

Un único archivo `index.html` **autocontenido**. Las tipografías (Inter, IBM
Plex Mono) y el logo de Next Leap van incrustados en base64. El hero es
tipográfico y está hecho solo con CSS, sin fotografía. La página no hace
peticiones externas y funciona sin conexión.

El archivo es **ASCII puro**. Las tildes van como entidades HTML y como escapes
`\uXXXX` en el JavaScript. Así se ve bien con cualquier codificación con la que
el navegador lo sirva.

### Editar el contenido

El `index.html` se genera desde `src/`:

```
src/
  template.html              marcado, estilos y lógica (UTF-8, legible)
  prompts-civil.js           8 prompts de litigio civil y procesal
  prompts-comercial.js       8 prompts de contratos y derecho comercial
  prompts-laboral.js         8 prompts de laboral y seguridad social
  prompts-penal.js           8 prompts de penal
  prompts-administrativo.js  8 prompts de administrativo y contratación estatal
  prompts-constitucional.js  8 prompts de constitucional
  rondas.js                  rondas del ejercicio
  assets/                    tipografías .woff2 y logo
  build.py                   ensambla y convierte a ASCII
```

Edita los `.js` o la plantilla con tildes normales y corre:

```
python3 src/build.py
```

Cada prompt es un objeto `{a, t, r, c, i, mal, por, tip}`: área, título, rol,
contexto, instrucción, prompt de partida, por qué falla y consejo. Los
marcadores editables se escriben entre corchetes: `[fecha de notificación]`.
El orden de las áreas está en `AREAS_ORDER` de `build.py` y en `AREAS` de la
plantilla. Los colores de cada área son las variables `--a-<área>` del CSS.

## Rigor jurídico

Los prompts citan solo normas de existencia cierta (por ejemplo la Ley 1564 de
2012, la Ley 1437 de 2011, el Código Sustantivo del Trabajo, la Ley 906 de
2004 o el Decreto 2591 de 1991). No citan números de sentencias. Cuando un
artículo o un término puede haber cambiado, el prompt le pide al modelo que
verifique la norma vigente y que marque la cita con `[verificar]`.

Los modelos de lenguaje inventan jurisprudencia con apariencia verosímil. Cada
norma y cada providencia que aparezca en una respuesta debe verificarse en la
fuente oficial antes de usarse.

## Manejo de información

Los prompts están pensados para información anonimizada. Antes de pegar
contenido en una herramienta de IA hay que reemplazar nombres, cédulas, NIT,
radicados y datos de contacto por marcadores genéricos. No se deben pegar
documentos con reserva legal ni información amparada por el secreto
profesional. La salida del modelo es un borrador. El concepto jurídico y la
decisión son del abogado responsable.

---

Next Leap S.A.S. · Clase de IA para abogados · Universidad de La Sabana
