// Recorre todas las misiones del pueblo cargado, simulando al jugador
(async () => {
  const G = __game, log = [], sleep = (ms) => new Promise(r => setTimeout(r, ms));
  window.__autoWin = true;
  G.ui.dialog = async (lines) => { for (let i = 0; i < lines.length; i++) { const L = lines[i]; if (L.choices) { const r = L.onChoice?.(0); if (r) lines.splice(i + 1, 0, ...r); } } return 0; };
  const go = async (x, z) => { G.player.place(x, z, 0); G.follow.snap(G.player); await sleep(200); };
  for (const M of G.missions) {
    const t0 = performance.now(); (window.__fl ||= []).push(`${M.i} ${M.type}: empieza`);
    try {
      if (G.unlocked && !G.unlocked(M)) { log.push(`${M.i} ${M.type}: bloqueada`); continue; }   // (hoy todas se hacen en cualquier orden)
      await go(M.host.pos.x + 1.5, M.host.pos.z + 1.5);
      await G.talk(M.host);
      let guard = 0;
      while (!M.done && guard++ < 12) {
        const T = G.target(M);
        if (M.type === 'visit' && M.step === 1) { for (const p of M.places) { if (!p.seen) { await go(p.at.x, p.at.z); G.checkArrival(); await sleep(300); } } }
        else if (['process', 'harvest'].includes(M.type) && M.step === 1) { for (const it of G.items.filter(i => i.M === M)) G.pick(it); }
        // dolmen y castillo: ir a cada hallazgo o bandera y cogerlo (cada uno abre su ficha)
        else if (['dolmen', 'castle'].includes(M.type) && M.step === 1) { for (const it of G.items.filter(i => i.M === M)) { await go(it.x + 1, it.z); G.pick(it); await sleep(150); G.ui.closeModal?.(); G.player.frozen = false; } }
        // cima: antes, la mochila con agua y dos alimentos (como haría el jugador en la fuente y el puesto)
        else if (M.type === 'summit' && M.step === 0) { G.P.bag.agua = Math.max(1, G.P.bag.agua || 0); G.P.bag.food = { ...(G.P.bag.food || {}), queso: 2 }; }
        // mirador: los montes se encuentran con los prismáticos (se da por hecho)
        else if (M.type === 'mirador' && M.step === 1) { const v = G.miradorSpot(); if (v) await go(v.x, v.z); M.count = M.need; M.step = 2; }
        // feria: ir a los corrales
        else if (M.type === 'feria' && M.step === 1 && M.fair) { await go(M.fair.x + 2, M.fair.z + 2); await G.judgeFair(M); }
        // personaje: ir a su recuerdo y responder la pregunta de la placa
        else if (M.type === 'figure' && M.step === 1 && M.memo) { await go(M.memo.x + 1.5, M.memo.z); await G.doMemorial(M); }
        else if (M.type === 'legend' && M.step === 2) { for (const k of G.clues.filter(k => k.M === M && !k.found)) { await go(k.x + 1, k.z); await G.examineClue(k); } }
        else if (M.type === 'legend' && M.step === 3) { await go(M.lair.x + 2, M.lair.z + 2); G.updateNight(0.016); await sleep(200); if (M.creature?.shown) { await G.meetCreature(M); continue; } }
        else if (M.type === 'herd' && M.step === 1) { const pen = __game.fauna && G.herd; for (const s of G.herd || []) { s.pos.x = window.__TOWN_PEN.x; s.pos.z = window.__TOWN_PEN.z; } G.updateHerd(0.016); }
        else if (M.type === 'carnival' && M.step === (M.night ? 2 : 1)) { for (const f of G.folk.filter(f => !f.found)) { await go(f.pos.x + 1, f.pos.z + 1); G.updateFolk(f, 0.016); } }
        else if (M.type === 'trade' && M.step === 1) { await go(M.bench.x + 1, M.bench.z); await G.doTrade(M); }
        else if (M.type === 'race' && M.step === 1) { for (const g of G.gates.slice()) { await go(g.x, g.z); G.updateRace(0.016); } }
        else if (M.type === 'dance' && M.step === 1) { const c = G.plazaStage(); await go(c.x, c.z); for (let k = 0; k < 30 && !G.dn; k++) await sleep(100); if (G.dn) { G.dn.hits = G.dn.total; G.dn.i = G.dn.seq.length; G.dn.t = 1e4; G.updateDance(0.016); await sleep(1800); continue; } }
        else if (M.type === 'pelota') { M.done || await G.complete(M, {}); }
        else if (M.type === 'summit' && M.step === 1) { for (const c of M.cairns) { await go(c.x + 1, c.z); G.updateSummit(M); await sleep(150); } await sleep(500); continue; }
        else if (M.type === 'observe' && M.step === 1) { M.count = M.need; M.step = 2; }
        if (!M.done) { await go(M.host.pos.x + 1.5, M.host.pos.z + 1.5); await G.talk(M.host); }
      }
      log.push(`${M.i} ${M.type}: ${M.done ? 'OK' : 'FALLO paso ' + M.step} (${Math.round(performance.now() - t0)} ms)`);
    } catch (e) { log.push(`${M.i} ${M.type}: ERROR ${e.message} ${e.stack.split('\n')[1]}`); }
  }
  const P = JSON.parse(localStorage.getItem('mendimendiz-perfil-v1'));
  log.push('sello: ' + P.towns[G.def.id]?.stamp + ' xp: ' + P.xp + ' insignias: ' + P.badges.join(','));
  return log;
})()
