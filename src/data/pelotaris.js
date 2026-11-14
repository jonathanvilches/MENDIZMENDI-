// Los pelotaris de la plantilla (ui/pelotariFig.js), cada uno con su pueblo, su estilo y su golpe estrella fijos: los que
// cuentan los comentaristas en el partido (pelota/guionVoz.js, «Unai es de Tafalla y juega con la izquierda…»). Antes el
// pueblo salía a suertes en cada campeonato y el estilo, de sus números; así la carta, el cuadro y lo que se oye cuadran.
// Iñigo, el protagonista, no está: juega por tu pueblo. Personajes inventados, no pelotaris reales.
export const FICHAS = {
  unai: { town: 'Tafalla', arq: 'zurdo', estrella: 'cortada' },
  mikel: { town: 'Leitza', arq: 'estratega', estrella: 'gancho' },
  aitor: { town: 'Tudela', arq: 'zurdo', estrella: 'gancho' },
  inaki: { town: 'Altsasu', arq: 'estratega', estrella: 'dosparedes' },
  ander: { town: 'Lesaka', arq: 'rematador', estrella: 'largo' },
  xabier: { town: 'Olite', arq: 'defensor', estrella: 'dejada' },
  jokin: { town: 'Cortes', arq: 'zurdo', estrella: 'cortada' },
  ekaitz: { town: 'Elizondo', arq: 'rematador', estrella: 'cortada' },
  julen: { town: 'Puente la Reina', arq: 'estratega', estrella: 'dejada' },
  asier: { town: 'Sangüesa', arq: 'defensor', estrella: 'dejada' },
  oihana: { town: 'Estella-Lizarra', arq: 'estratega', estrella: 'dosparedes' },
  garazi: { town: 'Viana', arq: 'estratega', estrella: 'dejada' },
  maialen: { town: 'Doneztebe', arq: 'defensor', estrella: 'dejada' },
  amaia: { town: 'Altsasu', arq: 'rematador', estrella: 'cortada' },
  irati: { town: 'Lekunberri', arq: 'defensor', estrella: 'cortada' },
  nahia: { town: 'Aoiz', arq: 'zurdo', estrella: 'dosparedes' },
  nerea: { town: 'Leitza', arq: 'rematador', estrella: 'largo' },
  leire: { town: 'Lumbier', arq: 'estratega', estrella: 'gancho' },
  ane: { town: 'Irurtzun', arq: 'estratega', estrella: 'dosparedes' },
  miren: { town: 'Puente la Reina', arq: 'rematador', estrella: 'largo' },
  uxue: { town: 'Etxalar', arq: 'defensor', estrella: 'largo' },
};
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/** La ficha del pelotari de la plantilla con ese nombre exacto («Unai», «Unai (Tafalla)»), o null */
export const fichaDe = (name) => FICHAS[fold(String(name || '').split(/[,·(]/)[0]).split(/\s+/)[0]] || null;
