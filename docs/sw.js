// Service worker de MENDIMENDIZ (versión web): guarda lo que se descarga para que la segunda vez cargue al momento y se
// pueda jugar sin conexión. Los archivos de assets/ llevan su huella en el nombre (no cambian nunca): se sirven de la
// caché. La página y el manifiesto se piden primero a la red (para recibir la versión nueva) y, sin red, de la caché.
// Dos cachés:
//  · la de la página, con el nombre de la versión (lo pone vite.config.js): al llegar una versión nueva se cambia entera
//  · la de los archivos con huella, común a todas las versiones: al actualizar solo se descarga lo que ha cambiado
//    (modelos, texturas y sonidos que no se tocan siguen guardados) y se quitan los que esta versión ya no usa
const CACHE = 'mendimendiz-aa5cffcc1e';
const ASSETS = 'mendimendiz-assets';
const KEEP = new Set(["index-CgAHv5rc.js","crowd3d-CL7HCLQ9.js","encierro-BL6sWEJG.js","encierroTex-Ug_xfSqQ.js","futbol-DlP3SUHh.js","mini3d-Dur4U-n4.js","pamplona-aAR77qSC.js","rolldown-runtime-DK3Fl9T5.js","three-D6iwT-Pd.js","Alpaca-D2vZsaGU.glb","Barbarian-k2sqtRJj.glb","Bull-56v2Fn7T.glb","Cow-DJ1lAb7R.glb","Deer-DQWNZxY8.glb","Donkey-G30t-JEU.glb","Fox-CY0-5l9T.glb","Goat-eu6uWMyX.glb","Horse-D62n8j6o.glb","Husky-Cc12reqs.glb","Jabali-Dz_5X6J1.glb","Knight-iVI3Lnjz.glb","Mage-BCOXCbO-.glb","Pig-DMqVsAis.glb","Ranger-DWmqvzxg.glb","Rig_Medium_General-gU7Uqnvm.glb","Rig_Medium_MovementBasic-DHr0m3cU.glb","Rogue-BGjtH9wX.glb","Rogue_Hooded-BTlQy_pN.glb","Sheep-C9dciflh.glb","ShibaInu-USaZSkHi.glb","Stag-D3M0MlZG.glb","Wolf-DW0w20w4.glb","_bell-DVOATASz.webp","almond-ZOoW2RK1.webp","anvil-C34v06vN.webp","apple-oQZiWJgX.webp","ardilla-DT8zKSde.webp","artichoke-teWTeLXm.webp","asparagus-DqcWUwMh.webp","axe-D76gXPHk.webp","badge-CT6N9TmR.webp","barbarian_bust-B7n1Q_lP.png","barbarian_full-Dt3oBEeX.png","basket-BDeWSL6l.webp","beans-DUbioeAO.webp","bell-Bm85ddv0.webp","binoculars-vscbdUR0.webp","boar-DMHXEVpP.webp","book-YkgIrUmI.webp","bread-CDRob-qC.webp","buitre-Bv0YQP9i.webp","bustard-D8b7lN13.webp","cardo-D4luHeA2.webp","castle-DWdxv9Up.webp","cathedral-BBIgcgyd.webp","check-DhQqkuwy.webp","cheese-uwzChc9p.webp","chistorra-TElIwEAK.webp","church-DEAyBq9o.webp","ciervo-BkUYyPvT.webp","corn-Bi5XTeej.webp","cow-DRk9RB03.webp","dance-5P0Dscwe.webp","deer-bdHnnGtv.webp","dog-BIDciHyL.webp","eagle-CD6V02qn.webp","eguzkilore-D3qg8Gqv.webp","espadrille-DV-7Ibc9.webp","exclaim-CJhrQt8H.webp","fish-AnVvBsYr.webp","flag-OQsjGFsY.webp","flower-5wcXvbuw.webp","food-CtNvHxEz.glb","footprint-RRfeKxko.webp","fox-XzZ_gegl.webp","frog-DPNekrvD.webp","gear-De6-siC1.webp","goat-B_usIeot.webp","grapes-zQxFfHVH.webp","grulla-BMzzRYXe.webp","hammer-C5AlzyTu.webp","herb-qcjpWlSa.webp","heron-BLJnhcYi.webp","home-BVQzek0d.webp","honey-QnC5ibjS.webp","hooded_bust-CASBvJ52.png","hooded_full-BH8W645P.png","horse-DwCw6Z-i.webp","index-r2CoN6gq.css","knight_bust-CsWb74no.png","knight_full-V-0qanf_.png","lamb-80oprTnA.webp","latxa-CUTH6Abd.webp","leaf-DDrXyVq2.webp","legend-BA2fe192.webp","lilita-one-latin-400-normal-87r-Z-Re.woff2","lilita-one-latin-400-normal-DXkechA3.woff","litter-Bq9SXzZT.webp","lock-nfJMzzsD.webp","mage_bust-CNXcXX6X.png","mage_full-Cp83-m_e.png","map-tVIkCvZr.webp","marmot-B3Y6wh7g.webp","mask-uqc-7rex.webp","milano-Dq_MEXSl.webp","milk-DBK3Q5ZF.webp","music-CWWuYgJ-.webp","nunito-latin-600-normal-Br8yIETf.woff2","nunito-latin-600-normal-Cd0eNu1l.woff","nunito-latin-700-normal-Dort48En.woff2","nunito-latin-700-normal-OcDqTBcA.woff","nunito-latin-800-normal-D-J0wlBY.woff","nunito-latin-800-normal-Dz8SOQK_.woff2","nunito-latin-900-normal-BVB1fGs6.woff2","nunito-latin-900-normal-CVn49sIn.woff","olive-C4k5xdvl.webp","osasuna-D_3jsTKe.glb","osasuna-DtGB0JZf.glb","osasuna_bust-CVwH1LJl.png","osasuna_fuera-CelEzl_w.glb","osasuna_fuera-DTN54_jK.glb","osasuna_full-D9u5UTwf.png","owl-BAE8YpwT.webp","pastor-0dI1uFmU.glb","pastor-Dv2RTopv.glb","pastor_bust-B_C22P_Y.png","pastor_full-CPlOLnz8.png","peak-DbLuhLFt.webp","pelota-ytdx8yI2.webp","pelotari-Ct1qVrVR.glb","pelotari-DRq7-7ci.glb","pelotari_bust-BK4mik3u.png","pelotari_full-DqirAJMU.png","pelotari_rojo-BgfW87iN.glb","pelotari_rojo-CILuBmP8.glb","pepper-WFenRTub.webp","person-BxNeM7zn.webp","pin-DLENenCI.webp","pine-b4Wd4Htm.webp","pito-DFpdCUHD.webp","potato-BoVUQkY7.webp","quebrantahuesos-DFeeE9N-.webp","quiz-B8GhLdhs.webp","rabbit-CMwslhRM.webp","ranger_bust-DvUXd9Qg.png","ranger_full-HLdzo-xe.png","ribbon-DM5M9XzD.webp","rogue_bust-CZfpWhat.png","rogue_full-CgKZG29e.png","running-BHFHzH2E.webp","sanfermin-DDB5Jd4P.glb","sanfermin-DWvW6ldB.glb","sanfermin_bust-CqW_6ITh.png","sanfermin_full-BL3WVc4N.png","shield-0W7OG0vx.webp","sparkle-BhkVhEAM.webp","stamp-BoJooJp4.webp","star-DaiR2FiO.webp","stone-ADLat7cA.webp","stork-Bkki57Ti.webp","tomato-Bj2AsM2i.webp","tree-BYqHG1vA.webp","trucha-gmTAKR2j.webp","txapela-C2Wcb-2I.webp","wheat-BwX3T_N_.webp","wine-BnG8gl2w.webp","wool-n75mFp2R.webp"]);   // los archivos de assets/ de esta versión (lo pone vite.config.js)
const name = (url) => new URL(url).pathname.split('/').pop();
// al instalarse guarda la página y lo imprescindible para arrancar (código, estilos y fuentes; unos 2,5 MB): así el
// juego abre sin conexión desde la primera visita. Modelos, texturas y sonidos se guardan según se usan.
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    await caches.open(CACHE).then(c => c.addAll(['./', './manifest.webmanifest'])).catch(() => {});
    const a = await caches.open(ASSETS);
    // (si ya está en la caché de una versión anterior, se copia en vez de volver a descargarlo)
    await Promise.all([...KEEP].filter(f => /\.(js|css|woff2)$/.test(f)).map(async f => {
      const u = new URL('./assets/' + f, self.location).href; if (await a.match(u)) return;
      const hit = await caches.match(u); if (hit) return a.put(u, hit);
      return a.add(u).catch(() => {});
    }));
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = await caches.open(ASSETS);
    for (const k of await caches.keys()) {
      if (k === CACHE || k === ASSETS) continue;
      // cachés de versiones anteriores: lo que esta versión sigue usando pasa a la caché común antes de borrarlas
      if (k.startsWith('mendimendiz-')) {
        const old = await caches.open(k);
        for (const r of await old.keys()) if (new URL(r.url).pathname.includes('/assets/') && KEEP.has(name(r.url)) && !(await keep.match(r))) { const res = await old.match(r); if (res) await keep.put(r, res); }
      }
      await caches.delete(k);
    }
    for (const r of await keep.keys()) if (!KEEP.has(name(r.url))) await keep.delete(r);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.includes('/assets/')) {
    // con huella: caché primero; lo que no esté se descarga y se guarda
    e.respondWith(caches.open(ASSETS).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })));
    return;
  }
  // la página: red primero (versión nueva), y si no hay red, la guardada
  e.respondWith(fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(r, res.clone())); return res; })
    .catch(async () => (await caches.match(r)) || (await caches.match('./'))));
});
