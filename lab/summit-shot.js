(async () => {
  const G = __game, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const M = G.missions.find(m => m.type === 'summit'); G.startSummit(M);
  const c = M.cairns[M.cairns.length - 1], b = M.cairns[M.cairns.length - 2];
  const dx = c.x - b.x, dz = c.z - b.z, l = Math.hypot(dx, dz);
  G.player.place(c.x - dx / l * 7, c.z - dz / l * 7, Math.atan2(dx, dz)); G.follow.snap(G.player); G.follow.yaw = Math.atan2(-dx, -dz);
  await sleep(500); return M.peak.name + ' ' + Math.round(c.x) + ',' + Math.round(c.z);
})()
