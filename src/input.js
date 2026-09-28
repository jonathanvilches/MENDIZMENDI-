// Teclado, ratón y controles táctiles (joystick + botones)
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.move = { x: 0, y: 0 };      // -1..1 (y = adelante)
    this.look = { dx: 0, dy: 0 };    // delta de cámara acumulado
    this.zoom = 0;
    this.pressed = new Set();        // acciones pulsadas este frame
    this.run = false;
    this.touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    this.enabled = true;
    this.canvas = canvas;
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.lookPtr = { id: null, x: 0, y: 0 };
    addEventListener('keydown', e => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => { this.keys.clear(); this.stickEnd(); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { this.zoom += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('pointerdown', e => this.down(e));
    addEventListener('pointermove', e => this.moveP(e));
    addEventListener('pointerup', e => this.up(e));
    addEventListener('pointercancel', e => this.up(e));
    this.pinch = null;
  }
  down(e) {
    if (!this.enabled) return;
    this.canvas.focus?.();
    if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.45 && this.stick.id === null) {
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      this.onStick?.(true, e.clientX, e.clientY, 0, 0);
    } else if (this.lookPtr.id === null) {
      this.lookPtr = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  }
  moveP(e) {
    if (e.pointerId === this.stick.id) {
      const R = 56;
      let dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      this.stick.x = dx / R; this.stick.y = -dy / R;
      this.onStick?.(true, this.stick.ox, this.stick.oy, dx, dy);
    } else if (e.pointerId === this.lookPtr.id) {
      this.look.dx += e.clientX - this.lookPtr.x; this.look.dy += e.clientY - this.lookPtr.y;
      this.lookPtr.x = e.clientX; this.lookPtr.y = e.clientY;
    }
  }
  up(e) {
    if (e.pointerId === this.stick.id) this.stickEnd();
    if (e.pointerId === this.lookPtr.id) this.lookPtr.id = null;
  }
  stickEnd() { this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 }; this.onStick?.(false); }
  update() {
    const k = this.keys;
    let x = 0, y = 0;
    if (this.enabled) {
      if (k.has('w') || k.has('arrowup') || k.has('z')) y += 1;
      if (k.has('s') || k.has('arrowdown')) y -= 1;
      if (k.has('a') || k.has('arrowleft') || k.has('q')) x -= 1;
      if (k.has('d') || k.has('arrowright')) x += 1;
      if (this.stick.id !== null) { x += this.stick.x; y += this.stick.y; }
    }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    this.move.x = x; this.move.y = y;
    const stickMag = this.stick.id !== null ? Math.hypot(this.stick.x, this.stick.y) : 0;
    this.run = this.enabled && (k.has('shift') || stickMag > 0.92 || this.runToggle);
  }
  consume(action) { const has = this.pressed.has(action); this.pressed.delete(action); return has; }
  endFrame() { this.pressed.clear(); this.look.dx = 0; this.look.dy = 0; this.zoom = 0; }
  press(a) { this.pressed.add(a); }
}
