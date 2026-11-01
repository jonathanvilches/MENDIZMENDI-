// ¿Se juega dentro de una app de tienda (App Store), con el juego empaquetado en ella? La envoltura nativa (Capacitor u
// otra con WKWebView) lo dice con window.Capacitor, con «HerrizherriApp» en el agente de usuario o abriendo la página con
// ?app. Entonces no se ofrece instalar el juego desde el navegador ni descargarlo, no se manda a la web y no se nombran
// otras plataformas: dentro de una app de la App Store, eso confunde y es motivo de rechazo (normas 2.3.10 y 4.2 de Apple).
// En la web no cambia nada.
let SI = null;
export function appNativa() {
  if (SI !== null) return SI;
  try { SI = !!(window.Capacitor?.isNativePlatform?.() || /HerrizherriApp/.test(navigator.userAgent) || new URLSearchParams(location.search).has('app') || sessionStorage.getItem('herrizherri-app') === '1'); }
  catch (e) { SI = false; }
  // (el ?app solo viene en la primera página: se recuerda en la sesión para las recargas)
  if (SI) try { sessionStorage.setItem('herrizherri-app', '1'); } catch (e) { }
  return SI;
}
