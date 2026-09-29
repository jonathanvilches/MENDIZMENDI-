(async () => {
  const G = __game, sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const M = G.missions.find(m => m.type === 'pelota');
  G.fronton.play(G, M.host);
  await sleep(2600);
  return G.fronton ? 'ok' : 'no fronton';
})()
