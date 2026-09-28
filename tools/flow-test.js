(async () => {
  const g = window.__game;
  const log = [];
  g.ui.dialog = async (lines) => { for (const l of lines) if (l.choices && l.onChoice) l.onChoice(0); return 0; };
  g.ui.reward = async () => {};
  const st = () => Object.entries(g.state.quests).map(([k, v]) => `${k}=${v.state}:${v.step}`).join(' ');
  const T = async (id) => { await g.talk(g.npcs[id]); };
  const tick = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r)); };
  // bienvenida
  await T('maite'); log.push('1 ' + st());
  const br = { x: g.npcs.maite.pos.x, z: g.npcs.maite.pos.z };
  g.teleport(-1.2, -8); g.player.pos.set(-1.2, g.player.pos.y, -8); g.checkPlaces(); log.push('2 ' + st());
  await g.interact({ kind: 'fountain', x: 0, z: 0 }); log.push('3 ' + st());
  await T('itziar'); log.push('4 ' + st());
  await T('maite'); log.push('5 ' + st() + ' ribbons=' + g.state.ribbons);
  // escudos
  await T('itziar');
  for (const p of window.__game.interactables().filter(i => i.kind === 'palace')) await g.interact(p);
  await T('itziar'); log.push('escudos ' + g.q('escudos').state + ' ribbons=' + g.state.ribbons.length);
  // ovejas
  await T('joxemari'); log.push('ovejas ' + g.q('ovejas').state + ':' + g.q('ovejas').step + ' herd=' + g.herd.length);
  const pen = (await import('/src/world/landmarks.js')).LANDMARKS.pen;
  for (const s of g.herd) { s.pos.x = pen.x; s.pos.z = pen.z; }
  g.updateHerding(0.1); log.push('herded step=' + g.q('ovejas').step + ' penned=' + g.penned);
  await T('joxemari'); log.push('ovejas ' + g.q('ovejas').state);
  // pelota
  await T('kike'); log.push('pelota mode=' + g.mode);
  g.endPelota(); g.q('pelota').state = 'active'; await g.winPelota(); log.push('pelota ' + g.q('pelota').state);
  // irati
  await T('inaki'); log.push('irati ' + g.q('irati').state + ':' + g.q('irati').step + ' bino=' + g.state.hasBino);
  g.state.observed = ['corzo', 'ciervo', 'ardilla', 'pito', 'buitre']; g.advance('irati', 2);
  await T('inaki'); log.push('irati ' + g.q('irati').state);
  // basajaun
  await T('basajaun'); log.push('basajaun litter items=' + g.litterItems.length);
  for (const it of [...g.litterItems]) await g.pickItem(it);
  await T('basajaun'); log.push('basajaun ' + g.q('basajaun').state);
  // lamia
  await T('lamia'); log.push('lamia comb=' + !!g.combItem);
  await g.pickItem(g.combItem); await T('lamia'); log.push('lamia ' + g.q('lamia').state);
  // zarratrako
  await T('amaia'); log.push('zarra ' + g.q('zarratrako').step + ' vis=' + g.npcs.zarratrako.visible);
  for (let k = 0; k < 3; k++) { const a = g.npcs.zarratrako; g.player.pos.set(a.pos.x + 1, a.pos.y, a.pos.z); g.zarra.fleeing = 0; g.updateZarratrako(0.1); await new Promise(r => setTimeout(r, 1000)); }
  log.push('zarra step=' + g.q('zarratrako').step);
  await T('amaia'); log.push('zarra ' + g.q('zarratrako').state + ' ribbons=' + g.state.ribbons.length);
  log.push('muskilda ' + g.q('muskilda').state + ':' + g.q('muskilda').step + ' tracked=' + g.state.tracked);
  await T('bobo'); log.push('dance mode=' + g.mode);
  // eguzkilore
  const eg = g.items.find(i => i.kind === 'eguz'); await g.pickItem(eg); log.push('eguz=' + g.state.eguz.length + ' cards=' + g.state.cards.length);
  // quiz
  await T('garazi'); log.push('stars=' + g.state.stars + ' quiz=' + g.state.quiz.length);
  return log;
})()
