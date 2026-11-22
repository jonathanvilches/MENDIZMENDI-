// Las tomas del tráiler v5: el juego jugado de verdad (v5/juego.mjs). Cada toma: url (el pueblo, la hora, el tiempo), seg,
// prep (en la página, antes de empezar: dónde está el jugador y qué hace en cada fotograma, window.__cada) y guion (en
// segundos, desde node: teclas y acciones). Las charlas son las del juego (ui.dialog, con la cámara que se acerca al
// vecino), con las frases que dicen las voces del tráiler y al ritmo de ellas (v3/guion-v3.json).
const OT = 'town=otsagabia-ochagavia&q=high&skipintro=1';

// las ayudas, en la página (van como texto: nada de fuera de la función)
export const AYUDA = () => {
  const G = window.__game, rt = window.__rt, H = window.__hf; if (!G || !H) return; const libre = window.__colliders?.isFree || (() => true);
  const suelo = (x, z) => H.groundHeight(x, z), seco = (x, z) => H.waterLevelAt(x, z) < H.groundHeight(x, z) - 0.4;
  const ok = (x, z, r = 0.6) => seco(x, z) && libre(x, z, r);
  const J = window.__j = {
    G, rt, suelo, seco, ok,
    // correr (o andar) en línea recta desde un sitio a «lejos» metros de c hacia c, por suelo seco y libre (si c no se da,
    // desde donde está el jugador hacia delante); la cámara del juego detrás
    corre(c, lejos = 26, o = {}) {
      const P = G.player; c ||= P.pos; let best = null;
      for (let i = 0; i < 48; i++) {
        const a = (o.h ?? 0) + i / 48 * 6.283, x = c.x + Math.cos(a) * lejos, z = c.z + Math.sin(a) * lejos; let bien = ok(x, z), sube = 0;
        for (let s = 2; s <= lejos - (o.margen ?? 3) && bien; s += 1.5) { const xx = x - Math.cos(a) * s, zz = z - Math.sin(a) * s; if (!ok(xx, zz, 0.5)) bien = false; sube = Math.max(sube, Math.abs(suelo(xx, zz) - suelo(x, z))); }
        for (let s = 1; s <= 5 && bien; s += 1) if (!ok(x + Math.cos(a) * s, z + Math.sin(a) * s, 0.35)) bien = false;
        // o.solo: que nadie tape al jugador: de los caminos buenos, el que pasa más lejos de vecinos, puestos y cosas (y
        // del sitio de la cámara, detrás)
        let tapa = 0;
        if (bien && o.solo) for (const v of [...Object.values(G.npcs || {}), ...(G.actors || []), ...(G.walkers || []), ...(G.folk || []), ...(G.items || []).map(i => ({ pos: { x: i.x, z: i.z } })), ...(G.tienda?.pos ? [{ pos: G.tienda.pos, r: 4.5 }] : [])]) {
          const p = v?.pos || v?.a?.pos; if (!p) continue;
          for (let s = -5; s <= lejos * 0.6; s += 1) { const d = Math.hypot(p.x - (x - Math.cos(a) * s), p.z - (z - Math.sin(a) * s)); if (d < (v.r || 2.6)) { tapa += (v.r || 2.6) - d; } }
        }
        if (bien && (!best || tapa < best.tapa - 0.01 || (Math.abs(tapa - best.tapa) <= 0.01 && sube < best.sube))) best = { x, z, a, sube, tapa };
      }
      best ||= { x: c.x + lejos, z: c.z, a: 0 };
      const dx = -Math.cos(best.a), dz = -Math.sin(best.a), h = Math.atan2(dx, dz);
      P.place(best.x, best.z, h); P.obj.visible = true; rt.follow.yaw = h + Math.PI;
      J.teclas(o.anda ? ['w'] : ['w', 'shift']);
      if (o.snap) rt.follow.snap?.(P);   // (la cámara, ya detrás, sin venir volando desde donde estaba)
      return best;
    },
    // fuera el caballo propio y los vehículos sueltos de la entrada (se ponían delante)
    limpia() { for (const V of G.av?.vehs || []) { try { V.dispose(); } catch (e) { } } if (G.av) G.av.vehs = []; if (G.montura && !G.player.vehiculo) { try { G.montura.dispose?.(); } catch (e) { } G.montura = null; } G.sinMontura = true; },
    teclas(ks) { G.input.keys.clear(); for (const k of ks) G.input.keys.add(k); },
    // un plano de dron: la cámara va por su camino según el segundo de la toma (el gancho de vuelo de la cámara del juego,
    // follow.cinematic.fly), camino(t) => { pos: [x, y, z], look: [x, y, z] }; sin el marcador ni los botones, como un plano
    // de cine. En los pasos de antes, quieta en el principio del camino
    dron(camino) {
      window.__tt = 0; const c0 = window.__cada; window.__cada = (t) => { window.__tt = t; c0?.(t); };
      rt.follow.cinematic = { t: 0, fly: (cam) => { const q = camino(window.__tt); cam.position.set(q.pos[0], q.pos[1], q.pos[2]); cam.lookAt(q.look[0], q.look[1], q.look[2]); } };
      G.ui.hudVisible?.(false);
    },
    // el jugador, a «lejos» metros del vecino a, mirándole, con el camino hasta él libre, seco y sin cuestas, y libre también
    // detrás, donde va la cámara del juego; o.h, desde qué lado se prefiere llegar
    hacia(a, lejos = 7, o = {}) {
      const p = a.pos; let best = null;
      for (let i = 0; i < 64; i++) {
        const h = (o.h ?? 0) + i * Math.PI * 2 / 64, dx = Math.sin(h), dz = Math.cos(h), sx = p.x + dx * lejos, sz = p.z + dz * lejos;
        let bien = ok(sx, sz), sube = 0;
        for (let s = 1.4; s <= lejos && bien; s += 0.7) { const x = p.x + dx * s, z = p.z + dz * s; if (!ok(x, z, 0.45)) bien = false; sube = Math.max(sube, Math.abs(suelo(x, z) - suelo(p.x, p.z))); }
        for (let s = 1; s <= 5 && bien; s += 1) if (!ok(sx + dx * s, sz + dz * s, 0.35)) bien = false;
        if (!bien || sube > 1.2) continue;
        const nota = -sube - (o.h != null ? Math.abs(Math.atan2(Math.sin(h - o.h), Math.cos(h - o.h))) * 0.8 : 0);
        if (!best || nota > best.nota) best = { sx, sz, h, nota };
      }
      best ||= { sx: p.x + lejos, sz: p.z, h: Math.PI / 2 };
      const P = G.player, head = best.h + Math.PI;
      P.place(best.sx, best.sz, head); P.obj.visible = true; rt.follow.yaw = best.h;
      return best;
    },
    // una charla como en el juego: el jugador anda hasta el vecino (llega), se para a «para» metros y, en «habla», se abre
    // el cuadro con las frases; cada una pasa a la siguiente en su segundo (pasa), como al tocar la pantalla
    charla(a, { habla, frases, pasa = [], para = 1.7, corre = false }) {
      const P = G.player; let abierto = false, k = 0;
      J.teclas(corre ? ['w', 'shift'] : ['w']);
      window.__cada = (t) => {
        if (G.input.keys.size && Math.hypot(P.pos.x - a.pos.x, P.pos.z - a.pos.z) < para) J.teclas([]);
        if (!abierto && t >= habla) {
          abierto = true; J.teclas([]);
          a.say(60); P.frozen = true; P.heading = Math.atan2(a.pos.x - P.pos.x, a.pos.z - P.pos.z);
          G.say(a, frases.map(text => ({ text })));
        }
        if (abierto && k < pasa.length && t >= pasa[k]) { k++; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })); }
      };
    },
  };
};

const tecla = (k) => (p) => p.evaluate((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), k);
// una charla con un vecino de Otsagabia: quién, a qué hora, desde qué distancia llega y lo que dice (con sus segundos)
const charla = (quien, hora, seg, o) => ({
  en: o.en, url: `?${OT}&weather=${o.tiempo || 'clear'}&t=${hora}`, seg, antes: 30,
  prep: eval(`() => { const J = window.__j, a = J.G.npcs?.${quien}; if (!a) throw new Error('sin ${quien}'); J.limpia(); J.hacia(a, ${o.lejos ?? 2.6}${o.h != null ? `, { h: ${o.h} }` : ''}); J.charla(a, ${JSON.stringify({ habla: o.habla ?? 0.1, pasa: o.pasa || [], frases: o.frases, para: o.para })}); ${o.extra || ''} }`),
  guion: o.guion,
});

// una lámina que se mueve (ui/anatomia.js), abierta como en el juego y, en cada segundo del guion, el paso que cuenta el
// narrador (como al tocar su ficha). La voz va en la mezcla del tráiler (v5/mezcla-v5.py): aquí el visor no suena y cada paso
// se queda con su subtítulo hasta el siguiente (el audio de la página, uno que no acaba nunca)
const lamTec = (id, seg, pasos, o) => ({
  en: o.en, url: `?${OT}&weather=clear&t=12`, seg, antes: 40,
  prep: eval(`async () => { window.__j.limpia(); const st = document.createElement('style'); st.textContent = '.lt-ayuda{display:none!important}'; document.head.appendChild(st); window.Audio = function () { return { play: () => Promise.resolve(), pause() {}, volume: 1 }; };
    const m = await import('/src/ui/anatomia.js'); m.laminaTecnica(window.__game.ui, '${id}', { button: 'Seguir' });
    const fr = document.querySelector('.lt iframe, iframe'); if (fr && !fr.classList.contains('lista')) await new Promise(r => fr.addEventListener('load', r, { once: true })); }`),
  guion: pasos.map(([t, i]) => [t, (p) => p.evaluate((i) => document.querySelector(`.lt-pasos button[data-i="${i}"]`)?.click(), String(i))]),
});

// los tiempos del montaje (v5/montaje.mjs) van en cada toma: «en», cuándo empieza en el tráiler
export const TOMAS = {
  // ---------- el principio: el mapa de inicio, Navarra, y sube el Pirineo como una isla ----------
  inicio: {
    en: 0, url: '?skipintro=1&q=high', seg: 7.6, antes: 8, espera: 12000,
    listo: (p) => p.waitForFunction(() => window.__mapa3d?.ren && window.__mapa3d.calentado?.(), null, { timeout: 300000 }).catch(() => { }),
    guion: [[1.9, (p) => p.evaluate(() => window.__mapa3d.comarca('pirineo'))]],
  },
  // ---------- Otsagabia: llegar corriendo, por la calle del río ----------
  // (22 nov, el autor: «puedes jugar mucho con movimientos de cámara, con movimientos de dron»: en «Desde aquí ves Otsagabia
  // entera», el dron sale detrás del explorador, que corre hacia la plaza, y sube hasta ver el pueblo y el río)
  llegada: {
    en: 7.5, url: `?${OT}&weather=clear&t=10.4`, seg: 4.4, antes: 30,
    prep: () => {
      const J = window.__j, P = J.G.player; J.limpia(); const L = window.__layout?.PLACES, b = J.corre(L?.plaza, 30);
      const fx = -Math.cos(b.a), fz = -Math.sin(b.a), e = (k) => k * k * (3 - 2 * k);
      // (sube casi en vertical sobre el explorador, siempre encima de la calle libre por la que corre: echándose atrás se
      // metía en las casas; el giro, pequeño, solo cuando ya va por encima de los tejados)
      J.dron((t) => {
        const k = e(Math.min(1, t / 4.4)), g = 0.5 * k * k, rx = fx * Math.cos(g) - fz * Math.sin(g), rz = fx * Math.sin(g) + fz * Math.cos(g);
        const atras = 6 - 3 * k, x = P.pos.x - rx * atras, z = P.pos.z - rz * atras, y = Math.max(J.suelo(x, z) + 2, P.pos.y + 2.4 + 22 * k), d = 4 + 4 * k;
        return { pos: [x, y, z], look: [P.pos.x + fx * d, P.pos.y + 1.2 - 1.2 * k, P.pos.z + fz * d] };
      });
    },
  },
  // Maite: «¡Kaixo! Soy Maite…», la fiesta y las cintas perdidas; al acabar, la primera cinta (la roja), como en el juego
  maite: {
    en: 11.8, url: `?${OT}&weather=clear&t=10.8`, seg: 18.2, antes: 36,
    prep: () => {
      const J = window.__j, G = J.G, a = G.npcs.maite; J.limpia(); J.hacia(a, 5.5);
      J.charla(a, { habla: 1.25, pasa: [4.8, 11.05, 13.3], frases: ['¡Kaixo! Soy Maite. ¡Ongi etorri a Otsagabia!', 'Mañana es la fiesta de Muskilda y los danzantes necesitan ocho cintas de colores para sus trajes…', '¡Pero se han perdido por todo el valle!'] });
      const c0 = window.__cada; let dada = false;
      window.__cada = (t) => { c0(t); if (!dada && t >= 13.45) { dada = true; G.player.frozen = false; const q = G.q('bienvenida'); q.state = 'active'; G.completeQuest('bienvenida'); } };
    },
  },
  itziar: charla('itziar', 11.4, 4.7, { en: 29.9, lejos: 3.4, habla: 0.75, frases: ['¿Sabes que en Otsagabia hay palacios con escudos de piedra?'] }),
  joxemari: charla('joxemari', 9.6, 3.8, { en: 34.5, habla: 0.05, frases: ['Egun on, gazte. Soy Joxemari, el pastor.'] }),
  // (Kike es un niño, más bajo que el explorador: el explorador se para más lejos para no taparle en el plano de la charla)
  kike: charla('kike', 17.2, 3.9, { en: 38.2, lejos: 3.6, para: 2.5, habla: 0.1, frases: ['¡Aupa! Soy Kike. ¿Juegas a pelota?'] }),
  joseba: charla('inaki', 11.0, 2.1, { en: 42.0, habla: 0.1, frases: ['Soy Joseba, guarda de Irati.'] }),
  lamia: charla('lamia', 17.6, 5.7, { en: 44.0, lejos: 6.5, habla: 1.75, frases: ['Estaba peinándome con mi peine de oro y… ¡plof!'] }),
  basajaun: charla('basajaun', 19.2, 6.1, { en: 49.6, tiempo: 'niebla', lejos: 3.2, habla: 0.1, pasa: [2.75], frases: ['¡Oooh! Una personita en mi bosque…', 'Soy el Basajaun, el señor del bosque.'] }),
  // «y esto es solo un pueblo»: otra comarca que sube en el mapa
  navarra: {
    en: 55.6, url: '?skipintro=1&q=high', seg: 1.75, antes: 8, espera: 12000,
    listo: (p) => p.waitForFunction(() => window.__mapa3d?.ren && window.__mapa3d.calentado?.(), null, { timeout: 300000 }).catch(() => { }),
    guion: [[0, (p) => p.evaluate(() => window.__mapa3d.comarca('baztan-bidasoa'))]],
  },
  // ---------- «Cada vecino te pide ayuda, y cada misión te enseña algo…» ----------
  // el cuaderno con las misiones (tecla C, como al jugar)
  cuaderno: {
    en: 57.25, url: `?${OT}&weather=clear&t=12`, seg: 1.85, antes: 24,
    prep: () => { const J = window.__j; J.limpia(); },
    guion: [[0, (p) => p.evaluate(() => window.__game.ui.openBook())]],
  },
  // una lámina «por dentro» al abrirse (la de la ferrería: la del queso sale luego, en el bloque de las láminas)
  lamina: {
    en: 59.1, url: `?${OT}&weather=clear&t=12`, seg: 2.3, antes: 24,
    prep: () => { window.__j.limpia(); const st = document.createElement('style'); st.textContent = '.lt-ayuda{display:none!important}'; document.head.appendChild(st); },
    guion: [[0, (p) => p.evaluate(() => import('/src/ui/anatomia.js').then(m => { m.laminaTecnica(window.__game.ui, 'ferreria', { button: '¡Vamos!' }); }))]],
  },
  // el pastoreo: la misión de Joxemari, las ovejas por el monte y el jugador detrás
  pastoreo: {
    en: 61.4, url: `?${OT}&weather=clear&t=9.4`, seg: 1.2, antes: 24,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia(); G.activate('ovejas'); G.advance('ovejas', 1); G.startHerding(false);
      // a media misión: el rebaño ya juntado a unos 25 m del redil y el jugador detrás, andando hacia él
      const pen = window.__LANDMARKS.pen, H = G.herd || [];
      const cx = H.reduce((a, s) => a + s.pos.x, 0) / H.length, cz = H.reduce((a, s) => a + s.pos.z, 0) / H.length;
      const L = Math.hypot(pen.x - cx, pen.z - cz) || 1, ux = (pen.x - cx) / L, uz = (pen.z - cz) / L;
      const C = { x: pen.x - ux * 26, z: pen.z - uz * 26 };
      const hueco = [[0, 0], [-2.6, 1.8], [2.4, 1.2], [-1.2, -2.2], [1.8, -2.6], [0.4, 3.4]];
      H.forEach((s, i) => {
        const [a, b] = hueco[i % hueco.length], x = C.x + ux * b - uz * a, z = C.z + uz * b + ux * a;
        s.pos.x = x; s.pos.z = z; s.home = { x, z }; s.heading = Math.atan2(ux, uz); s.state = 'walk'; s.timer = 3;
      });
      const P = G.player, h = Math.atan2(ux, uz); P.place(C.x - ux * 10, C.z - uz * 10, h); P.obj.visible = true; J.rt.follow.yaw = h + Math.PI;
      if (G.dog) { G.dog.pos.x = C.x - ux * 7 + uz * 2.5; G.dog.pos.z = C.z - uz * 7 - ux * 2.5; }
      J.teclas(['w']);
    },
  },
  // el carnaval: la comparsa de joaldunak por las calles de Ituren, con sus cencerros
  carnaval: {
    en: 62.5, url: '?town=ituren&q=high&skipintro=1&weather=clear&t=12.5', seg: 1.1, antes: 150,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia(); const M = (G.missions || []).find(m => m.type === 'carnival'); if (!M) throw new Error('sin carnaval');
      M.count = M.need; G.desfileCarnaval(M, window.__layout.PLACES.plaza);
      // la comparsa llega durante los pasos de antes; el jugador sale andando hacia la plaza 2 s antes de la toma (si
      // espera quieto, la cámara del juego se aleja), por un camino sin vecinos que lo tapen
      const pl = window.__layout.PLACES.plaza; let k = 0;
      window.__antes = () => { if (++k === 150 - 24) J.corre(pl, 12, { anda: true, solo: true, snap: true, margen: 5 }); };
    },
  },
  // las leyendas: la sombra de Teodosio sale de la cueva de Aralar
  leyenda: {
    en: 63.5, url: '?town=sierra-aralar&q=high&skipintro=1&weather=niebla&t=22.5', seg: 1.45, antes: 18,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia(); const M = (G.missions || []).find(m => m.type === 'legend'); if (!M) throw new Error('sin leyenda');
      M.count = M.need; G.startLegend(M);   // las pistas ya seguidas: la guarida queda fijada en M.lair
      const L = M.lair; J.hacia({ pos: L }, 6.5); G.showCreature(M);
    },
  },
  // ---------- «La naturaleza y la cultura, contadas jugando» ----------
  caballo: {
    en: 86.05, url: `?${OT}&weather=clear&t=16.8`, seg: 1.85, antes: 20,
    prep: () => {
      // primero el sitio (un camino recto, llano y libre de 45 m, como al correr), luego el caballo debajo del jugador y a
      // galope por él
      const J = window.__j, G = J.G, P = G.player; J.limpia(); J.corre(null, 45); J.teclas([]);
      const M = G.creaMontura?.(); if (!M?.A) throw new Error('sin montura');
      M.x = P.pos.x; M.z = P.pos.z; M.heading = P.heading; M.A.pos.set(P.pos.x, P.pos.y, P.pos.z); M.A.heading = P.heading; M.A.sync?.();
      M.sube(P); J.rt.follow.yaw = P.heading + Math.PI; J.rt.follow.snap?.(P); J.teclas(['w', 'shift']);
    },
  },
  irati: {
    en: 87.9, url: '?town=selva-irati&q=high&skipintro=1&weather=clear&t=10.4', seg: 1.8, antes: 30,
    prep: () => { const J = window.__j; J.limpia(); J.corre(null, 20, { anda: true }); },
  },
  // ---------- «Por dentro»: las láminas que se mueven (Anatomy), con Salva contando cómo se hacen (22 nov, el autor: «es
  // muy interesante que en el tráiler se expliquen [...] todas las ilustraciones, con las narraciones y las locuciones de
  // cómo se hacen el queso, el vino») ----------
  queso: lamTec('queso', 10.9, [[0, 2], [4.9, 6]], { en: 64.85 }),
  vino: lamTec('vino', 7.7, [[0, 2], [4.05, 5]], { en: 75.75 }),
  // todas las láminas, en su pantalla del juego (Saberes · Por dentro), de arriba abajo
  pordentro: {
    en: 83.45, url: '?screen=pordentro&q=high', seg: 2.6, antes: 6, espera: 5000,
    // (las miniaturas van con carga perezosa: se piden todas ya, que el barrido pasa por todas)
    listo: async (p) => {
      await p.waitForFunction(() => window.__hub && document.querySelectorAll('.lam-rail img').length > 8, null, { timeout: 300000 });
      await p.evaluate(() => document.querySelectorAll('.lam-rail img').forEach(i => { i.loading = 'eager'; }));
      await p.waitForFunction(() => [...document.querySelectorAll('.lam-rail img')].every(i => i.complete && i.naturalWidth), null, { timeout: 300000 });
    },
    prep: () => {
      const r = document.querySelector('.lam-rail'); let sc = r?.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      sc ||= document.scrollingElement; const max = sc.scrollHeight - sc.clientHeight, e = (k) => k * k * (3 - 2 * k);
      window.__cada = (t) => { sc.scrollTop = Math.round(max * e(Math.min(1, t / 2.6))); };
    },
  },
  // ---------- la pelota: elegir pelotari y un partido en el Labrit ----------
  elige: {
    en: 89.7, url: '?screen=sports&q=high', seg: 1.6, antes: 6, espera: 3000,
    listo: async (p) => {
      await p.waitForFunction(() => window.__hub && !document.querySelector('#hub.hidden'), null, { timeout: 300000 });
      await p.evaluate(() => { document.querySelector('[data-frpick]')?.click(); document.querySelector('[data-fronton="labrit"]')?.click(); }); await p.waitForTimeout(400);
      await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
      await p.waitForFunction(() => document.querySelector('.lg-root [data-a="libre"]'), null, { timeout: 600000 });
      await p.evaluate(() => document.querySelector('.lg-root [data-a="libre"]').click());
      await p.waitForFunction(() => document.querySelector('.ep-pant [data-a="ok"]'), null, { timeout: 120000 });
    },
    guion: [[0.2, (p) => p.evaluate(() => document.querySelector('.ep-pant .c3-flecha.der')?.click())], [0.9, (p) => p.evaluate(() => document.querySelector('.ep-pant .c3-flecha.der')?.click())]],
  },
  partido: {
    en: 91.3, url: '?screen=sports&q=high', seg: 6.0, antes: 24, espera: 4000,
    listo: async (p) => {
      await p.waitForFunction(() => window.__hub && !document.querySelector('#hub.hidden'), null, { timeout: 300000 });
      await p.evaluate(() => { document.querySelector('[data-frpick]')?.click(); document.querySelector('[data-fronton="labrit"]')?.click(); }); await p.waitForTimeout(400);
      await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
      await p.waitForFunction(() => document.querySelector('.lg-root [data-a="libre"]'), null, { timeout: 600000 });
      await p.evaluate(() => document.querySelector('.lg-root [data-a="libre"]').click());
      await p.waitForFunction(() => document.querySelector('.ep-pant [data-a="ok"], .pel-panel [data-pel-go]'), null, { timeout: 120000 });
      await p.evaluate(() => { const b = document.querySelector('.ep-pant [data-a="ok"]'); if (b) b.click(); });
      await p.waitForFunction(() => !document.querySelector('.ep-pant [data-a="ok"]'), null, { timeout: 60000 });
      // «¿En qué frontón?» (el carrusel de frontones del partido libre): «Jugar aquí» en el que sale delante
      for (let k = 0; k < 3; k++) {
        const h = await p.waitForFunction(() => document.querySelector('.pel-panel [data-pel-go]') ? 'go' : document.querySelector('.c3-pant [data-a="ok"]') ? 'fr' : null, null, { timeout: 180000 });
        if (await h.jsonValue() === 'go') break;
        await p.evaluate(() => document.querySelector('.c3-pant [data-a="ok"]')?.click()); await p.waitForTimeout(1500);
      }
      await p.waitForFunction(() => document.querySelector('.pel-panel [data-pel-go]'), null, { timeout: 180000 });
      await p.evaluate(() => document.querySelector('[data-pel-go]').click());
      await p.waitForFunction(() => { const g = window.__game?.pelotaMatch?.game; return g && g.phase !== 'intro'; }, null, { timeout: 180000 });
      // (juega solo; fuera la ayuda de teclas de los primeros tantos, que tapa la cancha)
      await p.evaluate(() => { const M = window.__game.pelotaMatch; M.game.autoplay = true; const h = M.hud; if (h?.teclas) { h.teclas(false); h.teclas = () => {}; } });
    },
  },
  // ---------- «El Basajaun es una leyenda… ¡pero el bosque es de verdad!» ----------
  bosque: {
    // (otra parte de la selva que la toma de Irati, la del bosque cerrado, a media tarde, con la luz entre los troncos)
    en: 97.3, url: '?town=selva-irati&q=high&skipintro=1&weather=clear&t=15.4', seg: 3.8, antes: 30,
    // (de dron: por encima de las copas de la selva, hacia delante y bajando un poco, con la luz de la tarde)
    prep: () => {
      const J = window.__j, P = J.G.player; J.limpia(); const F = window.__layout.PLACES.forest, b = J.corre(F, 24, { anda: true, snap: true });
      const fx = -Math.cos(b.a), fz = -Math.sin(b.a), e = (k) => k * (2 - k), y0 = J.suelo(F.x, F.z);
      J.dron((t) => {
        const k = e(Math.min(1, t / 3.8)), s = -34 + 44 * k, x = F.x + fx * s, z = F.z + fz * s, y = Math.max(J.suelo(x, z) + 24, y0 + 36 - 6 * k);
        return { pos: [x, y, z], look: [x + fx * 30, y - 16, z + fz * 30] };
      });
    },
  },
  // ---------- el final: el Bobo en Muskilda con las ocho cintas, y el baile ----------
  bobo: charla('bobo', 11.6, 3.9, { en: 101.05, habla: 0.05, frases: ['¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!'],
    extra: "import('/src/game/content.js').then(m => { J.G.state.ribbons = m.RIBBONS.map(r => r.id); J.G.refreshHUD?.(); });" }),
  danza: {
    en: 104.95, url: `?${OT}&weather=clear&t=12.2`, seg: 10.75, antes: 48,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia();
      import('/src/game/content.js').then(m => { G.state.ribbons = m.RIBBONS.map(r => r.id); G.refreshHUD?.(); });
      // (el baile empieza ya, en los pasos de antes, para que la cámara llegue a su sitio antes de la toma; y el jugador
      // baila bien: pulsa la flecha de cada nota cuando llega a la línea)
      G.startDance();
      const pulsa = () => {
        const d = G.dn; if (!d) return; const teclas = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'];
        for (const s of d.seq) if (!s.__p && s.t <= d.t + 1 / 24 && s.t > d.t - 0.2) { s.__p = 1; window.dispatchEvent(new KeyboardEvent('keydown', { key: teclas[s.lane], bubbles: true })); }
      };
      window.__antes = pulsa; window.__cada = pulsa;
    },
  },
};
