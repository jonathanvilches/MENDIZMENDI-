import{O as e,an as t,d as n,in as r,on as i}from"./three-BAS9ILz6.js";import{l as a,o}from"./glb-CBkVUZ95.js";var s={sanfermin:.056,pastor:-.115,osasuna:.119,osasuna_fuera:.112,osasuna_juez:.119,pelotari:.08,pelotari_rojo:.087},c={negro:`#171312`,castano:`#553321`,castanoClaro:`#8a5a34`,cobrizo:`#793018`,pelirrojo:`#b0491e`,rubioOscuro:`#aa844d`,rubio:`#eabc67`,canoso:`#968f87`,blanco:`#dbd6cb`};function l(t){let n=new e(t),r=2+1.8*(1-(.3*n.r+.59*n.g+.11*n.b));return[n.r,n.g,n.b].map(e=>(e/r)**(1/2.2))}var u=[null,null,null,`negro`,`negro`,`negro`,`castano`,`castano`,`castano`,`castanoClaro`,`castanoClaro`,`rubioOscuro`,`rubio`,`cobrizo`,`pelirrojo`];function d(e){let t=u[(Math.imul(e,2654435761)>>>0)%997%u.length];return t?c[t]:null}var f=e=>{let t=7;for(let n of String(e))t=t*31+n.charCodeAt(0)>>>0;return t},p=`uniform vec3 uHairC; uniform vec2 uHairK; varying vec3 vHairP;
vec3 noHair(vec3 lin){
  vec3 c = pow(max(lin, vec3(0.)), vec3(0.4545)), p = vHairP;
  float mx = max(c.r, max(c.g, c.b)), l = dot(c, vec3(0.3, 0.59, 0.11)), w = smoothstep(0.16, 0.3, (c.r - c.b) / max(c.r, 0.004)) * step(c.b, c.g + 0.03);
  // lo casi negro (el fondo de los surcos y las juntas de la textura) también es pelo, salvo con boina
  w = uHairK.x > 0. ? max(w, 1. - smoothstep(0.025, 0.04, mx)) : w * smoothstep(0.3, 0.42, l / -uHairK.x) * (1. - smoothstep(0.89, 0.91, p.y));
  float k = smoothstep(0.665, 0.69, p.y) * w * (1. - smoothstep(0.36, 0.5, mx));
  float fr = smoothstep(0.02, 0.045, p.z), ax = abs(p.x);
  k *= 1. - fr * (1. - smoothstep(0.088, 0.098, ax)) * (1. - smoothstep(0.815, 0.826, p.y));
  if (k <= 0.) return lin;
  // (sin bajar del 70 %: las juntas de la textura y el fondo de los surcos, casi negros, eran rayas oscuras en el pelo claro;
  // sin pasar del 120 %: los brillos, a pleno sol, se quemaban a blanco)
  vec3 o = uHairC * pow(clamp(l / abs(uHairK.x), 0.7, 1.2), 1.5);
  o *= 1. - uHairK.y * fr * (1. - smoothstep(0.09, 0.1, ax)) * (1. - smoothstep(0.86, 0.875, p.y));
  return mix(lin, pow(clamp(o, 0., 1.), vec3(2.2)), k);
}`,m=/vec4 emissiveColor = (?:texture2D|mzTex)\( emissiveMap, vEmissiveMapUv \);/;function h(e,a,o,c){if(!c||!e.map)return e;a.boundingBox||a.computeBoundingBox();let u=a.boundingBox,d=Math.max(.001,u.max.y-u.min.y),f=l(c),h=Math.max(...f),g={uHairC:{value:new t(...f)},uHairK:{value:new r(e.userData.hairRef||s[o]||.09,.6*h)},uHairBox:{value:new i(u.min.y,d,(u.min.x+u.max.x)/2,(u.min.z+u.max.z)/2)}},_=e.onBeforeCompile,v=e.customProgramCacheKey;return e.onBeforeCompile=(t,r)=>{_?.call(e,t,r),Object.assign(t.uniforms,g),t.vertexShader=t.vertexShader.replace(`#include <common>`,`#include <common>
uniform vec4 uHairBox; varying vec3 vHairP;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
vHairP = vec3(position.x - uHairBox.z, position.y - uHairBox.x, position.z - uHairBox.w) / uHairBox.y;`),t.fragmentShader=t.fragmentShader.replace(`#include <common>`,`#include <common>
`+p).replace(`#include <color_fragment>`,`#include <color_fragment>
 diffuseColor.rgb = noHair(diffuseColor.rgb);`).replace(`#include <emissivemap_fragment>`,n.emissivemap_fragment).replace(m,e=>e+`
 emissiveColor.rgb = noHair(emissiveColor.rgb);`)},e.customProgramCacheKey=()=>(v?v.call(e):``)+`+pelo`,e.needsUpdate=!0,e}var g=[.528,.449,.377];function _(e){return o(e,.3),e.onBeforeCompile=e=>{e.fragmentShader=e.fragmentShader.replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
totalEmissiveRadiance = emissive * diffuseColor.rgb;`)},e.customProgramCacheKey=()=>`chica-pelo`,e}function v(e,t){let n=l(t).map(e=>e**2.2);return e.color.setRGB(n[0]/g[0],n[1]/g[1],n[2]/g[2]),e}function y(e,t,n){n&&e.traverse(e=>{if(e.userData.peloColor){e.material=v(_(e.material.clone()),n),e.material.userData.own=!0;return}if(e.userData.pelo||!e.isSkinnedMesh||!e.material?.map)return;let r=e.material.clone();r.userData.own=!0,e.material.userData.fillK!=null&&o(r,e.material.userData.fillK),e.material=h(a(r),e.geometry,t,n)})}var b=`uniform vec3 uPeloC; uniform float uPeloRef;
vec3 conPelo(vec3 c, float a){
  if (a < 0.03) return c;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 o = uPeloC * clamp(pow(l / uPeloRef, 0.85), 0.4, 1.9);
  return mix(c, o, smoothstep(0.03, 0.7, a));
}`;function x(e,r,i){if(!r||!e.map)return e;let a={uPeloC:{value:new t(...r)},uPeloRef:{value:Math.max(.004,i||.05)}},o=e.onBeforeCompile,s=e.customProgramCacheKey;return e.onBeforeCompile=(t,r)=>{o?.call(e,t,r),Object.assign(t.uniforms,a),t.fragmentShader=t.fragmentShader.replace(`#include <common>`,`#include <common>
`+b).replace(`#include <color_fragment>`,`float mzPelo = clamp((1.0 - diffuseColor.a) * 2.0, 0.0, 1.0); diffuseColor.a = opacity;
#include <color_fragment>
 diffuseColor.rgb = conPelo(diffuseColor.rgb, mzPelo);`).replace(`#include <emissivemap_fragment>`,n.emissivemap_fragment).replace(m,e=>e+`
 emissiveColor.rgb = conPelo(emissiveColor.rgb, clamp((1.0 - emissiveColor.a) * 2.0, 0.0, 1.0));`)},e.customProgramCacheKey=()=>(s?s.call(e):``)+`+peloV`,e.needsUpdate=!0,e}export{_ as a,f as c,y as i,d as n,v as o,h as r,x as s,c as t};