import{O as e,an as t,ct as n,in as r,on as i}from"./three-BAS9ILz6.js";import{A as a,O as o,R as s,V as c,j as l}from"./glbChar-hp2UZVZs.js";var u=`
vec3 noHsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }
vec3 noRgb(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(1.,2./3.,1./3.))*6.-3.); return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y); }
// el color nuevo (HSV) con el brillo del píxel original respecto al brillo típico de esa prenda
vec3 noTone(vec4 t, float v, float ref){ return noRgb(vec3(t.x, t.y, clamp(t.z * v / ref, 0., 1.))); }
`,d={pastor:`
    bool white = s < 0.16 && v > 0.45, red = (h < 0.05 || h > 0.9) && s > 0.5;
    if (y > 0.36 && y < 0.66 && white && uShirt.w > 0.) return noTone(uShirt, v, 0.76);
    if (y > 0.36 && y < 0.64 && red && v < 0.45 && uVest.w > 0.) return noTone(uVest, v, 0.26);
    if (y > 0.55 && y < 0.71 && red && v >= 0.45 && uAcc.w > 0.) return noTone(uAcc, v, 0.7);
    if (y > 0.16 && y < 0.37 && v < 0.34 && s > 0.35 && uPants.w > 0.) return noTone(uPants, v, 0.22);`,sanfermin:`
    bool white = s < 0.16 && v > 0.45, red = (h < 0.05 || h > 0.93) && s > 0.6 && v > 0.35;
    if (y > 0.36 && y < 0.67 && white && uShirt.w > 0.) return noTone(uShirt, v, 0.76);
    if (y > 0.075 && y <= 0.36 && white && uPants.w > 0.) return noTone(uPants, v, 0.76);
    if (y < 0.7 && red && uAcc.w > 0.) return noTone(uAcc, v, 0.76);`,pelotari:`
    bool white = s < 0.16 && v > 0.45, blue = h > 0.5 && h < 0.72 && s > 0.4;
    if (y > 0.36 && y < 0.7 && blue && uShirt.w > 0.) return noTone(uShirt, v, 0.65);
    if (y > 0.07 && y <= 0.36 && white && uPants.w > 0.) return noTone(uPants, v, 0.76);`,osasuna:`
    bool red = (h < 0.05 || h > 0.93) && s > 0.6 && v > 0.35, navy = h > 0.55 && h < 0.78 && s > 0.3 && v < 0.45;
    if (y > 0.36 && y < 0.66 && red && uShirt.w > 0.) return noTone(uShirt, v, 0.78);
    if (y > 0.12 && y < 0.42 && navy && uPants.w > 0.) return noTone(uPants, v, 0.24);`},f=`
    if (uSash.w > 0. && abs(y - uPwaist.x) < uPwaist.y && abs(vNoP.x) < uPwaist.z) return uSash.rgb * (0.8 + 0.2 * v);
    if (uWrist.w > 0. && (noBanda(vNoP, uPwL, uPeL) || noBanda(vNoP, uPwR, uPeR))) return uWrist.rgb * (0.86 + 0.14 * v);
    if (uShoes.w > 0. && y < uPfoot && s < 0.24 && v > 0.42) return noTone(uShoes, v, 0.9);`;d.osasuna_fuera=`
    bool white = s < 0.16 && v > 0.45, dark = v < 0.45 && (s > 0.3 || v < 0.2);
    if (y > 0.43 && y < 0.66 && white && uShirt.w > 0.) return noTone(uShirt, v, 0.76);   // (más abajo, las manos claras)
    if (y > 0.12 && y < 0.42 && dark && uPants.w > 0.) return noTone(uPants, v, 0.24);`,d.pelotari_rojo=d.pelotari;for(let e of[`inigo`,`unai`,`mikel`,`aitor`,`inaki`,`ander`,`xabier`,`jokin`,`ekaitz`,`julen`,`asier`,`oihana`,`garazi`,`maialen`,`amaia`,`irati`,`nahia`,`nerea`,`leire`,`ane`,`miren`,`uxue`])d[`pelotari_`+e]=`
    bool blue = h > 0.5 && h < 0.72 && s > 0.4;
    ${f}
    if (y > 0.2 && y < 0.72 && blue && uShirt.w > 0.) return noTone(uShirt, v, 0.65);`;d.osasuna_juez=`
    bool red = (h < 0.045 || h > 0.9) && ((s > 0.6 && v > 0.15) || (s > 0.28 && v < 0.6)), navy = h > 0.55 && h < 0.8 && s > 0.2 && v < 0.5;
    if (y < 0.66 && red && uShirt.w > 0.) return noTone(uShirt, v, 0.78);
    if (y >= 0.66 && red) return vec3(0.17, 0.11, 0.08) * clamp(v / 0.7, 0.5, 1.2);
    if (y > 0.1 && y < 0.42 && navy && uPants.w > 0.) return noTone(uPants, v, 0.24);`;var p=t=>{if(!t)return new i(0,0,0,0);let n=new e(t),r=n.r,a=n.g,o=n.b,s=e=>Math.max(0,e)**(1/2.2),c=s(r),l=s(a),u=s(o),d=Math.max(c,l,u),f=d-Math.min(c,l,u),p=0;return f>1e-5&&(p=d===c?(l-u)/f%6:d===l?(u-c)/f+2:(c-l)/f+4),p=(p/6%1+1)%1,new i(p,d>0?f/d:0,d,1)},m=t=>{if(!t)return new i(0,0,0,0);let n=new e(t),r=e=>Math.max(0,e)**(1/2.2);return new i(r(n.r),r(n.g),r(n.b),1)};function h(e,r){let i=e.skeleton,a=Math.max(.001,r.max.y-r.min.y),o=new n,s=e=>{let n=i.bones.findIndex(t=>e.test(t.name));return n<0?null:new t().setFromMatrixPosition(o.copy(i.boneInverses[n]).invert())},c=e=>(e.y-r.min.y)/a,l=s(/Hips$/),u=s(/Spine$/),d=s(/LeftFoot$/),f=s(/LeftUpLeg$/),p=s(/LeftHand$/),m=s(/LeftForeArm$/),h=s(/RightHand$/),g=s(/RightForeArm$/);return!l||!u||!d||!f||!p||!m||!h||!g?null:{uPwaist:new t(c(l)+(c(u)-c(l))*.62,.026,Math.abs(f.x)*2),uPfoot:c(d)*.86,uPwL:p,uPeL:m,uPwR:h,uPeR:g}}function g(e,n,i){let f=d[n];if(!f)return;let g={uShirt:p(i.shirt),uPants:p(i.pants),uVest:p(i.vest),uAcc:p(i.acc),uShoes:p(i.shoes),uWrist:m(i.wrist),uSash:m(i.sash)},_=/^pelotari_.+/.test(n)&&n!==`pelotari_rojo`;return e.traverse(e=>{if(e.userData.peloColor){i.hair&&(e.material=l(a(e.material.clone()),i.hair),e.material.userData.own=!0);return}if(e.userData.pelo||!e.isSkinnedMesh||!e.material?.map)return;let d=e.geometry;d.boundingBox||d.computeBoundingBox();let p=d.boundingBox,m=new r(p.min.y,Math.max(.001,p.max.y-p.min.y)),v=e.material.clone();e.material.userData.fillK!=null&&s(v,e.material.userData.fillK);let y=_&&h(e,p)||{uPwaist:new t(-9,0,0),uPfoot:-9,uPwL:new t(99,99,99),uPeL:new t(99,98,99),uPwR:new t(99,99,99),uPeR:new t(99,98,99)};v.onBeforeCompile=e=>{Object.assign(e.uniforms,Object.fromEntries(Object.entries(g).map(([e,t])=>[e,{value:t}])),{uKitY:{value:m}},Object.fromEntries(Object.entries(y).map(([e,t])=>[e,{value:t}]))),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
varying float vNoY; varying vec3 vNoP; uniform vec2 uKitY;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
vNoY = (position.y - uKitY.x) / uKitY.y; vNoP = position;`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
uniform vec4 uShirt, uPants, uVest, uAcc, uShoes, uWrist, uSash; uniform vec3 uPwaist, uPwL, uPeL, uPwR, uPeR; uniform float uPfoot; varying float vNoY; varying vec3 vNoP;
// (¿cae el punto en la muñequera? un tramo del antebrazo, de la muñeca w hacia el codo e, y cerca de su eje)
bool noBanda(vec3 p, vec3 w, vec3 e){ vec3 d = e - w; float L = length(d); d /= L; vec3 q = p - w; float t = dot(q, d); return t > 0.03 * L && t < 0.44 * L && length(q - d * t) < 0.52 * L; }
${u}
vec3 noOutfit(vec3 lin){
  vec3 cs = pow(max(lin, vec3(0.)), vec3(0.4545)); vec3 q = noHsv(cs); float h = q.x, s = q.y, v = q.z, y = vNoY;
  ${f}
  return cs;
}`).replace(`#include <map_fragment>`,`#include <map_fragment>
 diffuseColor.rgb = pow(noOutfit(diffuseColor.rgb), vec3(2.2));`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
totalEmissiveRadiance = emissive * diffuseColor.rgb;`)},v.customProgramCacheKey=()=>`npc-outfit-`+n,e.material=o(c(v),d,n,i.hair)}),g}function _(e,t={}){e&&(e.uShoes.copy(p(t.shoes)),e.uWrist.copy(m(t.wrist)),e.uSash.copy(m(t.sash)))}function v(e,t){if(t.child)return null;let n=null;if(e.root.traverse(e=>{e.isBone&&/Head$/.test(e.name)&&!n&&(n=e)}),!n||n.userData.cabK)return null;let r=t.old?.9:.87;return()=>{n.scale.setScalar(r)}}export{g as n,_ as r,v as t};