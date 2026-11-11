import{t as e}from"./tele-BcET1e0V.js";import{n as t}from"./html-DmBJBSBf.js";import{s as n}from"./icons-BI0c2PX8.js";import{at as r,ot as i}from"./index-CFnEENNi.js";function a(e,t,n=`button`){let r=null;e.addEventListener(`pointerdown`,e=>{r=e.target.closest(n)}),e.addEventListener(`pointercancel`,()=>{r=null}),e.addEventListener(`pointerup`,i=>{let a=i.target.closest(n),o=a&&a===r&&e.contains(a);r=null,o&&t(a,i)}),e.addEventListener(`click`,r=>{if(r.detail!==0)return;let i=r.target.closest(n);i&&e.contains(i)&&t(i,r)})}var o=(e,t=``)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"${t}>${e}</svg>`,s={seguir:o(`<path d="M5 12h13M13 6l6 6-6 6"/>`),descanso:o(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`),camara:o(`<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z"/><circle cx="12" cy="13.3" r="3.2"/>`),ojo:o(`<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>`),fichas:o(`<rect x="3.5" y="5" width="10" height="14" rx="1.5"/><path d="M16.5 7.5l3.4 1-3 11.2-4.6-1.2"/>`),tactica:o(`<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M12 4.5v15M8 9.5h.01M8 14.5h.01M16 12h.01"/>`),cambios:o(`<path d="M7 4v14M3.5 14.5 7 18l3.5-3.5M17 20V6M13.5 9.5 17 6l3.5 3.5"/>`),controles:o(`<rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M7.5 10.5v3M6 12h3M15.5 11h.01M17.5 13h.01"/>`),salir:o(`<path d="M10 4.5H5.5v15H10M14 8l4 4-4 4M18 12H9"/>`),cerrar:o(`<path d="M6 6l12 12M18 6 6 18"/>`,` stroke-width="2.8"`)},c=(e,t=`Cerrar`)=>`<div class="pz-cab"><h2 class="pz-tit">${e}</h2><button type="button" class="pz-x" aria-label="${t}">${s.cerrar}</button></div>`,l=({cls:e=``,titulo:t,sub:n=``,ico:r=s.seguir,extra:i=``,attrs:a=``})=>`<button type="button" class="pz-fila ${e}" ${a}><span class="pz-tx"><b>${t}</b><small>${n}</small></span>${i}<i class="pz-ico" aria-hidden="true">${r}</i></button>`,u=e=>e==null?``:`<i class="pz-res ${e?`si`:`no`}" aria-hidden="true">${e?o(`<path d="M5 12.5l4.5 4.5L19 7.5"/>`,` stroke-width="3.2"`):o(`<path d="M7 7l10 10M17 7 7 17"/>`,` stroke-width="3"`)}</i>`,d=22050,f=null,p=null,m={a:[730,1250,2500],e:[480,1850,2550],i:[310,2250,2900],o:[500,900,2450],u:[340,760,2400]},h=`aaeeeiooua`,g=Math.random,_=e=>e[g()*e.length|0],v=()=>(g()+g()+g()-1.5)*1.15;function y(){if(p)return p;let e=65536,t=new Float32Array(e),n=625341585;for(let r=0;r<e;r++)n^=n<<13,n^=n>>>17,n^=n<<5,t[r]=(n>>>0)/2147483648-1;return p=t}function b(e,t,n,r){let i=2*Math.PI*Math.min(e,d*.45)/d,a=Math.sin(i)/(2*t),o=1+a;n[r]=a/o,n[r+1]=-2*Math.cos(i)/o,n[r+2]=(1-a)/o}var x=()=>new Promise(e=>setTimeout(e,0)),S=e=>[Math.cos((e+1)*Math.PI/4),Math.sin((e+1)*Math.PI/4)];function C(e,t,n,r){let i=y(),a=e.length,o=new Float64Array(9),[s,c]=S(r.pan),l=g(),u=0,f=g()*65536|0,p=0,m=n[0].v[0]*r.fs,h=n[0].v[1]*r.fs,_=n[0].v[2]*r.fs,v=0,x=0,C=0,w=0,T=0,E=0,D=0,O=0,k=r.gain,A=r.asp;for(let y of n){let n=d*(y.at??.022),S=d*(y.rl??.05),j=Math.max(0,y.a|0),M=Math.min(a,y.b|0),N=Math.max(1,M-j),P=y.c===1?d*(.05+g()*.03):y.c===2?d*.05:y.c===3?d*.03:0,F=y.v[0]*r.fs,I=y.v[1]*r.fs,ee=y.v[2]*r.fs,L=(y.f0b-y.f0a)/N,R=y.f0a,z=0;for(let a=j;a<M;a++){let N=a-j;if(!(N&31)){let e=y.c===2&&N<P,t=e?280*r.fs:F,n=e?1150*r.fs:I;m+=(t-m)*.32,h+=(n-h)*.26,_+=(ee-_)*.2,b(m,5.5,o,0),b(h,9,o,3),b(_,12,o,6),z+=(g()-.5)*.012,z*=.96}R+=L,l+=R*(1+z)/d,l>=1&&--l,u+=.32*(2*l-1-u);let B=i[f++&65535],V=(n>0?Math.min(1,N/n):1)*(S>0?Math.min(1,(M-a)/S):1)*y.amp,H=1,U=0;N<P&&(y.c===1?(H=.15,U=.55*Math.min(1,(P-N)/(d*.02))):y.c===3?N<P*.7?V=0:(H=.3,U=.9):y.c===2&&(V*=.55));let W=u*H+B*A,G=o[0]*(W-x)-o[1]*C-o[2]*w;w=C,C=G;let K=o[3]*(W-x)-o[4]*T-o[5]*E;E=T,T=K;let q=o[6]*(W-x)-o[7]*D-o[8]*O;O=D,D=q,x=v,v=W;let J=((G+K*.75+q*.35)*V+(B-p)*U*V*r.hiss)*k;p=B,e[a]+=J*s,t[a]+=J*c}}}function w(e,t){let n=[],r=g()*.6;for(;r<e;){let i=3+(g()*9|0),a=1.05+g()*.15,o=.82+g()*.1,s=g()*i|0;for(let c=0;c<i&&r<e;c++){let e=.1+g()*.13,l=c/i,u=t*(a+(o-a)*l)*(c===s?1.14:1)*(1+(g()-.5)*.06),f=g(),p=f<.3?1:f<.48?2:f<.68?3:0;n.push({a:r*d,b:(r+e)*d,f0a:u,f0b:u*(.96+g()*.06),v:m[_(h)],amp:c===s?1:.7+g()*.25,c:p}),r+=e+(g()<.12?.04+g()*.08:0)}r+=.18+g()*1.1}return n}function T(e,t,n){let{v0:r,v1:i,t0:a,att:o,hold:s,up:c,peak:l,end:u}=n,f=a+g()*.14,p=Math.min(e-f-.02,s+g()*.5),h=f+p*l,_=t*(1+(g()-.5)*.08);return[{a:f*d,b:h*d,f0a:_,f0b:_*c,v:m[r],amp:1,c:0,at:o*(.7+g()*.6),rl:0},{a:h*d,b:(f+p)*d,f0a:_*c,f0b:_*u,v:m[i],amp:1,c:0,at:0,rl:Math.min(.45,p*.5)}]}async function E(e,t,n,r=.8){let i=[557,593,641,677],a=[113,277];for(let[o,s]of[[e,0],[t,11]]){let e=o.length,t=new Float32Array(e),c=o.slice();for(let n of i){let i=n+s,a=new Float32Array(i),o=0,l=0;for(let n=0;n<e;n++){let e=a[o];l=e*.62+l*.38,a[o]=c[n]+l*r,t[n]+=e*.25,++o>=i&&(o=0)}await x()}for(let n of a){let r=n+s,i=new Float32Array(r),a=0;for(let n=0;n<e;n++){let e=i[a],o=t[n],s=-.5*o+e;i[a]=o+.5*s,t[n]=s,++a>=r&&(a=0)}}for(let r=0;r<e;r++)o[r]=c[r]*(1-n*.5)+t[r]*n;await x()}}function D(e,t){let n=1-Math.exp(-2*Math.PI*t/d),r=0;for(let t=0;t<e.length;t++)r+=n*(e[t]-r),e[t]=r}function O(e,t,n){let r=0;for(let n=0;n<e.length;n++)r+=e[n]*e[n]+t[n]*t[n];let i=n/Math.max(1e-6,Math.sqrt(r/(2*e.length))),a=0;for(let n=0;n<e.length;n++)e[n]*=i,t[n]*=i,a=Math.max(a,Math.abs(e[n]),Math.abs(t[n]));if(a>.95){let n=.95/a;for(let r=0;r<e.length;r++)e[r]*=n,t[r]*=n}}var k=()=>{let e=g()<.5;return{w:e,f0:e?185+g()*65:98+g()*42,fs:(e?1.15:1)*(.96+g()*.08)}};function A(e,t){let n=Math.round(t*d);try{return new AudioBuffer({numberOfChannels:2,length:n,sampleRate:d})}catch{}try{return e.createBuffer(2,n,d)}catch{return null}}async function j(e,t=7,n=30){let r=.6,i=Math.round(t*d),a=Math.round((t+r)*d),o=new Float32Array(a),s=new Float32Array(a);for(let e=0;e<n;e++){let e=k(),n=g()<.15;C(o,s,w(t+r,e.f0),{fs:e.fs,pan:(g()*2-1)*.9,gain:n?.9:.25+g()*.4,asp:.05+g()*.05,hiss:n?.2:.1}),await x()}for(let e of[o,s])D(e,2600),D(e,3200);await E(o,s,.5),O(o,s,.12);let c=A(e,t);if(!c)return null;let l=Math.round(r*d);for(let[e,t]of[[o,0],[s,1]]){let n=c.getChannelData(t);for(let t=0;t<i;t++)n[t]=e[t];for(let t=0;t<l;t++){let r=t/l;n[t]=e[t]*Math.sqrt(r)+e[i+t]*Math.sqrt(1-r)}}return c}async function M(e,t=5,n=160){let r=A(e,t);if(!r)return null;let i=r.getChannelData(0),a=r.getChannelData(1),o=y(),s=i.length,c=new Float64Array(3);for(let e=0;e<n;e++){let[n,r]=S((g()*2-1)*.95),l=g()<.07?1:.22+g()*.45,u=1/(3.6+g()*2.2),f=.02+Math.abs(v())*.11+(g()<.1?g()*.5:0),p=t*(.48+g()*.44);for(b(g()<.35?650+g()*450:1300+g()*1700,.9+g()*1.5,c,0);f<p;){let e=l*Math.min(1,(p-f)/.8)*(.75+g()*.5),t=Math.round(f*d),m=d*(.0028+g()*.004),h=0,_=0,v=0,y=0,b=g()*65536|0,x=Math.min(s-t,Math.round(m*6));for(let s=0;s<x;s++){let l=o[b++&65535]*Math.exp(-s/m)*Math.min(1,s/6),u=c[0]*(l-_)-c[1]*v-c[2]*y;y=v,v=u,_=h,h=l;let d=(u*1.6+l*.25)*e;i[t+s]+=d*n,a[t+s]+=d*r}f+=u*(1+(g()-.5)*.14),u*=1+(g()-.5)*.03}e%20==19&&await x()}return D(i,6500),D(a,6500),await E(i,a,.32,.72),O(i,a,.16),r}async function N(e,t){let n={oh:{sec:1.7,voices:30,shape:{v0:`o`,v1:`u`,t0:.02,att:.2,hold:1.05,up:1.28,peak:.42,end:.92},asp:.12,rms:.13,shout:1},groan:{sec:1.6,voices:28,shape:{v0:`o`,v1:`o`,t0:.02,att:.16,hold:1,up:1.08,peak:.2,end:.72},asp:.14,rms:.11,shout:1},roar:{sec:3,voices:44,shape:{v0:`e`,v1:`a`,t0:0,att:.1,hold:2,up:1.12,peak:.35,end:.88},asp:.18,rms:.17,shout:1.65}}[t],r=A(e,n.sec);if(!r)return null;let i=r.getChannelData(0),a=r.getChannelData(1);for(let e=0;e<n.voices;e++){let t=k();C(i,a,T(n.sec,t.f0*n.shout,n.shape),{fs:t.fs*(n.shout>1?1.08:1),pan:(g()*2-1)*.9,gain:.3+g()*.5,asp:n.asp,hiss:0}),e%2==1&&await x()}return D(i,3400),D(a,3400),await E(i,a,.42),O(i,a,n.rms),r}function P(e){return f||(f=(async()=>{let t={};return await x(),t.clap=await M(e),t.murmur=await j(e),t.oh=await N(e,`oh`),t.roar=await N(e,`roar`),t.groan=await N(e,`groan`),t})().catch(e=>(console.warn(`público`,e),f=null,{})))}var F=class{constructor(e,t){this.ctx=e,this.B=null,this.dead=!1,this.level=.3,this.srcs=new Set,this.bus=e.createGain(),this.bus.gain.value=+!document.hidden,this.bus.connect(t||e.destination),this.mur=e.createGain(),this.mur.gain.value=0,this.mur.connect(this.bus),this.onVis=()=>{try{this.bus.gain.setTargetAtTime(+!document.hidden,e.currentTime,.08)}catch{}},document.addEventListener(`visibilitychange`,this.onVis),this.ready=P(e).then(t=>{if(this.dead||!t.murmur)return!1;this.B=t;for(let[n,r,i]of[[1,0,1],[.93,3.1,.7]]){let a=e.createBufferSource(),o=e.createGain();a.buffer=t.murmur,a.loop=!0,a.playbackRate.value=n,o.gain.value=i,a.connect(o),o.connect(this.mur),a.start(e.currentTime+.02,r),this.srcs.add(a)}return this.setLevel(this.level,.8),!0})}setLevel(e,t=.35){this.level=e,this.B&&!this.dead&&this.mur.gain.setTargetAtTime(e*1.6,this.ctx.currentTime,t)}play(e,t=1,n=1,r=0){let i=this.B?.[e];if(!i||this.dead)return!1;let a=this.ctx,o=a.createBufferSource(),s=a.createGain();return o.buffer=i,o.playbackRate.value=n,s.gain.value=t,o.connect(s),s.connect(this.bus),o.start(a.currentTime+r),this.srcs.add(o),o.onended=()=>{this.srcs.delete(o);try{s.disconnect()}catch{}},!0}applause(e=1,t=0){return this.play(`clap`,e,.93+g()*.14,t)}ooh(e=1){return this.play(`oh`,e,.95+g()*.1)}groan(e=1){return this.play(`groan`,e,.94+g()*.1)}roar(e=1){return this.play(`roar`,e,.96+g()*.08)}ovation(){let e=this.roar(.9);return this.applause(1,.1),this.applause(.95,1.9),this.applause(.75,3.6),e}stop(e=.5){if(!this.dead){this.dead=!0,document.removeEventListener(`visibilitychange`,this.onVis);try{this.bus.gain.setTargetAtTime(0,this.ctx.currentTime,e/3)}catch{}setTimeout(()=>{for(let e of this.srcs)try{e.stop()}catch{}this.srcs.clear();try{this.bus.disconnect()}catch{}},e*1e3+150)}}},I=`#efe5cd`,ee=`#cdbd99`,L=`#b0874f`,R=`#7f6646`,z=`#2a2420`,B=I,V=.27,H=2*Math.sqrt(V*.73),U=e=>[.73*Math.cos(e)+V*Math.cos(3*e),.73*Math.sin(e)-V*Math.sin(3*e),H*Math.sin(2*e)],W=null;function G(){if(W)return W;let e=document.createElement(`canvas`);e.width=512,e.height=256;let t=e.getContext(`2d`);t.fillStyle=I,t.fillRect(0,0,512,256);let n=11,r=()=>(n=n*16807%2147483647)/2147483647;for(let e=0;e<2600;e++){t.fillStyle=r()<.5?`rgba(120,96,60,0.07)`:`rgba(255,252,240,0.09)`;let e=r()*512,n=r()*256,i=.6+r()*1.8;t.fillRect(e,n,i,i)}for(let e=0;e<22;e++){let e=r()*512,n=38.4+r()*256*.7,i=10+r()*34,a=t.createRadialGradient(e,n,0,e,n,i);a.addColorStop(0,`rgba(150,125,85,${.08+r()*.12})`),a.addColorStop(1,`rgba(150,125,85,0)`),t.fillStyle=a,t.fillRect(e-i,n-i,i*2,i*2)}t.strokeStyle=`rgba(110,88,58,0.22)`,t.lineWidth=.8;for(let e=0;e<26;e++){let e=r()*512,n=51.2+r()*256*.6,i=r()*Math.PI,a=4+r()*12;t.beginPath(),t.moveTo(e,n),t.lineTo(e+Math.cos(i)*a,n+Math.sin(i)*a),t.stroke()}t.strokeStyle=z,t.lineWidth=2.2,t.lineCap=`round`;let i=363.52,a=117.76;return t.beginPath(),t.moveTo(357.52,a),t.lineTo(369.52,a),t.moveTo(i,111.76),t.lineTo(i,123.76),t.stroke(),W=e,e}function K(e,t,n=t=>new e.MeshStandardMaterial(t)){let r=e,i=new r.Group,a=new r.CanvasTexture(G());a.colorSpace=r.SRGBColorSpace,a.anisotropy=4;let o=n({color:`#ffffff`,map:a,roughness:.62,metalness:0,emissive:`#000000`});i.add(new r.Mesh(new r.SphereGeometry(t,28,18),o));let s=[];for(let e=0;e<160;e++){let[n,i,a]=U(e/160*Math.PI*2);s.push(new r.Vector3(n,i,a).multiplyScalar(t*1.002))}let c=new r.CatmullRomCurve3(s,!0);i.add(new r.Mesh(new r.TubeGeometry(c,220,t*.026,6,!0),n({color:R,roughness:.85,metalness:0})));let l=new r.InstancedMesh(new r.CapsuleGeometry(t*.018,t*.15,2,6),n({color:L,roughness:.75,metalness:0}),108),u=new r.Vector3,d=new r.Vector3,f=new r.Vector3,p=new r.Vector3,m=new r.Vector3,h=new r.Matrix4,g=new r.Quaternion,_=new r.Vector3(0,1,0),v=new r.Vector3(1,1,1);for(let e=0;e<108;e++){let n=e/108;c.getPointAt(n,u),c.getTangentAt(n,d),f.copy(u).normalize(),p.crossVectors(d,f).normalize();let r=(e%2?1:-1)*.5;m.copy(p).multiplyScalar(Math.cos(r)).addScaledVector(d,Math.sin(r)).normalize(),g.setFromUnitVectors(_,m),u.addScaledVector(f,t*.012),l.setMatrixAt(e,h.compose(u,g,v))}return l.instanceMatrix.needsUpdate=!0,l.frustumCulled=!1,i.add(l),i.traverse(e=>{e.isMesh&&(e.castShadow=!0)}),{group:i,mat:o}}var q=0;function J(e=``){let t=`bc`+ ++q,n=e=>{let t=``,n=``;for(let r=0;r<=14;r++){let i=-1.15+r/14*2.3,a=16+e*(9.6-4.4*Math.cos(i)),o=16+11*Math.sin(i);if(t+=(r?`L`:`M`)+a.toFixed(1)+` `+o.toFixed(1),r%2&&r<14){let t=Math.cos(i)*e,r=.4*Math.sin(i);n+=`M${(a-t*1.6-r).toFixed(1)} ${(o-1.1).toFixed(1)}L${(a+t*1.6+r).toFixed(1)} ${(o+1.1).toFixed(1)}`}}return[t,n]},[r,i]=n(-1),[a,o]=n(1);return`<svg viewBox="0 0 32 32" aria-hidden="true"><defs><radialGradient id="${t}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fbf5e6"/><stop offset=".7" stop-color="${I}"/><stop offset="1" stop-color="${ee}"/></radialGradient></defs><circle cx="16" cy="16" r="13" fill="url(#${t})"${e?` stroke="${e}" stroke-width="2.5"`:``}/><path d="${r}${a}" stroke="${R}" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="${i}${o}" stroke="${L}" stroke-width="1" fill="none" stroke-linecap="round"/></svg>`}var te=`
.pel-root{position:fixed;inset:0;z-index:900;pointer-events:none;font-family:var(--pel-font,'MZ Texto',sans-serif);color:#fff;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.pel-root.vuelo>*{visibility:hidden!important}
/* (en la salida de los pelotaris a la cancha, solo su rótulo: match.js saleEntrada) */
.pel-root.sale>*:not(.pel-call){visibility:hidden!important}
.pel-root.repe :is(.pel-stick,.pel-btns,.pel-stickhint,.pel-tip,.pel-q,.pel-exit,.pel-call){visibility:hidden}
/* la repetición: el rótulo arriba a la izquierda, a la misma altura que el marcador (arriba a la derecha) y con su
   misma forma: igual de alto, el mismo fondo y la misma raya de color arriba; con su punto rojo que late y, en cámara
   lenta, su aviso. Debajo, cómo saltarla. Si no caben los dos en la misma fila, baja justo debajo del marcador
   (match.js, colocaRep). Antes iba centrado y, con el marcador largo, se montaba encima del nombre */
.pel-rep{position:absolute;left:calc(env(safe-area-inset-left,0px) + var(--edge,16px));top:calc(env(safe-area-inset-top,0px) + var(--edge,16px));display:flex;flex-direction:column;align-items:flex-start;gap:6px;pointer-events:none;animation:pel-repin .45s cubic-bezier(.2,1.3,.4,1) both}
.pel-rep-b{display:flex;align-items:center;gap:8px;height:30px;padding:0 16px 0 12px;background:rgba(7,2,15,.9);border-top:2px solid var(--fx,#ff2bd6);box-shadow:0 6px 20px rgba(0,0,0,.35);border-radius:6px;}
.pel-rep-b i{flex:none;width:8px;height:8px;border-radius:50%;background:#ff3b5c;box-shadow:0 0 8px #ff3b5c;animation:pel-rec 1s ease-in-out infinite}
.pel-rep-b b{font:400 var(--fs-lg)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.pel-rep-b .sl{display:none;font:800 var(--fs-xs)/1 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;color:#ffd6f6;padding:4px 8px;border-radius:999px;background:rgba(255,43,214,.35)}
.pel-rep.slow .sl{display:inline-block;animation:pel-repin .3s ease-out both}
.pel-rep-b .pv{font:800 var(--fs-xs)/1 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;color:#fff;padding:4px 8px;border-radius:999px;background:rgba(157,140,255,.38);max-width:24ch;overflow:hidden;text-overflow:ellipsis}
.pel-rep small{font:700 var(--fs-xs)/1.2 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#e8dcff;text-shadow:0 1px 3px #000;padding:3px 12px;border-radius:999px;background:rgba(7,2,15,.55)}
@keyframes pel-repin{from{opacity:0;transform:translateX(-24px)}}@keyframes pel-rec{50%{opacity:.25}}
/* el sorteo del saque. La chapa, en 3D en la cancha (chapa.js), con el centro despejado para verla: arriba el título
   entre dos rayas de color y por qué viste cada uno de su color; abajo, a cada lado, la tarjeta de cada pelotari con su
   figura, el cristal morado y el filo de su color, como las cartas del juego; en medio, el botón y, al caer, quién saca.
   Sin la cancha, la chapa plana de antes, en medio */
.pel-toss{position:absolute;inset:0;z-index:5;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;gap:12px;padding:calc(env(safe-area-inset-top,0px) + 16px) calc(env(safe-area-inset-right,0px) + 20px) calc(env(safe-area-inset-bottom,0px) + 16px) calc(env(safe-area-inset-left,0px) + 20px);pointer-events:auto;
  background:radial-gradient(ellipse at 50% 46%,rgba(7,2,15,0) 30%,rgba(7,2,15,.55) 100%),linear-gradient(180deg,rgba(7,2,15,.8) 0%,rgba(7,2,15,0) 26%,rgba(7,2,15,0) 58%,rgba(7,2,15,.82) 100%);animation:pel-tossbg .3s ease-out both}
.pel-toss:not(.tres){background:radial-gradient(ellipse at 50% 45%,rgba(40,14,92,.78),rgba(7,2,15,.92))}
.pel-toss.directo{animation:none}
.pel-root:has(>.pel-toss)>:not(.pel-toss){visibility:hidden}
.pel-toss.out{animation:pel-tossout .32s ease-in both}
.pel-toss-top{grid-column:1/-1;grid-row:1;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.pel-toss-k{display:flex;align-items:center;gap:14px;font:400 var(--fs-2xl)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#fff;text-shadow:0 2px 12px rgba(7,2,15,.8);animation:pel-kin .6s ease-out both}
.pel-toss-k i{display:block;width:clamp(28px,8vw,72px);height:4px;border-radius:2px;background:linear-gradient(90deg,transparent,#5b4bff)}.pel-toss-k i:last-child{background:linear-gradient(90deg,#ff2e88,transparent)}
.pel-toss-why{margin:0;font:700 var(--fs-sm)/1.3 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#e8dcff;text-shadow:0 1px 6px rgba(7,2,15,.9)}
/* las cartas de los dos pelotaris (las de la presentación, match.js cartaDe), a cada lado de la chapa, del alto que quepa
   bajo el título, y debajo su color y sus temporadas. La que saca se levanta; la otra se apaga */
.pel-toss{--tw:clamp(104px,min(calc((100dvh - 172px) / 1.48),26vw),210px)}
.pel-toss-p{--pc:#5b4bff;grid-row:2/4;align-self:center;justify-self:center;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;
  transition:transform .35s cubic-bezier(.2,1.4,.4,1),filter .35s,opacity .35s}
.pel-toss-p .gx-card{--w:var(--tw)!important;pointer-events:none}
.pel-toss-p>small{font:700 var(--fs-xs)/1.25 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;color:color-mix(in srgb,var(--pc) 45%,#fff);text-shadow:0 1px 6px rgba(7,2,15,.9)}
.pel-toss-p.azul{grid-column:1;animation:pel-tl .45s cubic-bezier(.2,1.3,.4,1) both}
.pel-toss-p.rojo{--pc:#ff2e88;grid-column:3;animation:pel-tr .45s cubic-bezier(.2,1.3,.4,1) both}
.pel-toss-p.gana{transform:translateY(-6px) scale(1.06)}
.pel-toss-p.pierde{opacity:.55;filter:saturate(.5)}
/* en medio, abajo: el botón y quién saca */
.pel-toss-mid{grid-column:2;grid-row:2/4;align-self:end;display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0;text-align:center}
.pel-toss.aire .pel-toss-go{opacity:0;pointer-events:none;transform:scale(.9);transition:opacity .2s,transform .2s}
.pel-toss-go{animation:pel-kin .5s .35s ease-out both}
.pel-toss-res{margin:0;min-height:1.1em;font:400 var(--fs-3xl)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap}
.pel-toss-res.azul{color:#c4bcff;text-shadow:0 0 18px rgba(91,75,255,.95),0 2px 6px rgba(7,2,15,.9);animation:pel-res .5s cubic-bezier(.2,1.6,.4,1) both}.pel-toss-res.rojo{color:#ffb0d6;text-shadow:0 0 18px rgba(255,46,136,.95),0 2px 6px rgba(7,2,15,.9);animation:pel-res .5s cubic-bezier(.2,1.6,.4,1) both}
/* la chapa plana de antes, solo si no hay cancha */
.pel-toss-coin{position:relative;width:104px;height:150px;perspective:600px;display:flex;align-items:flex-end;justify-content:center}
.pel-toss-coin .coin{position:relative;width:84px;height:84px;margin-bottom:22px;transform-style:preserve-3d;transform:rotateX(70deg)}
.pel-toss-coin .f{position:absolute;inset:0;border-radius:50%;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:inset 0 0 0 5px rgba(255,255,255,.4),inset 0 0 0 9px rgba(0,0,0,.15)}
.pel-toss-coin .f.azul{background:radial-gradient(circle at 35% 30%,#a59cff,#5b4bff 48%,#2a1a9e)}
.pel-toss-coin .f.rojo{transform:rotateX(180deg);background:radial-gradient(circle at 35% 30%,#ff9cc8,#ff2e88 48%,#9e0f52)}
.pel-toss-coin .sh{position:absolute;bottom:8px;left:50%;width:70px;height:12px;margin-left:-35px;border-radius:50%;background:rgba(0,0,0,.45);filter:blur(3px)}
.pel-toss.aire .coin{animation:pel-flip 1.45s cubic-bezier(.25,.6,.35,1) both}.pel-toss.aire .sh{animation:pel-flipsh 1.45s cubic-bezier(.25,.6,.35,1) both}
.pel-toss.cae .coin{animation:pel-flip 1.45s cubic-bezier(.25,.6,.35,1) both,pel-land .35s 1.45s ease-out}
@keyframes pel-flip{0%{transform:translateY(0) rotateX(70deg)}50%{transform:translateY(-96px) rotateX(990deg)}100%{transform:translateY(0) rotateX(calc(1870deg + var(--fin,0deg)))}}
@keyframes pel-flipsh{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.45);opacity:.4}}
@keyframes pel-land{30%{translate:0 -10px}}
.pel-root.pel-fuera{animation:pel-fuera .3s ease-in both}.pel-panel.pel-fuera{animation:pel-fuera .2s ease-in both;pointer-events:none}.pel-root.pel-fuera *{pointer-events:none!important}@keyframes pel-fuera{to{opacity:0}}
@keyframes pel-tossbg{from{opacity:0}}@keyframes pel-tossout{to{opacity:0;transform:scale(1.04)}}
@keyframes pel-tl{from{opacity:0;transform:translateX(-40px)}}@keyframes pel-tr{from{opacity:0;transform:translateX(40px)}}
@keyframes pel-kin{from{opacity:0;letter-spacing:.5em}}@keyframes pel-res{from{opacity:0;transform:scale(.5)}}
/* tumbado y bajo: todo un paso más pequeño; de pie, las cartas abajo, una al lado de otra, y el botón encima */
@media (max-height:500px){.pel-toss-k{font-size:var(--fs-xl)}.pel-toss-res{font-size:var(--fs-2xl)}}
@media (orientation:portrait){.pel-toss{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto auto}
  .pel-toss{--tw:clamp(104px,40vw,190px)}.pel-toss-mid{grid-column:1/-1;grid-row:3}.pel-toss-p{grid-row:4}.pel-toss-p.azul{grid-column:1}.pel-toss-p.rojo{grid-column:2}
  .pel-toss-res{white-space:normal}}
@media (prefers-reduced-motion:reduce){.pel-toss-p,.pel-toss-k,.pel-toss-go,.pel-toss-res{animation:none!important}}
@media (prefers-reduced-motion:reduce){.pel-toss *,.pel-rep *{animation-duration:.01s!important}}
.pel-root *{box-sizing:border-box}
.pel-top{position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--edge,16px));right:calc(env(safe-area-inset-right,0px) + var(--edge,16px));display:flex;justify-content:flex-end}
.pel-exit{padding:0;position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--edge,16px));left:calc(env(safe-area-inset-left,0px) + var(--edge,16px));width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.82);background:rgba(14,10,24,.66);box-shadow:0 3px 12px rgba(0,0,0,.35);color:#fff;pointer-events:auto;cursor:pointer;display:grid;place-items:center}.pel-exit svg{width:20px;height:20px;display:block}.pel-exit .pel-xi{width:22px;height:22px;display:block;pointer-events:none}
.pel-score{display:flex;align-items:stretch;gap:8px;opacity:.95;overflow:hidden;background:rgba(7,2,15,.9);border-top:2px solid var(--fx,#ff2bd6);box-shadow:0 6px 20px rgba(0,0,0,.35);max-width:100%;border-radius:6px;}
/* cada lado: arriba su nombre y sus tantos, en su color; debajo, en el fondo oscuro, su fuerza y su energía, cada una con
   su nombre y su color, con aire entre las tres cosas: la fuerza en rosa y la energía en dorado, que se vuelve naranja y
   luego roja al cansarse (antes, una sola raya blanca pegada al nombre) */
.pel-side{display:grid;grid-template-rows:auto auto;width:var(--psw,176px);min-width:0}
.ps-cab{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;min-width:0}
.pel-side b{font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-size:var(--fs-lg);font-weight:400;line-height:1;min-width:1em;text-align:center}
.pel-side span{flex:1;min-width:0;font:800 var(--fs-sm)/1 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.04em;text-transform:uppercase;opacity:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pel-side[data-side=rival] span{text-align:right}
.pel-side.pel-red .ps-cab{background:linear-gradient(180deg,#f22c84,#c01a6c)}.pel-side.pel-blue .ps-cab{background:linear-gradient(180deg,#5546f2,#3b2bc4)}
/* (delante de la barra, un rayo del color de la barra, para que se sepa que es la energía: en el borde de fuera de cada
   lado, como en espejo, donde empieza a llenarse) */
.ps-barras{display:flex;align-items:center;gap:8px;padding:10px}.ps-barras:empty{display:none}.pel-side[data-side=rival] .ps-barras{flex-direction:row-reverse}
.ps-barras .ps-barra{flex:1;min-width:0}.ps-ico{flex:none;display:block;width:14px;height:14px;color:#ffc94a;filter:drop-shadow(0 0 4px color-mix(in srgb,currentColor 45%,transparent))}
.ps-barras:has(.mid) .ps-ico{color:#ff8a3d}.ps-barras:has(.low) .ps-ico{color:#ff4d6d}
.ps-barra{position:relative;display:block;height:8px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}
.ps-barra u{position:absolute;inset:0;transform-origin:left;border-radius:inherit;background:#ffc94a;transition:transform .2s}.pel-side[data-side=rival] .ps-barra u{transform-origin:right}
.ps-barra.mid u{background:#ff8a3d}.ps-barra.low u{background:#ff4d6d;animation:pel-sen .5s ease-in-out infinite alternate}@keyframes pel-sen{to{opacity:.3}}
.pel-mid{display:grid;place-items:center;padding:0 12px;font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Texto'),sans-serif;color:var(--lila,#c9b2ff);text-transform:uppercase;letter-spacing:.1em;text-align:center;max-width:7em}
/* (lo que ocupa: en el móvil y la tableta, sin el «A 5 tantos» y con los lados más estrechos, para que no tape el frontis,
   que va en el centro de la pantalla, entre el 43 % y el 57 % del ancho; en el ordenador ancho, entero) */
.pel-root{--psw:132px}.pel-mid{display:none}
@media (min-width:1240px){.pel-root{--psw:180px}.pel-mid{display:grid}}
.pel-serve{width:7px;height:7px;border-radius:50%;background:#fff6d8;box-shadow:0 0 0 2px rgba(0,0,0,.25);visibility:hidden;flex:none}
.pel-serve.on{visibility:visible}
/* el marcador de retransmisión: al sumar, la cifra salta y se enciende en dorado y su lado se ilumina un momento; con
   tres tantos seguidos o más, la racha al lado de la cifra mientras dure: solo la llama (el número va en el aviso del
   tanto), para no quitarle sitio al nombre */
.pel-side b.sube{animation:pelSube .6s cubic-bezier(.2,1.6,.4,1)}
@keyframes pelSube{0%{transform:scale(1.9);color:#ffd166;text-shadow:0 0 14px rgba(255,209,102,.9)}60%{color:#ffd166}100%{transform:none}}
.pel-side.gana .ps-cab{animation:pelGana .9s ease-out}
@keyframes pelGana{0%{filter:brightness(1.9) saturate(1.2)}100%{filter:none}}
.ps-racha{display:none;flex:none;place-items:center;width:18px;height:18px;margin:0 -2px;border-radius:50%;background:rgba(7,2,15,.55);color:#ffd166}
.ps-racha.on{display:inline-grid;animation:pelRachaM .45s cubic-bezier(.2,1.6,.4,1)}.ps-racha svg{width:12px;height:12px}
@keyframes pelRachaM{from{transform:scale(.4);opacity:0}}
@media (prefers-reduced-motion:reduce){.pel-side b.sube,.pel-side.gana .ps-cab,.ps-racha.on,.pel-racha{animation:none}}
.pel-call{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 72px);transform:translateX(-50%) scale(.9);opacity:0;transition:opacity .18s,transform .18s;text-align:center;max-width:min(calc(92vw / var(--z, 1)),520px);padding:16px 24px;border-radius:18px;background:linear-gradient(180deg,rgba(50,19,111,.94),rgba(28,11,58,.94));border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 30px rgba(0,0,0,.35)}
.pel-call.on{opacity:1;transform:translateX(-50%) scale(1)}
/* (el aviso del tanto, con una raya arriba del color de quien lo gana y, si toca, la racha: tantos seguidos, iguala,
   remontada) */
.pel-call.c-azul{box-shadow:inset 0 3px 0 #6b5bff,0 14px 40px rgba(0,0,0,.4)}.pel-call.c-rojo{box-shadow:inset 0 3px 0 #ff2e88,0 14px 40px rgba(0,0,0,.4)}
.pel-racha{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;margin-top:var(--r-pp,12px);padding:4px 14px;border-radius:999px;background:var(--rc,linear-gradient(100deg,#ff2bd6,#7b2ff7));font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#fff;box-shadow:0 0 14px rgba(255,122,200,.45);animation:pelRacha .5s .15s cubic-bezier(.2,1.6,.4,1) both}
.pel-racha svg{width:16px;height:16px;flex:none;color:#ffd166}
.pel-call.c-azul .pel-racha{--rc:linear-gradient(100deg,#6b5bff,#3b2bc4)}.pel-call.c-rojo .pel-racha{--rc:linear-gradient(100deg,#ff2e88,#c01a6c)}
@keyframes pelRacha{from{opacity:0;transform:translateY(8px) scale(.8)}}
.pel-root.final .pel-call{background:var(--cta,linear-gradient(100deg,#ff2bd6,#7b2ff7));border-color:#ffc2ec;color:#fff;box-shadow:0 14px 40px rgba(0,0,0,.45);animation:pelFinal .6s cubic-bezier(.2,1.6,.4,1)}
.pel-root.final .pel-call :is(.pel-kantari,p){color:#fff}
@keyframes pelFinal{0%{transform:translateX(-50%) scale(.5)}100%{transform:translateX(-50%) scale(1)}}
.pel-call h3{margin:0;font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-size:var(--fs-hero);line-height:1;letter-spacing:0}
/* (el título y debajo, separado y en segundo plano, quién: más pequeño, más fino y en lila; antes iba pegado al título,
   blanco y casi del mismo peso, y la «p» del título rozaba la línea de debajo) */
.pel-call p{margin:var(--r-pp,12px) 0 0;font-size:var(--fs-sm);font-weight:600;line-height:1.3;color:#d9ccff}.pel-call :is(h3,p,.pel-kantari){text-box:trim-both cap alphabetic}
.pel-call .pel-kantari{margin-top:var(--r-pp,12px);font-size:var(--fs-md);font-weight:800;color:#ff7ac8}
.pel-golpe{position:absolute;top:calc(env(safe-area-inset-top,0px) + var(--edge,16px) + 50px);right:calc(env(safe-area-inset-right,0px) + var(--edge,16px));padding:5px 14px 5px 12px;font:800 var(--fs-sm)/1.1 var(--pel-display,'MZ Display','MZ Texto',sans-serif);letter-spacing:.04em;text-transform:uppercase;color:#fff;background:rgba(7,2,15,.88);border-left:4px solid #e8247c;border-radius:6px;opacity:0;transform:translateX(24px);transition:opacity .16s,transform .22s cubic-bezier(.22,1.12,.36,1);pointer-events:none;white-space:nowrap}
.pel-golpe.azul{border-left-color:#4b3cff}.pel-golpe.on{opacity:1;transform:none}
/* la tarjeta del rival: bajo el marcador, del color que viste; la barra de energía grande y, encima de ella, la fuerza de
   su último golpe, que se llena y se apaga */
.pel-root.repe .pel-golpe,.pel-root.paneled .pel-golpe{visibility:hidden}
.pel-q{position:absolute;left:50%;top:40%;display:flex;flex-direction:column;align-items:center;gap:2px;white-space:nowrap;transform:translate(-50%,-50%);font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-size:var(--fs-2xl);text-shadow:0 3px 10px rgba(0,0,0,.45);opacity:0;transition:opacity .15s;pointer-events:none}
.pel-q.on{opacity:1}
/* el aviso de cada golpe, como en los juegos de deportes: grande, en medio, con rebote, y su color según cómo le has
   dado (como era antes del aviso breve, que al autor le gustaba más) */
.pel-q b{font:400 var(--fs-4xl)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;text-transform:uppercase;letter-spacing:0;color:#fff;filter:drop-shadow(0 4px 0 rgba(7,2,15,.6))}
.pel-q.on b{animation:pel-qpop .45s cubic-bezier(.2,1.7,.4,1) both}
.pel-q small{font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#fff;padding:2px 8px;background:rgba(7,2,15,.72);border-radius:6px;}
.pel-q small:empty{display:none}
.pel-q.k-perfect b{background:linear-gradient(180deg,#fff 30%,#ff7ac8 60%,#ff2bd6);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 14px rgba(255,43,214,.9)) drop-shadow(0 4px 0 rgba(7,2,15,.6))}
.pel-q.k-good b{color:#c9b2ff}.pel-q.k-early b,.pel-q.k-late b,.pel-q.k-whiff b{color:#ff6fb5;animation:pel-qfuera .3s ease both}
@keyframes pel-qpop{from{transform:scale(2.2) rotate(-6deg);opacity:0}to{transform:none;opacity:1}}
@keyframes pel-qfuera{from{transform:scale(1.25);opacity:0}to{transform:none;opacity:1}}
.pel-tip{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 16px + var(--pel-tip-sube,0px));width:max-content;max-width:min(560px,calc(calc(100vw / var(--z, 1)) - 330px));padding:8px 16px;border-radius:14px;background:rgba(28,11,58,.86);border:1px solid rgba(255,255,255,.08);font-size:var(--fs-md);font-weight:700;line-height:1.3;text-align:center;opacity:0;transition:opacity .2s}
/* (con tu energía abajo en el centro, el consejo, encima de ella) */
.pel-tip.on{opacity:1}
.pel-stick{position:absolute;left:0;bottom:0;width:calc(46vw / var(--z, 1));height:calc(62dvh / var(--z, 1));pointer-events:auto;touch-action:none}
.pel-knob{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:3px solid rgba(255,255,255,.55);background:rgba(28,11,58,.3);display:none}
.pel-knob i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.85)}
.pel-stickhint{position:absolute;left:calc(env(safe-area-inset-left,0px) + var(--thumb,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px));width:120px;height:120px;border-radius:50%;border:3px dashed rgba(255,255,255,.55);display:grid;place-items:center;font-size:var(--fs-xs);font-weight:700;text-align:center;opacity:.8;padding:8px}
.pel-btns{position:absolute;right:calc(env(safe-area-inset-right,0px) + var(--thumb,16px));bottom:calc(env(safe-area-inset-bottom,0px) + var(--thumb,16px));display:flex;align-items:flex-end;gap:12px;pointer-events:auto}
/* (botones lisos, sin canto ni sombra: la cara con un degradado suave y, al pulsar, se encogen un poco. Antes llevaban un
   canto semitransparente debajo que parecía una sombra mal puesta) */
.pel-btn{padding:0;border:0;border-radius:50%;color:#2a0638;font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-weight:800;line-height:1.15;display:grid;place-items:center;cursor:pointer;touch-action:none;box-shadow:none;transition:transform .08s,filter .08s}
.pel-btn:active,.pel-btn.down{transform:scale(.94);filter:brightness(.92)}
.pel-hit{width:112px;height:112px;font-size:var(--fs-xl);color:#fff;text-shadow:0 1px 0 rgba(74,10,94,.45);background:linear-gradient(180deg,#ff7fdc 0%,#f43ad6 100%)}
.pel-hit.ready{animation:pel-pulse .5s infinite alternate}
@keyframes pel-pulse{from{box-shadow:0 0 0 0 rgba(255,220,80,.7)}to{box-shadow:0 0 0 14px rgba(255,220,80,0)}}
/* (cortada y dejada, con la misma letra: antes la cortada iba un tamaño más pequeña) */
.pel-drop{width:80px;height:80px;font-size:var(--fs-sm);line-height:1;padding:0 4px;text-align:center;color:#fff;text-shadow:0 1px 0 rgba(15,5,30,.45);border:0;background:linear-gradient(180deg,#6440b8 0%,#432189 100%)}
.pel-bcol{display:flex;flex-direction:column;align-items:center;gap:10px}
.pel-cut{background:linear-gradient(180deg,#ff5fae 0%,#d93088 100%)}
.pel-hit,.pel-cut,.pel-drop{position:relative}
.pel-hit.charging::after,.pel-cut.charging::after,.pel-drop.charging::after{content:'';position:absolute;inset:-8px;border-radius:50%;background:conic-gradient(#ff2bd6 var(--cp),rgba(255,255,255,.18) 0 var(--tope,100%),rgba(255,70,70,.5) 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));pointer-events:none}
.pel-hit.full::after,.pel-cut.full::after,.pel-drop.full::after{background:#ff2e88;animation:pel-full .25s infinite alternate}
.pel-hit.tope::after,.pel-cut.tope::after,.pel-drop.tope::after{background:conic-gradient(#ff9d3b var(--cp),rgba(255,70,70,.5) 0)}
@keyframes pel-full{to{filter:brightness(1.6)}}
/* (las ventanas del partido, por encima de todo: la etiqueta de GOLPE asomaba encima de «Seguir jugando» y se llevaba el toque) */
.pel-panel{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:rgba(14,4,34,.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:auto;padding:calc(env(safe-area-inset-top,0px) + 16px) max(16px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 16px) max(16px,env(safe-area-inset-left,0px))}
.pel-card{position:relative;width:min(520px,100%);max-height:100%;overflow:auto;background:radial-gradient(80% 60% at 100% 0%,rgba(255,43,214,.2),transparent 60%),linear-gradient(170deg,#31106b 0%,#12052a 78%);color:#f6f3fc;border:1px solid rgba(255,255,255,.08);padding:24px 24px 16px;box-shadow:0 24px 70px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08);border-radius:10px;animation:gx-rise .3s cubic-bezier(.2,.9,.3,1) both}
.pel-card::before{content:'';position:absolute;left:16px;right:0;top:0;height:3px;background:var(--cta,#ff2bd6);box-shadow:0 0 18px rgba(255,43,214,.5)}
.pel-card h2{margin:0 0 var(--t-mb);font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-weight:400;font-size:var(--fs-2xl);line-height:1;color:#fff;text-transform:uppercase;text-shadow:0 3px 0 rgba(7,2,15,.5)}
.pel-card .pel-sub{margin:0 0 12px;font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Texto'),sans-serif;color:#ff7ac8;letter-spacing:.04em;text-transform:uppercase}
.pel-card ol{margin:0 0 12px;padding-left:24px;color:#e6def7}.pel-card li{margin:0 0 8px;line-height:1.3}.pel-card li::marker{color:#ff7ac8;font-weight:900}
.pel-card .pel-ctrl{font-size:var(--fs-sm);line-height:1.45;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#cbc2e0;border-radius:12px;padding:8px 12px;margin:0 0 16px}
.pel-card .pel-big{font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-weight:400;font-size:var(--fs-4xl);text-align:center;margin:8px 0;color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.35)}
.pel-card .pel-big small{font-size:.45em;color:#cbbcf0;margin-left:2px}
.pel-estrellas{display:flex;justify-content:center;gap:12px;margin:0 0 12px}
.pel-estrellas i{display:grid;place-items:center;width:44px;height:44px;font-style:normal;animation:pel-est .5s cubic-bezier(.2,1.6,.4,1) var(--d,0s) both}
.pel-estrellas i:nth-child(2){width:56px;height:56px;margin-top:-8px}
.pel-estrellas svg{width:100%;height:100%;fill:none;stroke:#b79cff;stroke-width:1.6}
.pel-estrellas i.on svg{fill:#ffd166;stroke:#ffe39a;filter:drop-shadow(0 0 10px rgba(255,209,102,.6))}
@keyframes pel-est{from{opacity:0;transform:scale(.3) rotate(-30deg)}}
.pel-card .pel-metas{font-size:var(--fs-sm);color:#cbbcf0}.pel-card .pel-metas b{color:#fff;font-weight:800;margin-right:4px}
@media (prefers-reduced-motion:reduce){.pel-estrellas i{animation:none}}
.pel-card .pel-fact{background:rgba(255,122,200,.1);border:1px solid rgba(255,255,255,.08);color:#fff3c4;border-radius:12px;padding:8px 12px;margin:8px 0 16px;font-size:var(--fs-sm);line-height:1.3}.pel-card .pel-fact b{color:#ff7ac8}
.pel-lbl{display:block;font-size:var(--fs-xs);font-weight:900;color:#cbbcf0;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px}
.pel-levels{display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap}
.pel-levels button{flex:1;min-width:90px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);color:#fff;padding:8px 8px;font:inherit;font-weight:900;cursor:pointer}
.pel-dur button small{font:inherit;font-weight:700;opacity:.7;margin-left:4px}
.pel-levels button[aria-pressed=true]{background:linear-gradient(180deg,#8338ec,#5e22c4);border-color:#c9a6ff;color:#fff;box-shadow:none}
.pel-go{border:0;border-radius:999px;padding:12px 24px;font:400 var(--fs-xl)/1 var(--f-display,'MZ Display'),'MZ Texto',sans-serif;text-transform:uppercase;letter-spacing:.04em;min-height:48px;cursor:pointer;color:#fff;background:var(--cta,linear-gradient(100deg,#ff2bd6,#c21cff 55%,#7b2ff7));box-shadow:0 0 18px rgba(255,43,214,.45);text-shadow:0 2px 0 rgba(74,10,94,.5)}.pel-go:active{transform:translateY(2px);box-shadow:0 2px 0 #8a1c8f}
.pel-go.alt{font:800 var(--fs-md)/1.15 var(--f-cond,'MZ Cond'),'MZ Texto',sans-serif;letter-spacing:.04em;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);color:#fff;box-shadow:none;text-shadow:none}
.pel-root.calling .pel-tip,.pel-root.calling .pel-q{opacity:0}
.pel-root.paneled .pel-exit,.pel-root.paneled .pel-q,.pel-root.paneled .pel-call,.pel-root.paneled .pel-tip{visibility:hidden}
/* la ficha del rival: cómo corre, cuánto pega, sus manos, sus golpes preferidos y de qué tener cuidado */
.pf{display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px;min-width:0}.pf>b{flex:1 1 100%}.pf .pf-k{color:#fff}
.pf .pf-sh{flex:1 1 100%;font-size:var(--fs-sm)}.pf .pf-sh em{font-style:normal;margin-right:12px;white-space:nowrap}.pf .pf-sh em i{font-style:normal;color:#ff7ac8;letter-spacing:1px}
.pf p strong{color:#ffb9a8}
.pel-pairs{margin:0 0 8px;font-size:var(--fs-sm);line-height:1.45;color:#d8cff0}
/* las partes del frontón: el botón junto al título y la ficha de cada parte, abajo */
.pel-chip{position:relative;min-height:40px;margin-left:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,122,200,.12);color:#ff7ac8;border-radius:999px;padding:4px 12px;font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;cursor:pointer;vertical-align:middle}
.pel-tour{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);transform:translateX(-50%);width:min(560px,calc(calc(100vw / var(--z, 1)) - 32px));padding:8px 16px;border-radius:16px;background:linear-gradient(180deg,rgba(50,19,111,.95),rgba(28,11,58,.95));border:1px solid rgba(255,255,255,.08);pointer-events:auto;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.pel-tour b{display:block;font-family:var(--pel-display,'MZ Display','MZ Texto',sans-serif);font-size:var(--fs-lg);font-weight:400;color:#ff7ac8}
.pel-tour p{margin:4px 0 8px;font-size:var(--fs-sm);line-height:1.3}.pel-tour div{display:flex;gap:8px;justify-content:flex-end}
.pel-tour button{border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.08);color:#fff;font:inherit;font-weight:900;padding:8px 16px;min-height:44px;cursor:pointer}
.pel-tour button.go{background:linear-gradient(180deg,#ffc2ec,#ff7ac8 50%,#ff3dbd);color:#2a0638;border:0}
@media (max-width:560px){
  .pel-tip{max-width:calc(calc(100vw / var(--z, 1)) - 32px);bottom:auto;top:calc(env(safe-area-inset-top,0px) + 64px)}}
@media (max-height:520px){.pel-hit{width:94px;height:94px;font-size:var(--fs-lg)}.pel-drop{width:68px;height:68px;font-size:var(--fs-xs)}
  .pel-tip{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 48px);max-width:calc(calc(100vw / var(--z, 1)) - 240px);font-size:var(--fs-sm);padding:8px 12px}
  .pel-call{top:calc(env(safe-area-inset-top,0px) + 56px);padding:12px 20px}
  .pel-card{width:min(780px,100%);padding:16px 16px 12px}.pel-card h2{font-size:var(--fs-xl)}.pel-card .pel-sub{margin-bottom:8px}
  .pel-card ol{columns:2;column-gap:24px;font-size:var(--fs-sm);margin-bottom:8px}.pel-card li{break-inside:avoid;margin-bottom:4px}
  .pel-card .pel-ctrl{font-size:var(--fs-sm);padding:8px 8px;margin-bottom:8px}.pel-levels{margin-bottom:8px}.pel-levels button{padding:8px 8px}
  .pel-go{padding:8px 16px;font-size:var(--fs-md)}.pel-card .pel-big{font-size:var(--fs-3xl);margin:2px 0}.pel-card .pel-fact{margin:8px 0 8px;font-size:var(--fs-sm)}}
/* móvil en horizontal con poca altura: título y marcador en una línea, sin la etiqueta «Nivel» (el grupo la lleva como
   aria-label) y los niveles junto a los botones de jugar, para que todo quepa sin desplazar */
@media (orientation:landscape) and (max-height:440px){
  .pel-panel{padding-top:calc(env(safe-area-inset-top,0px) + 8px);padding-bottom:calc(env(safe-area-inset-bottom,0px) + 8px)}
  .pel-card{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:12px;padding:8px 16px 12px;border-radius:18px}
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>*{flex:1 1 100%}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>h2{flex:0 0 auto;margin-bottom:8px}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-sub{flex:1 1 0;min-width:0;margin-bottom:8px}
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-lbl{display:none}
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-levels{flex:3 1 0;min-width:0;margin:0;align-self:center;flex-wrap:nowrap}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-levels button{min-width:0;min-height:44px}
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-levels+.pel-row{flex:2 1 0;min-width:0;align-self:center}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-levels+.pel-row .pel-go{min-height:44px}
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-court{margin-bottom:8px}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-lv5 button{flex:1 1 auto;min-width:max-content;padding:4px 6px;font-size:var(--fs-xs);text-transform:none;letter-spacing:0}   /* (cada nivel entero: «Iniciación» no se parte; cada botón del ancho de su nombre) */
  :is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-mod{flex:1 1 100%;margin:0 0 8px}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-mod button{min-height:44px;padding:4px 8px}:is(.pel-card,.pel-card:where(.mas)>.pel-lado)>.pel-pairs{margin-bottom:8px;font-size:var(--fs-xs)}
  .pel-card.mas>.pel-sub,.pel-card.mas>.pel-lado>.pel-sub{display:none}.pel-opts{display:contents}.pel-card.mas>h2,.pel-card.mas>.pel-lado>h2{align-self:center;margin-bottom:8px}
  .pel-otabs{flex:1 1 0;min-width:0;margin-bottom:8px}.pel-opane{flex:1 1 100%}.pel-opane .pel-mod{margin-bottom:8px}.pel-opane .pel-mod button{min-height:44px;padding:4px 8px}.pel-opane .pel-pairs{margin:0 0 8px;font-size:var(--fs-xs)}
  .pel-balls{margin-bottom:8px}
  .pel-orow{margin-bottom:8px}.pel-orow .pel-switch{min-height:44px;padding:4px 12px}
  /* (la pestaña «Partido», entera sin desplazar: cada rótulo a la izquierda de su grupo en vez de encima, los dos
     interruptores en una fila y sin el párrafo de la elección de material, que se explica al elegirlo) */
  .pel-opane[data-pane="0"]{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 12px;align-items:center}
  .pel-opane[data-pane="0"]>*{margin:0}.pel-opane[data-pane="0"]>:is(.pel-mod,.pel-pairs,.pel-orow){grid-column:1/-1}
  .pel-opane[data-pane="0"] .pel-ballwhat{display:none}.pel-opane[data-pane="0"]{margin-bottom:8px}
  @media (max-height:380px){.pel-opane[data-pane="0"]{row-gap:4px;margin-bottom:4px}}
  .pel-opane[data-pane="1"],.pel-opane[data-pane="2"]{max-height:calc(calc(100dvh / var(--z, 1)) - 156px);overflow:auto;overscroll-behavior:contain}
  .pel-opane ol{columns:2;column-gap:24px;margin-bottom:8px}.pel-opane .pel-ctrl{margin-bottom:8px}}
@media (hover:hover) and (pointer:fine){.pel-stick,.pel-stickhint{display:none}}
/* zona táctil de 44 px en las píldoras pequeñas (el dibujo no cambia) */
.pel-chip::before{content:'';position:absolute;inset:-8px -4px}
/* quién juega contra quién: las cartas de los pelotaris (ui/sportCard.js, las del cuadro del torneo y la Gran final), las
   tuyas de tu color a la izquierda, el «VS» y las del rival; al tocar una, su ficha. En una pantalla tumbada las cartas
   van a la izquierda, con todo el alto de la ventana, y lo demás (.pel-lado: el título, el frontón, «Más opciones», el
   nivel y los botones) en una columna a su derecha, que no baja de 280 px; de pie, las cartas arriba y lo demás debajo.
   El ancho de la carta, --cw, lo mide match.js (intro, encaja) con el sitio que queda: mano a mano salen de 136 px o
   más, con sus seis cifras en dos columnas; por parejas, dos por lado, el delantero encima del zaguero. Con «Más
   opciones» abierto las cartas se apartan y la columna se deshace (display:contents): la ventana de siempre */
.pel-rv{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 12px}
.pel-team{flex:none;display:flex;flex-direction:column;gap:8px}
.pel-vs .gx-card{--w:var(--cw,140px)!important}
.pel-vs-x{flex:none;min-width:32px;text-align:center;font:400 var(--fs-2xl)/1 var(--pel-display,'MZ Display','MZ Texto',sans-serif);letter-spacing:.02em;background:linear-gradient(180deg,#fff,#ff7ac8);-webkit-background-clip:text;background-clip:text;color:transparent}   /* (el mismo «VS» que el del cuadro del torneo) */
.pel-lado{display:contents}.pel-pres .pel-row{margin-left:0;margin-right:0;padding-left:0;padding-right:0}
/* (con «Más opciones» abierto sobra la línea del campeonato: así la vista cabe sin desplazar) */
.pel-card.pel-pres.mas>.pel-lado>.pel-sub{display:none}
.pel-mas{display:flex;align-items:center;gap:8px;margin:0 0 8px}.pel-mas .pel-more{flex:1 1 0;width:auto;min-width:0;margin:0}.pel-mas .pel-chip{flex:none;margin:0;min-height:44px}
@media (max-width:520px){.pel-pres .pel-sum{display:none}}
@media (max-width:440px){.pel-card.pel-pres{padding-left:16px;padding-right:16px}}
@media (orientation:landscape){
  .pel-card.pel-pres{width:min(960px,100%)}
  .pel-card.pel-pres:not(.mas){display:flex;flex-wrap:nowrap;align-items:center;gap:16px}
  .pel-card.pel-pres:not(.mas)>.pel-rv{flex:none;margin:0}
  .pel-card.pel-pres:not(.mas)>.pel-lado{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:12px}
  .pel-card.pel-pres:not(.mas)>.pel-lado>*{flex:none;margin:0}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lbl{margin-bottom:-4px}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-row{position:static;padding:0;background:none}
  .pel-card.pel-pres:not(.mas) .pel-sum{display:none}   /* (el resumen de lo elegido no cabe entero en la columna) */
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lv5{display:grid;grid-template-columns:repeat(6,minmax(0,1fr))}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lv5 button{grid-column:span 2;min-width:0}.pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lv5 button:nth-child(n+4){grid-column:span 3}
}
/* (en el móvil tumbado: el mismo relleno arriba que abajo, todo más junto y sin el rótulo «Nivel», que el grupo lo lleva
   como aria-label) */
@media (orientation:landscape) and (max-height:500px){
  .pel-card.pel-pres:not(.mas){padding:12px 16px}
  .pel-card.pel-pres:not(.mas)>.pel-lado{gap:8px}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lbl{display:none}
  .pel-vs-x{font-size:var(--fs-xl)}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-lv5 button{min-height:44px;padding:4px 8px}
  .pel-card.pel-pres:not(.mas)>.pel-lado>.pel-row .pel-go{min-height:44px}
}
.pel-wide{display:block;width:100%;margin:0 0 12px}
/* el frontón: su dibujo, su nombre y lo que se nota al jugar en él (al tocarlo, qué pasa con cada cosa) */
.pel-court{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;margin:0 0 12px;padding:4px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,122,200,.08);color:#fff;font:inherit;text-align:left;cursor:pointer}
.pel-court svg{flex:none;width:48px;height:36px}.pel-court-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.pel-court-t b{font-size:var(--fs-sm);font-weight:900;line-height:1.3}.pel-court-t span{display:flex;flex-wrap:wrap;gap:4px}
.pel-court-t i{font-style:normal;font-size:var(--fs-xs);font-weight:800;line-height:1.3;padding:0 8px;border-radius:999px;background:rgba(255,255,255,.1);color:#ff7ac8}
.pel-court-what{margin:-4px 0 12px;font-size:var(--fs-sm);line-height:1.45;color:#e6def7}.pel-court-what b{color:#ff7ac8}
/* «Más opciones»: plegado, con lo elegido a la vista */
/* «Más opciones»: un botón con lo elegido a la vista. Al tocarlo, el mismo panel pasa a la vista de opciones, en
   pestañas (Partido, Reglas, Controles), en vez de alargarse: quién juega y el frontón se apartan, y el nivel y los
   botones de jugar siguen abajo */
.pel-more{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;margin:0 0 8px;padding:0;border:0;background:none;color:#cbbcf0;font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Texto'),sans-serif;text-transform:uppercase;letter-spacing:.1em;text-align:left;white-space:nowrap;cursor:pointer}
.pel-more::before{content:'';flex:none;width:8px;height:8px;border:solid #ff7ac8;border-width:0 2px 2px 0;transform:rotate(-45deg);margin:0 4px 0 2px}
.pel-more .pel-sum{margin-left:auto;padding-left:12px;min-width:0;font-size:var(--fs-xs);font-weight:800;letter-spacing:0;text-transform:none;color:#ff7ac8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pel-card.mas :is(.pel-rv,.pel-court,.pel-court-what,.pel-mas){display:none}
.pel-opts[hidden],.pel-opane[hidden]{display:none}
.pel-otabs{display:flex;align-items:stretch;gap:4px;margin:0 0 12px}
.pel-otabs button{flex:1 1 0;min-width:0;min-height:44px;padding:0 8px;border:0;border-radius:999px;background:none;color:#cbbcf0;font:800 var(--fs-sm)/1.2 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
.pel-otabs button[aria-selected=true]{color:#fff;background:var(--btn-on,#7a42ea)}
.pel-otabs .pel-back{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:0 12px 0 4px;color:#ff7ac8;letter-spacing:.04em}
.pel-otabs .pel-back::before{content:'';width:8px;height:8px;border:solid currentColor;border-width:0 0 2px 2px;transform:rotate(45deg)}
.pel-opane{animation:pel-pane .18s ease both}@keyframes pel-pane{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.pel-opane ol{margin:0 0 12px}.pel-opane .pel-ctrl{margin:0 0 12px}
.pel-orow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:center;margin:0 0 12px}
.pel-orow .pel-ballwhat,.pel-orow .pel-switch{margin:0}.pel-orow .pel-ballwhat{grid-row:span 2}
/* (de pie, en el móvil: los dos interruptores uno debajo del otro, a lo ancho, y sin el párrafo de la elección de material,
   como en el móvil tumbado: se explica al elegirlo. Antes, el párrafo en una columna estrecha y la pestaña se pasaba 226 px) */
@media (orientation:portrait) and (max-width:600px){.pel-orow{grid-template-columns:minmax(0,1fr);gap:8px}.pel-orow .pel-ballwhat{display:none}}
.pel-lv5 button{min-width:0;font-size:var(--fs-sm)}
/* móvil muy estrecho de pie: los niveles bajan a otra fila en vez de pisarse y «Volver al pueblo» parte en dos líneas */
@media (orientation:portrait) and (max-width:400px){.pel-lv5 button{flex:1 1 auto;min-width:max-content}}
@media (orientation:portrait) and (max-width:360px){.pel-row .pel-go{white-space:normal;font-size:var(--fs-lg);line-height:1.1}}
/* tu energía: grande, abajo en el centro (entre el joystick y los botones); verde, amarilla y roja al cansarte */
@keyframes pel-low{to{box-shadow:none}}
/* el descanso: a la derecha de tu energía (de pie, encima), con los que te quedan; pedido, en rosa; descansando, «Seguir»;
   cansado y con descansos, brilla */
/* interruptores de «Más opciones» (la cámara dinámica) */
.pel-switch{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;margin:0 0 12px;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);color:#fff;font:inherit;text-align:left;cursor:pointer}
.pel-switch span{flex:1;display:flex;flex-direction:column;gap:2px}.pel-switch b{font-size:var(--fs-sm);font-weight:900;line-height:1.3}.pel-switch small{font-size:var(--fs-xs);font-weight:600;line-height:1.3;color:#d8cff0}
.pel-switch i{flex:none;position:relative;width:48px;height:28px;border-radius:999px;background:rgba(255,255,255,.18);transition:background .15s}
.pel-switch i::after{content:'';position:absolute;top:4px;left:4px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .15s}
.pel-switch[aria-checked=true] i{background:#ff2bd6}.pel-switch[aria-checked=true] i::after{transform:translateX(20px)}
/* la pelota: cinco botones con su bote dibujado y, debajo, lo que hace la elegida */
.pel-balls{display:grid;grid-template-columns:auto repeat(5,minmax(0,1fr));align-items:center;gap:4px}
.pel-balls>small{padding-right:8px;font-size:var(--fs-xs);font-weight:900;color:#cbbcf0;text-transform:uppercase;letter-spacing:.04em}
.pel-balls button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:58px;padding:4px 4px 8px;line-height:1.15;white-space:normal;text-align:center}
.pel-balls button span{font-size:var(--fs-xs);font-weight:800}
.pel-balls button[aria-pressed=true] svg{color:#fff}.pel-balls button svg{color:#c9b2ff}
.pel-ballwhat{margin:8px 0 12px;font-size:var(--fs-sm);line-height:1.45;color:#e7defa}
/* el momento justo: un aro que se cierra sobre el botón de golpe; cuando lo toca, suelta. Fucsia y brillante en el momento */
.pel-tring{position:absolute;inset:-4px;border-radius:50%;border:3px solid #fff;pointer-events:none;opacity:0;transform:scale(1.9);will-change:transform,opacity}
.pel-tring.on{opacity:.9}.pel-tring.now{border-color:#fff;box-shadow:0 0 22px #ff2bd6;opacity:1}
.pel-hit .pel-hl{position:relative;z-index:1}

/* ordenador (pantalla grande): las ventanas del partido más anchas y con la letra a su tamaño */
@media (min-width:1200px) and (min-height:560px){
  .pel-card{width:min(1000px,100%);padding:32px 40px 24px}.pel-card ol{columns:2;column-gap:40px}.pel-card li{break-inside:avoid}.pel-card h2{font-size:var(--fs-3xl)}.pel-card .pel-sub{font-size:var(--fs-md)}
  .pel-card li,.pel-card .pel-ctrl,.pel-pairs{font-size:var(--fs-md)}.pel-go{min-height:56px}.pel-levels button{min-height:48px}
  .pel-card.pel-pres.mas{padding-top:24px}
}
/* la elección de material (material.js): un desplegable con cómo quieres tus pelotas y, debajo, cuáles son, cada una con
   su número, lo viva que es y su peso */
.pel-card.pel-matcard{width:min(560px,100%)}
.pel-msel{display:grid;gap:6px;margin:0 0 12px}.pel-msel>span{font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Texto'),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#ff9ad8}
.pel-mseg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.pel-mseg button{min-height:44px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(20,8,40,.55);color:#fff;font:700 var(--fs-md)/1.1 'MZ Texto',sans-serif;cursor:pointer;touch-action:manipulation}
.pel-mseg button[aria-checked=true]{background:rgba(131,56,236,.6);border-color:#c9a6ff;box-shadow:none}
.pel-matcard .pel-mgo{position:sticky;bottom:-16px;margin:0 -24px -16px;padding:8px 24px 16px;background:linear-gradient(180deg,rgba(18,5,42,0),#12052a 14px)}
.pel-matcard .pel-mgo .pel-go{touch-action:manipulation}
.pel-mchips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}
.pel-mchip{display:inline-flex;align-items:center;gap:8px;padding:5px 14px 5px 5px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08)}
.pel-mchip svg{width:30px;height:30px}.pel-mchip b{font:900 var(--fs-sm)/1.1 var(--f-cond,'MZ Texto'),sans-serif}.pel-mchip small{font-size:var(--fs-xs);color:#cbc2e0;white-space:nowrap}
.pel-mat-what{margin:0 0 12px;font-size:var(--fs-sm);color:#d8cff0;line-height:1.35}
.pel-mrv{margin:-4px 0 12px;font-size:var(--fs-xs);color:#b9addb}.pel-mrv:empty{display:none}
/* la fila de los botones del panel (Ahora no y ¡A jugar!): con su hueco entre ellos y pegada abajo si el panel se
   desplaza, sobre el color del fondo. En «Partido de pelota: menos cosas en pantalla» se borró sin querer junto a otra
   regla y los dos botones quedaban pegados el uno al otro */
.pel-row{display:flex;gap:12px;position:sticky;bottom:-16px;z-index:1;margin:8px -4px -8px;padding:8px 4px;background:#12052a}
.pel-row .pel-go{flex:1 1 0;min-width:0;white-space:nowrap}
@media (max-width:440px){.pel-row{flex-direction:column-reverse}.pel-row .pel-go{flex:none;width:100%}}
.pel-row .pel-go:disabled{opacity:.45;cursor:default;box-shadow:none}
@media (max-height:500px){.pel-msel{margin-bottom:8px}.pel-mseg button{min-height:40px}.pel-matcard .pel-mgo{bottom:-12px;margin:0 -16px -12px;padding:6px 16px 12px}.pel-mchip svg{width:24px;height:24px}.pel-mat-what{margin-bottom:8px}}
/* la experiencia en el panel del final: el nivel con su barra y lo que ha subido cada cualidad, en cuatro casillas */
/* el resumen del partido (match.js, estBloque): cada cifra, la tuya y la del rival, con el color de cada uno */
/* el final: a la izquierda el resultado, el momento clave y la experiencia; a la derecha las estadísticas y el mapa de
   golpes. En dos columnas cuando hay sitio (móvil tumbado y ordenador): en una sola, el nivel quedaba debajo de los
   botones */
.pel-fin{display:block}
:where(.pel-card:has(.pel-fin)) .pel-row{margin-left:0;margin-right:0;padding-left:0;padding-right:0;background:linear-gradient(rgba(21,6,49,0),rgba(21,6,49,.96) 8px)}
.pel-fin :is(.pel-big,.pel-clave,.pel-est,.pel-xp,.pel-mapa,.pel-fact){margin:0 0 16px}.pel-fin :is(.pel-fin-a,.pel-fin-b)>:last-child{margin-bottom:0}.pel-fin-a:not(:empty)+.pel-fin-b{margin-top:16px}
@media (min-width:600px){.pel-fin .pel-fin-a+.pel-fin-b{margin-top:0}}.pel-card:has(.pel-fin)>.pel-sub{margin-bottom:16px}
/* el resultado en la cabecera del final: el tanteo entre los dos nombres, cada uno con su color, y las fichas a la derecha */
.pel-card .pel-sub:has(.pel-marca){display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px}.pel-sub:has(.pel-marca) .pel-chip{margin-left:auto;min-height:32px}@media (max-width:440px){.pel-sub:has(.pel-marca) .pel-chip{margin-left:0}}
.pel-marca{display:inline-flex;align-items:baseline;gap:12px;min-width:0}.pel-marca i{font-style:normal;white-space:nowrap}.pel-marca i.azul{color:#b9b1ff}.pel-marca i.rojo{color:#ff9cc8}
.pel-marca b{font:400 var(--fs-2xl)/1 var(--pel-display,'MZ Display','MZ Texto',sans-serif);color:#fff;letter-spacing:.02em;white-space:nowrap;text-shadow:0 3px 0 rgba(7,2,15,.5)}
@media (min-width:600px){.pel-card:has(.pel-fin){width:min(860px,100%)}.pel-fin{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:0 16px;align-items:start}}
.pel-clave{margin:4px 0 12px;padding:10px 14px;border-radius:8px;background:linear-gradient(100deg,rgba(255,43,214,.16),rgba(123,47,247,.12));border:1px solid rgba(255,255,255,.08)}
.pel-clave b{display:block;font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#ff7ac8}
.pel-clave p{margin:4px 0 0;font-size:var(--fs-sm);font-weight:700;line-height:1.35;color:#fff}
.pel-mapa{margin:0 0 12px;padding:10px 14px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
.pel-mapa svg{display:block;width:100%;height:auto;margin-top:8px}
.pel-mapa text{font:800 16px/1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.06em;text-transform:uppercase;fill:#cbbcf0}
/* los comentarios (comenta.js): un rótulo de retransmisión abajo en el centro, entre el joystick y los botones, con la
   inicial y el nombre de quien habla (rosa cuando narra; lila cuando explica la jugada); en vertical, a lo ancho
   y por encima de los botones. También en la repetición: es cuando más se comenta */
.pel-com{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);transform:translate(-50%,8px);width:max-content;max-width:min(calc(100vw / var(--z, 1) - 420px),520px);display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:10px;align-items:center;padding:8px 14px 8px 10px;background:rgba(7,2,15,.88);border-left:3px solid var(--cc,#ff2bd6);border-radius:3px;box-shadow:0 6px 18px rgba(0,0,0,.35);opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;--cc:#ff2bd6}
.pel-com.on{opacity:1;transform:translate(-50%,0)}.pel-com.e{--cc:#9d8cff}
.pel-com .pc-q{grid-row:1/3;width:30px;height:30px;border-radius:50%;background:var(--cc);display:grid;place-items:center;font:400 var(--fs-md)/1 var(--pel-display,'MZ Display','MZ Texto',sans-serif);color:#fff;font-style:normal}
.pel-com b{font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--cc)}.pel-com b small{font:inherit;color:#cbbcf0;letter-spacing:.04em}
.pel-com p{margin:2px 0 0;font-size:var(--fs-sm);font-weight:600;line-height:1.3;color:#fff}
@media (orientation:portrait){.pel-com{left:16px;right:16px;width:auto;max-width:none;transform:translateY(8px);bottom:calc(env(safe-area-inset-bottom,0px) + 200px)}.pel-com.on{transform:none}}
.pel-root.paneled .pel-com{visibility:hidden}
body.alto-contraste .pel-com{background:#000;border:2px solid #fff;border-left:4px solid var(--cc)}
/* accesibilidad (util/accesible.js): textos grandes, un 20 % más, y alto contraste, con fondo negro, letra blanca y bordes
   blancos en el marcador, los avisos, los paneles y los botones */
body.textos-grandes .pel-root{--fs-xs:15px;--fs-sm:17px;--fs-md:19px;--fs-lg:24px;--fs-xl:28px;--fs-2xl:36px;--fs-3xl:44px;--fs-4xl:52px;--fs-hero:clamp(36px,7vw,56px)}
body.textos-grandes .pel-root :is(.pel-est,.pel-xp) li b{font-size:13px}body.textos-grandes .pel-side{width:calc(var(--psw,176px) * 1.12)}
body.alto-contraste .pel-score{background:#000;border-top-color:#fff;opacity:1;box-shadow:0 0 0 2px #fff}
body.alto-contraste .pel-side :is(span,b){color:#fff;text-shadow:0 1px 0 #000}
body.alto-contraste :is(.pel-call,.pel-golpe,.pel-tip,.pel-q,.pel-rep-b){background:#000!important;border:2px solid #fff!important;color:#fff!important;box-shadow:none!important}
body.alto-contraste .pel-call :is(p,.pel-kantari){color:#fff!important}body.alto-contraste .pel-racha{background:#000;border:2px solid #ffd166;color:#ffd166;box-shadow:none}
body.alto-contraste .pel-card{background:#000;border:2px solid #fff}body.alto-contraste .pel-card :is(p,li,small,.pel-sub,dt,dd){color:#fff!important}
body.alto-contraste .pel-card :is(.pel-est,.pel-xp,.pel-clave,.pel-mapa,.pel-fact,.pel-ctrl){background:#0b0b0b;border:2px solid #fff}
body.alto-contraste .pel-row{background:#000}body.alto-contraste .pel-go.alt,body.alto-contraste .pel-levels button,body.alto-contraste .pel-chip{background:#000;border:2px solid #fff;color:#fff}
body.alto-contraste .pel-btn{box-shadow:0 0 0 3px #fff}body.alto-contraste .pm-btn{background:#000;border:2px solid #fff}
.pel-mapa span{display:flex;gap:10px}.pel-mapa i{font-style:normal}.pel-mapa i.rojo{color:#ff9cc8}.pel-mapa i.azul{color:#b9b1ff}
.pel-est{margin:4px 0 12px;padding:12px 14px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
.pel-est-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.pel-est-top b{font:400 var(--fs-lg)/1 var(--f-display,'MZ Display'),sans-serif;text-transform:uppercase;letter-spacing:.02em}
.pel-est span{display:flex;gap:10px;min-width:0}.pel-est i{font-style:normal}.pel-est i.rojo{color:#ff9cc8}.pel-est i.azul{color:#b9b1ff}
.pel-est-top i{font:800 var(--fs-xs)/1.2 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.06em;text-transform:uppercase;max-width:11ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pel-est ul{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 8px;columns:auto}
.pel-est li{display:grid;grid-template-rows:1fr auto;justify-items:center;align-items:end;gap:4px;margin:0;padding:0}
.pel-est li b{font:800 11px/1.1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#cbbcf0;text-align:center}
.pel-est li span{font:400 var(--fs-md)/1 var(--f-display,'MZ Display'),sans-serif;gap:12px}
.pel-est p{margin:8px 0 0;font:700 var(--fs-xs)/1.3 var(--f-cond,'MZ Cond'),sans-serif;color:#e7defa;text-align:center}
@media (max-width:440px){.pel-est ul{grid-template-columns:repeat(2,minmax(0,1fr))}}
.pel-xp{margin:4px 0 12px;padding:12px 14px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
.pel-xp.sube{border-color:#ffd36a;box-shadow:0 0 18px rgba(255,211,106,.25)}
.pel-xp-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.pel-xp-top b{font:400 var(--fs-lg)/1 var(--f-display,'MZ Display'),sans-serif;text-transform:uppercase;letter-spacing:.02em}
.pel-xp.sube .pel-xp-top b{color:#ffd36a}.pel-xp-top span{font:800 var(--fs-sm)/1 var(--f-cond,'MZ Cond'),sans-serif;color:#ffb1e3;white-space:nowrap}
.pel-xp-bar{display:block;height:8px;margin:10px 0 0;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.pel-xp-bar u{display:block;height:100%;border-radius:inherit;background:var(--cta,#c21cff);animation:pel-xpin 1s cubic-bezier(.2,.9,.3,1) both}
@keyframes pel-xpin{from{width:0}}
.pel-xp ul{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,max-content);justify-content:space-between;gap:8px 12px}
.pel-xp li{display:grid;grid-template-rows:1fr auto;justify-items:center;align-items:end;gap:4px;padding:0}
.pel-xp li b{font:800 11px/1.1 var(--f-cond,'MZ Cond'),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#cbbcf0}
.pel-xp li span{font:400 var(--fs-md)/1 var(--f-display,'MZ Display'),sans-serif;color:#7dffa8}.pel-xp li small{font:700 var(--fs-xs)/1 var(--f-cond,'MZ Cond'),sans-serif;color:#e7defa}
/* (en el móvil tumbado, todo a la vista y con aire: 12 px entre bloques y 10-14 px dentro de cada uno, sin casillas dentro
   de las casillas; el mapa de golpes con su título a la izquierda, para que la cancha use el ancho y no quede diminuta, y
   los botones a 44 px de alto, con 12 px por encima. Antes iba todo a 6-8 px, el resultado ocupaba una fila para él solo
   y el panel se desplazaba 11 px, lo justo para que el mapa pareciera cortado) */
@media (orientation:landscape) and (max-height:520px){
  .pel-card:has(.pel-fin){padding:14px 20px 12px}.pel-card:has(.pel-fin)>:is(h2,.pel-sub){margin-bottom:12px}.pel-marca b{font-size:var(--fs-xl)}
  .pel-fin{column-gap:16px;align-items:stretch}.pel-fin>div{display:flex;flex-direction:column}.pel-fin>div>:last-child{flex:1 1 auto}.pel-fin :is(.pel-big,.pel-clave,.pel-est,.pel-xp,.pel-mapa,.pel-fact){margin:0 0 12px}.pel-fin :is(.pel-fin-a,.pel-fin-b)>:last-child{margin-bottom:0}
  .pel-fin .pel-big{font-size:var(--fs-2xl)}.pel-fin :is(.pel-clave,.pel-est,.pel-xp,.pel-mapa){padding:10px 14px}
  .pel-fin :is(.pel-est-top,.pel-xp-top) b{font-size:var(--fs-md);line-height:1.05}.pel-xp-bar{margin-top:8px}.pel-est ul{margin-top:12px}
  .pel-mapa{display:grid;grid-template-columns:minmax(0,7.5em) minmax(0,1fr);align-items:center;column-gap:12px}
  .pel-mapa .pel-est-top{flex-direction:column;align-items:flex-start;gap:6px}.pel-mapa svg{margin:0;max-height:80px}
  .pel-fin-b:has(.pel-est) .pel-mapa .pel-est-top span{display:none}   /* (los colores de cada uno ya los dice la leyenda de las estadísticas, justo encima) */
  .pel-card:has(.pel-fin) .pel-row{margin:4px 0 -12px;padding:8px 0 12px;bottom:-12px}
  .pel-card:has(.pel-fin) .pel-go{min-height:44px;padding:8px 16px}}
/* (y en los más bajos, como el iPhone SE tumbado, sin el pie de las estadísticas, que el tanto más largo ya lo cuenta el
   momento clave, ni el total de cada cualidad bajo lo que ha subido) */
@media (orientation:landscape) and (max-height:400px){.pel-fin :is(.pel-est p,.pel-xp li small){display:none}}
/* (y en los de 375 px, el SE y el mini, 10 px entre bloques y un poco menos de relleno, para que siga cabiendo entero) */
@media (orientation:landscape) and (max-height:380px){.pel-card:has(.pel-fin){padding-top:12px}.pel-card:has(.pel-fin)>:is(h2,.pel-sub),.pel-fin :is(.pel-big,.pel-clave,.pel-est,.pel-xp,.pel-mapa,.pel-fact){margin-bottom:10px}
  .pel-fin :is(.pel-clave,.pel-est,.pel-xp,.pel-mapa){padding:8px 12px}.pel-est ul{margin-top:12px;row-gap:8px}.pel-mapa svg{max-height:60px}.pel-fin :is(.pel-fin-a,.pel-fin-b)>:last-child{margin-bottom:0}}
/* (y con la barra de Safari, el móvil tumbado se queda en 320-360 px de alto: todo más junto, para que el mapa de golpes
   no quede debajo de los botones. Antes, ahí había que desplazar el panel para verlo entero y parecía cortado) */
@media (orientation:landscape) and (max-height:360px){.pel-card:has(.pel-fin){padding-top:10px}.pel-card:has(.pel-fin)>:is(h2,.pel-sub){margin-bottom:8px}
  .pel-fin :is(.pel-big,.pel-clave,.pel-est,.pel-xp,.pel-mapa,.pel-fact){margin-bottom:8px}.pel-fin :is(.pel-clave,.pel-est,.pel-xp,.pel-mapa){padding:6px 12px}
  .pel-clave p{line-height:1.25}.pel-est ul{margin-top:6px;row-gap:4px}.pel-est li{gap:2px}.pel-xp-bar{margin-top:6px}.pel-xp ul{margin-top:6px}
  .pel-mapa svg{max-height:46px}.pel-fin :is(.pel-fin-a,.pel-fin-b)>:last-child{margin-bottom:0}
  .pel-card:has(.pel-fin) .pel-row{padding-top:6px}}
/* el menú del partido: un botón redondo a la derecha del marcador, con el icono de pausa como el del pueblo (al abrirlo, el
   partido se para). Dentro, todo junto y ordenado: la pelota (se cambia mientras sacas tú), el descanso, las fichas de
   los pelotaris y salir. En su badge, los descansos que te quedan; brilla si estás cansado y te quedan. Antes la pelota
   y el descanso iban en otro botón a la izquierda, debajo de una X de salir */
.pel-top{gap:8px;align-items:flex-start}
.pel-menu{position:relative;flex:none;pointer-events:auto;color:#e6def7;font:800 var(--fs-xs)/1 var(--f-cond,'MZ Texto'),sans-serif}
.pm-btn{position:relative;display:grid;place-items:center;width:44px;height:44px;padding:0;border-radius:50%;border:2px solid rgba(255,255,255,.82);background:rgba(14,10,24,.66);box-shadow:0 3px 12px rgba(0,0,0,.35);color:#fff;cursor:pointer;transition:transform .18s cubic-bezier(.22,1.1,.36,1)}
.pm-btn img,.pm-btn svg{width:22px;height:22px;display:block;pointer-events:none}
.pm-btn i:empty{display:none}.pm-btn i{position:absolute;right:-5px;bottom:-5px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--cta,#c21cff);font:900 11px/1 var(--f-cond,'MZ Texto'),sans-serif;font-style:normal;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.pel-menu.on .pm-btn{transform:scale(.94);border-color:#ff7ac8}
/* (el menú del partido es la ventana de pausa de src/ui/pausa.js: centrada sobre el partido, con sus filas) */
.pm-hoja{display:none}.pel-menu.on .pm-hoja{display:grid}
.pz-k{flex:none;display:grid;place-items:center;min-width:28px;height:28px;padding:0 8px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);font:800 var(--fs-xs)/1 var(--f-cond,'MZ Texto'),sans-serif;color:#e6def7}
.pb-desc.pedido .pz-ico{background:#ff7ac8}
.pel-menu.llama .pm-btn{animation:pel-llama 1s ease-in-out infinite alternate}@keyframes pel-llama{to{box-shadow:0 0 18px rgba(255,43,214,.6)}}
@media (prefers-reduced-motion:reduce){.pel-menu.llama .pm-btn{animation:none;box-shadow:none}}
.pel-root.paneled .pel-menu,.pel-root.repe .pel-menu{visibility:hidden}
`,ne=J(),Y=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5.2 1.6 1 2.6 2 3 0-3 .5-5.5.5-8.5z" fill="currentColor"/></svg>`;function X(){if(!document.getElementById(`pel-style`)){let e=document.createElement(`style`);e.id=`pel-style`,e.textContent=te,document.head.appendChild(e)}}var re=n(`close`)?`<img class="pel-xi" src="${n(`close`)}" alt="" aria-hidden="true">`:`<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,ie=n(`pause`)?`<img src="${n(`pause`)}" alt="" aria-hidden="true">`:`<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>`,ae=class{constructor(e,n,r,o,u={you:`azul`,rival:`rojo`}){this.txt=n,this.touch=o;let d=n.pausa||{},f=e=>o?``:`<kbd class="pz-k">${e}</kbd>`;X();let p=this.root=document.createElement(`div`);p.className=`pel-root`,p.innerHTML=`
      <div class="pel-top"><div class="pel-score">
        <div class="pel-side ${u.you===`rojo`?`pel-red`:`pel-blue`}" data-side="you"><div class="ps-cab"><i class="pel-serve" data-pel-s="you"></i><span>${t(Z(r.you))}</span><i class="ps-racha" data-pel-r="you"></i><b data-pel-n="you">0</b></div><div class="ps-barras"></div></div>
        <div class="pel-mid" data-pel-mid></div>
        <div class="pel-side ${u.rival===`azul`?`pel-blue`:`pel-red`}" data-side="rival"><div class="ps-cab"><b data-pel-n="rival">0</b><i class="ps-racha" data-pel-r="rival"></i><span>${t(Z(r.rival))}</span><i class="pel-serve" data-pel-s="rival"></i></div><div class="ps-barras"></div></div>
      </div><div class="pel-menu"><button type="button" class="pm-btn" aria-haspopup="true" aria-expanded="false" aria-label="${n.menu||`Menú`}">${ie}<i class="pm-n"></i></button><div class="pm-hoja pz-fondo" role="dialog" aria-modal="true" aria-label="${t(d.titulo||`Pausa`)}"><div class="pz-panel">${c(t(d.titulo||`Pausa`),t(d.cerrar||`Cerrar`))}<div class="pz-lista">
        ${l({cls:`pm-seguir`,titulo:t(d.seguir?.[0]||`Continuar`),sub:t(d.seguir?.[1]||``),ico:s.seguir})}
        <div class="pm-bolas pz-grupo" hidden><span class="pz-tx"><b>${t(n.pelotaT||`Pelota`)}</b><small class="pb-pista"></small></span><div class="pb-lista pz-ops"></div></div>
        ${l({cls:`pb-desc`,titulo:t(n.desc?.btn||`Descanso`),ico:s.descanso,extra:`<em class="pz-n"></em>`,attrs:`hidden`})}
        ${l({cls:`pm-vista`,titulo:t(n.vistaFP||`Primera persona`),sub:t(d.vista||``),ico:s.ojo,extra:f(`V`),attrs:`hidden aria-pressed="false"`})}
        ${l({cls:`pm-plano`,titulo:``,sub:t(d.camara||``),ico:s.camara,extra:f(`C`)})}
        ${l({cls:`pm-fichas`,titulo:t(n.fichas||`Fichas`),sub:t(d.fichas||``),ico:s.fichas,attrs:`hidden`})}
        ${l({cls:`pm-salir`,titulo:t(n.salirPartido||n.exit),sub:t(d.salir||``),ico:s.salir})}
      </div></div></div></div></div>
      <div class="pel-call"><h3></h3><p></p><div class="pel-kantari"></div><div class="pel-racha" hidden></div></div>
      <div class="pel-golpe" aria-live="off"></div>
      <div class="pel-com" role="status" aria-live="polite"></div>
      <div class="pel-q"></div>
      <div class="pel-tip"></div>
      <div class="pel-stick"><div class="pel-knob"><i></i></div></div>
      ${o?`<div class="pel-stickhint"><svg viewBox="0 0 48 48" width="46" height="46"><path d="M24 6l6 7h-4v8h8v-4l7 7-7 7v-4h-8v8h4l-6 7-6-7h4v-8h-8v4l-7-7 7-7v4h8v-8h-4z" fill="#fff" opacity=".9"/></svg></div>`:``}
      <div class="pel-btns"><div class="pel-bcol"><button class="pel-btn pel-drop pel-cut" data-k="cut" aria-label="${n.cut}"><span>${n.cut}</span></button><button class="pel-btn pel-drop pel-dejada" data-k="drop" aria-label="${n.drop}"><span>${n.drop}</span></button></div><button class="pel-btn pel-hit" aria-label="${n.hit}"><span class="pel-hl">${n.hit}</span>${o?``:`<small class="pel-hk">${n.hitKey||``}</small>`}<i class="pel-tring" aria-hidden="true"></i></button></div>`,e.appendChild(p),this.$=e=>p.querySelector(e);let m=e=>{let t=e.cloneNode(!0);t.style.cssText=`position:absolute;visibility:hidden;flex:none;width:auto;overflow:visible;text-overflow:clip`,e.parentElement.appendChild(t);let n=t.getBoundingClientRect().width;return t.remove(),n};this.nombres=()=>{let e=[...p.querySelectorAll(`.ps-cab span`)];e.forEach(e=>{e.style.fontSize=``});let t=Math.min(1,...e.map(e=>{let t=e.getBoundingClientRect().width,n=m(e);return t>0&&n>t+.5?t/n:1}));if(t<1){let n=Math.max(11,parseFloat(getComputedStyle(e[0]).fontSize)*t);e.forEach(e=>{e.style.fontSize=`${Math.floor(n*10)/10}px`})}},requestAnimationFrame(this.nombres),document.fonts?.ready?.then(()=>this.nombres()),i(p.querySelector(`.pel-btns`)),this.onFit=()=>{i(p.querySelector(`.pel-btns`)),this.nombres()},addEventListener(`resize`,this.onFit),this.callT=0,this.qT=0;let h=this.menuEl=p.querySelector(`.pel-menu`),g=this.abreMenu=(e,t=!0)=>{h.classList.contains(`on`)!==e&&(h.classList.toggle(`on`,e),h.querySelector(`.pm-btn`).setAttribute(`aria-expanded`,String(e)),(t||!e)&&this.onMenu?.(e,t))},_=h.querySelector(`.pm-hoja`);a(h,e=>{if(e.classList.contains(`pm-btn`))return g(!h.classList.contains(`on`));if(e.classList.contains(`pm-seguir`)||e.classList.contains(`pz-x`)){let e=h._ahora;g(!1),e&&this.onDescanso?.();return}if(e.classList.contains(`pb-desc`)){g(!1),this.onDescanso?.();return}if(e.classList.contains(`pm-fichas`)){g(!1),this.onFichas?.();return}if(e.classList.contains(`pm-vista`)){g(!1),this.onVista?.();return}if(e.classList.contains(`pm-plano`)){this.onPlano?.();return}if(e.classList.contains(`pm-salir`)){g(!1),this.onSalir?.();return}e.dataset.bola!=null&&(this.onBola?.(+e.dataset.bola),g(!1))}),this.fueraMenu=e=>{h.classList.contains(`on`)&&!h._ahora&&(!h.contains(e.target)||e.target===_)&&g(!1)},addEventListener(`pointerdown`,this.fueraMenu,!0),this.cierraBolas=()=>g(!1)}vista(e,t){let n=this.menuEl.querySelector(`.pm-vista`);n&&(n.hidden=!e,n.setAttribute(`aria-pressed`,String(!!t)))}plano(e){let t=this.menuEl?.querySelector(`.pm-plano .pz-tx b`);t&&(t.textContent=e)}fichas(e){let t=this.menuEl.querySelector(`.pm-fichas`);t&&(t.hidden=!e)}energy(e){if(!e){for(let e of this.root.querySelectorAll(`.ps-barras`))e.hidden=!0;return}let n=e.map(e=>e.id+e.side).join();if(this.enKey!==n){this.enKey=n;for(let n of[`you`,`rival`]){let r=this.root.querySelector(`.pel-side[data-side="${n}"] .ps-barras`);if(!r)continue;let i=t(this.txt.energy||`Energía`);r.innerHTML=e.some(e=>e.side===n)?`<svg class="ps-ico" viewBox="0 0 24 24" role="img" aria-label="${i}"><title>${i}</title><path d="M13.5 2 4.5 13.6h6.6L10 22l9.5-12h-6.8z" fill="currentColor"/></svg><i class="ps-barra" title="${i}"><u></u></i>`:``}}for(let e of this.root.querySelectorAll(`.ps-barras`))e.hidden=!1;for(let t of[`you`,`rival`]){let n=e.filter(e=>e.side===t),r=this.root.querySelector(`.pel-side[data-side="${t}"] .ps-barra`);if(!n.length||!r)continue;let i=Math.round(n.reduce((e,t)=>e+t.en,0)/n.length*50)/50;r._v!==i&&(r._v=i,r.querySelector(`u`).style.transform=`scaleX(${i})`,r.classList.toggle(`mid`,i<.5&&i>=.25),r.classList.toggle(`low`,i<.25))}}descansos(e,t,n,r){let i=this.menuEl,a=i?.querySelector(`.pb-desc`);if(!a)return;let o=this.txt.desc||{},s=`${e}|${t}|${n}|${r}`;if(a._k===s)return;a._k=s;let c=this.txt.pausa||{},l=i.querySelector(`.pm-seguir small`),u=i.querySelector(`.pz-tit`);l&&(l.textContent=r?c.descAhora||``:c.seguir?.[1]||``),u&&(u.textContent=r?c.descanso||o.tuyo||``:c.titulo||``),a.hidden=!e||!!r,i.querySelector(`.pm-n`).textContent=e&&t?t:``,e&&(a.querySelector(`.pz-tx b`).textContent=n?o.pedido||`Pedido`:o.btn||`Descanso`,a.querySelector(`.pz-tx small`).textContent=n?c.descPedido||``:o.quedan?o.quedan(t):``,a.querySelector(`.pz-n`).textContent=r||n?``:t,a.disabled=!r&&!t&&!n,a.classList.toggle(`pedido`,!!n),a.classList.toggle(`ahora`,!!r),a.setAttribute(`aria-label`,`${o.btn||`Descanso`}: ${o.quedan?o.quedan(t):t}`),r!==i._ahora&&(i._ahora=r,this.abreMenu?.(!!r,!1)))}cansado(e){this.menuEl?.classList.toggle(`llama`,!!e)}setNames(e,t){let n=this.root.querySelector(`[data-side=you] span`),r=this.root.querySelector(`[data-side=rival] span`);n&&(n.textContent=Z(e)),r&&(r.textContent=Z(t))}setScore(e,t,n,r){for(let[n,r]of[[`you`,e],[`rival`,t]]){let e=this.$(`[data-pel-n=${n}]`),t=Number(e.textContent),i=e.closest(`.pel-side`);e.textContent=r,Number.isFinite(+r)&&r!==``&&+r>t&&(e.classList.remove(`sube`),i.classList.remove(`gana`),e.offsetWidth,e.classList.add(`sube`),i.classList.add(`gana`))}for(let e of this.root.querySelectorAll(`.pel-serve`))e.classList.toggle(`on`,e.dataset.pelS===n);r!=null&&(this.$(`[data-pel-mid]`).textContent=r)}call(e,n,r,i=2,a=null){let o=this.$(`.pel-call`);o.querySelector(`h3`).textContent=e,o.querySelector(`p`).textContent=n||``,o.classList.remove(`c-azul`,`c-rojo`),a?.col&&o.classList.add(`c-`+a.col);let s=o.querySelector(`.pel-racha`);s.hidden=!a?.racha,s.innerHTML=a?.racha?`${Y}<span>${t(a.racha)}</span>`:``,o.querySelector(`p`).style.display=n?``:`none`;let c=o.querySelector(`.pel-kantari`);c.textContent=r?`«${r}»`:``,c.style.display=r?``:`none`,o.classList.add(`on`),this.callT=i,this.root.classList.add(`calling`),o.style.top=``;let l=this.$(`.pel-top`)?.getBoundingClientRect(),u=o.getBoundingClientRect(),d=this.root.getBoundingClientRect();l&&l.width>0&&u.right>l.left-12&&u.left<l.right+12&&u.top<l.bottom+12&&(o.style.top=`${Math.round(l.bottom-d.top+12)}px`)}comenta(e){let n=this._com||(this._com=this.$(`.pel-com`));if(n){if(!e){n.classList.remove(`on`),this.comT=0,this.comSig=null;return}if(this.comT>0&&this.comVisto<2.4){this.comSig=e;return}this.comVisto=0,n.className=`pel-com `+(e.r===`e`?`e`:`n`),n.innerHTML=`<i class="pc-q" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zm-6 9a6 6 0 0 0 5 5.9V21h2v-3.1A6 6 0 0 0 18 12h-2a4 4 0 0 1-8 0z" fill="currentColor"/></svg></i><b>${t(e.rol)}</b><p>${t(e.texto)}</p>`,n.offsetWidth,n.classList.add(`on`),this.comT=Math.min(6,2.6+e.texto.length/30)}}setRacha(e,t,n=``){for(let r of this.root.querySelectorAll(`.ps-racha`)){let i=r.dataset.pelR===e&&!!t,a=i?String(t):``;r._t!==a&&(r._t=a,r.innerHTML=i?Y:``,r.classList.toggle(`on`,i),i?(r.setAttribute(`role`,`img`),r.setAttribute(`aria-label`,n),r.title=n):(r.removeAttribute(`aria-label`),r.removeAttribute(`title`)))}this.nombres?.()}quality(e,n=``,r=``){let i=this.$(`.pel-q`);i.className=`pel-q`+(r?` k-`+r:``),i.innerHTML=e?`<b>${t(e)}</b><small>${t(n)}</small>`:``,i.offsetWidth,i.classList.toggle(`on`,!!e),this.qT=r?1:.8}tip(e){let t=this.$(`.pel-tip`),n=e||``;t._t!==n&&(t._t=n,t.textContent=n),t.classList.toggle(`on`,!!e)}ready(e){this.$(`.pel-hit`).classList.toggle(`ready`,!!e)}bolas(e,n,r,i,a){let o=this.menuEl?.querySelector(`.pm-bolas`);if(!o)return;o.hidden=!1;let s=e.map(e=>e.n).join()+`|`+(n?.n??``)+`|`+r+`|`+a;o._k!==s&&(o._k=s,o.querySelector(`.pb-pista`).textContent=a,o.querySelector(`.pb-lista`).innerHTML=e.map(e=>{let[a,o]=i(e);return`<button type="button" class="pz-op" data-bola="${e.n}" aria-pressed="${e===n}"${r?``:` disabled`}>${ne}<b>${t(a)}</b><small>${t(o)}</small></button>`}).join(``))}timing(e){let t=this._tr||(this._tr=this.$(`.pel-tring`));if(!t)return;let n=e!=null&&e>-.12&&e<.9,r=n?Math.max(0,Math.min(1,(e-.03)/.75)):1,i=n?Math.round((1+r*.95)*100)/100:0;t._v!==i&&(t._v=i,t.classList.toggle(`on`,n),t.classList.toggle(`now`,n&&Math.abs(e-.03)<.07),n&&(t.style.transform=`scale(${i})`))}hitLabel(e){let t=this._hl||(this._hl=this.$(`.pel-hl`));t&&t._t!==e&&(t._t=e,t.textContent=e,r(t.parentElement))}charge(e,t,n=1){for(let[r,i]of[[`hit`,`.pel-hit`],[`cut`,`.pel-cut`],[`drop`,`.pel-dejada`]]){let a=this.$(i);if(!a)continue;let o=t===r?e:0,s=o+`:`+n.toFixed(2);a._cp!==s&&(a._cp=s,a.style.setProperty(`--cp`,(o*100).toFixed(0)+`%`),a.style.setProperty(`--tope`,(n*100).toFixed(0)+`%`),a.classList.toggle(`charging`,o>0),a.classList.toggle(`full`,o>=1),a.classList.toggle(`tope`,o>0&&n<.99&&o>=n-.01))}}golpe(e,t){let n=this._g||(this._g=this.$(`.pel-golpe`));n&&e&&(n.className=`pel-golpe `+(t===`azul`?`azul`:`rojo`),n.textContent=e,n.offsetWidth,n.classList.add(`on`),this.gT=1.5)}tick(e){if(this.gT>0&&(this.gT-=e)<=0&&this._g?.classList.remove(`on`),this.comT>0&&(this.comVisto+=e,(this.comT-=e)<=0&&this._com?.classList.remove(`on`)),this.comSig&&(this.comT<=0||this.comVisto>=2.4)){let e=this.comSig;this.comSig=null,this.comT=0,this.comenta(e)}this.callT>0&&(this.callT-=e)<=0&&(this.$(`.pel-call`).classList.remove(`on`),this.root.classList.remove(`calling`)),this.qT>0&&(this.qT-=e)<=0&&this.$(`.pel-q`).classList.remove(`on`)}panel(e){this.onPanel?.(),this.closePanel();let t=document.createElement(`div`);return t.className=`pel-panel`,t.innerHTML=`<div class="pel-card">${e}</div>`,this.root.appendChild(t),this.panelEl=t,this.root.classList.add(`paneled`),t}closePanel(){let e=this.panelEl;e&&(this.panelEl=null,e.classList.add(`pel-fuera`),setTimeout(()=>e.remove(),220)),this.root.classList.remove(`paneled`)}controls(e){for(let t of[`.pel-stick`,`.pel-btns`,`.pel-stickhint`]){let n=this.$(t);n&&(n.style.visibility=e?``:`hidden`)}}destroy(){removeEventListener(`resize`,this.onFit),this.fueraMenu&&removeEventListener(`pointerdown`,this.fueraMenu,!0);let e=this.root;e.classList.add(`pel-fuera`),setTimeout(()=>e.remove(),320)}},Z=e=>String(e).replace(/\s*\([^)]*\)/g,``),oe=`
/* (la gama y las letras van aquí también: el fútbol se puede abrir solo, sin el resto del juego) */
.pvs{--v0:#07020f;--v2:#1e0a44;--azul:#5b4bff;--azul2:#24127a;--rojo:#ff2e88;--rojo2:#6e0b4c;--lila:#c9b2ff;--rosa:#ff7ac8;--fx:#ff2bd6;--fx2:#c21cff;--cta:linear-gradient(100deg,#ff2bd6 0%,#c21cff 55%,#7b2ff7 100%);--f-display:'MZ Display','MZ Texto',system-ui,sans-serif;--f-cond:'MZ Cond','MZ Texto',system-ui,sans-serif;
  position:fixed;inset:0;z-index:2000;overflow:hidden;pointer-events:auto;cursor:pointer;color:#fff;font-family:var(--f-cond);background:var(--v0);animation:pvs-in .2s ease-out both}
.pvs.shake{animation:pvs-shake .42s cubic-bezier(.36,.07,.19,.97) both}
.pvs-side{position:absolute;top:0;bottom:0;width:60%;overflow:hidden}
.pvs-side.azul{left:0;background:radial-gradient(90% 80% at 25% 70%,#7b6bff 0%,var(--azul) 30%,var(--azul2) 72%,#0b0530 100%);clip-path:polygon(0 0,100% 0,72% 100%,0 100%);animation:pvs-l .45s cubic-bezier(.2,.9,.3,1) both}
.pvs-side.rojo{right:0;background:radial-gradient(90% 80% at 75% 70%,#ff6fb5 0%,var(--rojo) 30%,var(--rojo2) 72%,#2a0420 100%);clip-path:polygon(28% 0,100% 0,100% 100%,0 100%);animation:pvs-r .45s cubic-bezier(.2,.9,.3,1) both}
/* rayas de velocidad que corren hacia el centro, tumbadas y en trazos (casi verticales parecían lluvia cayendo sobre el frontón) */
.pvs-side::before{content:'';position:absolute;top:0;bottom:0;left:-240px;right:-240px;background:repeating-linear-gradient(180deg,transparent 0 30px,rgba(255,255,255,.08) 30px 32px);-webkit-mask-image:repeating-linear-gradient(90deg,transparent 0,#000 120px,transparent 240px);mask-image:repeating-linear-gradient(90deg,transparent 0,#000 120px,transparent 240px);animation:pvs-run 1.6s linear infinite}
.pvs-side.rojo::before{animation-direction:reverse}
/* foco que barre cada lado */
.pvs-side::after{content:'';position:absolute;top:-30%;left:30%;width:40%;height:160%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);transform-origin:50% 0;animation:pvs-beam 3.2s ease-in-out infinite alternate}
.pvs-side.rojo::after{animation-delay:-1.6s}
/* (sin líneas separadoras: los dos lados se separan solos por su color; la raya blanca del centro cruzaba los rótulos) */
/* el golpe del VS: un destello que sale del centro, rosa; a toda pantalla y blanco parecía un relámpago */
.pvs-flash{position:absolute;inset:0;z-index:6;background:radial-gradient(60% 70% at 50% 45%,rgba(255,255,255,.9) 0%,rgba(255,122,200,.55) 35%,rgba(255,43,214,0) 70%);opacity:0;pointer-events:none;animation:pvs-flash .5s .62s ease-out both}
.pvs-sparks{position:absolute;inset:0;z-index:2;pointer-events:none}
.pvs-sparks i{position:absolute;bottom:-10px;width:4px;height:4px;border-radius:50%;background:#fff;box-shadow:0 0 8px 2px var(--rosa);opacity:0;animation:pvs-spark var(--t,3s) linear var(--d,0s) infinite}
.pvs-top{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:5;display:flex;justify-content:center;animation:pvs-drop .4s .9s cubic-bezier(.2,1.3,.4,1) both}
.pvs-bar{display:flex;align-items:stretch;max-width:calc(100% - 32px);filter:drop-shadow(0 6px 14px rgba(0,0,0,.5))}
.pvs-bar>*{display:flex;align-items:center;gap:8px;padding:4px 16px;min-height:34px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvs-comp{background:var(--cta);font:400 var(--fs-lg)/1 var(--f-display);text-transform:uppercase;border-radius:6px;padding-left:20px!important;padding-right:20px!important}
.pvs-venue{background:rgba(7,2,15,.86);font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila);margin-left:-10px;border-radius:6px;padding-left:22px!important;padding-right:22px!important}
.pvs-venue svg{width:34px;height:26px;flex:none}
.pvs-lineb{background:rgba(7,2,15,.86);font:800 var(--fs-sm)/1.15 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:#fff;margin-left:-10px;border-radius:6px;padding-left:22px!important;padding-right:22px!important;border-left:2px solid var(--fx)}
.pvs-fig{position:absolute;left:0;top:0;width:50%;height:100%;z-index:3;pointer-events:none}
/* (cada imagen, de pie sobre el borde de abajo de su caja; el sitio y la altura los pone layoutVs) */
.pvs-fig>img,.pvs-fig>.pf{position:absolute;left:0;bottom:0;height:100%;width:auto;max-width:none;z-index:2}.pvs-fig>.mate{z-index:1}
.pvs-fig.azul{animation:pvs-figl .55s .25s cubic-bezier(.2,1.15,.4,1) both}.pvs-fig.rojo{animation:pvs-figr .55s .25s cubic-bezier(.2,1.15,.4,1) both}
.pvs-fig.azul>img,.pvs-fig.azul>.pf{filter:drop-shadow(0 0 2px #fff) drop-shadow(-8px 0 18px rgba(123,107,255,.85)) drop-shadow(0 14px 18px rgba(0,0,0,.5))}
.pvs-fig.rojo>img,.pvs-fig.rojo>.pf{transform:scaleX(-1);filter:drop-shadow(0 0 2px #fff) drop-shadow(-8px 0 18px rgba(255,111,181,.85)) drop-shadow(0 14px 18px rgba(0,0,0,.5))}
/* (las animadas, sin sombras de filtro: con tres drop-shadow, el navegador la volvía a pintar en cada fotograma y en el móvil
   se entrecortaba, y el contorno blanco marcaba los bordes del recorte. Detrás, su halo y su sombra en el suelo, fijos, en el
   fondo de la propia imagen) */
.pvs-fig>img.pf-an{filter:none;will-change:transform;background:radial-gradient(40% 36% at 50% 50%,var(--halo) 0%,transparent 72%),radial-gradient(30% 3.2% at 50% 97.5%,rgba(0,0,0,.5) 0%,transparent 100%)}
.pvs-fig.azul>img.pf-an{--halo:rgba(123,107,255,.6)}.pvs-fig.rojo>img.pf-an{--halo:rgba(255,111,181,.55)}
/* (el compañero, detrás: algo más pequeño y apagado) */
.pvs-fig .mate{opacity:.9}
.pvs-fig>.kit{position:absolute;inset:0;display:grid;place-items:end center;padding-bottom:4%}.pvs-fig .kit svg{width:auto;height:84%;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 14px 18px rgba(0,0,0,.5))}
/* (las zonas seguras del iPhone, para medirlas) */
.pvs-safe{position:absolute;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}
.pvs-x{position:absolute;left:50%;top:44%;z-index:5;transform:translate(-50%,-50%);font:400 clamp(72px,calc(16vh / var(--z, 1)),140px)/1 var(--f-display);letter-spacing:-.02em;padding:0 .08em;
  background:linear-gradient(180deg,#fff 0%,#fff 42%,var(--rosa) 58%,var(--fx2) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px rgba(255,43,214,.85)) drop-shadow(0 6px 0 rgba(7,2,15,.7));
  animation:pvs-x .45s .5s cubic-bezier(.2,1.6,.4,1) both}
.pvs-mid{position:absolute;left:50%;top:calc(44% + clamp(50px,calc(12vh / var(--z, 1)),84px));z-index:5;transform:translateX(-50%);width:min(300px,34%);display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;animation:pvs-upc .35s 1.05s ease-out both}
.pvs-line{font:800 var(--fs-sm)/1.2 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.pvs-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}
.pvs-tags span{padding:2px 8px;background:rgba(7,2,15,.75);border:1px solid rgba(255,255,255,.08);font:700 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--lila);border-radius:6px;}
.pvs-tags b{color:#fff;font-weight:800}
.pvs [hidden]{display:none!important}.pvs-tags span{white-space:nowrap}.pvs-mid.stack .pvs-tags{flex-direction:column;align-items:center}
.pvs-plate{position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 46px);z-index:5;width:max-content;max-width:min(330px,38%);display:grid;grid-template-columns:auto minmax(0,1fr);align-items:stretch;filter:drop-shadow(0 8px 16px rgba(0,0,0,.55))}
.pvs-plate.azul{left:calc(env(safe-area-inset-left,0px) + 16px);animation:pvs-pl .4s .85s cubic-bezier(.2,1.2,.4,1) both}
.pvs-plate.rojo{right:calc(env(safe-area-inset-right,0px) + 16px);grid-template-columns:minmax(0,1fr) auto;text-align:right;animation:pvs-pr .4s .95s cubic-bezier(.2,1.2,.4,1) both}
.pvs-ovr{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 12px;background:#fff;color:var(--v2);border-radius:6px;}
.pvs-plate.azul .pvs-ovr{color:var(--azul2)}.pvs-plate.rojo .pvs-ovr{order:2;color:var(--rojo2)}
.pvs-ovr b{font:400 var(--fs-3xl)/1 var(--f-display)}.pvs-ovr small{font:800 var(--fs-xs)/1.2 var(--f-cond);letter-spacing:.1em;text-transform:uppercase}
.pvs-who{min-width:0;padding:8px 18px 10px;background:rgba(7,2,15,.86);border-radius:6px;margin-left:-6px}
.pvs-plate.rojo .pvs-who{margin:0 -6px 0 0}
.pvs-who b{display:block;padding-right:.1em;font:400 var(--fs-2xl)/1.15 var(--f-display);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvs-who small{display:block;font:700 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.1em;text-transform:uppercase;color:var(--lila);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pvs-st{display:flex;gap:14px;margin-top:4px;font:700 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.06em;text-transform:uppercase;color:var(--lila)}.pvs-plate.rojo .pvs-st{justify-content:flex-end}
.pvs-st b{display:inline;font:800 var(--fs-sm)/1 var(--f-cond);color:#fff;margin-left:3px}
/* accesibilidad (util/accesible.js) */
body.textos-grandes .pvs{--fs-xs:15px;--fs-sm:17px;--fs-md:19px;--fs-lg:24px;--fs-xl:28px;--fs-2xl:36px;--fs-3xl:44px}
body.alto-contraste .pvs :is(.pvs-who,.pvs-tick,.pvs-venue,.pvs-lineb,.pvs-tags span){background:#000;border:2px solid #fff}
body.alto-contraste .pvs :is(.pvs-who small,.pvs-st,.pvs-arq span,.pvs-venue,.pvs-tick .q){color:#fff}body.alto-contraste .pvs .pvs-arq span{background:#000;border:1px solid #fff}
/* (su arquetipo, su mano y su golpe estrella: rules.js, arqChips) */
.pvs-arq{display:flex;flex-wrap:wrap;align-items:center;gap:2px 14px;margin-top:6px}.pvs-plate.rojo .pvs-arq{justify-content:flex-end}
/* el arquetipo y el golpe estrella, en una línea de texto, sin cajas: antes eran tres etiquetas en dos filas y la placa
   quedaba apretada (la mano está en la ficha; el zurdo ya es un arquetipo) */
.pvs-arq span{display:inline-flex;align-items:center;gap:5px;font:800 var(--fs-xs)/1.3 var(--f-cond);letter-spacing:.08em;text-transform:uppercase;color:#fff;white-space:nowrap}
.pvs-arq svg{width:15px;height:15px;flex:none;color:#ff7ad9}.pvs-arq span.estrella{color:#ffd166}
.pvs-tick{position:absolute;left:0;right:0;bottom:0;z-index:5;height:calc(env(safe-area-inset-bottom,0px) + 36px);padding-bottom:env(safe-area-inset-bottom,0px);display:flex;align-items:center;background:rgba(7,2,15,.9);animation:pvs-up .35s 1.2s ease-out both}
.pvs-tick .q{flex:1;min-width:0;overflow:hidden;white-space:nowrap;padding-left:calc(env(safe-area-inset-left,0px) + 16px);font:600 var(--fs-sm)/1.3 var(--f-cond);font-style:italic;letter-spacing:.02em}
.pvs-tick .q span{display:inline-block;padding-right:40px}.pvs-tick .q.run span{animation:pvs-marq var(--mt,12s) linear 1.6s infinite}
.pvs-tick .q em{font-style:normal;color:var(--rosa);font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-right:8px}
.pvs-tap{flex:none;align-self:stretch;display:flex;align-items:center;padding:0 calc(env(safe-area-inset-right,0px) + 16px) 0 20px;background:var(--cta);font:400 var(--fs-md)/1 var(--f-display);text-transform:uppercase;letter-spacing:.04em;border-radius:6px;animation:pvs-tap 1s ease-in-out 1.6s infinite alternate}
.pvs.out{animation:pvs-out .22s ease-in both}
@keyframes pvs-in{from{opacity:0}to{opacity:1}}@keyframes pvs-out{to{opacity:0;transform:scale(1.04)}}
@keyframes pvs-l{from{transform:translateX(-100%)}to{transform:none}}@keyframes pvs-r{from{transform:translateX(100%)}to{transform:none}}
@keyframes pvs-figl{from{transform:translateX(-70%) scale(.9);opacity:0}to{transform:none;opacity:1}}@keyframes pvs-figr{from{transform:translateX(70%) scale(.9);opacity:0}to{transform:none;opacity:1}}
@keyframes pvs-run{from{transform:translateX(-240px)}to{transform:none}}
@keyframes pvs-beam{from{transform:rotate(-22deg)}to{transform:rotate(22deg)}}
@keyframes pvs-flash{0%{opacity:0}12%{opacity:.75}100%{opacity:0}}
@keyframes pvs-x{from{transform:translate(-50%,-50%) scale(3.2) rotate(-8deg);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
@keyframes pvs-shake{0%,100%{transform:none}20%{transform:translate(-6px,3px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-4px,2px)}80%{transform:translate(3px,-1px)}}
@keyframes pvs-drop{from{transform:translateY(-80px)}to{transform:none}}
@keyframes pvs-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
@keyframes pvs-upc{from{transform:translate(-50%,24px);opacity:0}to{transform:translateX(-50%);opacity:1}}
@keyframes pvs-pl{from{transform:translateX(-120%) skewX(-10deg)}to{transform:none}}@keyframes pvs-pr{from{transform:translateX(120%) skewX(10deg)}to{transform:none}}
@keyframes pvs-spark{0%{transform:translate(0,0);opacity:0}10%{opacity:1}100%{transform:translate(var(--x,20px),calc(-110vh / var(--z, 1)));opacity:0}}
@keyframes pvs-marq{0%,12%{transform:translateX(0)}100%{transform:translateX(-100%)}}
@keyframes pvs-tap{from{filter:brightness(.85)}to{filter:brightness(1.2)}}
@media (orientation:landscape) and (max-height:500px){.pvs-who b{font-size:var(--fs-xl)}.pvs-ovr b{font-size:var(--fs-2xl)}.pvs-plate{max-width:min(300px,36%)}}
@media (orientation:portrait){.pvs-bar{flex-wrap:wrap;justify-content:center;row-gap:4px}.pvs-venue{margin-left:0}.pvs-who b{font-size:var(--fs-xl)}.pvs-comp{font-size:var(--fs-md)}}
/* (placas compactas en pantallas muy bajas: Safari con sus barras en el móvil tumbado) */
@media (orientation:landscape) and (max-height:340px){.pvs-who{padding:2px 12px}.pvs-who b{font-size:var(--fs-lg)}.pvs-ovr{padding:2px 10px}.pvs-ovr b{font-size:var(--fs-xl)}.pvs-st b{font-size:var(--fs-xs)}}
@media (prefers-reduced-motion:reduce){.pvs,.pvs *{animation:none!important}.pvs-flash{display:none}}
`;function se(e={}){let t=e.covered||e.labrit,n=e.labrit?`#b05a8a`:e.stone?`#a99ac8`:`#6a5aa8`;return`<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M6 44h52l-8-10H14z" fill="#3a2a5e" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 34V14h22v20z" fill="${n}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 34L6 44V22l8-8z" fill="${n}" opacity=".8" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 31h22" stroke="#ff2bd6" stroke-width="2"/>`+(e.stone&&!e.labrit?`<path d="M14 20h22M14 26h22M25 14v6M20 20v6M30 20v6M25 26v5" stroke="rgba(0,0,0,.28)" stroke-width="1"/>`:``)+(t?`<path d="M2 16L32 4l30 12" fill="none" stroke="#ff7ac8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`:`<circle cx="52" cy="9" r="4" fill="#ff7ac8"/>`)+(e.wet&&!t?e.snow?`<g fill="#fff"><circle cx="44" cy="19" r="1.6"/><circle cx="50" cy="23" r="1.6"/><circle cx="56" cy="19" r="1.6"/></g>`:`<path d="M44 18l-2 5M50 20l-2 5M56 18l-2 5" stroke="#c9b2ff" stroke-width="2" stroke-linecap="round"/>`:``)+`<circle cx="40" cy="38" r="2.2" fill="#fff"/></svg>`}var ce=!1,Q=.86,le=.92,ue=.45,de=.33,fe=.3,pe=(e,t)=>e?.naturalWidth&&e.naturalHeight?e.naturalWidth/e.naturalHeight:t;function $(e,t=Q){let n=e.querySelector(`:scope > :not(.mate)`),r=e.querySelector(`:scope > .mate`),i=!!n?.classList.contains(`kit`),a=!!n?.classList.contains(`duo`);return{main:n,mate:r,kit:i,duo:a,ms:t,a:i?.8:pe(n,a?1:2/3),am:r?pe(r,2/3)*t:0,face:i?.6:r?1-t+t*de:a?fe:de}}function me(e,t,n,r,i){if(t.kit){Object.assign(t.main.style,{left:`${r}px`,right:`auto`,width:`${t.a*n}px`});return}let a=t.a*n,o=t.am*n;Object.assign(t.main.style,{left:`${r}px`,height:`${n}px`}),t.mate&&Object.assign(t.mate.style,{left:`${i<0?r-o*.55:r+a-o*ue}px`,height:`${n*t.ms}px`})}function he(t){let n=t.clientWidth,r=t.clientHeight;if(!n||!r)return;let i=e=>t.querySelector(e),a=r>n,o=e=>`${Math.round(e)}px`,s=getComputedStyle(i(`.pvs-safe`)),c=parseFloat(s.paddingLeft)||0,l=parseFloat(s.paddingRight)||0,u=i(`.pvs-top`),d=i(`.pvs-bar`),f=i(`.pvs-tick`),p=i(`.pvs-x`),m=i(`.pvs-mid`),h=i(`.pvs-mid .pvs-line`),g=i(`.pvs-lineb`),_={azul:i(`.pvs-fig.azul`),rojo:i(`.pvs-fig.rojo`)},v={azul:i(`.pvs-plate.azul`),rojo:i(`.pvs-plate.rojo`)},y={azul:i(`.pvs-side.azul`),rojo:i(`.pvs-side.rojo`)},b=[`azul`,`rojo`];if(g){g.hidden=!1;let e=[...d.children].reduce((e,t)=>e+t.scrollWidth,0)-10*(d.children.length-1);g.hidden=!a&&e>n-c-l-32,h&&(h.hidden=!g.hidden)}m.hidden=![...m.children].some(e=>!e.hidden);for(let e of b){for(let t of[`left`,`right`,`top`,`bottom`,`maxWidth`])v[e].style[t]=``;Object.assign(y[e].style,{width:``,left:``,right:``,clipPath:``}),_[e].style.clipPath=``}let x=(t,n)=>{m.classList.toggle(`stack`,t),Object.assign(m.style,{width:`max-content`,alignItems:``,textAlign:``});let r=m.hidden?0:Math.min(Math.ceil(e(m.getBoundingClientRect().width))+1,n);return m.style.width=`${r}px`,[r,m.hidden?0:m.offsetHeight]},S=f.offsetTop,C={azul:$(_.azul,a?le:Q),rojo:$(_.rojo,a?le:Q)};if(!a){let e=u.offsetTop+u.offsetHeight+8,t=Math.min(v.azul.offsetTop,v.rojo.offsetTop)-10,i=i=>Math.max(44,Math.min(150,Math.max(72,r*.28),n*.13/1.03,t-e-(i?i+12:0))),[a,s]=x(!0,n*.34);s&&i(s)<72&&([a,s]=x(!1,n*.34));let d=i(s);p.style.fontSize=o(d);let f=e+(t-e-d-(s?s+12:0))/2;p.style.top=o(f+d/2),Object.assign(m.style,{left:``,top:o(f+d+12)});let h=Math.max(p.offsetWidth,a)+32,g=n/2-h/2,y=(e,t)=>e.kit?(g-t)/e.a:e.mate?(g-Math.max(t,34))/(e.a*.97+e.am*.27):e.main?.classList.contains(`duo`)?(g-n*.02)*1.02/e.a:g*1.06/e.a,w=Math.min(y(C.azul,c),y(C.rojo,l),(S-e)/.66,(t-4-e)/Math.max(C.azul.face,C.rojo.face,.01));(C.azul.kit||C.rojo.kit)&&(w=Math.min(w,S-e));let T=w*.985<S-e?S-w*.985:e;for(let e of b){let t=C[e],r=_[e],i=e===`azul`?0:n/2+h/2,a=t.a*w,s=t.main?.classList.contains(`duo`);Object.assign(r.style,{left:o(i),top:o(T),width:o(g),height:o(w)});let c=t.mate?e===`azul`?g-a*.97:-a*.03:s?e===`azul`?n*.02+(g-n*.02-a)/2:(g-n*.02-a)/2:(g-a)/2;me(r,t,w,c,e===`azul`?-1:1)}return}let[,w]=x(!1,n-32),T=u.offsetTop+u.offsetHeight+8;Object.assign(m.style,{left:``,top:o(T)});let E=T+(w?w+8:0),D=Math.max(56,Math.min(120,n*.26)),O=D/2+4,k=Math.round((E+S-O)/2),A=n*.07;Object.assign(y.azul.style,{width:`100%`,left:`0`,right:`0`,clipPath:`polygon(0 0,100% 0,100% ${o(k-A)},0 ${o(k+A)})`}),Object.assign(y.rojo.style,{width:`100%`,left:`0`,right:`0`,clipPath:`polygon(0 ${o(k+A)},100% ${o(k-A)},100% 100%,0 100%)`}),Object.assign(p.style,{fontSize:o(D),top:o(k)});let j=Math.min(n*.72,320);for(let e of b)v[e].style.maxWidth=o(j);let M=Math.max(v.azul.offsetHeight,v.rojo.offsetHeight);Object.assign(v.azul.style,{left:`auto`,right:o(16+l),bottom:`auto`,top:o(k-O-6-M)}),Object.assign(v.rojo.style,{right:`auto`,left:o(16+c),bottom:`auto`,top:o(S-10-M)});let N=k+O,P=e=>e.kit?1/e.a:1/(e.a+e.am*.55),F=n-32-c-l,I=Math.min((k-E)*1.55,(S-N)*1.55,F*P(C.azul),F*P(C.rojo),(k-O-6-M-4-E)/Math.max(C.azul.face,.01),(S-10-M-4-N)/Math.max(C.rojo.face,.01));for(let e of b){let t=C[e],r=_[e],i=e===`azul`?E:N,a=t.a*I;Object.assign(r.style,{left:`0`,top:o(i),width:o(n),height:o(I)}),e===`azul`&&(r.style.clipPath=`polygon(0 ${o(-E)},100% ${o(-E)},100% ${o(k-A-E)},0 ${o(k+A-E)})`),me(r,t,I,e===`azul`?16+c:n-16-l-a,e===`azul`?1:-1)}}var ge=(e,n)=>`<div class="pvs-plate ${n}">${e.ovr==null?`<span></span>`:`<div class="pvs-ovr"><b>${t(e.ovr)}</b><small>${t(e.ovrLabel||`Media`)}</small></div>`}
  <div class="pvs-who"><b>${t(e.name)}</b><small>${t(e.sub||``)}</small>${e.stats?.length?`<div class="pvs-st">${e.stats.map(e=>`<span>${t(e.k)}<b>${t(e.v)}</b></span>`).join(``)}</div>`:``}${e.arq?.length?`<div class="pvs-arq">${e.arq.filter(e=>e.k!==`mano`).map(e=>`<span class="${e.k}" title="${t(e.what||``)}">${e.icon||``}${t(e.t)}</span>`).join(``)}</div>`:``}</div></div>`,_e=(e,t)=>{if(e.figHtml)return`<div class="pvs-fig ${t}"><div class="kit">${e.figHtml}</div></div>`;let n=e.matePf?e.matePf.replace(`class="pf`,`class="pf mate`):e.mateImg?`<img class="mate" src="${e.mateImg}" alt="">`:``;return`<div class="pvs-fig ${t}">${t===`rojo`?n:``}${e.pf||`<img src="${e.img}" alt="">`}${t===`azul`?n:``}</div>`};function ve(e,n){if(!ce){let e=document.createElement(`style`);e.id=`pvs-style`,e.textContent=oe,document.head.appendChild(e),ce=!0}return new Promise(r=>{let i=document.createElement(`div`);i.className=`pvs`,i.setAttribute(`role`,`dialog`),i.setAttribute(`aria-label`,`${n.you.name} VS ${n.rival.name}`),i.innerHTML=`<div class="pvs-side azul"></div><div class="pvs-side rojo"></div><div class="pvs-sparks" aria-hidden="true">${Array.from({length:22},(e,t)=>`<i style="left:${(t*37+11)%100}%;--d:${(t*.29%3).toFixed(2)}s;--t:${2.4+t%5*.5}s;--x:${(t%2?1:-1)*(10+t*7%40)}px"></i>`).join(``)}</div>
      ${_e(n.you,`azul`)}${_e(n.rival,`rojo`)}
      <div class="pvs-top"><div class="pvs-bar">${n.comp?`<span class="pvs-comp">${t(n.comp)}</span>`:``}${n.venue?`<span class="pvs-venue">${n.venueIcon||(n.cond?se(n.cond):``)}${t(n.venue)}</span>`:``}${n.line?`<span class="pvs-lineb" hidden>${t(n.line)}</span>`:``}</div></div>
      <div class="pvs-x" aria-hidden="true">VS</div>
      <div class="pvs-mid">${n.line?`<div class="pvs-line">${t(n.line)}</div>`:``}${n.tags?.length?`<div class="pvs-tags">${n.tags.slice(0,3).map(e=>`<span title="${t(e.what||``)}"><b>${t(e.name)}</b></span>`).join(``)}</div>`:``}</div>
      ${ge(n.you,`azul`)}${ge(n.rival,`rojo`)}
      <div class="pvs-tick"><div class="q">${n.quote?`<span><em>${t(n.quoteBy||n.rival.name)}</em>«${t(n.quote)}»</span>`:``}</div><div class="pvs-tap">${t(n.tap||``)}</div></div>
      <div class="pvs-flash"></div><div class="pvs-safe" aria-hidden="true"></div>`,e.appendChild(i);let a=()=>{try{he(i)}catch{}};a(),document.fonts?.ready.then(a);for(let e of i.querySelectorAll(`.pvs-fig img`))e.complete||e.addEventListener(`load`,a,{once:!0});addEventListener(`resize`,a),requestAnimationFrame(()=>{let e=i.querySelector(`.pvs-tick .q`),t=e?.firstElementChild;t&&t.offsetWidth>e.clientWidth&&(e.classList.add(`run`),e.style.setProperty(`--mt`,`${Math.max(8,t.offsetWidth/60).toFixed(1)}s`))});let o=setTimeout(()=>{i.classList.add(`shake`);try{n.onSlam?.()}catch{}},600),s=!1,c=()=>{s||(s=!0,clearTimeout(u),clearTimeout(o),removeEventListener(`keydown`,l,!0),removeEventListener(`resize`,a),i.classList.add(`out`),setTimeout(()=>i.remove(),230),r())},l=e=>{e.stopImmediatePropagation(),e.preventDefault(),c()},u=setTimeout(c,n.ms||window.__vsMs||5500);setTimeout(()=>{s||(i.addEventListener(`pointerdown`,c),addEventListener(`keydown`,l,!0))},600)})}export{X as a,J as c,s as d,c as f,a as h,re as i,F as l,u as m,ve as n,B as o,l as p,ae as r,K as s,se as t,P as u};