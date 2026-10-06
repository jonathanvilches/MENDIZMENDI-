// Service worker de MENDIMENDIZ (versión web): guarda lo que se descarga para que la segunda vez cargue al momento y se
// pueda jugar sin conexión. Los archivos de assets/ llevan su huella en el nombre (no cambian nunca): se sirven de la
// caché. La página y el manifiesto se piden primero a la red (para recibir la versión nueva) y, sin red, de la caché.
// Dos cachés:
//  · la de la página, con el nombre de la versión (lo pone vite.config.js): al llegar una versión nueva se cambia entera
//  · la de los archivos con huella, común a todas las versiones: al actualizar solo se descarga lo que ha cambiado
//    (modelos, texturas y sonidos que no se tocan siguen guardados) y se quitan los que esta versión ya no usa
const CACHE = 'mendimendiz-659bad4bf1';
const ASSETS = 'mendimendiz-assets';
const KEEP = new Set(["index-seBM45ZT.js","crowd3d-DlLZyBGM.js","encierro-DN2AuUVN.js","encierroTex-ZGTGUnl4.js","futbol-DkK-flRQ.js","mini3d-VwWEogRk.js","pamplona-1u4DecY_.js","rolldown-runtime-DK3Fl9T5.js","three-BkAs6nAP.js","Alpaca-D2vZsaGU.glb","Bull-56v2Fn7T.glb","Cow-DJ1lAb7R.glb","Deer-DQWNZxY8.glb","Donkey-G30t-JEU.glb","Fox-CY0-5l9T.glb","Goat-eu6uWMyX.glb","Horse-D62n8j6o.glb","Husky-Cc12reqs.glb","Jabali-Dz_5X6J1.glb","Pig-DMqVsAis.glb","Sheep-C9dciflh.glb","ShibaInu-USaZSkHi.glb","Stag-D3M0MlZG.glb","Wolf-DW0w20w4.glb","_bell-DVOATASz.webp","acc-osasuna-celebra-DWSt2_0W.webp","acc-osasuna-corre-DZbUw-7n.webp","acc-osasuna-salta-BKQ7cUkm.webp","acc-pastor-corre-DYc6DMpN.webp","acc-pastor-salta-CtSXC4T9.webp","acc-pelotari-corre-BMY2nSrE.webp","acc-pelotari-golpea-DCojKZOR.webp","acc-sanfermin-celebra-D6ewl_kU.webp","acc-sanfermin-corre-BYLI1m2J.webp","acc-sanfermin-salta-CJ4ADd2e.webp","almond-ZOoW2RK1.webp","altsasu-alsasua-CYujQxFC.webp","altsasu-alsasua-s-BxB7kxzG.webp","amaiur-maya-del-baztan-CqQglXKs.webp","amaiur-maya-del-baztan-s-D5WCe3Ip.webp","anvil-C34v06vN.webp","aoiz-BQdFl4X4.webp","aoiz-s-Dlsdv4Xq.webp","apple-oQZiWJgX.webp","ardilla-DT8zKSde.webp","aribe-F8lwNHi9.webp","aribe-s-eFLxRbp0.webp","artajona-BCOoSIFF.webp","artajona-s-oocMUPId.webp","artichoke-teWTeLXm.webp","asparagus-DqcWUwMh.webp","av-osasuna-C1HTEBuk.webp","av-pastor-BBFrUncJ.webp","av-pelotari-1UWm4oaX.webp","av-sanfermin-C-LhhpVQ.webp","axe-D76gXPHk.webp","badge-CT6N9TmR.webp","basket-BDeWSL6l.webp","beans-DUbioeAO.webp","bell-Bm85ddv0.webp","bidasoa-0_WhHabo.webp","bidasoa-s-C4fVZ7nD.webp","binoculars-vscbdUR0.webp","boar-DMHXEVpP.webp","book-YkgIrUmI.webp","bread-CDRob-qC.webp","buitre-BysFRL2D.webp","burgui-burgi-DkUXvuh4.webp","burgui-burgi-s-CdbbIN01.webp","bustard-D8b7lN13.webp","cardo-D4luHeA2.webp","castle-DWdxv9Up.webp","cathedral-BBIgcgyd.webp","check-DhQqkuwy.webp","cheese-uwzChc9p.webp","chistorra-TElIwEAK.webp","church-DEAyBq9o.webp","ciervo-BkUYyPvT.webp","corn-Bi5XTeej.webp","cortes-hc6L_Aqr.webp","cortes-s--QUPdbeX.webp","cow-DRk9RB03.webp","dance-5P0Dscwe.webp","deer-bdHnnGtv.webp","dog-BIDciHyL.webp","eagle-Bbbw_bN3.webp","eguzkilore-D3qg8Gqv.webp","elizondo-C_Z6RPcC.webp","elizondo-s-zBigsiox.webp","erronkari-roncal-CSDQlwcl.webp","erronkari-roncal-s-CSHrq-FB.webp","espadrille-DV-7Ibc9.webp","estella-DVGDm1Vg.webp","estella-s-eu8NzR8m.webp","etxalar-s-ChOuMCZv.webp","etxalar-woBXsj6f.webp","exclaim-CJhrQt8H.webp","fish-AnVvBsYr.webp","flag-OQsjGFsY.webp","flower-5wcXvbuw.webp","food-CtNvHxEz.glb","footprint-RRfeKxko.webp","fox-XzZ_gegl.webp","frog-DPNekrvD.webp","gear-De6-siC1.webp","goat-B_usIeot.webp","grapes-zQxFfHVH.webp","grulla-DNz5qkq6.webp","hammer-C5AlzyTu.webp","herb-qcjpWlSa.webp","heron-BLJnhcYi.webp","home-BVQzek0d.webp","honey-QnC5ibjS.webp","horse-DwCw6Z-i.webp","index--wqFdA4I.css","irulegi-Bx84f8B8.webp","irulegi-s-Ch3w-ySm.webp","irurtzun-YqnfhEyd.webp","irurtzun-s-Bly5n5uG.webp","isaba-izaba-CYjC1g-p.webp","isaba-izaba-s-C2e5M2dX.webp","ituren-Bc-4zKNy.webp","ituren-s-DwNoEIEW.webp","javier-XqUUhpJ5.webp","javier-s-DmOV25p0.webp","lamb-80oprTnA.webp","larraun-leitzaldea-e-Wo2xbR.webp","larraun-leitzaldea-s-CvSJcAU0.webp","latxa-CUTH6Abd.webp","leaf-DDrXyVq2.webp","legend-BA2fe192.webp","leitza-DsooSKew.webp","leitza-s-BqRH_7y6.webp","lekunberri-BkkQ-2-8.webp","lekunberri-s-D5tMoZYG.webp","lesaka-Cd1O1LFq.webp","lesaka-s-CbHVdm7g.webp","lilita-one-latin-400-normal-87r-Z-Re.woff2","lilita-one-latin-400-normal-DXkechA3.woff","litter-Bq9SXzZT.webp","lock-nfJMzzsD.webp","lumbier-CWf5OcHQ.webp","lumbier-s-BggTxOZN.webp","map-tVIkCvZr.webp","marcilla-s-RjnrGc2T.webp","marcilla-wCx7yFBO.webp","marmot-B3Y6wh7g.webp","mask-uqc-7rex.webp","milano-7a9mBK5C.webp","milk-DBK3Q5ZF.webp","music-CWWuYgJ-.webp","nunito-latin-600-normal-Br8yIETf.woff2","nunito-latin-600-normal-Cd0eNu1l.woff","nunito-latin-700-normal-Dort48En.woff2","nunito-latin-700-normal-OcDqTBcA.woff","nunito-latin-800-normal-D-J0wlBY.woff","nunito-latin-800-normal-Dz8SOQK_.woff2","nunito-latin-900-normal-BVB1fGs6.woff2","nunito-latin-900-normal-CVn49sIn.woff","olite-SaRcHLRl.webp","olite-s-BN29TVTm.webp","olive-C4k5xdvl.webp","orreaga-roncesvalles-DOpo_gdv.webp","orreaga-roncesvalles-s-k4aX-Kle.webp","osasuna-BA2Hn7Kc.glb","osasuna-D11JKCpp.glb","osasuna_bust-CTTzpc3k.webp","osasuna_fuera-BhLyJORQ.glb","osasuna_fuera-DeHZ2KiQ.glb","osasuna_full-CmIXQH-P.webp","owl-BAE8YpwT.webp","pamplona-BszkrgK9.webp","pamplona-s-B1gIJdgv.webp","pamplona-s-CCULCmST.webp","pamplona-yZZJAVPS.webp","pastor-Dc2ALhTS.glb","pastor-Dv2RTopv.glb","pastor_bust-C41arg63.webp","pastor_full-CvJXxYyN.webp","peak-DbLuhLFt.webp","pelota-ytdx8yI2.webp","pelotari-Dgy1oeu9.glb","pelotari-ninNeP_8.glb","pelotari_bust-CY9NMhv0.webp","pelotari_full-CgWYgW6k.webp","pelotari_rojo-BOHV2LF7.glb","pelotari_rojo-WapZ6xPf.glb","pepper-WFenRTub.webp","person-BxNeM7zn.webp","pin-DLENenCI.webp","pine-b4Wd4Htm.webp","pirineo-TIau903m.webp","pirineo-s-C8rZZ2CF.webp","pito-DFpdCUHD.webp","potato-BoVUQkY7.webp","prepirineo-kJU64GiW.webp","prepirineo-s-ctQw6QA_.webp","puente-la-reina-BYBr50tI.webp","puente-la-reina-s-in4XWpHK.webp","quebrantahuesos-COKY13V7.webp","quiz-B8GhLdhs.webp","rabbit-CMwslhRM.webp","ribbon-DM5M9XzD.webp","ribera-Cp6Y7KVp.webp","ribera-alta-s-DFxGShHT.webp","ribera-alta-sO-oNVrC.webp","ribera-s-CEHLt1Ux.webp","running-BHFHzH2E.webp","sakana-3A2M6xAj.webp","sakana-s-CxwzeYde.webp","sanfermin-5UPO25cj.glb","sanfermin-DWvW6ldB.glb","sanfermin_bust-Dm3m_EL5.webp","sanfermin_full-mCi18D1-.webp","sanguesa-21HPTi5Z.webp","sanguesa-b1TpLmMH.webp","sanguesa-s-CzSnXIGe.webp","sanguesa-s-DcYk9HRv.webp","shield-0W7OG0vx.webp","sparkle-BhkVhEAM.webp","stamp-BoJooJp4.webp","star-DaiR2FiO.webp","stone-ADLat7cA.webp","stork-BFaMQHgT.webp","tafalla-CC8-Wr75.webp","tafalla-s-CO_k18R0.webp","tierra-estella-BIzPuw9e.webp","tierra-estella-s-BZh0YKI-.webp","tomato-Bj2AsM2i.webp","tree-BYqHG1vA.webp","trucha-gmTAKR2j.webp","tudela-CNXCPfCh.webp","tudela-s-DzhXfmbc.webp","txapela-C2Wcb-2I.webp","ujue-DY6AeqSF.webp","ujue-s-BPoyW7H8.webp","valdizarbe-novenera-Bs-vOhhE.webp","valdizarbe-novenera-s-CaOb2hQN.webp","viana-BAch7k9M.webp","viana-s-B4qp8Ijj.webp","wheat-BwX3T_N_.webp","wine-BnG8gl2w.webp","wool-n75mFp2R.webp","zona-media-9yVcLciG.webp","zona-media-s-Dbge7-GI.webp","zugarramurdi-BsO0yp7r.webp","zugarramurdi-s-DoUGwy6l.webp"]);   // los archivos de assets/ de esta versión (lo pone vite.config.js)
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
