import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => { localStorage.setItem('mendimendiz-perfil-v1', JSON.stringify({ name: 'Ane', avatar: 'leire' })); });
const cdp = await page.context().newCDPSession(page);
if (process.argv[3] === 'warm') { await page.goto(process.argv[2], { timeout: 300000 }); await page.waitForFunction(() => window.__ready, null, { timeout: 300000 }); await page.waitForTimeout(40000); }
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdp.send('Profiler.start');
await page.goto(process.argv[2], { timeout: 300000 });
await page.waitForFunction(() => window.__ready, null, { timeout: 300000 });
await page.waitForTimeout(12000);
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map(n => [n.id, n])); const parent = new Map();
for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const self = new Map(); const dts = profile.timeDeltas; 
profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (dts[i] || 0)));
const incl = new Map();
for (const [id, t] of self) { const seen = new Set(); let cur = id; while (cur != null) { const n = byId.get(cur); const k = n.callFrame.functionName || '(anon)'; if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + t); } cur = parent.get(cur); } }
const sf = new Map(); for (const [id, t] of self) { const k = byId.get(id).callFrame.functionName || '(anon)'; sf.set(k, (sf.get(k) || 0) + t); }
console.log('INCL', [...incl].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, t]) => k + ':' + Math.round(t / 1000)).join('  '));
console.log('SELF', [...sf].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, t]) => k + ':' + Math.round(t / 1000)).join('  '));
// línea de tiempo: tramos seguidos sin inactividad, con las funciones más pesadas
let tm = profile.startTime, run = null; const runs = [];
const chain = (id) => { const out = []; let cur = id; while (cur != null) { out.push(byId.get(cur).callFrame.functionName); cur = parent.get(cur); } return out; };
profile.samples.forEach((id, i) => { tm += dts[i] || 0; const fn = byId.get(id).callFrame.functionName; const idle = fn === '(idle)' || fn === '(program)' && false;
  if (idle) { if (run) { runs.push(run); run = null; } return; }
  if (!run) run = { t0: tm, t1: tm, c: new Map() }; run.t1 = tm; for (const k of new Set(chain(id))) if (k) run.c.set(k, (run.c.get(k) || 0) + (dts[i] || 0)); });
if (run) runs.push(run);
for (const r of runs) if (r.t1 - r.t0 > 400000) console.log('TASK', Math.round((r.t0 - profile.startTime) / 1000), Math.round((r.t1 - r.t0) / 1000) + 'ms', [...r.c].sort((a, b) => b[1] - a[1]).slice(2, 16).map(([k, t]) => k + ':' + Math.round(t / 1000)).join(' '));
await browser.close();
