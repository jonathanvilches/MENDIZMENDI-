// Nombres de pila y oficios con género, para que el nombre de cada vecino vaya con su cuerpo: si el personaje es
// un chico, su nombre es de chico, y si es una chica, de chica (lo comprueban el juego y tools/nombres.mjs).
export const NOMBRES_M = ['Aitor', 'Ander', 'Andoni', 'Asier', 'Beñat', 'Eneko', 'Endika', 'Ekaitz', 'Gaizka', 'Gorka', 'Haritz', 'Aritz', 'Ibai', 'Igor',
  'Iker', 'Imanol', 'Iñaki', 'Iñigo', 'Íñigo', 'Jokin', 'Jon', 'Joseba', 'Josu', 'Joxe', 'Josetxo', 'Julen', 'Kepa', 'Koldo', 'Manex', 'Mattin', 'Mikel',
  'Oier', 'Patxi', 'Peio', 'Pello', 'Txema', 'Txomin', 'Unai', 'Xabier', 'Xabi', 'Fermín', 'Martín', 'Ramón', 'Julián', 'Pablo', 'Miguel', 'Juan',
  'José', 'Javier', 'Francisco', 'Sancho', 'Carlos', 'Teobaldo', 'Felipe', 'Enrique', 'Pedro', 'Antonio', 'Manuel', 'Luis', 'Andrés', 'Tomás',
  'Alfonso', 'Fernando', 'Santiago', 'Jesús', 'Ángel', 'Ignacio', 'Nicolás', 'Tximista', 'Benito', 'Agustín', 'Alberto', 'Rafael', 'Roldán', 'Paco',
  'Lucas', 'Mateo', 'Daniel', 'David', 'Hugo', 'Leo', 'Marcos', 'Pepe', 'Txus', 'Josema', 'Inazio', 'Eduardo', 'Ernesto', 'Hilario', 'Gabriel', 'Simón',
  'Juanito', 'Juanjo', 'Txetxu', 'Pachi', 'Xanti', 'Santi', 'Bixente', 'Mitxel', 'Urko', 'Eder', 'Erik', 'Galder', 'Gotzon', 'Markel', 'Ugaitz', 'Xabat'];
export const NOMBRES_F = ['Ainhoa', 'Aitziber', 'Amaia', 'Ane', 'Arantxa', 'Arantza', 'Begoña', 'Edurne', 'Elixabete', 'Garazi', 'Garbiñe', 'Gentzane',
  'Graxi', 'Haizea', 'Idoia', 'Irati', 'Iratxe', 'Itsaso', 'Itziar', 'Izaskun', 'Jone', 'Josune', 'June', 'Karmele', 'Kattalin', 'Koro', 'Laia', 'Leire',
  'Lide', 'Maddi', 'Maialen', 'Maite', 'Malen', 'Maritxu', 'Mirentxu', 'Miren', 'Nahia', 'Naroa', 'Nekane', 'Nerea', 'Oihana', 'Olatz', 'Saioa', 'Uxue',
  'Paula', 'Lucía', 'María', 'Mari', 'Carmen', 'Pilar', 'Rosa', 'Teresa', 'Isabel', 'Juana', 'Blanca', 'Sancha', 'Urraca', 'Toda', 'Leonor', 'Catalina',
  'Magdalena', 'Elena', 'Ana', 'Inés', 'Marta', 'Sara', 'Julia', 'Alicia', 'Beatriz', 'Raquel', 'Rosario', 'Dolores', 'Mercedes', 'Josefa', 'Margarita',
  'Josefina', 'Remedios', 'Sagrario', 'Socorro', 'Asun', 'Puri', 'Maribel', 'Mariví', 'Lourdes', 'Ainara', 'Alazne', 'Amets', 'Ekiñe', 'Enara', 'Ibone',
  'Irantzu', 'Itxaso', 'Lorea', 'Maider', 'Miriam', 'Oihane', 'Udane', 'Zuriñe', 'Andrea', 'Clara', 'Laura', 'Irene', 'Noelia', 'Nora', 'Emilia'];
// los que se ponen cuando hay que cambiar un nombre (de aquí, cortos y fáciles de leer)
const PON_M = ['Jon', 'Mikel', 'Iker', 'Unai', 'Koldo', 'Patxi', 'Josu', 'Aitor', 'Peio', 'Xabier', 'Iñaki', 'Ander', 'Julen', 'Eneko', 'Gorka', 'Kepa'];
const PON_F = ['Ane', 'Maite', 'Miren', 'Leire', 'Amaia', 'Nerea', 'Itziar', 'Maddi', 'Garazi', 'Edurne', 'Ainhoa', 'Uxue', 'Irati', 'Olatz', 'Nekane', 'Josune'];
// oficios y tratos con forma de chico y de chica (los de -ari, «guía» o «guarda» valen para los dos)
const ROL = [['pastor', 'pastora'], ['quesero', 'quesera'], ['molinero', 'molinera'], ['herrero', 'herrera'], ['cestero', 'cestera'], ['palomero', 'palomera'],
  ['ganadero', 'ganadera'], ['criador', 'criadora'], ['hospitalero', 'hospitalera'], ['tendero', 'tendera'], ['panadero', 'panadera'], ['bodeguero', 'bodeguera'],
  ['agricultor', 'agricultora'], ['apicultor', 'apicultora'], ['alfarero', 'alfarera'], ['carpintero', 'carpintera'], ['sabio', 'sabia'], ['maestro', 'maestra'],
  ['monje', 'monja'], ['abad', 'abadesa'], ['hortelano', 'hortelana'], ['pescador', 'pescadora'], ['leñador', 'leñadora'], ['artesano', 'artesana'],
  ['vecino', 'vecina'], ['señor', 'señora'], ['don', 'doña'], ['chico', 'chica'], ['niño', 'niña'], ['abuelo', 'abuela'], ['aitona', 'amona'], ['rey', 'reina'],
  ['san', 'santa'], ['peregrino', 'peregrina'], ['ciclista', 'ciclista'], ['violinista', 'violinista'], ['viticultor', 'viticultora'], ['vaquero', 'vaquera'],
  ['cocinero', 'cocinera'], ['zapatero', 'zapatera'], ['tejedor', 'tejedora'], ['lavandero', 'lavandera'], ['carbonero', 'carbonera'], ['almadiero', 'almadiera'],
  ['guardés', 'guardesa'], ['conde', 'condesa'], ['príncipe', 'princesa'], ['músico', 'música'], ['cantero', 'cantera'], ['sidrero', 'sidrera'],
  ['txakolinero', 'txakolinera'], ['resinero', 'resinera'], ['bertsolari', 'bertsolari'], ['ermitaño', 'ermitaña'], ['campanero', 'campanera'],
  ['hilandero', 'hilandera'], ['encargado', 'encargada'], ['vendedor', 'vendedora'], ['frutero', 'frutera'], ['carnicero', 'carnicera'], ['jardinero', 'jardinera'],
  ['arqueólogo', 'arqueóloga'], ['guardabosques', 'guardabosques'], ['recolector', 'recolectora'], ['mielero', 'mielera'], ['salinero', 'salinera'],
  ['espartero', 'espartera'], ['labrador', 'labradora'], ['mozo', 'moza'], ['alcalde', 'alcaldesa'], ['juglar', 'juglaresa']];
const lc = (s) => s.toLowerCase();
const NM = new Set(NOMBRES_M.map(lc)), NF = new Set(NOMBRES_F.map(lc));
const RM = new Map(ROL.filter(([m, f]) => m !== f).map(([m, f]) => [m, f])), RF = new Map(ROL.filter(([m, f]) => m !== f).map(([m, f]) => [f, m]));

/** 'm', 'f' o null según el nombre («Ane, pastora» → 'f'; «Sabio Patxi» → 'm'; «Juglar» → 'm'; «Guía» → null). */
export function nameGender(full = '') {
  for (const w of lc(full).split(/[\s,.;:()«»"]+/).filter(Boolean)) {
    if (NF.has(w) || RF.has(w)) return 'f';
    if (NM.has(w) || RM.has(w)) return 'm';
  }
  return null;
}

/** El mismo nombre en el otro género: el nombre de pila por uno de la lista (siempre el mismo para cada nombre) y los
 *  oficios en su forma («Ane, pastora» → «Jon, pastor» si el cuerpo es de chico). */
export function nameFor(full, sex) {
  const want = sex === 'girl' ? 'f' : 'm';
  if (!full || nameGender(full) !== (want === 'f' ? 'm' : 'f')) return full;
  const L = want === 'f' ? PON_F : PON_M, other = want === 'f' ? NM : NF, role = want === 'f' ? RM : RF;
  const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return full.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g, (w) => {
    const k = lc(w);
    if (other.has(k)) return L[hash(k) % L.length];
    if (role.has(k)) { const r = role.get(k); return w[0] === w[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r; }
    return w;
  });
}
