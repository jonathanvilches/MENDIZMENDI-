// Las setas de la misión de las setas del bosque de Orgi (data/bosques.js; game/townActividades.js, pickSeta; los
// modelos, game/items.js). Para los pequeños: qué seta es, cómo se reconoce y si se coge o se deja. Las buenas son las
// de otoño del robledal; las venenosas se miran y se quedan en su sitio
export const SETAS = {
  'seta-hongo': { name: 'Hongo', text: 'Es el Boletus edulis, el hongo blanco. Sombrero pardo, pie gordo y blanco, y debajo, en vez de láminas, una esponja de poros. Es grande: se puede coger. Se corta por el pie con la navaja.' },
  'seta-beltza': { name: 'Hongo beltza', text: 'Beltza quiere decir negro en euskera: su sombrero es oscuro, casi negro. Es un hongo como el blanco, con poros debajo, y sale entre robles y castaños al final del verano y en otoño.' },
  'seta-rebozuelo': { name: 'Rebozuelo', text: 'En euskera, zizahori. Es de color naranja, como una yema de huevo, y tiene forma de embudo. Debajo no tiene láminas finas, sino pliegues gruesos que bajan por el pie. Huele un poco a albaricoque.' },
  'seta-matamoscas': { mala: true, name: 'Matamoscas', text: 'Es la Amanita muscaria: roja con motas blancas, como la de los cuentos. Es bonita pero venenosa. Se mira, se le puede hacer una foto, y se deja en su sitio. Si la tocas, lávate bien las manos.' },
  'seta-oronja': { mala: true, name: 'Oronja verde', text: 'Es la Amanita phalloides, la seta más peligrosa del bosque: un trocito puede matar a una persona. Fíjate en el anillo que tiene en el pie y en la bolsa blanca de abajo, la volva. Nunca se coge.' },
};
export const SETAS_BUENAS = ['seta-hongo', 'seta-beltza', 'seta-rebozuelo'];
export const SETAS_MALAS = ['seta-matamoscas', 'seta-oronja'];
