// El pueblo (game/townGame.js), sus deportes: la pelota en el frontón del pueblo, los campeonatos con su frontón de cada
// ronda, el fútbol en el campo del pueblo y en El Sadar, y la pasaka del claustro de Iruña. Son métodos de TownGame:
// townGame.js los une a su clase (util/mezcla.js), con su this.

import { KINDS, fueraDe, pelotaMenu, playTorneoRound, sedeDe, torneo, torneoPanel, youBonus, yourMatch } from './torneo.js';
import { LEVELS, esExterior } from '../data/levels.js';
import { PASAKA } from '../data/pasaka.js';
import { PLACES } from '../world/layout.js';
import { addXP, checkBadges, profile, saveProfile, townState } from './profile.js';
import { clubOfTown, teamOfClub } from '../futbol/clubs.js';
import { clubPanel, season as ligaSeason } from '../futbol/liga.js';
import { freeVenues, hallVenue, labrit } from './fronton.js';
import { armsOfTown } from '../data/armas-navarra.js';
import { armsReady } from '../ui/escudoImg.js';
import { infoCard } from '../ui/minigames.js';
import { isEU, tr } from '../i18n.js';
import { laminaUrl } from '../ui/laminas.js';
import { pasakaMenu, pasakaReward } from '../ui/pasaka.js';
import { pasakaVenue, playPasaka } from './pasaka3d.js';
import { showChampion } from '../ui/champion.js';
import { vueloFronton } from './llegadas.js';
import { CLUBS } from '../futbol/clubs.js';
import { COURT } from '../pelota/rules.js';
const loadFutbol = () => import('./futbol.js').then(m => m.Futbol);
const CLUBS_NAME = (id) => CLUBS[id]?.name || '';

export class PuebloDeportes {
  // el músico de la plaza enseña el instrumento de su zona (ui/instrumentos.js): habla, se toca y, si sale, carta de tradiciones
  // el canónigo del claustro enseña la pasaka (game/pasaka3d.js): habla, se juega de pareja con él en el sobreclaustro y,
  // si se gana, carta de tradiciones (ui/pasaka.js)
  async pasakaCon(a) {
    // (el toque que cierra el último diálogo no vuelve a empezar la pasaka: un respiro al salir)
    if (this.sportBusy || this.mode !== 'play' || this.elapsed < (this.pasakaCool || 0)) return;
    a.say(3); a.wave = 1.2; this.player.frozen = true; this.mode = 'mini'; this.sportBusy = true;
    try {
      await this.say(a, PASAKA.lines.ask);
      if (this.disposed) return;
      const r = await this.playPasaka(a);
      if (this.disposed || r.quit) return;
      this.player.frozen = true; this.mode = 'mini';
      const isNew = await pasakaReward(this.ui, r, { who: a.name });
      await this.say(a, r.win ? PASAKA.lines.win : PASAKA.lines.lose);
      if (r.win) { this.player.rig?.doCheer?.(); if (isNew) for (const bd of checkBadges()) await infoCard(this.ui, { icon: bd.icon, kicker: 'Nueva insignia', title: bd.name, text: bd.text, button: '¡Bien!' }); }
    } finally { if (!this.disposed) { this.player.frozen = false; this.mode = 'play'; this.sportBusy = false; a.talking = 0; this.pasakaCool = this.elapsed + 1.5; this.ui.hudVisible?.(true); } }
  }
  // el sobreclaustro: muy por encima y fuera del pueblo, como el frontón cubierto, pero al otro lado
  pasakaVenue() { return pasakaVenue(this.scene, { x: PLACES.plaza.x, z: PLACES.plaza.z + 2600 }); }
  // llegada: un plano desde el fondo de la galería, con el público ya puesto
  async pasakaIntro(V) {
    if (window.__autoWin) return;
    this.sky.flood = 1; this.sky.indoor = true; this.sky.floodCur = 1; this.ui.hudVisible?.(false); this.perro?.away?.();
    this.player.place(V.entry.x, V.entry.z, 0); this.player.frozen = true;
    try {
      const rt = this.rt, shot = async (pos, look, ms) => { this.follow.cinematic = { pos, look, t: 0, lookCur: look.clone() }; this.camera.position.copy(pos); this.camera.lookAt(look);
        const f0 = rt?.frameNo ?? 0, t0 = performance.now(); await new Promise(r => { const k = () => (performance.now() - t0 >= ms && (rt?.frameNo ?? 1e9) - f0 >= 30) || performance.now() - t0 > ms + 12000 ? r() : setTimeout(k, 50); k(); }); };
      this.ui.toast?.(tr('Sobreclaustro de la catedral · Iruña'), 'pelota', 2600);
      await shot(V.toWorld(3.2, 26.5, 4.2), V.toWorld(-0.5, 2, 1.3), 1900);
    } finally { this.follow.cinematic = null; }
  }
  /** Un partido de pasaka en el sobreclaustro con `a` de pareja: { win, g } o { quit }. stay: sin volver al pueblo al acabar. */
  async playPasaka(a, { stay = false } = {}) {
    const V = this.pasakaVenue(); if (!V) return { quit: true };
    const P = this.player, home = { x: P.pos.x, z: P.pos.z, h: P.heading };   // (adonde se vuelve: antes de la llegada al claustro)
    await this.pasakaIntro(V);
    if (this.disposed) return { quit: true };
    return await playPasaka(this, V, a, { stay, home });
  }
  // Pasaka desde el menú (sin misiones): Pamplona en modo campeonato, directo al sobreclaustro; entre partido y partido,
  // el menú de la pasaka; al salir, de vuelta a su pantalla del menú
  async pasakaOnly() {
    this.sportMode = true; this.sportBusy = true; this.ui.hudVisible(false); this.perro?.away?.();
    try {
      const a = this.canonigo;
      for (;;) {
        this.ui.hudVisible(false); this.player.frozen = true; this.perro?.away?.();
        const r = await this.playPasaka(a, { stay: true });
        if (this.disposed) return;
        if (!r.quit) await pasakaReward(this.ui, r, { who: a?.name || PASAKA.canonigo.name });
        if (this.disposed) return;
        const pick = await pasakaMenu(this.ui);
        if (this.disposed || pick !== 'again') return;
      }
    } finally { if (!this.disposed) { if (this.sky) { this.sky.flood = 0; this.sky.indoor = false; } this.onExit?.('pasaka'); } }
  }
  // un solo menú o partido a la vez (pelota o fútbol): mientras dura, nada del pueblo responde y el jugador no se mueve
  // detrás de los menús; al acabar, todo como estaba (si el pueblo se ha rehecho o se ha viajado, el nuevo manda)
  async sportGuard(fn) {
    if (this.sportBusy || this.mode !== 'play') return;
    this.sportBusy = true; this.player.frozen = true;
    try { return await fn(); }
    finally { if (!this.disposed) { this.sportBusy = false; this.player.frozen = false; this.ui.hudVisible(true); } }
  }
  // Partido de fútbol en El Sadar con la entrenadora de la cantera
  playFutbol() { return this.sportGuard(() => this.futbolSadar()); }
  async futbolSadar() {
    const a = this.coach; if (!a) return;
    this.player.frozen = true;
    try {
      const first = !this.futSeen; this.futSeen = true;
      await this.say(a, first ? ['¡Kaixo! Soy Leire, entrenadora de la cantera de Iruña. ¿Te atreves a jugar en El Sadar?',
        'Un partido once contra once en el campo de El Sadar, con porteros y árbitro. ¡Al campo!',
        'Con el balón: PASE y TIRO (mantenlo pulsado para chutar más fuerte). Sin balón: ROBO cuando se le separe del pie, o ENTRADA. ¡Aupa Iruña!'] : ['¿Otro partido? ¡La grada está llena!']);
    } finally { a.talking = 0; }
    const Futbol = await loadFutbol();
    this.futbol = new Futbol(this, this.sadar);
    const r = await this.futbol.run();
    if (r.quit) return;
    const best = (townState(profile(), this.def.id).best ||= {});
    if (r.win) { best.futbol = (best.futbol || 0) + 1; saveProfile(); }
    await this.say(a, [r.win ? `¡${r.you} a ${r.cpu}! Juegas como un rojillo de verdad.` : r.you === r.cpu ? `${r.you} a ${r.cpu}. ¡Empate! Muy buen partido.` : `${r.you} a ${r.cpu}. ¡Casi! Vuelve cuando quieras para la revancha.`]);
  }
  // Fútbol en el pueblo con el entrenador del club. Es un minijuego: la primera vez, un partido contra el equipo vecino
  // da el sello de fútbol del pasaporte; después, otro partido cuando quieras.
  playFutsal() { return this.sportGuard(() => this.futbolPueblo()); }
  async futbolPueblo() {
    const a = this.futsalCoach; if (!a) return;
    const st = (townState(profile(), this.def.id).futsal ||= { step: 0, tries: 0, sello: false });
    const town = this.def.name.split(' /')[0], club = clubOfTown(this.def.id);
    const local = club ? teamOfClub(club.id) : { name: town, short: town.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() };
    // el rival del partido del pueblo: el club vecino más parecido de la liga (o el equipo de los vecinos)
    const rivalId = club ? ligaSeason(club.id).teams[1] : null, rivalTeam = rivalId ? teamOfClub(rivalId) : null, rivalName = rivalTeam?.name || 'los vecinos';
    const Futbol = await loadFutbol();
    // (un solo fútbol, el de once, y todos los partidos en El Sadar: con sus gradas llenas es más espectacular que el
    // campo del pueblo)
    const fut = new Futbol(this, null, { campo: 'sadar', title: 'El Sadar', sub: 'Partido de fútbol', local });
    this.player.frozen = true;
    try {
      if (st.step === 0 && !st.met) {
        await this.say(a, [club ? `¡Kaixo! Entreno al equipo de ${club.name}. Aquí puedes jugar con nosotros.` : `¡Kaixo! Esta es la pista de ${town}.`,
          this.pista ? 'Tienes la Liga Navarra contra los clubes de la zona, amistosos contra cualquier club de Navarra y el partido del pueblo. Todos se juegan en El Sadar, el estadio de Iruña.' : 'Tienes la Liga Navarra contra los clubes de la zona y amistosos contra cualquier club de Navarra. Todos se juegan en El Sadar, el estadio de Iruña.',
          ...(this.pista ? [`Juega un partido contra ${rivalName}. Si ganas, te pongo el sello de fútbol en el pasaporte.`] : [])].filter(Boolean));
        st.step = this.pista ? 2 : 0; if (!this.pista) st.met = true; saveProfile();
      } else await this.say(a, [club ? `¡Aupa ${club.name}! ¿Qué jugamos hoy?` : '¿Qué jugamos hoy?']);
    } finally { a.talking = 0; }   // (el jugador sigue quieto con el menú del club delante)
    // menú del club (como en los juegos de fútbol): liga, partido del pueblo, amistoso. En la liga juegas con «tu club» (el del primer pueblo
    // en el que la empezaste); todas las jornadas, en El Sadar, desde cualquier pueblo
    const P = profile(), myClub = P.futbolClub || club?.id, S = myClub ? ligaSeason(myClub) : null;
    if (st.step === 1) st.step = 2;   // (ya no hay entrenamiento previo: directo al partido por el sello)
    const sala = !this.pista ? null : st.step === 2 ? ['sala', 'Partido por el sello', `Contra ${rivalName} · en El Sadar`] : ['sala', 'Partido de fútbol', 'En El Sadar'];
    const ligaSub = `${P.futbolClub ? CLUBS_NAME(myClub) + ' · ' : ''}en El Sadar`;
    const items = (club ? [['liga', 'Liga Navarra', ligaSub, S.j < S.rounds.length ? `Jornada ${S.j + 1} de ${S.rounds.length}` : 'Nueva temporada'], sala, ['amistoso', 'Amistoso', 'Contra cualquier club de Navarra'], ['exit', 'Salir', '']] : [sala, ['exit', 'Salir', '']]).filter(Boolean);
    const pick = club ? await clubPanel(club.id, items, `${town} · tu club`) : 'sala';
    if (pick === 'exit' || (pick === 'sala' && !this.pista)) return;
    if (pick === 'liga') {
      if (!P.futbolClub) { P.futbolClub = club.id; saveProfile(); }
      const r = await fut.liga(myClub); if (!r.quit && r.win) addXP(30);
      return;
    }
    if (pick === 'amistoso') { const r = await fut.friendly(club.id); if (r.quit) return; await this.say(a, [r.win ? `¡${r.you} a ${r.cpu}! ¡Qué partidazo!` : r.you === r.cpu ? `${r.you} a ${r.cpu}. Empate.` : `${r.you} a ${r.cpu}. La próxima, seguro.`]); return; }
    if (st.step === 2) {
      const r = await fut.match('vecinos', 'facil', 2, rivalTeam); if (r.quit) return;
      if (r.win) {
        st.step = 3; st.sello = true; addXP(60); saveProfile();
        await this.say(a, [`¡${r.you} a ${r.cpu}! Has ganado a ${rivalName}. Toma: el sello de fútbol de ${town} para tu pasaporte.`, 'Vuelve cuando quieras a jugar otro partido.']);
        this.ui.toast?.(`Sello de fútbol de ${town}`, 'balon', 2600);
      } else await this.say(a, [r.you === r.cpu ? `${r.you} a ${r.cpu}. ¡Empate! Para el sello hay que ganar: ¿la revancha?` : `${r.you} a ${r.cpu}. ¡Casi! Habla conmigo para la revancha.`]);
      return;
    }
    const r = await fut.run(); if (r.quit) return;
    await this.say(a, [r.win ? `¡${r.you} a ${r.cpu}! ¡Qué partidazo!` : r.you === r.cpu ? `${r.you} a ${r.cpu}. Empate.` : `${r.you} a ${r.cpu}. La próxima, seguro.`]);
  }
  // los pueblos del juego donde se juega el torneo de la comarca: los de la comarca y, si son pocos, los más cercanos
  comarcaVenues() {
    const own = LEVELS.filter(l => l.comarca === this.def.comarca), i0 = LEVELS.findIndex(l => l.id === this.def.id);
    const near = LEVELS.filter(l => l.comarca !== this.def.comarca && l.id !== 'pamplona').sort((a, b) => Math.abs(LEVELS.indexOf(a) - i0) - Math.abs(LEVELS.indexOf(b) - i0));
    // (al menos 8: cada partido de un campeonato va en un frontón distinto, también los de la liga, torneo.js fueraDe)
    return [...own, ...near].slice(0, Math.max(own.length, 8)).map(l => ({ id: l.id, name: l.name.split(' /')[0] }));
  }
  // Partido libre en el frontón del pueblo (fuera de las misiones): contra el pelotari o el anfitrión de la misión
  // (un solo menú o partido de pelota a la vez: mientras dura, el jugador quieto y sin los botones del pueblo debajo
  // del menú; al acabar, todo como estaba)
  async freePelota() {
    const a = this.pelotari || this.missions.find(M => M.type === 'pelota')?.host;
    if (!this.fronton || !a || this.mode !== 'play' || this.sportBusy) return;
    this.sportBusy = true; this.player.frozen = true;
    try {
      const first = !this.pelotaSeen; this.pelotaSeen = true;
      await this.say(a, first ? ['¡Aupa! ¿Echamos un partido de pelota a mano?', 'La pelota tiene que dar en el frontis por encima de la chapa, la raya roja. Ve al círculo verde y pulsa GOLPE cuando brille.']
        : ['¿Otro partido? ¡Vamos!']);
      a.talking = 0;
      // partido libre o el torneo de mano de la comarca (la txapela, parte de la misión de la comarca)
      const P = profile(), town = this.def.name.split(' /')[0], cm = this.comarca?.name || 'la comarca';
      const ctx = { comarca: this.def.comarca, comarcaName: cm, towns: this.comarcaVenues() };
      const you = { name: P.name || 'Tú', town };
      this.ui.hudVisible(false);
      // (el partido libre, en el frontón que elijas: de primeras, el de la plaza, que es donde estás)
      const sel = { sedes: this.sedes(), sede: this.fronton.court.labrit ? 'labrit' : 'plaza' };
      const pick = await pelotaMenu(torneo(you, ctx), town, torneo(you, ctx, false, 'parejas'), sel, torneo(you, ctx, false, 'cuatro'));
      if (this.disposed || pick === 'exit') return;
      if (pick === 'torneo') return await this.pelotaTorneo(a, ctx);
      if (pick === 'torneoParejas') return await this.pelotaTorneo(a, ctx, 'parejas');
      if (pick === 'torneoCuatro') return await this.pelotaTorneo(a, ctx, 'cuatro');
      const v = await this.venueListo(sel.sede); await this.venuePrep(v);
      if (this.disposed) return;
      const r = await v.play(this, a, { ...(v === this.fronton ? {} : { returnTo: this.fronton }), intro: (m) => vueloFronton(this, v, m) });
      if (this.disposed) return;   // (el pueblo se rehízo durante el partido: el fondo de los campeonatos ya es del nuevo)
      this.sportBackdrop(false);
      if (r.quit || r.error) return;
      const best = (townState(profile(), this.def.id).best ||= {});
      if (r.win) { best.pelota = (best.pelota || 0) + 1; saveProfile(); }
      this.player.frozen = true;
      await this.say(a, [r.win ? `¡${r.you} a ${r.cpu}! Juegas como un pelotari de verdad. Vuelve cuando quieras.` : `${r.you} a ${r.cpu}. ¡Casi! Aquí estaré para la revancha.`]);
    } finally { if (!this.disposed) { this.sportBusy = false; this.player.frozen = false; a.talking = 0; this.sportBackdrop(false); this.ui.hudVisible(true); if (this.rt?.quality === 'low') freeVenues(); } }   // (de vuelta al pueblo, en el móvil, sin los frontones de los campeonatos)
  }
  // Campeonato de pelota desde el menú (sin misiones): el frontón del pueblo elegido con su menú de pelota (partido
  // libre o torneo por la txapela, todos los partidos aquí, sin viajar). Al salir del menú, de vuelta al inicio
  /** En Campeonatos solo el frontón con lo que lo rodea: ni vecinos, ni animales, ni bosque, ni las casas a más de 60 m
   *  de la cancha (las de alrededor se quedan: en los frontones de calle el público está en sus balcones). Para jugar a
   *  pelota no hacen falta, el pueblo aquí es solo el decorado y al salir se suelta entero; así la tarjeta gráfica no
   *  llega a cargarlo. En el iPhone la imagen se perdía al empezar el partido o al volver al menú (octubre de 2026) */
  soloFronton() {
    if (!this.fronton || this.soloCancha) return;
    this.soloCancha = { keep: this.pelotari || this.missions.find(M => M.type === 'pelota')?.host };
    try { this.rt?.nature?.campeonato(); } catch (e) { console.warn('campeonato', e); }
    if (this.rt?.fauna) this.rt.fauna.visDist = 0;
    try {
      // (y si el pueblo juega a cubierto, levels.js esExterior, ninguna: aquí no se juega ningún partido)
      const C = this.fronton.toWorld(0, COURT.L / 2), R = esExterior(this.def.id) ? 60 : -Infinity, town = this.scene.children.find(o => o.name === 'town');
      // (fuera de la escena y sin su memoria gráfica, si llegó a subirse; el pueblo no vuelve a usarse)
      if (town) for (const m of [...town.children]) { const s = m.geometry?.boundingSphere; if (s && Math.hypot(s.center.x - C.x, s.center.z - C.z) - s.radius > R) { town.remove(m); m.geometry.dispose(); } }
    } catch (e) { console.warn('campeonato: casas', e); }
    // y en el móvil, lo que queda (el frontón, sin el personaje del jugador, que no juega aquí), subido ya a la tarjeta
    // poco a poco mientras se elige partido: así no llega todo de golpe en la entrada a la cancha (rt.subePoco). Los
    // modelos de los pelotaris, no: si el rival es una chica, el del colorado no se usaba y ocupaba 5 MB
    if (this.rt?.quality === 'low' && this.rt.subePoco) this.rt.subePoco(this.scene, false, new Set([this.player?.obj].filter(Boolean)));
  }
  // En el pueblo, el pelotari junto al frontón te invita al campeonato de la comarca: el que elijas (Manomanista, Parejas
  // o Cuatro y Medio); si te apuntas, se va a jugarlo (main.js: solo el frontón, con su cuadro ya abierto) y, al acabar,
  // vuelves aquí, a la puerta del frontón. En el pueblo no se juega a pelota: cada partido, en un frontón distinto
  async invitaCampeonato() {
    const a = this.pelotari; if (!a || this.campeonato || this.disposed) return;
    const P = profile(), cm = this.comarca?.name || 'la comarca'; let kind = null;
    a.say?.(2);
    await this.say(a, [`¡Aupa${P.name ? ', ' + P.name : ''}! Se está jugando el campeonato de pelota de ${cm}.`,
      { text: '¿Te apuntas? Cada partido, en un frontón distinto, y la final en el Labrit de Iruña. ¿En cuál?', choices: ['Manomanista', 'Parejas', 'Cuatro y Medio', 'Ahora no'],
        onChoice: (j) => { kind = ['mano', 'parejas', 'cuatro'][j] || null; return kind ? [] : ['Cuando quieras, aquí estaré.']; } }]);
    if (!kind || this.disposed) return;
    const e = this.fronton?.entry || this.player.pos, c = this.fronton?.toWorld?.(0, 12);
    this.onExit?.('pueblo', { pelota: this.def.id, torneo: kind, vuelta: { id: this.def.id, x: e.x, z: e.z, h: c ? Math.atan2(c.x - e.x, c.z - e.z) : this.player.heading } });
  }
  async sportOnly(o = {}) {
    this.sportMode = true; this.sportBusy = true; this.ui.hudVisible(false);
    this.soloFronton();
    this.perro?.away?.();   // (en el campeonato no hace falta el perro: ni saluda ni avisa entre partido y partido)
    const a = this.pelotari || this.missions.find(M => M.type === 'pelota')?.host;
    this.sportBackdrop(true);
    try {
      if (!this.fronton || !a) return;
      const e = this.fronton.entry, c = this.fronton.toWorld(0, 12);
      this.player.place(e.x, e.z, Math.atan2(c.x - e.x, c.z - e.z)); this.follow.snap(this.player);
      const P = profile(), town = this.def.name.split(' /')[0], cm = this.comarca?.name || 'la comarca';
      const ctx = { comarca: this.def.comarca, comarcaName: cm, towns: this.comarcaVenues() };
      // (el frontón cubierto se monta ya, tapado por el fondo: así la llegada no espera a montarlo ni a compilarlo)
      // (solo si es el elegido: las rondas y los partidos se juegan ya en el frontón del pueblo)
      const S0 = this.sedes(); if (!this.fronton.court.labrit && (S0.includes(P.pelotaSede) ? P.pelotaSede : S0[0]) === 'cubierto') await this.rt?.warm?.(this.hallVenue().court.group);
      // (desde el pueblo, apuntado por el pelotari: derecho al cuadro del campeonato elegido; al salir, de vuelta al pueblo)
      if (o.torneo) { this.vuelta = o.vuelta || null; await this.pelotaTorneo(a, ctx, o.torneo); return; }
      for (;;) {
        // (entre partido y partido, el jugador quieto en la puerta del frontón y sin el perro, que vuelve al acabar
        // cada partido; delante, el fondo de los campeonatos: el pueblo no se ve ni se dibuja)
        this.ui.hudVisible(false); this.player.frozen = true; this.perro?.away?.(); this.sportBackdrop(true);
        const you = { name: P.name || 'Tú', town };
        // (el frontón del partido libre, a elegir: el de la plaza, el cubierto, el Labrit u otro pueblo; se recuerda)
        const S = this.sedes(), sel = { sedes: S, sede: S.includes(P.pelotaSede) ? P.pelotaSede : this.fronton.court.labrit ? 'labrit' : S[0], otro: true, onSede: (k) => { P.pelotaSede = k; saveProfile(); } };
        const pick = await pelotaMenu(torneo(you, ctx), town, torneo(you, ctx, false, 'parejas'), sel, torneo(you, ctx, false, 'cuatro'));
        if (this.disposed || pick === 'exit') return;
        if (pick.startsWith('otro:')) { if (pick.slice(5) !== this.def.id) { this.luego = { pelota: pick.slice(5) }; return; } continue; }
        if (pick === 'torneo' || pick === 'torneoParejas' || pick === 'torneoCuatro') { await this.pelotaTorneo(a, ctx, pick === 'torneoParejas' ? 'parejas' : pick === 'torneoCuatro' ? 'cuatro' : 'mano'); if (this.disposed) return; continue; }
        // (el fondo sigue delante mientras se preparan los pelotaris: lo quita el vuelo de la llegada; antes se veía al
        // jugador quieto en la puerta del frontón hasta que empezaba el partido)
        const hv = await this.venueListo(sel.sede); await this.venuePrep(hv);
        if (this.disposed) return;
        // (al acabar, de vuelta al menú de pelota sin pasar por el pueblo: el resultado ya se ha visto en la cancha)
        const r = await hv.play(this, a, { returnTo: this.fronton, comp: 'Partido de exhibición', stay: true, intro: (m) => vueloFronton(this, hv, m) });
        if (this.disposed) return;   // (si el pueblo se rehízo durante el partido, el fondo ya es del nuevo: no se toca)
        this.sportBackdrop(true);
        if (r.quit || r.error) continue;
        const best = (townState(profile(), this.def.id).best ||= {});
        if (r.win) { best.pelota = (best.pelota || 0) + 1; saveProfile(); }
      }
    } finally { if (!this.disposed) this.onExit?.('sports', this.luego || (this.vuelta ? { vuelta: this.vuelta } : null)); }   // (de vuelta a Torneos, de donde se vino, al frontón de otro pueblo o, si te apuntaste en el pueblo, a él; si el pueblo se rehízo, el nuevo sigue)
  }
  /** Fondo de los menús de los campeonatos de pelota: la lámina del frontón, desenfocada bajo el morado de los
   *  deportes, a pantalla completa. Antes, entre menú y menú se veía el pueblo y su frontón de la calle, que en los
   *  campeonatos no pinta nada; además, con él delante el pueblo no se dibuja (runtime: covered). Solo en Campeonatos. */
  sportBackdrop(on, force = false, ya = false) {
    // (fuera de Campeonatos, solo el velo de ir al cubierto o al Labrit, force; cualquier otro, lo quita)
    if (!this.sportMode && !force) on = false;
    let el = document.querySelector('.sport-bg');
    if (!el && on) {
      el = document.createElement('div'); el.className = 'sport-bg gx-bg';
      const u = laminaUrl('dep-fronton'); if (u) { const i = document.createElement('i'); i.style.backgroundImage = `url("${u}")`; el.appendChild(i); }
      document.body.appendChild(el);
    }
    // (ya: delante al momento, sin fundido; el siguiente cambio ya funde)
    if (el && ya) { el.classList.add('ya'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('ya'))); }
    el?.classList.toggle('on', !!on);
    this.rt?.checkCover?.();   // (al quitarlo, el frontón cubierto se dibuja ya: sin un momento de la imagen vieja)
  }
  // el torneo entero se juega en este frontón (los rivales vienen aquí): el del pueblo elegido en Campeonatos o el
  // del pueblo en el que estás
  async pelotaTorneo(a, ctx, kind = 'mano') {
    const P = profile(), town = this.def.name.split(' /')[0], pairs = kind === 'parejas';
    let T = torneo({ name: P.name || 'Tú', town }, ctx, false, kind), played = false;
    try {
      for (;;) {
        this.ui.hudVisible(false); this.player.frozen = true; this.sportBackdrop(true);   // (con el cuadro del torneo delante, nada del pueblo debajo)
        const sel = { sedes: this.sedes() }, act = await torneoPanel(T, town, sel);
        if (this.disposed || act === 'exit') return;   // (el pueblo se rehízo mientras tanto: este torneo ya no sigue)
        if (act === 'new') { T = torneo({ name: P.name || 'Tú', town }, ctx, true, kind); continue; }
        if (act === 'sim') { playTorneoRound(T); continue; }
        const m = yourMatch(T);
        // (en el frontón elegido para este partido; si no, en el que le toca a la ronda, distinto del de la anterior: el
        // del pueblo, su cubierto o el cubierto de otro pueblo; la final, en el Labrit de Iruña)
        const venue = await this.venueListo(sedeDe(T, m, this.sedes()), fueraDe(T));
        await this.venuePrep(venue);
        if (this.disposed) return;
        // (por parejas: juegas con tu compañero contra el delantero y el zaguero rivales)
        // (stay: del partido, al cuadro del torneo, sin volver al pueblo entre ronda y ronda)
        const r = await venue.play(this, a, { target: m.target, level: m.level, rivalName: `${pairs ? m.rival.mates[0] : m.rival.name} (${m.rival.town})`, fixedLevel: true, returnTo: this.fronton, rivalStats: m.stats, stay: true,
          pairs: pairs ? { partner: m.partner, rivalMate: m.mate } : null, rivalTown: m.rival.townId ? { id: m.rival.townId, name: m.rival.town } : null,
          comp: `${(KINDS[kind] || KINDS.mano).name} · ${m.round}`, final: m.round === 'Final', youBonus: youBonus(T), rivalBonus: ((m.rival.lv || 2) - 2) * 3, intro: (pm) => vueloFronton(this, venue, pm), cuatro: kind === 'cuatro' });
        if (this.disposed) return;   // (si el pueblo se rehízo durante el partido, el fondo ya es del nuevo: no se toca)
        this.sportBackdrop(true);
        played = true;
        if (r.quit && r.later) continue;   // («Ahora no» antes de empezar: de vuelta al cuadro del torneo, de donde se vino)
        // (si el partido no se pudo montar o falló jugando, de vuelta al cuadro sin apuntar nada: antes contaba como un
        // 0 a 0 perdido o te sacaba del torneo al pueblo, «se me sale solo de la partida»)
        if (r.error) { this.ui.toast?.(isEU() ? 'Partidak ezin izan du jarraitu. Saiatu berriro.' : 'El partido no ha podido seguir. Vuelve a intentarlo.', 'pelota', 3200); continue; }
        if (r.quit) return;   // (salir del partido es salir: de vuelta al pueblo, no al panel del torneo otra vez)
        if (r.color) T.tuColor = r.color;   // (el color con que jugaste: el de tu carta de campeón)
        playTorneoRound(T, r.you, r.cpu);
        if (T.done && T.players[T.champion].you) {
          P.txapelas = (P.txapelas || 0) + 1; addXP(150); saveProfile();
          this.player.rig.doCheer?.(); this.particles.confetti?.(this.player.pos, 120);
          // la gran celebración: la txapela baja, confeti, fuegos y el frontón en pie
          if (pairs) {
            await showChampion({ kind: 'pelota', kicker: `${KINDS.parejas.full} · ${ctx.comarcaName}`, title: '¡Txapeldunak!', name: T.players[T.champion].name, sub: `La txapela de parejas de ${ctx.comarcaName} es vuestra. Llevas ${P.txapelas} ${P.txapelas === 1 ? 'txapela' : 'txapelas'}. Zorionak!`, score: `Final · ${r.you} – ${r.cpu}`, sound: this.sound, button: 'Ponerme la txapela' });
          } else {
            await showChampion({ kind: 'pelota', kicker: `${(KINDS[kind] || KINDS.mano).full} · ${ctx.comarcaName}`, title: '¡Txapeldun!', name: P.name || 'Campeón', sub: `La txapela de ${ctx.comarcaName} es tuya. Llevas ${P.txapelas} ${P.txapelas === 1 ? 'txapela' : 'txapelas'}. Zorionak!`, score: `Final · ${r.you} – ${r.cpu}`, sound: this.sound, button: 'Ponerme la txapela' });
          }
        }
        // (sin charla en el pueblo entre ronda y ronda: el cuadro del torneo ya dice si sigues, la ronda que viene y dónde)
      }
    } finally { if (played && !this.sportMode && !this.disposed) this.perro?.release?.(); }   // (el perro, que se quedó en casa durante el torneo, vuelve al acabar)
  }
  // el frontón de un partido: el de la plaza (el de la calle del pueblo, cada uno de su comarca), el cubierto o el Labrit
  // (en Iruña, el de la calle ya es el Labrit)
  // (fuera: el cubierto de otro pueblo, { id, name } de torneo.js fueraDe)
  // (los frontones para jugar aquí: el del pueblo solo si tiene su entorno, levels.js esExterior; si no, el cubierto y el Labrit)
  sedes() { return this.fronton?.court.labrit ? ['labrit', 'cubierto'] : esExterior(this.def.id) ? ['plaza', 'cubierto', 'labrit'] : ['cubierto', 'labrit']; }
  // (igual, pero con el escudo de ese pueblo ya cargado: si no, la pared izquierda del cubierto de otro pueblo salía con
  // el escudo dibujado de antes y no con el del autor; el del pueblo en el que estás ya lo carga main.js al entrar)
  async venueListo(sede, fuera = null) {
    const otro = sede === 'fuera' && fuera ? fuera.id : null, A = otro && armsOfTown(otro);
    if (A) await Promise.race([armsReady(A.id), new Promise(r => setTimeout(r, 4000))]);
    return this.venueDe(sede, fuera);
  }
  venueDe(sede, fuera = null) {
    const otro = sede === 'fuera' && fuera ? LEVELS.find(l => l.id === fuera.id) : null;
    if (otro) return this.hallVenue(otro);
    // (en un campeonato que no se juega en el pueblo, el frontón del pueblo es solo el sitio de espera: fronton.js anclaFronton)
    const F = this.fronton?.ancla ? null : this.fronton;
    if (this.fronton?.court.labrit) return sede === 'cubierto' ? this.hallVenue() : F || this.labritVenue();
    return sede === 'plaza' && F ? F : sede === 'labrit' ? this.labritVenue() : this.hallVenue();
  }
  // ir al cubierto o al Labrit: el pueblo se tapa (el velo de los campeonatos) mientras se preparan los pelotaris y el
  // jugador va allí (el cielo y las sombras van con él); la llegada, el vuelo hasta la cancha con el partido ya montado
  // (llegadas.js), que es quien quita el velo. Al de la plaza, donde ya estás, solo el velo: si no, al elegir en el menú
  // se veía un momento la calle y luego, de golpe, el vuelo
  async venuePrep(v) {
    if (window.__autoWin) return;
    this.sportBackdrop(true, true);
    if (this.rt?.quality === 'low') freeVenues(v);   // (en el móvil, solo el frontón que se va a usar: fronton.js)
    if (v === this.fronton) return;
    await this.rt?.warm?.(v.court.group);   // (sus sombreadores, antes de verlo: si no, la llegada se quedaba congelada un momento)
    if (this.disposed) return;
    this.sky.flood = 1; this.sky.indoor = true; this.sky.floodCur = 1; this.ui.hudVisible?.(false); this.perro?.away?.();
    this.player.place(v.entry.x, v.entry.z, 0); this.player.frozen = true;
  }
  // el frontón Labrit: muy por encima del pueblo y fuera de sus límites (solo se ve por dentro y en la llegada)
  labritVenue() { return labrit(this.scene, { x: PLACES.plaza.x + 2600, z: PLACES.plaza.z }); }
  // el frontón cubierto del pueblo (los campeonatos): también muy por encima y fuera de sus límites, al otro lado
  hallVenue(def = this.def) { return hallVenue(this.scene, { x: PLACES.plaza.x - 2600, z: PLACES.plaza.z }, def); }
}
