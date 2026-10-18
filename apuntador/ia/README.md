# Servidor de IA de Apuntador

Hace dos cosas con Claude (la IA de Anthropic):

- **«Escríbelo conmigo»**: escribe un guion para decirlo en voz alta a partir de lo que pones en el asistente (tipo de vídeo, mensaje, público, ideas, acción final, duración y tono). Ajusta la longitud a tu ritmo de lectura y tiene prohibido inventarse datos.
- **«Mejorarlas con IA»**: reescribe solo las frases en las que te trabaste en la toma, más fáciles de decir y con el mismo sentido.

Sin este servidor, la app sigue funcionando: el asistente hace un borrador con tu estructura y tus palabras, y las frases se simplifican con reglas, todo en el dispositivo.

## Qué recibe y qué guarda

- Solo texto: lo que escribes en el asistente o las frases que eliges mejorar. Nunca imagen ni sonido.
- No guarda nada ni escribe el texto en los registros. Lo pasa a la API de Anthropic y devuelve la respuesta.
- Anthropic no usa los datos de la API para entrenar sus modelos y los borra en 30 días como máximo, o más tiempo si detecta un uso que infringe sus políticas. Sus condiciones comerciales incluyen el acuerdo de encargado de tratamiento (DPA) con cláusulas contractuales tipo para la transferencia a EE. UU.
- La app pide permiso la primera vez y lo explica en «Aviso legal y condiciones».
- Cada respuesta lleva `"ai": true` y el modelo usado, para que el texto generado quede marcado.

## Ponerlo en marcha (unos 10 minutos)

Necesitas una cuenta de Cloudflare (el plan gratuito sirve) y una clave de la API de Anthropic (console.anthropic.com).

1. Instala la herramienta de Cloudflare: `npm install -g wrangler` y entra con `wrangler login`.
2. En esta carpeta, guarda la clave como secreto: `wrangler secret put ANTHROPIC_API_KEY`.
3. Revisa `wrangler.toml`: `ALLOWED_ORIGINS` debe ser la web de la app (ahora `https://jonathanvilches.github.io`). Si quieres un modelo más barato, descomenta `MODEL`.
4. Publica: `wrangler deploy`. Te da una dirección del tipo `https://apuntador-ia.<tu-cuenta>.workers.dev`.
5. Pon esa dirección en `AI_URL`, en `apuntador/index.html` (junto a `LEGAL`), y vuelve a publicar la app.

### Antes de abrirlo al público

- Pon un límite de gasto mensual en la consola de Anthropic.
- Opcional: añade en Cloudflare un límite de peticiones por IP (Rate Limiting) con el nombre `LIMITER`; el servidor lo usa si existe.
- Acepta las condiciones comerciales y el DPA de Anthropic y el DPA de Cloudflare, y anótalos en tu registro de actividades de tratamiento.

## Coste orientativo

Un guion de 60 segundos son unas 150 palabras: unos pocos miles de tokens entre la petición y la respuesta, es decir, céntimos o menos por guion según el modelo. Con Sonnet o Haiku es bastante más barato que con Opus.

## Pruebas

`worker.js` se prueba con la API de Anthropic simulada: CORS solo para la web de la app, límites de tamaño, errores sin detalles, que no reenvía nada más que los campos del asistente y que el texto vuelve limpio y marcado como generado por IA.
