// El pueblo (game/townGame.js), sus conversaciones: hablar con los vecinos, el euskera con ellos, el diálogo de cada
// misión, la cuentacuentos, los sabios y su cuestionario, el músico y los oficios del campo. Son métodos de TownGame:
// townGame.js los une a su clase (util/mezcla.js), con su this.

import { CASTILLOS, CASTLE_QUIZ, PARTS } from '../data/castillos.js';
import COMARCAS from '../data/comarcas.json';
import { CROP } from '../data/campo.js';
import { FAUNA } from '../data/fauna.js';
import { FERIA } from '../data/ferias.js';
import { HITZ_TXT, choicesFor, nextHizketa, nextWord, reviewWord } from '../data/hitzak.js';
import { KIND_LABEL } from '../data/cuentos.js';
import { KIND_TIP, LABEL_TIP, STYLE_TIP } from '../data/sabios.js';
import { LEVELS } from '../data/levels.js';
import { PROCESOS, TRADICIONES } from '../data/procesos.js';
import { TAREAS } from './rutinas.js';
import { TOWN } from '../world/townBuilder.js';
import { addCard, addXP, checkBadges, saveProfile } from './profile.js';
import { choiceGame, infoCard, sequenceGame, simonGame } from '../ui/minigames.js';
import { greet, weatherNow } from './saludo.js';
import { instrumentoById } from '../data/instrumentos.js';
import { isEU } from '../i18n.js';
import { jugarInstrumento } from '../ui/instrumentos.js';
import { leyendaUrl, tradicionUrl } from '../ui/laminas.js';
import { makeItem } from './items.js';
import { terrainHeight } from '../world/heightfield.js';
const loadEncierro = () => import('./encierro.js').then(m => m.Encierro);
export const QUIZ_N = 3;

export class PuebloCharla {
  say(a, lines) {
    const look = a.obj?.userData.look;
    return this.ui.dialog(lines.map(t => ({ who: a.name, look, ...(typeof t === 'string' ? { text: greet(this, t) } : t) })));   // (greet: el saludo a la hora y con el tiempo de ahora)
  }
  // Euskera con los vecinos (data/hitzak.js): cada vecino enseña una palabra de lo que está haciendo (quien pasea, del
  // tiempo que hace) y pregunta cómo se dice; si ya sabes las suyas, repasa una que sabes. Cuando ya sabes unas cuantas,
  // uno de cada dos charla contigo en euskera: te dice algo y eliges qué contestar. Una vez por vecino y visita; se guardan
  // en el perfil (1, oída; 2, acertada) y se ven en el cuaderno del pueblo, pestaña Euskera
  hitzLines(a) {
    if (a.hitzDone) return [];
    const K = this.P.hitzak ||= {}, theme = TAREAS[a.tarea] ? a.tarea : 'base', w0 = weatherNow(this), night = (this.sky?.night ?? 0) > 0.5;
    const sky = w0 === 'snow' ? 'elurra' : w0 === 'rain' ? 'euria' : night ? (this.rnd() < 0.5 ? 'gaua' : 'ilargia') : 'eguzkia';
    let w = nextWord(theme, K, theme === 'paseo' || theme === 'base' ? sky : null); const isNew = !!w;
    if (Object.keys(K).length >= 4 && (!w || this.rnd() < 0.5)) { a.hitzDone = true; return this.hizketaLines(a, { gaua: night, perro: !!this.perro, eguraldia: w0 === 'snow' ? 'elurra' : w0 === 'rain' ? 'euria' : 'argia' }); }
    if (!w) w = reviewWord(K, this.rnd); if (!w) return [];
    a.hitzDone = true;
    const [eu, es] = w, who = a.name, look = a.obj?.userData.look, choices = choicesFor(w, this.rnd), T = HITZ_TXT;
    const out = isNew ? [{ text: T.teach(eu, es), onShow: () => { if (K[eu]) return; K[eu] = 1; saveProfile(); this.ui.toast(T.toast(eu, es), 'talk', 3200); } }] : [];
    out.push({ text: isNew ? T.ask(es) : T.review(es), choices, notr: true, onChoice: (j) => {
      const ok = choices[j] === eu; K[eu] = Math.max(K[eu] || 0, ok ? 2 : 1); addXP(ok ? 6 : 2); saveProfile();
      this.sound.ui(ok ? 'coin' : 'error');
      return [{ who, look, text: ok ? T.ok(eu, es) : T.no(eu, es) }];
    } });
    return out;
  }
  // una conversación corta en euskera: lo que dice el vecino (con el castellano al lado), tres respuestas para elegir y
  // cómo acaba él; si fallas, te dice la buena y qué significaba la tuya
  hizketaLines(a, ctx) {
    const H = this.P.hizketak ||= {}, h = nextHizketa(H, ctx, this.rnd); if (!h) return [];
    const izena = this.P.name || 'Iñigo', put = ([eu, es]) => [eu.replace('{izena}', () => izena), es.replace('{izena}', () => izena)];   // (con función: un nombre con «$» se queda tal cual)
    const [aEu, aEs] = put(h.a), ok = put(h.ok), opts = [ok, ...h.no.map(put)], who = a.name, look = a.obj?.userData.look, T = HITZ_TXT;
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(this.rnd() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    const fin = { who, look, text: T.say(...put(h.fin)) };
    return [{ text: T.say(aEu, aEs), choices: opts.map(o => o[0]), notr: true, onShow: () => { if (H[h.id]) return; H[h.id] = 1; saveProfile(); this.ui.toast(T.toast2(aEu), 'talk', 3200); }, onChoice: (j) => {
      const good = opts[j] === ok; H[h.id] = Math.max(H[h.id] || 0, good ? 2 : 1); addXP(good ? 8 : 2); saveProfile();
      this.sound.ui(good ? 'coin' : 'error');
      return [{ who, look, text: good ? T.ok(...ok) : T.no2(...ok, ...opts[j]) }, fin];
    } }];
  }
  async talk(a) {
    if (a.sabio) return this.sabioTalk(a);
    if (a.cuento) return this.kontalariTalk(a);
    // vecinos sin misión (pelotari, entrenador, puestos): lo suyo, o un saludo; nunca un diálogo de misión vacío
    if (!a.mission) {
      if (a === this.pelotari) return this.campeonato ? this.freePelota() : this.invitaCampeonato();
      if (a === this.coach) return this.playFutbol();
      if (a === this.futsalCoach) return this.playFutsal();
      if (a.shop) return this.tienda.open();
      a.say?.(2); return this.say(a, [`¡Kaixo! Soy ${a.name}. ¡Que disfrutes de ${this.def.name.split(' /')[0]}!`, ...this.hitzLines(a)]);
    }
    const M = a.mission;
    a.say(4); this.player.frozen = true; this.speaker = a;
    this.player.heading = Math.atan2(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z);
    const first = M && !M.done && M.step === 0;
    try { await this.dialog(M, a); } finally { this.player.frozen = false; a.talking = 0; this.speaker = null; }
    // la voz del narrador abre cada misión con un pequeño misterio
    if (first && M.step > 0 && M.type !== 'legend') { const h = this.hook(M); if (h) setTimeout(() => this.ui.whisper?.(h, 5200), 400); }
    this.autoTrack();
  }
  // Diálogos de cada misión según el paso
  async dialog(M, a) {
    const d = this.def, m = M.m, name = this.state.name;
    if (M.done) {
      const extra = M.type === 'quiz' ? ['¿Quieres otra pregunta?'] : [];
      await this.say(a, [`¡Gracias por tu ayuda, ${name}! Aquí en ${d.name} ya te conocemos.`, ...extra]);
      if (M.type === 'quiz') await this.quizRound(M, a, 1);
      return;
    }
    this.tracked = M.i;
    const S = (lines) => this.say(a, lines);
    switch (M.type) {
      case 'visit':
        if (M.step === 0) {
          await S([`¡Kaixo, ${name}! Ongi etorri: ¡te damos la bienvenida a ${d.name}!`, d.intro || '', `Aquí hay ${M.need} lugares que tienes que conocer: ${M.places.map(p => p.name).join(', ')}.`, 'Sigue la luz dorada y la flecha de arriba. Cuando llegues a cada lugar, lo apuntarás en tu cuaderno.'].filter(Boolean));
          this.startVisit(M);
        } else if (M.step === 1) await S([`Te quedan ${M.need - M.count} lugares por visitar. ¡Sigue la luz dorada!`]);
        else { await S([`¡Ya conoces ${d.name}! Ahora la gente del pueblo te pedirá ayuda.`, 'Los que tienen una exclamación amarilla encima tienen una misión para ti.']); await this.complete(M); }
        return;
      case 'process':
        if (M.step === 0) { await S([m.text]); await this.explain(PROCESOS[m.id], m.product, 'what'); await S([`Primero: ${m.gather?.label?.toLowerCase() || 'recoge lo necesario'}. Necesito ${M.need}.`]); this.startGather(M, m.gather?.item || 'star', m.gather?.label || 'Recoger', m.gather?.near); }
        else if (M.step === 1) await S([`Aún faltan ${M.need - M.count}. ¡Tú puedes!`]);
        else if (M.step === 2 || M.step === 3) {
          M.step = 3;
          await S([`¡Perfecto! Ahora hagamos ${m.product} paso a paso.`]);
          await this.explain(PROCESOS[m.id], m.product, 'how');
          await S(['Ordena los pasos: ¿qué se hace primero?']);
          const r = await sequenceGame(this.ui, { title: m.product, hint: 'Toca los pasos en el orden correcto', icon: M.icon, steps: m.steps });
          if (r.win) { await S([`¡Así se hace ${m.product}! Es un producto de ${this.comarca?.name || 'Navarra'}.`]); await this.explain(PROCESOS[m.id], m.product, 'then'); await this.complete(M, { card: m.product, cardText: m.text }); }
        }
        return;
      case 'harvest':
        if (M.step === 0) { await S([m.text, `Recoge ${M.need} ${CROP[m.crop]?.[0] || 'frutos'} en los campos. Te los marco con un brillo.`]); this.startGather(M, M.item, 'Recoger ' + (CROP[m.crop]?.[0] || ''), 'fields'); }
        else if (M.step === 1) await S([`${M.need - M.count === 1 ? 'Te falta 1' : `Te faltan ${M.need - M.count}`}. ¡Mira en los campos!`]);
        else { this.player.rig.doAct('pick', 0.8); await S(['¡Qué buena cosecha! Esto lo llevaremos al mercado.']); await this.complete(M, { card: CROP[m.crop]?.[0], cardText: m.text }); }
        return;
      case 'herd':
        if (M.step === 0) { await S([...(m.story || []), m.text, 'Acércate por detrás de los animales para que avancen hacia la puerta del redil. Si corres, se asustan.']); this.startHerd(M); }
        else if (M.step === 1) await S([`Quedan ${M.need - M.count}. Rodéalos con calma.`]);
        else { await S([m.outro || '¡Todos dentro! Buen trabajo de pastor.']); await this.complete(M, { card: m.card || M.title, cardText: m.cardText || m.text }); }
        return;
      case 'dance':
        if (M.step === 0) {
          // (si la danza tiene su ilustración, la ficha la enseña con lo que se cuenta de ella)
          const lam = tradicionUrl(m.ilus);
          if (lam) { await infoCard(this.ui, { icon: 'dance', lamina: lam, kicker: 'Danza', title: m.name, text: m.text, button: '¡Vamos!' }); await S(['Ven al centro de la plaza y sigue el ritmo con las flechas.']); }
          else await S([m.text, 'Ven al centro de la plaza y sigue el ritmo con las flechas.']);
          M.step = 1;
        }
        else await S(['¡La plaza nos espera! Ponte en el centro.']);
        return;
      case 'carnival':
        if (M.night) {
          if (M.step === 0) { await S([...M.night.story, m.text || ''].filter(Boolean)); M.step = 1; }
          if (M.step === 1) { if (this.isNight()) { await S([M.night.night]); this.startCarnival(M); } else await this.offerNight(a, M.night.wait, () => this.startCarnival(M)); }
          else if (M.step === 2) await S([`${M.need - M.count === 1 ? 'Te falta 1' : `Te faltan ${M.need - M.count}`}. Escucha los cencerros…`]);
          else { await S([`¡Los has encontrado a todos! Así se vive el carnaval de ${this.def.name.split(' /')[0]}: una tradición que se remonta a tiempos muy antiguos.`]); await this.complete(M, { card: M.folk?.name, cardText: M.folk?.fact }); }
          return;
        }
        if (M.step === 0) { await S([m.text || M.folk?.fact || '', M.folk?.culture || '', `Hay ${M.need} escondidos por el pueblo. No los verás desde lejos: escucha sus cencerros, suenan más fuerte cuando estás cerca.`].filter(Boolean)); this.startCarnival(M); }
        else if (M.step === 1) await S([`${M.need - M.count === 1 ? 'Te falta 1' : `Te faltan ${M.need - M.count}`}. Escucha…`]);
        else { await S([`¡Los has encontrado a todos! ${M.folk?.clue ? '' : ''}Así se vive el carnaval en ${this.comarca?.name}.`]); await this.complete(M, { card: M.folk?.name, cardText: M.folk?.fact }); }
        return;
      case 'trade':
        if (M.step === 0) { const of = M.oficio; await S(of ? [of.intro, `Soy ${a.name}. Ven al banco de trabajo y te enseño cómo se hacía, paso a paso.`] : [m.text, `Ven al banco de trabajo. ${M.trade.hint}`]); M.step = 1; }
        else await S([M.tstep ? `Íbamos por el paso ${M.tstep + 1}. Vuelve al banco de trabajo.` : 'Ponte en el banco de trabajo cuando quieras.']);
        return;
      case 'legend': {
        const L = M.leg;
        if (M.step === 0) { await S(L.story); M.step = 1; }
        if (M.step === 1) { if (this.isNight()) { await S([L.night]); this.startLegend(M); } else await this.offerNight(a, L.wait, () => this.startLegend(M)); }
        else if (M.step === 2) await S([`Te quedan ${M.need - M.count} pistas. Busca las luces en la oscuridad.`]);
        else if (M.step === 3) await S([`Ya lo tienes cerca. Ve con cuidado… ${L.creature} te está esperando.`]);
        return;
      }
      case 'race':
        if (m.kind === 'encierro') {
          if (M.step === 2) { await S(['¡Has llegado a la plaza! Así se vive el encierro.']); await this.complete(M, { card: 'El encierro', cardText: m.text }); return; }
          await S([m.text, 'Recuerda: en la vida real solo pueden correr las personas mayores de 18 años. Aquí, en el juego, sí puedes probar. ¿Preparado? Vamos a la Estafeta.']);
          const Encierro = await loadEncierro();
          const r = await new Encierro(this).run();
          if (this.disposed || r.quit || r.error) return;   // (salir a medias o sin poder prepararlo no es «los toros son muy rápidos»)
          if (r.win) { M.step = 2; saveProfile(); await S(['¡Bravo! Has corrido el encierro hasta la plaza.']); await this.complete(M, { card: 'El encierro', cardText: m.text }); }
          else await S(['No pasa nada: los toros son muy rápidos. Habla conmigo cuando quieras intentarlo otra vez.']);
          return;
        }
        if (M.step === 0 || (M.step === 1 && !this.race)) { await S([m.text, `Pasa por los ${M.need} aros antes de que se acabe el tiempo. ¡Mantén pulsado Mayús o el botón de correr!`]); this.startRace(M); }
        else if (M.step === 2) { await S(['¡Qué rapidez! Lo has conseguido.']); await this.complete(M, { card: M.title, cardText: m.text }); }
        return;
      case 'observe': {
        const F0 = FAUNA[M.species[0]];
        if (M.step === 0) {
          await S([...(m.story || []), m.text, F0 ? `Fíjate bien: ${F0.look}` : '', 'Toma mis prismáticos. Pulsa F (o el botón de prismáticos), busca con calma y, cuando el círculo se ponga amarillo, pulsa E para anotarlo. La brújula te indica hacia dónde mirar.'].filter(Boolean));
          M.step = 1; this.binoOn = true; this.ui.showBinoButton(); this.obsSeen ||= new Set(); await this.mochila.give('prismaticos');
        } else if (M.step === 1) await S([`Llevas ${M.count}/${M.need}. ${m.hint || 'Mira al cielo: sigue la marca de la brújula.'}`]);
        else { await S([m.outro || '¡Muy bien observado! Has aprendido a reconocerlos por su silueta, como los guardas de verdad.']); await this.complete(M, { card: M.title, cardText: m.text }); }
        return;
      }
      case 'tradition': {
        await S([m.text]);
        const lam = tradicionUrl(m.ilus) || '';   // (su ilustración, en las fichas de qué es, cómo se hace y antes y ahora)
        if (M.step === 0) { await this.explain(TRADICIONES[m.title], m.title, 'what', lam); await this.explain(TRADICIONES[m.title], m.title, 'how', lam); }
        await S([m.kind === 'angel' ? 'Repite los movimientos en el mismo orden.' : 'Escucha la melodía y repítela.']);
        M.step = 1;
        const r = await simonGame(this.ui, { title: M.title, icon: M.icon, rounds: 4, labels: m.kind === 'angel' ? ['Cuerda', 'Alas', 'Bajar', 'Saludo'] : null });
        if (r.win) { await S(['¡Precioso! Así se mantiene viva la tradición.']); await this.explain(TRADICIONES[m.title], m.title, 'then', lam); await this.complete(M, { card: M.title, cardText: m.text }); }
        else await S(['No pasa nada, inténtalo otra vez cuando quieras.']);
        return;
      }
      case 'pelota': {
        if (!this.fronton) { await S(['Hoy el frontón está cerrado. ¡Vuelve otro día!']); return; }
        if (M.step === 0) {
          await S([...(m.story || []), m.text || '',
            'Así se juega: la pelota tiene que dar en el frontis por encima de la chapa, la raya roja. La puedes devolver de aire o después de un bote.',
            'Ve al círculo verde y pulsa GOLPE cuando la pelota brille. ¡El primero que llegue a 5 tantos gana!'].filter(Boolean));
          M.step = 1;
        } else await S(['¿La revancha? ¡Vamos al frontón!']);
        a.talking = 0; this.player.frozen = false;
        this.sportBusy = true; let r;
        try { r = await this.fronton.play(this, a); } finally { this.sportBusy = false; }
        if (this.disposed || r.quit) return;   // (si se deja a medias, sin «¡Casi!» de un partido que no se ha jugado)
        if (r.win) { await S([`¡${r.you} a ${r.cpu}! Juegas como un pelotari de verdad.`]); await this.complete(M, { card: M.title, cardText: m.text }); }
        else await S([`${r.you} a ${r.cpu}. ¡Casi! Háblame otra vez para jugar la revancha.`]);
        return;
      }
      case 'summit': {
        const pk = M.peak;
        if (M.step === 0 && M.prep) {
          if (!this.supplyOk()) { await S([`Aún no: ${this.supplyText()}. Agua en la fuente de la plaza y comida en el puesto de productos del pueblo.`]); return; }
          M.prep = false;
          await S(['¡Mochila lista! Agua, comida de aquí y ganas de subir. ¡Vamos!', 'Fíjate en las señales pintadas en las piedras: te enseñaré a leerlas por el camino.']);
          this.startSummit(M); return;
        }
        if (M.step === 0) {
          await S([`¿Ves ese monte de ahí arriba? Es como el ${pk.name}${pk.altName ? ' (' + pk.altName + ')' : ''}: ${pk.intro}`,
            `El de verdad mide ${pk.altitude.toLocaleString('es')} metros. Desde ${pk.start} son ${String(pk.distance).replace('.', ',')} km y ${pk.gain} metros de desnivel.`,
            'Te he marcado el camino con mojones pintados de blanco y amarillo, como los de los senderos de verdad. Síguelos hasta la cima y firma en el buzón de cumbre.',
            'Y abre bien los ojos: en la subida viven animales del monte. Si caminas despacio, podrás acercarte a ellos sin asustarlos.',
            'Un consejo de montañera: agua, gorra y paso tranquilo. ¡Y nunca subas sola ni solo al monte!']);
          if (!this.supplyOk()) {
            M.prep = true; this.spawnStall();
            await S(['Pero antes, ¡a llenar la mochila! Al monte se sube con agua y con comida que alimente.', `Necesitas la cantimplora llena (en la fuente de la plaza) y dos alimentos de aquí: pan, queso, miel… Los encontrarás en el puesto de productos del pueblo.`]);
            return;
          }
          M.prep = false;
          this.startSummit(M);
        } else await S([`Sigue los mojones: te faltan ${M.need - M.count} hasta la cima.`]);
        return;
      }
      case 'dolmen': {
        const st = M.site;
        if (M.step === 0) {
          await S(st.intro);
          await infoCard(this.ui, { icon: st.icon, kicker: '¿Qué es?', title: st.whatTitle, text: st.what, button: '¡A excavar!' });
          M.step = 1; M.count = 0;
          const c = TOWN.landmarks.find(l => l.kind === st.landmark)?.spot || M.host.pos;
          st.finds.forEach(([kind], i) => { const a = i / st.finds.length * Math.PI * 2 + 0.4, s2 = this.spot({ x: c.x + Math.cos(a) * 7, z: c.z + Math.sin(a) * 7 }, 3);
            const o = makeItem(kind); o.position.set(s2.x, terrainHeight(s2.x, s2.z), s2.z); this.scene.add(o); this.items.push({ M, x: s2.x, z: s2.z, obj: o, label: 'Excavar con cuidado', kind, find: i }); });
          this.ui.toast(`Busca los brillos ${st.where} y excava con cuidado`, st.icon, 3000);
        } else if (M.step === 1) await S([`Te quedan ${M.need - M.count} hallazgos. ¡Despacio, como una arqueóloga de verdad!`]);
        else {
          if (!M.seqOk) {
            await S([st.hostDone]);
            const r = await sequenceGame(this.ui, { title: st.stepsTitle, hint: 'Toca los pasos en orden', icon: st.icon, steps: st.steps });
            if (!r.win) { await S(['¡Casi! Vuelve a hablar conmigo y lo intentamos otra vez.']); return; }
            M.seqOk = true;
          }
          // (cada yacimiento, su pregunta: data/yacimientos.js)
          if (st.q) {
            const ord = [0, 1, 2].sort(() => this.rnd() - 0.5), Q = st.q;
            const r = await choiceGame(this.ui, { title: st.title || st.whatTitle, icon: st.icon, q: Q.q, options: ord.map(i => Q.options[i]), answer: ord.indexOf(Q.answer), why: Q.why });
            if (!r.win) { await S(['¡Casi! Piénsalo otra vez y vuelve a hablar conmigo.']); return; }
          }
          await infoCard(this.ui, { icon: st.icon, kicker: 'Antes y ahora', title: st.nowTitle, text: 'Así ha cambiado:', extra: `<div class="antes-ahora"><div><b>Antes</b>${st.then}</div><div><b>Ahora</b>${st.now}</div></div>`, button: '¡Lo he aprendido!' });
          await this.complete(M, { card: st.card, cardText: st.what });
        }
        return;
      }
      case 'mirador': {
        if (M.step === 0) {
          await S([`Desde el mirador se ven muchos montes de Navarra. Los montañeros los reconocen por su forma y por su dirección.`, `Toma los prismáticos. Ve al mirador, pulsa F (o el botón de prismáticos) y busca las marcas con interrogación: cada una es un monte de verdad, en su dirección real. Céntrala y pulsa E.`, `Encuentra ${M.need} montes.`]);
          M.step = 1; M.count = 0; this.binoOn = true; this.ui.showBinoButton(); this.obsSeen ||= new Set(); await this.mochila.give('prismaticos');
        } else if (M.step === 1) await S([`Llevas ${M.count} de ${M.need}. Desde el mirador, gira despacio con los prismáticos: las marcas están en el horizonte.`]);
        else {
          const li = M.montes.map(x => `<li><b>${x.name}</b><i>al ${x.dir}</i><span>${x.altitude.toLocaleString('es')} m · ${Math.round(x.km)} km</span></li>`).join('');
          await infoCard(this.ui, { icon: 'peak', kicker: 'Desde el mirador', title: 'Los montes que se ven', text: 'Estos son los montes que se ven desde aquí. ¡Ya sabes encontrarlos!', extra: `<ul class="peaklist">${li}</ul>`, button: '¡Los recordaré!' });
          await this.complete(M, { card: 'Mirador de ' + this.def.name.split(' /')[0], cardText: 'Desde aquí se ven ' + M.montes.map(x => x.name).join(', ') + '.' });
        }
        return;
      }
      case 'castle': {
        const C = M.castle;
        if (M.step === 0) {
          await S(C.intro);
          M.step = 1; M.count = 0;
          // banderas en las partes del castillo, medidas desde su centro hacia la puerta
          const lm = TOWN.landmarks.find(l => l.kind === 'castle'), c = { x: lm?.x ?? M.host.pos.x, z: lm?.z ?? M.host.pos.z }, g = lm?.spot || { x: c.x, z: c.z + 20 };
          const fx = g.x - c.x, fz = g.z - c.z, fl = Math.hypot(fx, fz) || 1, F = { x: fx / fl, z: fz / fl }, Sd = { x: F.z, z: -F.x }, R = 18 * C.size;
          C.parts.forEach((id) => { const p = { ...PARTS[id], ...(C.own[id] || {}) }, want = { x: c.x + (F.x * p.f + Sd.x * p.s) * R, z: c.z + (F.z * p.f + Sd.z * p.s) * R }, s2 = this.spot(want, 5);
            const o = makeItem('flag'); o.position.set(s2.x, terrainHeight(s2.x, s2.z), s2.z); this.scene.add(o); this.items.push({ M, x: s2.x, z: s2.z, obj: o, label: 'Mirar: ' + p.name, kind: 'flag', part: id }); });
          this.ui.toast('Busca las banderas alrededor del castillo', 'castle', 3000);
        } else if (M.step === 1) await S([`Te quedan ${M.need - M.count} partes por ver. ¡Busca las banderas!`]);
        else {
          await S(['¡Ya conoces todas las partes del castillo! Una pregunta de guardián:']);
          const r = await choiceGame(this.ui, { title: 'Guardián del castillo', icon: 'castle', q: CASTLE_QUIZ.q, options: CASTLE_QUIZ.options, answer: CASTLE_QUIZ.answer, why: CASTLE_QUIZ.why });
          if (r && r.win === false) { await S(['¡Casi! Piénsalo otra vez y vuelve a hablar conmigo.']); return; }
          await infoCard(this.ui, { icon: 'castle', kicker: 'Antes y ahora', title: C.title, text: 'Así ha cambiado:', extra: `<div class="antes-ahora"><div><b>Antes</b>${C.then}</div><div><b>Ahora</b>${C.now}</div></div>`, button: 'Seguir' });
          await infoCard(this.ui, { icon: 'castle', kicker: 'Ruta de los castillos', title: 'Castillos de Navarra', text: 'Después de la conquista de Navarra muchos castillos se derribaron. Estos son algunos de los que quedan, en pie o en ruinas:', extra: `<ul class="castlelist">${CASTILLOS.map(([n, t]) => `<li><b>${n}</b> ${t}</li>`).join('')}</ul>`, button: '¡A por ellos!' });
          await this.complete(M, { card: C.title, cardText: C.then });
        }
        return;
      }
      case 'feria': {
        if (M.step === 0) {
          // (con su ilustración, la ficha la enseña con lo que cuenta el tratante, como en las danzas)
          const lam = tradicionUrl(m.ilus);
          if (lam) { await infoCard(this.ui, { icon: 'cow', lamina: lam, kicker: 'Feria de ganado', title: M.title, text: [...FERIA.intro, m.note || ''].filter(Boolean).join(' '), button: '¡Vamos!' }); }
          else await S([...FERIA.intro, m.note || '']);
          M.step = 1;
        }
        else if (M.step === 1) await S(['Ve a los corrales y mira bien los animales. ¡Luego me cuentas!']);
        else {
          await S(['¿Qué te han parecido? Ahora aprende lo más importante de una feria: cómo se cierra un trato.']);
          const ord = [0, 1, 2].sort(() => this.rnd() - 0.5), D = FERIA.deal;
          const r = await choiceGame(this.ui, { title: 'El trato', icon: 'hand', q: D.q, options: ord.map(i => D.options[i]), answer: ord.indexOf(D.answer), why: D.why });
          if (!r.win) { await S(['¡Casi! Piénsalo otra vez y vuelve a hablar conmigo.']); return; }
          this.player.rig.doAct?.('point', 0.5);
          await infoCard(this.ui, { icon: 'cow', kicker: 'Antes y ahora', title: M.title, text: 'Así han cambiado las ferias de ganado:', extra: `<div class="antes-ahora"><div><b>Antes</b>${FERIA.then}</div><div><b>Ahora</b>${FERIA.now}</div></div>`, button: '¡Trato hecho!' });
          this.mochila.addFood('queso', 1);
          await this.complete(M, { card: M.title, cardText: 'En la feria se compra, se vende y se premia el ganado; el trato se cierra con un apretón de manos.' });
        }
        return;
      }
      case 'figure': {
        const F = M.fig;
        if (M.step === 0) {
          await S([F.hello]);
          for (let i = 0; i < F.pages.length; i++) await infoCard(this.ui, { icon: F.icon, lamina: M.figImg, kicker: F.kicker, title: isEU() ? (F.eu || F.name) : `${F.name}${F.eu ? ' · ' + F.eu : ''}`, text: F.pages[i], badge: F.years, button: i < F.pages.length - 1 ? `Seguir (${i + 1}/${F.pages.length})` : 'Ir a ver su recuerdo' });
          if (M.figId && addCard('personaje:' + M.figId, 'historia')) saveProfile();   // (ya lo conoces: se abre en Personajes)
          await S([`Su recuerdo está aquí al lado. Acércate y lee la placa: luego te haré una pregunta.`]);
          M.step = 1; M.memo.obj.userData.ring.visible = true;
        } else await S([`Ve al recuerdo de ${F.name}: lo verás con el aro dorado.`]);
        return;
      }
      case 'quiz':
        if (M.step === 0) { await S([`¡Hola, ${name}! Soy quien más sabe de ${d.name}. ¿Aceptas mi reto? Tres preguntas sobre el pueblo y la comarca.`]); M.step = 1; }
        await this.quizRound(M, a, QUIZ_N - M.count);
        if (M.count >= M.need) await this.complete(M, { card: `Sabio de ${d.name}` });
    }
  }
  // Tarjetas que explican un producto o una tradición: qué es, cómo se hace, y antes/ahora
  async explain(X, title, part, lamina = '') {
    if (!X) return;
    const icon = this.missions.find(M => M.m.product === title || M.m.title === title)?.icon || 'book';
    if (part === 'what') return infoCard(this.ui, { icon, lamina, kicker: '¿Qué es?', title, text: X.what, button: 'Entendido' });
    if (part === 'how') return infoCard(this.ui, { icon, lamina, kicker: 'Cómo se hace', title, text: X.how, button: '¡Vamos!' });
    return infoCard(this.ui, { icon, lamina, kicker: 'Antes y ahora', title, text: 'Así ha cambiado:', extra: `<div class="antes-ahora"><div><b>Antes</b>${X.then}</div><div><b>Ahora</b>${X.now}</div></div>`, button: '¡Lo he aprendido!' });
  }
  async kontalariTalk(a) {
    const C = a.cuento, town = this.def.name.split(' /')[0], f = !!C.teller.female, n = C.parts.length;
    a.say(5); this.player.frozen = true; this.speaker = a;
    this.player.heading = Math.atan2(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z);
    let isNew = false;
    try {
      const heard = this.P.cards.includes('cuento:' + C.id);
      await this.say(a, [heard ? `¡Otra vez por aquí, ${this.state.name}! ¿Quieres volver a oír «${C.title}»? Siéntate, que empiezo.`
        : `Kaixo, ${this.state.name}. Soy ${a.name.replace(/^Kontalari /, '')}, ${f ? 'la contadora' : 'el contador'} de cuentos de ${town}. ¿Te cuento ${C.kind === 'historia' ? 'una historia que pasó de verdad' : 'una leyenda'}? Se llama «${C.title}».`]);
      for (let i = 0; i < n; i++) await infoCard(this.ui, { icon: C.icon, lamina: leyendaUrl(C.id, true) || '', kicker: `${KIND_LABEL[C.kind]} · ${i + 1} de ${n}`, title: C.title, text: C.parts[i], button: i < n - 1 ? 'Sigue…' : 'Fin' });
      await infoCard(this.ui, { icon: 'visit', kicker: C.place, title: 'Lo que puedes ver hoy', text: C.today, button: 'Seguir' });
      await choiceGame(this.ui, { title: C.title, icon: 'quiz', q: C.q.q, options: C.q.options, answer: C.q.answer, why: C.q.why });
      isNew = addCard('cuento:' + C.id, C.kind === 'historia' ? 'historia' : 'tradiciones');
      addXP(isNew ? 25 : 3); saveProfile();
    } finally { this.player.frozen = false; a.talking = 0; this.speaker = null; }
    for (const bd of checkBadges()) await infoCard(this.ui, { icon: bd.icon, kicker: 'Nueva insignia', title: bd.name, text: bd.text, button: '¡Bien!' });
    if (isNew) this.ui.toast('Cuento guardado en tu libro de leyendas (menú · Leyendas)', 'book', 3000);
  }
  async sabioTalk(a) {
    const p = a.sabio, d = this.def, f = /^Sabia/.test(a.name);
    a.say(5); this.player.frozen = true; this.speaker = a;
    this.player.heading = Math.atan2(a.pos.x - this.player.pos.x, a.pos.z - this.player.pos.z);
    try {
      const tip = p.kind === 'church' ? (LABEL_TIP[p.label] || STYLE_TIP[p.style]) : KIND_TIP[p.kind];
      await this.say(a, [`Kaixo, ${this.state.name}. Soy ${a.name.replace(/^Sabi[oa] /, '')}, ${f ? 'la sabia' : 'el sabio'} del pueblo: conozco la historia de cada piedra de ${d.name.split(' /')[0]}.`, `${p.name}. ${p.text}`, tip].filter(Boolean));
      // cuenta como lugar visitado en la misión «Conoce el pueblo»
      const M = this.missions.find(x => x.type === 'visit' && !x.done);
      if (M) { if (M.step === 0) this.startVisit(M); const q = M.places.find(x => x.name === p.name); if (q && !q.seen) { q.seen = true; await this.showPlace(M, q); } }
    } finally { this.player.frozen = false; a.talking = 0; this.speaker = null; }
  }
  async tocarCon(a) {
    const inst = instrumentoById(a.musico); if (!inst) return;
    a.say(3); a.wave = 1.2; this.player.frozen = true; this.mode = 'mini';
    try {
      await this.say(a, [inst.lines.ask]);
      const r = await jugarInstrumento(this.ui, inst, { who: a.name });
      if (r.quit) return;
      await this.say(a, [r.win ? inst.lines.win : inst.lines.lose]);
      if (r.win) { this.player.rig?.doCheer?.(); for (const bd of checkBadges()) await infoCard(this.ui, { icon: bd.icon, kicker: 'Nueva insignia', title: bd.name, text: bd.text, button: '¡Bien!' }); }
    } finally { this.player.frozen = false; this.mode = 'play'; a.talking = 0; }
  }
  async explainWork(a) {
    const I = a.info; a.say(3); a.wave = 1.2;
    this.player.frozen = true;
    try {
      await this.say(a, I.lines);
      await infoCard(this.ui, { icon: I.icon, kicker: 'Oficios del campo', title: I.title, text: 'Así ha cambiado este trabajo:', extra: `<div class="antes-ahora"><div><b>Antes</b>${I.then}</div><div><b>Ahora</b>${I.now}</div></div>`, badge: addCard('campo:' + I.title) ? 'Nueva carta' : '', button: '¡Lo he entendido!' });
    } finally { this.player.frozen = false; a.talking = 0; }
  }
  async showAgro(o) {
    const I = o.info; this.player.frozen = true;
    try { await infoCard(this.ui, { icon: I.icon, kicker: 'El campo de ' + this.def.name.split(' /')[0], title: I.title, text: I.text, extra: `<div class="antes-ahora"><div><b>Antes</b>${I.then}</div><div><b>Ahora</b>${I.now}</div></div>`, badge: addCard('campo:' + I.title) ? 'Nueva carta' : '', button: 'Seguir explorando' }); }
    finally { this.player.frozen = false; }
  }
  // ---------- Preguntas ----------
  questions() {
    const d = this.def, c = this.comarca, others = LEVELS.filter(l => l.id !== d.id && l.church);
    const pick3 = (right, pool) => { const w = [...new Set(pool.filter(x => x && x !== right))].sort(() => this.rnd() - 0.5).slice(0, 2); const opts = [right, ...w].sort(() => this.rnd() - 0.5); return { a: opts, ok: opts.indexOf(right) }; };
    const Q = [];
    if (d.church) Q.push({ q: `¿Cómo se llama la iglesia principal de ${d.name}?`, ...pick3(d.church.name, others.map(o => o.church.name)), why: d.church.text });
    Q.push({ q: `¿En qué comarca está ${d.name}?`, ...pick3(c?.name, COMARCAS.map(x => x.name)), why: `${d.name} pertenece a ${c?.name}.` });
    if (d.river) Q.push({ q: `¿Qué río o regata pasa por ${d.name}?`, ...pick3(d.river.name, LEVELS.filter(l => l.river).map(l => l.river.name)), why: `El ${d.river.name} da vida a los campos y antes movía molinos.` });
    if (c?.culture?.dance) Q.push({ q: `¿Qué danza es típica de ${c.name}?`, ...pick3(c.culture.dance.title, COMARCAS.filter(x => x.culture?.dance).map(x => x.culture.dance.title)), why: c.culture.dance.text });
    if (c?.culture?.carnival) Q.push({ q: `¿Qué carnaval es famoso en ${c.name}?`, ...pick3(c.culture.carnival.title, COMARCAS.filter(x => x.culture?.carnival).map(x => x.culture.carnival.title)), why: c.culture.carnival.text });
    if (c?.culture?.festival) Q.push({ q: `¿Qué fiesta se celebra en ${c.culture.festival.place}?`, ...pick3(c.culture.festival.title, COMARCAS.filter(x => x.culture?.festival).map(x => x.culture.festival.title)), why: c.culture.festival.text });
    for (const lm of d.landmarks || []) Q.push({ q: `¿Qué puedes visitar en ${d.name}?`, ...pick3(lm.name, LEVELS.flatMap(l => (l.landmarks || []).map(x => x.name))), why: lm.text });
    const pm = (d.missions || []).find(m => m.type === 'process');
    if (pm) Q.push({ q: `¿Qué producto has aprendido a hacer en ${d.name}?`, ...pick3(pm.product, LEVELS.flatMap(l => (l.missions || []).filter(m => m.type === 'process').map(m => m.product))), why: pm.text });
    const cropM = (d.missions || []).find(m => m.type === 'harvest');
    if (cropM) Q.push({ q: `¿Qué se cosecha en ${d.name}?`, ...pick3(CROP[cropM.crop]?.[0], Object.values(CROP).map(x => x[0])), why: cropM.text });
    if (c?.nature?.animals?.length) { const an = c.nature.animals[0]; Q.push({ q: `¿Qué animal vive en los montes de ${c.name}?`, ...pick3(an, ['Pingüino', 'Camello', 'Canguro', 'Cebra']), why: `En ${c.name} puedes ver ${c.nature.animals.join(', ').toLowerCase()}.` }); }
    return Q.filter(q => q.a.length >= 2);
  }
  async quizRound(M, a, n) {
    const all = this.questions(); this.quizUsed ||= new Set();
    let pool = all.filter(q => !this.quizUsed.has(q.q)); if (pool.length < n) { this.quizUsed.clear(); pool = all; }
    for (let i = 0; i < n && pool.length; i++) {
      const Q = pool.splice(Math.floor(this.rnd() * pool.length), 1)[0]; this.quizUsed.add(Q.q);
      let ok = false;
      await this.say(a, [{ text: Q.q, choices: Q.a, onChoice: (j) => { ok = j === Q.ok; return [{ who: a.name, look: a.obj.userData.look, text: (ok ? '¡Correcto! ' : `No era esa. La respuesta es: ${Q.a[Q.ok]}. `) + (Q.why || '') }]; } }]);
      if (ok) { M.count++; this.sound.ui('coin'); this.ts.quizOk = (this.ts.quizOk || 0) + 1; } else this.sound.ui('error');
      this.ui.setQuest && this.updateHUD();
    }
    saveProfile();
  }
}
