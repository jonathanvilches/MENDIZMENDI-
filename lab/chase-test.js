// Prueba de la persecución nocturna con tiempo simulado (a 20 fotogramas por segundo, sin
// depender de lo rápido que dibuje el navegador): 1) perseguir en línea recta, 2) esperar a
// que se canse, 3) cortarle el paso según su aviso.
(async () => {
  const G = __game, sleep = (ms) => new Promise(r => setTimeout(r, ms)), log = [];
  window.__autoWin = true; G.ui.dialog = async () => 0;
  const M = G.missions.find(m => m.type === 'legend'); if (!M) return ['sin leyenda'];
  G.sky.time = 23.2; M.count = M.need; G.startLegend(M); M.step = 3;
  const P = G.player, go = (x, z) => { P.place(x, z, P.heading); G.follow.snap(P); };
  go(M.lair.x + 12, M.lair.z + 2); await sleep(5500);
  const c = M.chase; if (!c) return ['la persecución no empezó'];
  G.mode = 'test';                                          // que el bucle del juego no la mueva a la vez
  const A = c.a.pos, dt = 0.05, dist = () => Math.hypot(A.x - P.pos.x, A.z - P.pos.z);
  const run = (sec, strat) => { const st = {}; let min = 99; for (let i = 0; i < sec / dt && !c.caught; i++) { strat(); c.update(dt); st[c.state] = (st[c.state] || 0) + dt; min = Math.min(min, dist()); } return { st, min }; };
  const toward = (x, z, v = 6.8) => { const dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz) || 1; P.heading = Math.atan2(dx, dz); go(P.pos.x + dx / d * Math.min(d, v * dt), P.pos.z + dz / d * Math.min(d, v * dt)); };
  go(A.x + 9, A.z + 2);
  // 1) correr detrás en línea recta 5 s
  let d0 = dist(), r = run(5, () => toward(A.x, A.z));
  log.push(`1) persecución en línea recta 5 s: ${d0.toFixed(1)} → ${dist().toFixed(1)} m · estados ${JSON.stringify(Object.fromEntries(Object.entries(r.st).map(([k, v]) => [k, +v.toFixed(1)])))}`);
  // 2) seguir hasta que se canse
  r = run(8, () => toward(A.x, A.z));
  log.push(`2) sigue corriendo 8 s: distancia mínima ${r.min.toFixed(1)} m · se cansó: ${!!r.st.tired} · atrapada: ${c.caught}`);
  // 3) estrategia: cuando avisa, correr a su destino para cortarle el paso
  if (!c.caught) { r = run(15, () => { const g = c.state === 'warn' || c.state === 'flee' ? c.goal : A; toward(g.x, g.z); }); log.push(`3) cortando el paso 15 s: atrapada ${c.caught} (mínima ${r.min.toFixed(1)} m)`); }
  G.mode = 'play';
  await sleep(4000);
  log.push(`misión completada: ${M.done}`);
  return log;
})()
