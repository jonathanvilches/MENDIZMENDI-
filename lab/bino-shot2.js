// Prismáticos: busca un ave de la especie pedida que se vea sin obstáculos y la encuadra
(async () => {
  const G = __game, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const id = new URLSearchParams(location.search).get('bird') || 'buitre';
  const M = G.missions.find(m => m.type === 'observe'); if (M) { M.step = 1; G.obsSeen = new Set(); }
  // subir a un sitio despejado: el campo más abierto del pueblo
  const f = __layout.PLACES.fields || __layout.PLACES.edgeN; G.player.place(f.x, f.z, 0); G.follow.snap(G.player);
  G.binoOn = true; G.toggleBinoculars(); await sleep(300);
  for (let i = 0; i < 60; i++) {
    const o = G.fauna.observables().find(x => x.id === id); if (!o) return 'sin ' + id;
    const P = G.player.pos, dx = o.pos.x - P.x, dy = o.pos.y - (P.y + 1.55), dz = o.pos.z - P.z;
    G.binoYaw = Math.atan2(dx, dz); G.binoPitch = Math.atan2(dy, Math.hypot(dx, dz));
    await sleep(30);
  }
  return 'ok';
})()
