// El sombreado sencillo, para las gráficas del procesador del ordenador (calidad baja sin pantalla táctil, main.js): los
// materiales de siempre (MeshStandardMaterial) sin el brillo calculado como en la realidad, que es lo que más cuenta en
// cada punto de la imagen. Queda la luz del sol y la del cielo, con el color de cada cosa; lo metálico, con su color como
// si fuera mate. En el juego casi todo es mate (rugosidad 0,85-0,9) y apenas cambia. Se cambia el trozo de sombreador de
// three.js, que se lee al compilar: hay que llamarlo antes de pintar nada
import * as THREE from 'three';

let hecho = false;
export function sombreadoSencillo() {
  if (hecho) return; hecho = true;
  const C = THREE.ShaderChunk;
  let s = C.lights_physical_pars_fragment;
  // (la luz directa: solo la difusa, con el color de lo metálico sumado)
  s = s.replace(/reflectedLight\.directSpecular \+= irradiance \* BRDF_GGX\([^;]*\);\s*reflectedLight\.directDiffuse \+= irradiance \* BRDF_Lambert\( material\.diffuseColor \);/,
    'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor + material.specularColor );');
  // (la del cielo, igual: sin el reparto entre brillo y color de la superficie)
  s = s.replace(/(void RE_IndirectSpecular_Physical\([^)]*\) \{)[\s\S]*?\n\}\n/,
    '$1\n\treflectedLight.indirectDiffuse += ( material.diffuseColor + material.specularColor ) * irradiance * RECIPROCAL_PI;\n}\n');
  if (s !== C.lights_physical_pars_fragment && /RE_IndirectSpecular_Physical\([^)]*\) \{\n\treflectedLight/.test(s)) C.lights_physical_pars_fragment = s;
}
