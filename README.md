# Casa de Cambio

> Conversor de divisas con jQuery, Bootstrap y una API pública sin clave.

[![Demo](https://img.shields.io/badge/demo-live-264F73?style=flat-square&logo=githubpages&logoColor=white)](https://tejedasebastian.github.io/casa-cambio-boot/)

## Qué es

Proyecto de 2024 para practicar jQuery, consumo de APIs y Bootstrap. El usuario elige una moneda de origen, ingresa una cantidad y obtiene la conversión a todas las monedas disponibles.

La versión actual usa [open.er-api.com](https://www.exchangerate-api.com/docs/free), una API pública que **no requiere clave**.

**Demo:** https://tejedasebastian.github.io/casa-cambio-boot/

## Características

- Carga más de 160 monedas al iniciar.
- Conversión desde cualquier moneda a todas las demás.
- Formato de números `es-PE` con dos decimales.
- Mensajes de estado accesibles (`role="status"`, `aria-live`).
- Manejo de errores si la API no responde.
- Layout responsive con Bootstrap.
- Sin build step: HTML, CSS y JS estáticos.

## Stack

| Capa | Herramienta |
|---|---|
| UI | HTML5, CSS3, Bootstrap 5.3 |
| Interacción | jQuery 3.7.1 |
| API | open.er-api.com (ExchangeRate-API, free tier) |
| Lint | ESLint + Standard |
| Deploy | GitHub Pages |

## Estructura

```text
.
├── index.html
├── main.css
├── main.js                  # Lógica de conversión
├── casadecambio-jquery.js   # Carga de monedas y select
├── dinero.svg / dinero.png
├── package.json
└── .eslintrc.json
```

## Correr en local

No necesita instalación para funcionar: jQuery y Bootstrap vienen de CDN.

```bash
npx http-server . -p 8080
```

Abre `http://127.0.0.1:8080`.

Si quieres usar los scripts de npm:

```bash
npm install
npm run empezar
```

## Nota de seguridad

La versión anterior de este proyecto tenía una **API key de ExchangeRate-API hardcodeada** en el JavaScript. Eso significa que cualquiera podía leerla desde el navegador.

En esta versión:

- se eliminó la clave del código;
- se migró a `open.er-api.com`, que no usa clave;
- se agregó manejo de errores para no dejar la UI colgada.

**Si clonaste o usaste la versión anterior, rota esa clave en tu cuenta de ExchangeRate-API.** Borrarla del código no es suficiente: sigue en el historial de Git.

## Limitaciones

- Depende de una API pública; puede fallar o rate-limitar.
- No guarda historial ni preferencias.
- No incluye backend ni autenticación.
- Es un proyecto de aprendizaje, no un servicio financiero real.

## Licencia

[MIT](LICENSE)
