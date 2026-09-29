// Uso: node tools/play.mjs <url> <prefix> '<json de pasos>'
// pasos: [{js:"código", wait:ms, shot:"nombre", keys:[..], hold:{key,ms}}]
import { chromium } from 'playwright-core';
const [,, url, prefix, stepsJson, w = 1280, h = 720] = process.argv;
const steps = JSON.parse(stepsJson);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', m => { const t = m.text(); if (!/toNonIndexed|vite|Canvas2D|CERT|404|AudioContext|NaN|bake/.test(t)) logs.push(m.type() + ': ' + t); });
page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
await page.goto(url);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 }).catch(() => logs.push('timeout ready'));
for (const s of steps) {
  try {
    if (s.file) { const code = (await import('fs')).readFileSync(s.file, 'utf8'); const r = await page.evaluate(code); if (r !== undefined) logs.push('file> ' + JSON.stringify(r, null, 1)); }
    if (s.js) { const r = await page.evaluate(s.js); if (r !== undefined) logs.push('js> ' + JSON.stringify(r)); }
    if (s.keys) for (const k of s.keys) await page.keyboard.press(k);
    if (s.hold) { await page.keyboard.down(s.hold.key); await page.waitForTimeout(s.hold.ms); await page.keyboard.up(s.hold.key); }
    if (s.wait) await page.waitForTimeout(s.wait);
    if (s.shot) await page.screenshot({ path: `${prefix}-${s.shot}.png` });
  } catch (e) { logs.push('STEP ERROR: ' + e.message); }
}
console.log(logs.slice(0, 60).join('\n'));
await browser.close();
