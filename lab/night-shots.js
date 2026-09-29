// Prepara escenas nocturnas de leyenda para capturas: pista brillante y aparición de la criatura
(async () => {
  const G = __game, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const stage = new URLSearchParams(location.search).get('stage') || 'clue';
  G.sky.time = 22.4;
  const M = G.missions.find(m => m.type === 'legend');
  M.step = 1; G.startLegend(M);
  await sleep(400);
  if (stage === 'clue') {
    const k = G.clues.find(c => c.M === M);
    const dx = k.x - M.host.pos.x, dz = k.z - M.host.pos.z, l = Math.hypot(dx, dz) || 1;
    G.player.place(k.x - dx / l * 6, k.z - dz / l * 6, Math.atan2(dx, dz)); G.follow.snap(G.player);
    G.ui.whisper(M.leg.clues[0].text, 60000);
  } else {
    for (const k of G.clues.filter(c => c.M === M)) { k.found = true; k.obj.visible = false; }
    M.count = M.need; M.step = 3;
    const s = M.lair, dx = M.host.pos.x - s.x, dz = M.host.pos.z - s.z, l = Math.hypot(dx, dz) || 1; const p = G.spot({ x: s.x + dx / l * 3.6, z: s.z + dz / l * 3.6 }, 2); G.player.place(p.x, p.z, Math.atan2(s.x - p.x, s.z - p.z)); G.follow.snap(G.player); G.follow.yaw = Math.atan2(p.x - s.x, p.z - s.z) + 0.75;
    G.updateNight(0.016);
    await sleep(2500);
  }
  return 'ok';
})()
