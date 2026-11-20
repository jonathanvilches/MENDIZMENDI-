import{O as e,in as t,on as n}from"./three-BAS9ILz6.js";import{_ as r,a as i,m as a,o,r as s}from"./hairColor-DhoqJtrz.js";var c=`
vec3 noHsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }
vec3 noRgb(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(1.,2./3.,1./3.))*6.-3.); return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y); }
// el color nuevo (HSV) con el brillo del píxel original respecto al brillo típico de esa prenda
vec3 noTone(vec4 t, float v, float ref){ return noRgb(vec3(t.x, t.y, clamp(t.z * v / ref, 0., 1.))); }
`,l={pastor:`
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
    if (y > 0.12 && y < 0.42 && navy && uPants.w > 0.) return noTone(uPants, v, 0.24);`};l.osasuna_fuera=`
    bool white = s < 0.16 && v > 0.45, dark = v < 0.45 && (s > 0.3 || v < 0.2);
    if (y > 0.43 && y < 0.66 && white && uShirt.w > 0.) return noTone(uShirt, v, 0.76);   // (más abajo, las manos claras)
    if (y > 0.12 && y < 0.42 && dark && uPants.w > 0.) return noTone(uPants, v, 0.24);`,l.pelotari_rojo=l.pelotari;for(let e of[`inigo`,`unai`,`mikel`,`aitor`,`inaki`,`ander`,`xabier`,`jokin`,`ekaitz`,`julen`,`asier`,`oihana`,`garazi`,`maialen`,`amaia`,`irati`,`nahia`,`nerea`,`leire`,`ane`,`miren`,`uxue`])l[`pelotari_`+e]=`
    bool blue = h > 0.5 && h < 0.72 && s > 0.4;
    if (y > 0.2 && y < 0.72 && blue && uShirt.w > 0.) return noTone(uShirt, v, 0.65);`;l.osasuna_juez=`
    bool red = (h < 0.045 || h > 0.9) && ((s > 0.6 && v > 0.15) || (s > 0.28 && v < 0.6)), navy = h > 0.55 && h < 0.8 && s > 0.2 && v < 0.5;
    if (y < 0.66 && red && uShirt.w > 0.) return noTone(uShirt, v, 0.78);
    if (y >= 0.66 && red) return vec3(0.17, 0.11, 0.08) * clamp(v / 0.7, 0.5, 1.2);
    if (y > 0.1 && y < 0.42 && navy && uPants.w > 0.) return noTone(uPants, v, 0.24);`;var u=t=>{if(!t)return new n(0,0,0,0);let r=new e(t),i=r.r,a=r.g,o=r.b,s=e=>Math.max(0,e)**(1/2.2),c=s(i),l=s(a),u=s(o),d=Math.max(c,l,u),f=d-Math.min(c,l,u),p=0;return f>1e-5&&(p=d===c?(l-u)/f%6:d===l?(u-c)/f+2:(c-l)/f+4),p=(p/6%1+1)%1,new n(p,d>0?f/d:0,d,1)};function d(e,n,d){let f=l[n];if(!f)return;let p={uShirt:u(d.shirt),uPants:u(d.pants),uVest:u(d.vest),uAcc:u(d.acc)};e.traverse(e=>{if(e.userData.peloColor){d.hair&&(e.material=o(i(e.material.clone()),d.hair),e.material.userData.own=!0);return}if(e.userData.pelo||!e.isSkinnedMesh||!e.material?.map)return;let l=e.geometry;l.boundingBox||l.computeBoundingBox();let u=l.boundingBox,m=new t(u.min.y,Math.max(.001,u.max.y-u.min.y)),h=e.material.clone();e.material.userData.fillK!=null&&a(h,e.material.userData.fillK),h.onBeforeCompile=e=>{Object.assign(e.uniforms,Object.fromEntries(Object.entries(p).map(([e,t])=>[e,{value:t}])),{uKitY:{value:m}}),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
varying float vNoY; uniform vec2 uKitY;`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
vNoY = (position.y - uKitY.x) / uKitY.y;`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
uniform vec4 uShirt, uPants, uVest, uAcc; varying float vNoY;
${c}
vec3 noOutfit(vec3 lin){
  vec3 cs = pow(max(lin, vec3(0.)), vec3(0.4545)); vec3 q = noHsv(cs); float h = q.x, s = q.y, v = q.z, y = vNoY;
  ${f}
  return cs;
}`).replace(`#include <map_fragment>`,`#include <map_fragment>
 diffuseColor.rgb = pow(noOutfit(diffuseColor.rgb), vec3(2.2));`).replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>
totalEmissiveRadiance = emissive * diffuseColor.rgb;`)},h.customProgramCacheKey=()=>`npc-outfit-`+n,e.material=s(r(h),l,n,d.hair)})}function f(e,t){if(t.child)return null;let n=null;if(e.root.traverse(e=>{e.isBone&&/Head$/.test(e.name)&&!n&&(n=e)}),!n||n.userData.cabK)return null;let r=t.old?.9:.87;return()=>{n.scale.setScalar(r)}}export{d as n,f as t};