// Speed Insights de Vercel: lo que tardan de verdad las visitas en ver y usar el juego (carga, primera imagen, respuesta
// a los toques), en el panel del proyecto en Vercel. Solo cuando el juego se sirve desde Vercel: en GitHub Pages, en el
// artefacto, en el archivo único y en el servidor de pruebas su script (/_vercel/speed-insights/script.js) no existe y
// daría un error de carga. (Con un dominio propio en Vercel, añadirlo aquí.)
// No es el componente de Next.js (@vercel/speed-insights/next): el juego no usa Next ni React, y este hace lo mismo.
import { injectSpeedInsights } from '@vercel/speed-insights';

export function startVercel() {
  try { if (/\.vercel\.app$/i.test(location.hostname)) injectSpeedInsights(); } catch (e) { }
}
