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
        for (let s = 2; s <= lejos - 3 && bien; s += 1.5) { const xx = x - Math.cos(a) * s, zz = z - Math.sin(a) * s; if (!ok(xx, zz, 0.5)) bien = false; sube = Math.max(sube, Math.abs(suelo(xx, zz) - suelo(x, z))); }
        for (let s = 1; s <= 5 && bien; s += 1) if (!ok(x + Math.cos(a) * s, z + Math.sin(a) * s, 0.35)) bien = false;
        if (bien && (!best || sube < best.sube)) best = { x, z, a, sube };
      }
      best ||= { x: c.x + lejos, z: c.z, a: 0 };
      const dx = -Math.cos(best.a), dz = -Math.sin(best.a), h = Math.atan2(dx, dz);
      P.place(best.x, best.z, h); P.obj.visible = true; rt.follow.yaw = h + Math.PI;
      J.teclas(o.anda ? ['w'] : ['w', 'shift']);
      return best;
    },
    // fuera el caballo propio y los vehículos sueltos de la entrada (se ponían delante)
    limpia() { for (const V of G.av?.vehs || []) { try { V.dispose(); } catch (e) { } } if (G.av) G.av.vehs = []; if (G.montura && !G.player.vehiculo) { try { G.montura.dispose?.(); } catch (e) { } G.montura = null; } G.sinMontura = true; },
    teclas(ks) { G.input.keys.clear(); for (const k of ks) G.input.keys.add(k); },
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
  prep: eval(`() => { const J = window.__j, a = J.G.npcs?.${quien}; if (!a) throw new Error('sin ${quien}'); J.limpia(); J.hacia(a, ${o.lejos ?? 2.6}${o.h != null ? `, { h: ${o.h} }` : ''}); J.charla(a, ${JSON.stringify({ habla: o.habla ?? 0.1, pasa: o.pasa || [], frases: o.frases })}); ${o.extra || ''} }`),
  guion: o.guion,
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
  llegada: {
    en: 7.5, url: `?${OT}&weather=clear&t=10.4`, seg: 4.4, antes: 30,
    prep: () => { const J = window.__j; J.limpia(); const L = window.__layout?.PLACES; J.corre(L?.plaza, 30); },
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
  kike: charla('kike', 17.2, 3.9, { en: 38.2, habla: 0.1, frases: ['¡Aupa! Soy Kike. ¿Juegas a pelota?'] }),
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
  // la lámina «por dentro» del queso de las ovejas latxas
  lamina: {
    en: 59.1, url: `?${OT}&weather=clear&t=12`, seg: 2.3, antes: 24,
    prep: () => { window.__j.limpia(); },
    guion: [[0, (p) => p.evaluate(() => import('/src/ui/anatomia.js').then(m => { m.laminaTecnica(window.__game.ui, 'queso', { button: '¡Vamos!' }); }))]],
  },
  // el pastoreo: la misión de Joxemari, las ovejas por el monte y el jugador detrás
  pastoreo: {
    en: 61.4, url: `?${OT}&weather=clear&t=9.4`, seg: 1.2, antes: 60,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia(); G.activate('ovejas'); G.advance('ovejas', 1); G.startHerding(false);
      const fl = (G.sheep || G.herd || []).filter(o => o.pos); const o = fl[0];
      if (o) { const P = G.player; P.place(o.pos.x - 6, o.pos.z - 2, Math.atan2(6, 2)); J.rt.follow.yaw = Math.atan2(6, 2) + Math.PI; J.teclas(['w', 'shift']); }
    },
  },
  // el carnaval: la comparsa de joaldunak por las calles de Ituren, con sus cencerros
  carnaval: {
    en: 62.5, url: '?town=ituren&q=high&skipintro=1&weather=clear&t=12.5', seg: 1.1, antes: 150,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia(); const M = (G.missions || []).find(m => m.type === 'carnival'); if (!M) throw new Error('sin carnaval');
      M.count = M.need; G.desfileCarnaval(M, window.__layout.PLACES.plaza);
      const pl = window.__layout.PLACES.plaza; J.corre(pl, 18, { anda: true });
    },
  },
  // las leyendas: la sombra de Teodosio sale de la cueva de Aralar
  leyenda: {
    en: 63.5, url: '?town=sierra-aralar&q=high&skipintro=1&weather=niebla&t=19.4', seg: 1.45, antes: 30,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia(); const M = (G.missions || []).find(m => m.type === 'legend'); if (!M) throw new Error('sin leyenda');
      const L = M.lair || M.m?.lairPos || G.player.pos; const P = G.player; P.place(L.x + 9, L.z + 9, Math.atan2(-9, -9)); J.rt.follow.yaw = Math.atan2(-9, -9) + Math.PI;
      G.showCreature(M);
    },
  },
  // ---------- «La naturaleza y la cultura, contadas jugando» ----------
  caballo: {
    en: 64.85, url: `?${OT}&weather=clear&t=16.8`, seg: 1.85, antes: 40,
    prep: () => {
      const J = window.__j, G = J.G, P = G.player; if (!G.montura) G.creaMontura?.(); const M = G.montura; if (!M?.A) throw new Error('sin montura');
      P.place(M.A.pos.x + 1, M.A.pos.z + 1, 0); M.sube(P); J.corre(null, 30);
    },
  },
  irati: {
    en: 66.7, url: '?town=selva-irati&q=high&skipintro=1&weather=clear&t=10.4', seg: 1.8, antes: 30,
    prep: () => { const J = window.__j; J.limpia(); J.corre(null, 20, { anda: true }); },
  },
  // ---------- la pelota: elegir pelotari y un partido en el Labrit ----------
  elige: {
    en: 68.5, url: '?screen=sports&q=high', seg: 1.6, antes: 6, espera: 3000,
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
    en: 70.1, url: '?screen=sports&q=high', seg: 6.0, antes: 24, espera: 4000,
    listo: async (p) => {
      await p.waitForFunction(() => window.__hub && !document.querySelector('#hub.hidden'), null, { timeout: 300000 });
      await p.evaluate(() => { document.querySelector('[data-frpick]')?.click(); document.querySelector('[data-fronton="labrit"]')?.click(); }); await p.waitForTimeout(400);
      await p.evaluate(() => document.querySelector('[data-sport="pelota"]').click());
      await p.waitForFunction(() => document.querySelector('.lg-root [data-a="libre"]'), null, { timeout: 600000 });
      await p.evaluate(() => document.querySelector('.lg-root [data-a="libre"]').click());
      await p.waitForFunction(() => document.querySelector('.ep-pant [data-a="ok"], .pel-panel [data-pel-go]'), null, { timeout: 120000 });
      await p.evaluate(() => { const b = document.querySelector('.ep-pant [data-a="ok"]'); if (b) b.click(); });
      await p.waitForFunction(() => document.querySelector('.pel-panel [data-pel-go]'), null, { timeout: 180000 });
      await p.evaluate(() => document.querySelector('[data-pel-go]').click());
      await p.waitForFunction(() => { const g = window.__game?.pelotaMatch?.game; return g && g.phase !== 'intro'; }, null, { timeout: 180000 });
      await p.evaluate(() => { window.__game.pelotaMatch.game.autoplay = true; });
    },
  },
  // ---------- «El Basajaun es una leyenda… ¡pero el bosque es de verdad!» ----------
  bosque: {
    en: 76.1, url: '?town=selva-irati&q=high&skipintro=1&weather=clear&t=11.2', seg: 3.8, antes: 30,
    prep: () => { const J = window.__j; J.limpia(); J.corre(null, 24, { anda: true, h: 1.6 }); },
  },
  // ---------- el final: el Bobo en Muskilda con las ocho cintas, y el baile ----------
  bobo: charla('bobo', 11.6, 3.9, { en: 79.85, habla: 0.05, frases: ['¡Las ocho cintas! ¡Los danzantes ya pueden ponerse sus trajes!'],
    extra: "import('/src/game/content.js').then(m => { J.G.state.ribbons = m.RIBBONS.map(r => r.id); J.G.refreshHUD?.(); });" }),
  danza: {
    en: 83.75, url: `?${OT}&weather=clear&t=12.2`, seg: 10.75, antes: 24,
    prep: () => {
      const J = window.__j, G = J.G; J.limpia();
      import('/src/game/content.js').then(m => { G.state.ribbons = m.RIBBONS.map(r => r.id); G.refreshHUD?.(); });
      window.__cada = (t) => {
        if (!G.dn && t >= 0) G.startDance();
        // (el jugador baila bien: pulsa la flecha de cada nota cuando llega a la línea)
        const d = G.dn; if (!d) return; const teclas = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'];
        for (const s of d.seq) if (!s.__p && s.t <= d.t + 1 / 24 && s.t > d.t - 0.2) { s.__p = 1; window.dispatchEvent(new KeyboardEvent('keydown', { key: teclas[s.lane], bubbles: true })); }
      };
    },
  },
};
