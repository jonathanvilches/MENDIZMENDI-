// El mapa 3D de Navarra del inicio: las comarcas en relieve, cada una en su color y separada de las demás, con todos los
// pueblos del juego señalados encima, y una cámara para recorrerlo. Las comarcas por descubrir salen apagadas y bajas; a
// medida que sellas sus pueblos se encienden y crecen, hasta brillar del todo: así se ve lo que falta para conquistar
// Navarra. Se mueve como en un juego: arrastrar (o WASD y las flechas) para ir adelante, atrás y a los lados, la rueda o
// el pellizco para acercarse, el botón derecho (o Q y E, o girar con dos dedos) para rotar, y los botones de la esquina.
// Al tocar una comarca, la cámara vuela hasta ella; al tocar un pueblo, también, y se abre su ficha.
// Usa el renderizador del menú (src/hub/stage.js: un solo contexto WebGL para todo el menú) y se para solo en cuanto su
// caja sale de la página o deja de verse. Los nombres van en HTML encima del lienzo, nítidos a cualquier tamaño.
import * as THREE from 'three';
import { hubRenderer, rendererVivo } from './stage.js';
import { escala } from '../util/tele.js';
import { esc } from '../util/html.js';

// (las coordenadas son las del mapa de comarcas de comarcas.json, viewBox 10 10 725 780: se centran y se pasan a metros
// del mundo 3D, con el norte hacia el fondo)
const CX = 372, CY = 400, S = 0.1;
const W = (sx, sy) => [(sx - CX) * S, (sy - CY) * S];
const TOP0 = 0.7, TOPX = 1.6;   // (alto de una comarca sin descubrir y lo que crece al sellarla entera)

// el contorno de cada comarca viene en escalones (de una rejilla): se simplifica y se suaviza para que el borde en 3D sea limpio
function puntos(path) {
  const n = path.match(/-?\d+(\.\d+)?/g).map(Number), P = [];
  for (let i = 0; i + 1 < n.length; i += 2) P.push([n[i], n[i + 1]]);
  return P;
}
function simplifica(P, eps) {
  if (P.length < 4) return P;
  const d = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9; return Math.abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / L; };
  const rec = (a, b, out) => { let m = 0, k = -1; for (let i = a + 1; i < b; i++) { const v = d(P[i], P[a], P[b]); if (v > m) { m = v; k = i; } } if (m > eps) { rec(a, k, out); rec(k, b, out); } else out.push(P[a]); };
  const out = []; rec(0, P.length - 1, out); return out;
}
const chaikin = (P) => P.flatMap((p, i) => { const q = P[(i + 1) % P.length]; return [[p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]]; });
function contorno(path) {
  let P = puntos(path); if (P.length > 2 && P[0][0] === P.at(-1)[0] && P[0][1] === P.at(-1)[1]) P.pop();
  P = chaikin(chaikin(simplifica(P, 1.1)));
  let cx = 0, cy = 0; for (const [x, y] of P) { cx += x; cy += y; } cx /= P.length; cy /= P.length;
  // (un poco encogida hacia su centro: entre comarca y comarca queda una raya oscura que las separa)
  const k = 0.982; return { P: P.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]), cx, cy };
}

const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const mezcla = (a, b, t) => a + (b - a) * t;
const color = (hex, gris) => { const c = new THREE.Color(hex), g = new THREE.Color('#2a2140'); return c.lerp(g, gris); };

/**
 * host: la caja donde va el mapa. o: { comarcas: [{ id, name, color, path, pct, done }], towns: [{ id, name, comarca,
 * sx, sy, state: ''|'go'|'ok', bosque, here }], onTown(id), onSelect(comarcaId|null), hueco(), tapa }. hueco: los píxeles que
 * tapa lo de encima ({ t: arriba, r: a la derecha, b: abajo }): Navarra se encaja y lo elegido se centra en lo que queda
 * libre. tapa: un selector de lo de encima (el saludo, los botones…), para que ningún nombre quede debajo.
 * Devuelve { select(id), vista(), dispose() }.
 */
export function mapa3d(host, o) {
  let r; try { r = hubRenderer(); } catch (e) { return null; }   // (sin WebGL: quien llama pone el mapa plano)
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x14062e, 90, 190);
  const cam = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
  scene.add(new THREE.HemisphereLight(0xe6dcff, 0x241046, 1.5));
  const sol = new THREE.DirectionalLight(0xffffff, 1.9); sol.position.set(-30, 60, 25); scene.add(sol);
  const mats = [], geos = [];
  const M = (o2) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05, toneMapped: false, ...o2 }); mats.push(m); return m; };

  // el suelo: un disco morado oscuro con una rejilla tenue y un halo debajo de Navarra
  const tc = document.createElement('canvas'); tc.width = tc.height = 512; const tg = tc.getContext('2d');
  const gr = tg.createRadialGradient(256, 256, 0, 256, 256, 256); gr.addColorStop(0, '#3a1580'); gr.addColorStop(0.45, '#1d0a45'); gr.addColorStop(1, '#0d0420');
  tg.fillStyle = gr; tg.fillRect(0, 0, 512, 512);
  tg.strokeStyle = 'rgba(190,150,255,.10)'; tg.lineWidth = 1; for (let i = 0; i <= 512; i += 16) { tg.beginPath(); tg.moveTo(i, 0); tg.lineTo(i, 512); tg.moveTo(0, i); tg.lineTo(512, i); tg.stroke(); }
  const suelo = new THREE.CanvasTexture(tc); suelo.colorSpace = THREE.SRGBColorSpace;
  const sg = new THREE.CircleGeometry(150, 64); geos.push(sg);
  const base = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: suelo, toneMapped: false })); mats.push(base.material); base.material.map.dispose = suelo.dispose.bind(suelo);
  base.rotation.x = -Math.PI / 2; scene.add(base);

  // las comarcas
  const C = o.comarcas.map((c, i) => {
    const { P, cx, cy } = contorno(c.path);
    const sh = new THREE.Shape(P.map(([x, y]) => { const [X, Z] = W(x, y); return new THREE.Vector2(X, -Z); }));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.14, bevelSegments: 2, curveSegments: 4 });
    g.rotateX(-Math.PI / 2); geos.push(g);
    const gris = c.pct > 0 ? mezcla(0.3, 0, c.pct) : 0.5;   // (sin descubrir, apagada; con cada sello, más su color)
    const top = M({ color: color(c.color, gris), emissive: new THREE.Color(c.color), emissiveIntensity: c.done ? 0.28 : c.pct * 0.12 });
    const side = M({ color: color(c.color, Math.min(0.8, gris + 0.25)).multiplyScalar(0.6) });
    const mesh = new THREE.Mesh(g, [top, side]); mesh.userData.c = c.id;
    const alto = TOP0 + TOPX * c.pct + (c.done ? 0.5 : 0);
    mesh.scale.y = 0.01; scene.add(mesh);
    // (el borde de arriba, una línea clara del color de la comarca)
    const lg = new THREE.BufferGeometry().setFromPoints(P.map(([x, y]) => { const [X, Z] = W(x, y); return new THREE.Vector3(X, 0, Z); })); geos.push(lg);
    const linea = new THREE.LineLoop(lg, new THREE.LineBasicMaterial({ color: new THREE.Color(c.color).lerp(new THREE.Color('#ffffff'), 0.55), transparent: true, opacity: c.pct > 0 ? 0.95 : 0.55, toneMapped: false })); mats.push(linea.material);
    scene.add(linea);
    const [X, Z] = W(cx, cy);
    const lab = document.createElement('div'); lab.className = 'm3-cl' + (c.done ? ' ok' : c.pct > 0 ? ' go' : ''); lab.style.setProperty('--c', c.color);
    lab.innerHTML = `<b>${esc(c.name)}</b>${c.towns ? `<small>${c.stamps}/${c.towns}</small>` : ''}`;
    return { ...c, mesh, top, linea, alto, h: 0.01, lift: 0, X, Z, lab, d: 0.25 + i * 0.07 };
  });
  const byId = new Map(C.map(c => [c.id, c]));
  // (lo que ocupa Navarra: sus esquinas, para encajarla en la pantalla)
  const caja = new THREE.Box3(); for (const c of C) { c.mesh.geometry.computeBoundingBox(); caja.union(c.mesh.geometry.boundingBox); }
  caja.max.y = Math.max(...C.map(c => c.alto)) + 0.6;
  const esquinas = []; for (const x of [caja.min.x, caja.max.x]) for (const y of [0, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z));
  const centro = caja.getCenter(new THREE.Vector3());

  // los pueblos: una chincheta de luz sobre su comarca (gris por descubrir, fucsia empezado, dorada sellado)
  const pg = new THREE.SphereGeometry(0.42, 16, 12), stick = new THREE.CylinderGeometry(0.07, 0.07, 1, 6), ringG = new THREE.RingGeometry(0.75, 0.95, 32);
  geos.push(pg, stick, ringG);
  const PM = { '': M({ color: 0xd9d2ee, emissive: 0x6b5a99, emissiveIntensity: 0.4 }), go: M({ color: 0xff7ac8, emissive: 0xff2bd6, emissiveIntensity: 0.8 }), ok: M({ color: 0xffd76a, emissive: 0xffb02e, emissiveIntensity: 0.9 }) };
  const stickM = M({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4, transparent: true, opacity: 0.55 });
  const ringM = new THREE.MeshBasicMaterial({ color: 0xff7ac8, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }); mats.push(ringM);
  const T = o.towns.filter(t => byId.has(t.comarca)).map((t, i) => {
    const [X, Z] = W(t.sx, t.sy), g = new THREE.Group();
    const bola = new THREE.Mesh(pg, PM[t.state] || PM['']); bola.position.y = 1.15;
    const palo = new THREE.Mesh(stick, stickM); palo.position.y = 0.5;
    g.add(bola, palo); g.position.set(X, 0, Z); g.scale.setScalar(0.01); scene.add(g);
    let ring = null; if (t.here) { ring = new THREE.Mesh(ringG, ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring); }
    const lab = document.createElement('div'); lab.className = 'm3-tl' + (t.state ? ' ' + t.state : '') + (t.here ? ' here' : ''); lab.innerHTML = `<span>${esc(t.name)}</span>`;
    return { ...t, g, bola, ring, c: byId.get(t.comarca), lab, X, Z, ph: i * 0.7 };
  });
  const tById = new Map(T.map(t => [t.id, t]));

  // la capa de los nombres y los controles
  const capa = document.createElement('div'); capa.className = 'm3-capa';
  for (const c of C) capa.append(c.lab); for (const t of T) capa.append(t.lab);
  const cv = r.domElement; cv.className = 'm3-cv'; cv.tabIndex = 0; cv.setAttribute('aria-label', 'Mapa 3D de Navarra: arrastra para moverte y toca una comarca o un pueblo');
  host.prepend(cv); host.append(capa);

  // ---------- la cámara: un punto del mapa al que mira, la distancia, el giro y la inclinación ----------
  // (la vista de toda Navarra: la distancia a la que cabe entera en lo que queda libre, más inclinada en las pantallas
  // anchas, para que se vea la profundidad, y más desde arriba en el móvil de pie)
  const libre = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1, hu = o.hueco?.() || {}; return { w: Math.max(80, w - (hu.r || 0)), h: Math.max(80, h - (hu.t || 0) - (hu.b || 0)), W: w, H: h }; };
  const camPos = (s, out = new THREE.Vector3()) => out.set(s.x + Math.sin(s.yaw) * Math.cos(s.pitch) * s.d, Math.sin(s.pitch) * s.d, s.z + Math.cos(s.yaw) * Math.cos(s.pitch) * s.d);
  // (se prueba a qué distancia caben todas las esquinas de Navarra en el hueco libre, con la misma cámara)
  // (fb: cuánto de lo de abajo cuenta: con toda Navarra, puede pasar por debajo de la fila de comarcas, que es translúcida)
  const prueba = new THREE.PerspectiveCamera(cam.fov, 1, 0.5, 2000), pq = new THREE.Vector3();
  function encaja(pts, x, z, pitch, fb) {
    const L = libre(), hu = o.hueco?.() || {};
    prueba.aspect = L.W / L.H; prueba.setViewOffset(L.W, L.H, (hu.r || 0) / 2, ((hu.b || 0) - (hu.t || 0)) / 2, L.W, L.H);
    const s = { x, z, yaw: 0, pitch, d: 0 }, m = 0.025;
    const cabe = (d) => { s.d = d; camPos(s, prueba.position); prueba.lookAt(x, 0.8, z); prueba.updateMatrixWorld(); prueba.updateProjectionMatrix();
      return pts.every(e => { pq.copy(e).project(prueba); const px = (pq.x + 1) / 2 * L.W, py = (1 - pq.y) / 2 * L.H;
        return pq.z < 1 && px > L.W * m && px < L.W - (hu.r || 0) - L.W * m && py > (hu.t || 0) + L.H * m && py < L.H - (hu.b || 0) * fb - L.H * m * fb; }); };
    let a = 8, b = 400; for (let i = 0; i < 18; i++) { const c = (a + b) / 2; if (cabe(c)) b = c; else a = c; }
    return b;
  }
  function casa() {
    const L = libre(), pitch = L.w / L.h < 1.05 ? 1.02 : L.w / L.h < 1.6 ? 0.82 : 0.7;
    return { x: centro.x, z: centro.z, d: encaja(esquinas, centro.x, centro.z, pitch, 0.35), yaw: 0, pitch };
  }
  // (una comarca: sus esquinas, con lo que sube al elegirla)
  for (const c of C) { const bb = c.mesh.geometry.boundingBox.clone(); bb.max.y = c.alto + 1.1; c.esq = []; for (const x of [bb.min.x, bb.max.x]) for (const y of [0, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) c.esq.push(new THREE.Vector3(x, y, z)); c.mid = bb.getCenter(new THREE.Vector3()); }
  let DMAX = 150;
  const v = { x: 0, z: 4, d: 132, yaw: 0, pitch: 1.18 }, goal = casa();
  let vuelo = null;   // (un vuelo animado hasta un sitio: { de, a, t0, dur })
  const volar = (a, dur = 0.9) => { vuelo = { de: { ...v }, a: { ...v, ...a }, t: 0, dur }; Object.assign(goal, vuelo.a); };
  const lim = () => { goal.x = Math.max(-42, Math.min(42, goal.x)); goal.z = Math.max(-44, Math.min(44, goal.z)); goal.d = Math.max(12, Math.min(DMAX, goal.d)); goal.pitch = Math.max(0.45, Math.min(1.35, goal.pitch)); };
  // (el comienzo: desde muy alto, la cámara baja y se inclina mientras las comarcas crecen una tras otra)
  Object.assign(v, { d: goal.d * 1.45, pitch: 1.25 }); DMAX = Math.max(150, goal.d * 1.35);
  vuelo = { de: { ...v }, a: { ...goal }, t: 0, dur: 1.8 };

  // ---------- tocar y arrastrar ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5);
  const aNdc = (e) => { const b = cv.getBoundingClientRect(); ndc.set((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); return ndc; };
  const enSuelo = (e) => { ray.setFromCamera(aNdc(e), cam); return ray.ray.intersectPlane(plano, new THREE.Vector3()); };
  // (qué hay debajo del dedo: el pueblo cuya chincheta o cuyo nombre queda más cerca en la pantalla y, si no, la comarca)
  const bw = new THREE.Vector3();
  function quien(e) {
    const b = cv.getBoundingClientRect(), k = b.width / (sz.w || 1) || 1, mx = (e.clientX - b.left) / k, my = (e.clientY - b.top) / k;
    let best = null, bd = (e.pointerType === 'mouse' ? 22 : 30);
    for (const t of T) {
      if (t.g.scale.x < 0.3) continue;
      t.bola.getWorldPosition(bw).project(cam); if (bw.z > 1) continue;
      const px = (bw.x + 1) / 2 * sz.w, py = (1 - bw.y) / 2 * sz.h, dd = Math.hypot(px - mx, py - my);
      if (dd < bd) { bd = dd; best = t; }
      if (!t.lab.hidden && t.lab._w) { const ly = t.lab._y ?? py; if (Math.abs(mx - t.lab._x) < t.lab._w / 2 && my < ly && my > ly - t.lab._h) { best = t; bd = 0; } }
    }
    if (best) return { t: best.id };
    ray.setFromCamera(aNdc(e), cam);
    const hc = ray.intersectObjects(C.map(c => c.mesh), false)[0]; if (hc) return { c: hc.object.userData.c };
    return null;
  }
  let hover = null, sel = null;
  const ptrs = new Map(); let arr = null, gesto = null;
  const usado = () => host.classList.add('m3-usado');   // (la ayuda de los controles se va en cuanto se usan)
  const onDown = (e) => {
    usado(); cv.focus({ preventScroll: true }); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { cv.setPointerCapture(e.pointerId); } catch (x) { }
    vuelo = null;
    if (ptrs.size === 1) arr = { x: e.clientX, y: e.clientY, p: enSuelo(e), rot: e.button === 2 || e.ctrlKey, yaw: goal.yaw, pitch: goal.pitch, movido: false };
    else { arr = null; const [a, b] = [...ptrs.values()]; gesto = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), d0: goal.d, yaw0: goal.yaw }; }
  };
  const onMove = (e) => {
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse') { const q = quien(e); const h = q?.t ? 't:' + q.t : q?.c ? 'c:' + q.c : null; if (h !== hover) { hover = h; cv.style.cursor = h ? 'pointer' : 'grab'; } } return; }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesto && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      goal.d = gesto.d0 * gesto.d / Math.max(20, d); goal.yaw = gesto.yaw0 - (ang - gesto.ang); lim(); return;
    }
    if (!arr) return;
    if (Math.hypot(e.clientX - arr.x, e.clientY - arr.y) > 6) arr.movido = true;
    if (!arr.movido) return;
    cv.style.cursor = 'grabbing';
    if (arr.rot) { const b = cv.getBoundingClientRect(); goal.yaw = arr.yaw - (e.clientX - arr.x) / b.width * 3.2; goal.pitch = arr.pitch + (e.clientY - arr.y) / b.height * 1.6; lim(); return; }
    // (arrastrar agarra el mapa: el punto que tocaste se queda bajo el dedo)
    const p = enSuelo(e); if (p && arr.p) { goal.x += arr.p.x - p.x; goal.z += arr.p.z - p.z; v.x = goal.x; v.z = goal.z; lim(); }
  };
  const onUp = (e) => {
    const era = arr; ptrs.delete(e.pointerId); if (ptrs.size < 2) gesto = null;
    if (!ptrs.size) arr = null; cv.style.cursor = hover ? 'pointer' : 'grab';
    if (e.type !== 'pointerup' || !era || era.movido || era.rot) return;
    const q = quien(e);
    if (q?.t) irPueblo(q.t);
    else if (q?.c) select(q.c);
    else select(null);
  };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('pointerleave', () => { if (!ptrs.size) hover = null; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  // (la rueda acerca y aleja; ya del todo lejos, la rueda hacia abajo vuelve a bajar la página, para llegar a lo de debajo)
  cv.addEventListener('wheel', (e) => { if (e.deltaY > 0 && !e.ctrlKey && goal.d >= DMAX - 1) return; e.preventDefault(); usado(); vuelo = null; goal.d *= Math.exp(Math.max(-80, Math.min(80, e.deltaY)) * 0.0022); lim(); }, { passive: false });
  // (Safari en el iPhone: que el pellizco mueva el mapa y no amplíe la página)
  for (const ev of ['gesturestart', 'gesturechange']) cv.addEventListener(ev, (e) => e.preventDefault());

  // teclado: con el mapa elegido (al tocarlo) o con el ratón encima
  const keys = new Set(); let dentro = false;
  cv.addEventListener('pointerenter', () => { dentro = true; }); cv.addEventListener('pointerleave', () => { dentro = false; });
  const MOV = { w: 'f', arrowup: 'f', s: 'b', arrowdown: 'b', a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r', q: 'ql', e: 'qr', '+': 'in', '=': 'in', '-': 'out' };
  const kd = (e) => { const k = MOV[e.key.toLowerCase()]; if (!k || !(dentro || document.activeElement === cv) || e.target.closest?.('input,textarea')) return; e.preventDefault(); usado(); vuelo = null; keys.add(k); };
  const ku = (e) => { const k = MOV[e.key.toLowerCase()]; if (k) keys.delete(k); };
  addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('blur', () => keys.clear());

  // los botones de la esquina (mientras se mantienen pulsados)
  const pad = document.createElement('div'); pad.className = 'm3-pad';
  const B = [['f', 'Adelante', 'M12 5l6 7h-4v7h-4v-7H6z'], ['l', 'Izquierda', 'M5 12l7-6v4h7v4h-7v4z'], ['home', 'Ver toda Navarra', 'M4 11l8-7 8 7v9h-5v-6H9v6H4z'], ['r', 'Derecha', 'M19 12l-7 6v-4H5v-4h7V6z'], ['b', 'Atrás', 'M12 19l-6-7h4V5h4v7h4z'],
    ['in', 'Acercar', 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z'], ['out', 'Alejar', 'M5 11h14v2H5z'], ['ql', 'Girar a la izquierda', 'M12 5a7 7 0 1 1-6.6 9.3l1.9-.6A5 5 0 1 0 12 7v3L7.5 6 12 2z'], ['qr', 'Girar a la derecha', 'M12 5a7 7 0 1 0 6.6 9.3l-1.9-.6A5 5 0 1 1 12 7v3l4.5-4L12 2z']];
  pad.innerHTML = B.map(([k, t, d]) => `<button type="button" class="m3-b b-${k}" data-k="${k}" aria-label="${t}" title="${t}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg></button>`).join('');
  host.append(pad);
  pad.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); usado(); vuelo = null; if (b.dataset.k === 'home') { vista(); return; } keys.add(b.dataset.k); b.setPointerCapture?.(e.pointerId); const fin = () => { keys.delete(b.dataset.k); b.removeEventListener('pointerup', fin); b.removeEventListener('pointercancel', fin); }; b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin); });

  // (un pueblo: si su comarca no estaba elegida, primero la comarca entera; si ya lo estaba, de cerca, con lo de alrededor)
  function irPueblo(id) {
    const t = tById.get(id); if (!t) return;
    if (sel !== t.comarca) select(t.comarca);
    else { const R = 6, pts = []; for (const dx of [-R, R]) for (const dz of [-R, R]) pts.push(new THREE.Vector3(t.X + dx, 0, t.Z + dz), new THREE.Vector3(t.X + dx, 4, t.Z + dz));
      volar({ x: t.X, z: t.Z, d: Math.max(16, encaja(pts, t.X, t.Z, 0.95, 1)), yaw: 0, pitch: 0.95 }); }
    o.onTown?.(id);
  }
  // (toda Navarra, desde arriba)
  function vista() { select(null); volar(casa(), 1.1); }
  // ---------- elegir una comarca: vuela hasta ella y se levanta ----------
  function select(id, fly = true) {
    const c = id && byId.get(id);
    sel = c ? c.id : null;
    host.classList.toggle('con-sel', !!c);
    for (const x of C) x.lab.classList.toggle('sel', x.id === sel);
    o.onSelect?.(sel);   // (antes de volar: el panel que se abre cambia el hueco donde se encaja)
    if (c && fly) volar({ x: c.mid.x, z: c.mid.z, d: Math.max(22, encaja(c.esq, c.mid.x, c.mid.z, 0.95, 1)), yaw: 0, pitch: 0.95 });
  }

  // ---------- el bucle: solo mientras se ve ----------
  let vivo = true, visible = true, t0 = performance.now(), last = t0, raf = 0;
  const io = new IntersectionObserver((en) => { visible = en[0]?.isIntersecting ?? true; if (visible && !raf) raf = requestAnimationFrame(frame); }, { threshold: 0.02 }); io.observe(host);
  const LENTO = matchMedia?.('(pointer: coarse)').matches;   // (en el móvil, 30 imágenes por segundo: el mapa no necesita más)
  const sz = { w: 0, h: 0, z: 0 }, off = { x: 0, y: 0 };
  const pv = new THREE.Vector3();
  function frame(now) {
    raf = 0;
    if (!vivo) return;
    if (!host.isConnected || !rendererVivo(r)) { dispose(); return; }
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    // (en el móvil, y en el ordenador mientras nada se mueve, 30 imágenes por segundo: las chinchetas que flotan no
    // necesitan más, y así el resto del menú va más suelto)
    const quieto = !keys.size && !vuelo && !ptrs.size && Math.abs(goal.d - v.d) < 0.05 * v.d && Math.abs(goal.x - v.x) + Math.abs(goal.z - v.z) < 0.05;
    if ((LENTO || quieto) && now - last < 30) return;
    // (el tiempo de cada imagen, nunca hacia atrás: la marca del navegador puede ser anterior a la de al crear el mapa, y un
    // paso negativo hacía que la cámara se disparara)
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = Math.max(last, now); const t = Math.max(0, now - t0) / 1000;
    // tamaño del lienzo
    const w = host.clientWidth, h = host.clientHeight, z = escala();
    if (w !== sz.w || h !== sz.h || z !== sz.z) { const antes = sz.w; Object.assign(sz, { w, h, z }); if (antes && !sel && !host.classList.contains('m3-usado')) Object.assign(goal, casa()); r.setPixelRatio(Math.min(2, (devicePixelRatio || 1) * z)); r.setSize(w, h, false); cv.style.width = w + 'px'; cv.style.height = h + 'px'; cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); }
    // movimiento con las teclas y los botones
    if (keys.size) {
      const sp = goal.d * 0.9 * dt, fx = -Math.sin(goal.yaw), fz = -Math.cos(goal.yaw);
      if (keys.has('f')) { goal.x += fx * sp; goal.z += fz * sp; } if (keys.has('b')) { goal.x -= fx * sp; goal.z -= fz * sp; }
      if (keys.has('l')) { goal.x += fz * sp; goal.z -= fx * sp; } if (keys.has('r')) { goal.x -= fz * sp; goal.z += fx * sp; }
      if (keys.has('ql')) goal.yaw += dt * 1.4; if (keys.has('qr')) goal.yaw -= dt * 1.4;
      if (keys.has('in')) goal.d *= Math.exp(-dt * 1.6); if (keys.has('out')) goal.d *= Math.exp(dt * 1.6);
      lim();
    }
    if (vuelo) {
      vuelo.t += dt / vuelo.dur; const k = ease(Math.min(1, vuelo.t));
      for (const q of ['x', 'z', 'd', 'yaw', 'pitch']) v[q] = mezcla(vuelo.de[q], vuelo.a[q], k);
      if (vuelo.t >= 1) vuelo = null;
    } else { const k = 1 - Math.exp(-dt * 9); for (const q of ['x', 'z', 'd', 'yaw', 'pitch']) v[q] += (goal[q] - v[q]) * k; }
    // (con el panel abierto, el centro de la vista se corre a lo que queda libre, poco a poco)
    const hu = o.hueco?.() || {}, kk = 1 - Math.exp(-dt * 8);
    off.x += ((hu.r || 0) / 2 - off.x) * kk; off.y += (((hu.b || 0) - (hu.t || 0)) / 2 - off.y) * kk;
    if (Math.abs(off.x) > 0.5 || Math.abs(off.y) > 0.5) cam.setViewOffset(w, h, off.x, off.y, w, h); else if (cam.view?.enabled) cam.clearViewOffset();
    camPos(v, cam.position); cam.lookAt(v.x, 0.8, v.z);
    scene.fog.near = v.d * 0.95; scene.fog.far = v.d * 2.2; cam.far = v.d * 2.6 + 60; cam.updateProjectionMatrix();
    // las comarcas: crecen al empezar (una tras otra), se levantan al pasar por encima o al elegirlas
    for (const c of C) {
      const nace = ease(Math.max(0, Math.min(1, (t - c.d) / 0.7)));
      const quiere = (hover === 'c:' + c.id ? 0.45 : 0) + (sel === c.id ? 0.9 : 0);
      c.lift += (quiere - c.lift) * (1 - Math.exp(-dt * 10));
      c.h = Math.max(0.01, (c.alto + c.lift) * nace + (sel && sel !== c.id ? -0.25 : 0) * nace);
      c.mesh.scale.y = c.h; c.linea.position.y = c.h * 1.12 + 0.13;
      c.top.emissiveIntensity = (c.done ? 0.28 : c.pct * 0.12) + c.lift * 0.22 + (c.done ? Math.sin(t * 2 + c.d * 9) * 0.06 : 0);
    }
    for (const x of T) {
      const nace = ease(Math.max(0, Math.min(1, (t - 0.9 - x.c.d * 0.6) / 0.5)));
      const big = (hover === 't:' + x.id ? 1.35 : 1) * (sel && sel !== x.comarca ? 0.75 : 1);
      x.g.position.y = x.c.h * 1.12 + 0.12; x.g.scale.setScalar(Math.max(0.01, nace * big));
      x.bola.position.y = 1.15 + Math.sin(t * 2.2 + x.ph) * 0.12;
      if (x.ring) { const p = (t * 0.8) % 1; x.ring.scale.setScalar(1 + p * 1.8); ringM.opacity = 0.9 * (1 - p); }
    }
    r.setClearColor(0x0d0420, 1);
    r.render(scene, cam);
    // los nombres encima, sin pisarse nunca ni quedar debajo de lo de encima: primero el pueblo donde estás y el que señalas;
    // de cerca, los pueblos antes que las comarcas; de lejos, al revés. El que no cabe, se esconde
    if (now - tapas.t > 400) medirTapas(now);
    const cerca = v.d < 46, ocupado = tapas.r.slice(), lista = [];
    for (const x of T) { const on = (cerca || sel === x.comarca || x.here || hover === 't:' + x.id) && (!sel || sel === x.comarca || cerca);
      lista.push([x.here || hover === 't:' + x.id ? 0 : cerca || sel === x.comarca ? 1 : 3, x.lab, x.X, x.g.position.y + 2.2, x.Z, on]); }
    for (const c of C) lista.push([sel === c.id && cerca ? 4 : 2, c.lab, c.X, c.h * 1.12 + 1.6, c.Z, !sel || sel === c.id || v.d > 60]);
    lista.sort((a, b) => a[0] - b[0]);
    for (const [, el, x, y, z, on] of lista) etiqueta(el, x, y, z, on, ocupado);
  }
  // (lo de encima, medido de vez en cuando, en píxeles del mapa)
  const tapas = { t: -1e9, r: [] };
  function medirTapas(now) {
    tapas.t = now; tapas.r = []; if (!o.tapa) return;
    const b = host.getBoundingClientRect(), k = escala() || 1;
    for (const e of host.querySelectorAll(o.tapa)) { if (e.hidden || !e.offsetParent) continue; const r = e.getBoundingClientRect(); if (!r.width) continue;
      tapas.r.push([(r.left - b.left) / k, (r.top - b.top) / k, (r.right - b.left) / k, (r.bottom - b.top) / k]); }
  }
  function etiqueta(el, x, y, z, on, ocupado) {
    pv.set(x, y, z).project(cam);
    let ok = on && pv.z < 1 && Math.abs(pv.x) < 1.1 && Math.abs(pv.y) < 1.1;
    const px = (pv.x + 1) / 2 * sz.w, py = (1 - pv.y) / 2 * sz.h;
    if (ok) {
      if (!el._w) { if (el.hidden) el.hidden = false; el._w = el.offsetWidth; el._h = el.offsetHeight; }
      const R = [px - el._w / 2 - 3, py - el._h - 3, px + el._w / 2 + 3, py + 1];
      if (R[0] < 0 || R[2] > sz.w || R[1] < 0 || R[3] > sz.h || ocupado.some(q => R[0] < q[2] && q[0] < R[2] && R[1] < q[3] && q[1] < R[3])) ok = false;
      else ocupado.push(R);
    }
    if (!ok) { if (!el.hidden) el.hidden = true; return; }
    if (el.hidden) el.hidden = false;
    el._x = px; el._y = py; el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
  }
  // (los tamaños de los nombres, otra vez cuando llega la letra)
  document.fonts?.ready.then(() => { for (const e of capa.children) e._w = 0; });
  raf = requestAnimationFrame(frame);

  function dispose() {
    if (!vivo) return; vivo = false; cancelAnimationFrame(raf); io.disconnect();
    removeEventListener('keydown', kd); removeEventListener('keyup', ku);
    for (const g of geos) g.dispose(); for (const m of mats) { m.map?.dispose(); m.dispose(); }
    cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp);
    if (cv.parentNode === host) cv.remove(); capa.remove(); pad.remove();
  }
  return { select, vista, dispose, volar: irPueblo };
}
