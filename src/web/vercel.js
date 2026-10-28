// Web Analytics de Vercel: cuántas visitas tiene el juego y desde dónde (países, aparatos, navegadores), en el panel del
// proyecto en Vercel. Solo cuando el juego se sirve desde Vercel: en GitHub Pages, en el artefacto, en el archivo único y
// en el servidor de pruebas su script (/_vercel/insights/script.js) no existe y daría un error de carga. (Con un dominio
// propio en Vercel, añadirlo aquí.)
// No es el componente de Next.js (@vercel/analytics/next): el juego no usa Next ni React, y este hace lo mismo.
// (Speed Insights, la velocidad de las visitas, es de pago en Vercel: la fluidez se mide con el informe en directo del
// artefacto, src/util/informe.js)
import { inject } from '@vercel/analytics';

export function startVercel() {
  try { if (/\.vercel\.app$/i.test(location.hostname)) inject(); } catch (e) { }
}
