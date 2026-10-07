// Vigía de figuras para las pruebas en el navegador: se inyecta en la página y, fotograma a fotograma, anota lo que se
// vería raro en una figura animada (GlbChar): saltos de sitio, mezcla de clips por debajo del peso 1 (asoma la postura en
// cruz del modelo), cambios de clip a ráfagas, patinar (moverse con el clip de quieto), clip congelado, cadera fuera del
// cuerpo, valores NaN o figura oculta. Uso: await page.evaluate(VIGIA_SRC) y luego window.__vigia.* (ver abajo).
export const VIGIA_SRC = `(() => {
  const V = window.__vigia = { list: [], frames: 0 };
  // seguir una figura: name, root (el GlbChar.root), speed() en m/s, skip() (fotogramas que no cuentan: repetición, saque)
  V.add = (name, root, speed, skip) => {
    const c = root?.userData?.glbChar; if (!c) return;
    const hips = Object.values(c.bones).find(b => /hips$/i.test(b.name));
    V.list.push({ name, c, root, hips, speed, skip: skip || (() => false), last: null, sw0: c.switches, swHist: [], tCur: null, frozen: 0,
      n: { frames: 0, jump: 0, maxJump: 0, lowW: 0, minW: 1, burst: 0, skate: 0, runStill: 0, frozen: 0, hips: 0, nan: 0, hidden: 0, switches: 0 }, ex: [] });
  };
  const wp = (o) => { o.updateWorldMatrix(true, false); const e = o.matrixWorld.elements; return [e[12], e[13], e[14]]; };
  const vis = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  V.step = (dt, t, tag = '') => {
    V.frames++;
    for (const f of V.list) {
      const c = f.c, n = f.n; if (f.skip()) { f.last = null; continue; }
      n.frames++;
      const p = wp(f.root), sp = f.speed() || 0, note = (k, extra) => { n[k]++; if (f.ex.length < 40) f.ex.push([+t.toFixed(2), k, tag, c.currentName, +sp.toFixed(2), extra]); };
      if (p.some(v => !Number.isFinite(v))) { note('nan'); continue; }
      if (!vis(f.root)) note('hidden');
      if (f.last) { const d = Math.hypot(p[0] - f.last[0], p[2] - f.last[2]); n.maxJump = Math.max(n.maxJump, d); if (d > Math.max(0.6, sp * dt * 3 + 0.15)) note('jump', +d.toFixed(2)); }
      f.last = p;
      // pesos: la suma de las acciones activas (por debajo de 0,9 se mezcla la postura de reposo del modelo)
      let w = 0; for (const a of Object.values(c.actions)) if (a.isRunning() || a.getEffectiveWeight() > 0) w += a.getEffectiveWeight();
      n.minW = Math.min(n.minW, w); if (w < 0.9) note('lowW', +w.toFixed(2));
      // ráfagas: más de 4 cambios de clip en un segundo
      const sw = c.switches - f.sw0; f.sw0 = c.switches; n.switches += sw; for (let i = 0; i < sw; i++) f.swHist.push(t);
      while (f.swHist.length && t - f.swHist[0] > 1) f.swHist.shift(); if (f.swHist.length > 4) { note('burst', f.swHist.length); f.swHist.length = 0; }
      // patinar: moverse rápido con el clip de quieto (sin gesto suelto) o correr parado
      if (!c.oneShot && sp > 1.2 && !/^(Walk|Run)$/.test(c.currentName)) note('skate');
      if (!c.oneShot && sp < 0.05 && c.currentName === 'Run' && c.speed < 0.05) note('runStill');
      // clip congelado: el tiempo del clip no avanza en un segundo (sin estar parado a propósito)
      const a = c.current; if (a && a.timeScale !== 0 && a.loop !== 2200) { if (f.tCur !== null && Math.abs(a.time - f.tCur) < 1e-5) { f.frozen += dt; if (f.frozen > 1) { note('frozen'); f.frozen = 0; } } else f.frozen = 0; f.tCur = a.time; }
      // cadera: lejos de la figura (miembros «desconectados»)
      if (f.hips) { const h = wp(f.hips), d = Math.hypot(h[0] - p[0], h[2] - p[2]); if (d > 1.2 || h[1] - p[1] > 2.2 || h[1] - p[1] < -0.4) note('hips', +d.toFixed(2)); }
    }
  };
  V.gap = () => { for (const f of V.list) { f.last = null; f.tCur = null; } };   // (tras ceder el hilo: el bucle real también movió el juego)
  V.report = () => V.list.map(f => ({ name: f.name, ...f.n, maxJump: +f.n.maxJump.toFixed(2), minW: +f.n.minW.toFixed(2), ex: f.ex.slice(0, +(window.__vigiaEx || 8)) }));
  V.total = () => { const t = {}; for (const f of V.list) for (const [k, v] of Object.entries(f.n)) if (!/^(frames|maxJump|minW|switches)$/.test(k)) t[k] = (t[k] || 0) + v; return t; };
})()`;
