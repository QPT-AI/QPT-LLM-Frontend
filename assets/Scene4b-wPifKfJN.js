import{r as e}from"./rolldown-runtime-hePW80VL.js";import{m as t,n,t as r}from"./jsx-runtime-DJ73XKeI.js";import{$ as i,Ot as a,U as o,_ as s,a as c,b as l,m as u,t as d}from"./react-three-fiber.esm-CTFwH2-c.js";/* empty css               */var f=e(t(),1),p=r(),m=`#e8690a`,h=`#1c3d49`,g=`#fff2c8`,_=`#5fd8ff`,v=`#ffb454`,y=2.2,b=60,x=3,S=28;function C(e,t){let n=.05*(e*e+t*t),r=e-.6*Math.sin(t*.85);return n+-.6*Math.exp(-(r*r)/(1.1*.55))-.1}function w(e,t){return .035*Math.sin(e*5.5+t*1.5)*Math.cos(t*4.7-e*1.1)+.018*Math.sin(e*11-t*8)}var T=[{x:-.25,z:.05,s:.55,d:1.25,id:`well-global`},{x:1.2,z:.95,s:.32,d:.5,id:`well-a`},{x:-1.15,z:.7,s:.3,d:.42,id:`well-b`},{x:.35,z:-1.25,s:.34,d:.46,id:`well-c`}],E=[{x:1.65,z:-.35,s:.5,h:1.5,id:`peak-global`},{x:-1.7,z:-.25,s:.42,h:.8,id:`peak-a`},{x:.55,z:1.55,s:.4,h:.9,id:`peak-b`},{x:-.5,z:1.7,s:.35,h:.65,id:`peak-c`}];function D(e,t){let n=C(e,t);for(let r of T){let i=e-r.x,a=t-r.z;n-=r.d*Math.exp(-(i*i+a*a)/(2*r.s*r.s))}for(let r of E){let i=e-r.x,a=t-r.z;n+=r.h*Math.exp(-(i*i+a*a)/(2*r.s*r.s))}return n+w(e,t)}function O(e,t){let n=.015;return[(D(e+n,t)-D(e-n,t))/(2*n),(D(e,t+n)-D(e,t-n))/(2*n)]}var k=T.reduce((e,t)=>t.d>e.d?t:e,T[0]),A=E.reduce((e,t)=>t.h>e.h?t:e,E[0]),j=D(k.x,k.z)-.05,M=D(A.x,A.z)+.05,N=[...T.map(e=>({x:e.x,z:e.z,kind:`min`,isGlobal:e.id===k.id})),...E.map(e=>({x:e.x,z:e.z,kind:`max`,isGlobal:e.id===A.id}))],P=new l(h),F=new l(m),ee=new l(g),I=new l;function L(e,t=new l){let n=o.clamp((e-j)/(M-j),0,1);return t.copy(P).lerp(F,o.smoothstep(n,0,.5)),t.lerp(ee,o.smoothstep(n,.5,1)),t}var R=`
  attribute vec3 color;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vColor = color;
    vNormal = normalize(normalMatrix * normal);
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,z=`
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPos;
  uniform float uTime;
  void main() {
    vec3 lightDir = normalize(vec3(0.4, 0.9, 0.35));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float shimmer = 1.0 + 0.04 * sin(uTime * 1.2 + vPos.x * 2.0 + vPos.z * 2.0);
    vec3 col = vColor * (0.5 + diff * 0.7) * shimmer;
    gl_FragColor = vec4(col, 1.0);
  }
`;function B(){return(0,f.useMemo)(()=>{let e=new i(y*2,y*2,b,b);e.rotateX(-Math.PI/2);let t=e.attributes.position,n=new Float32Array(t.count*3);for(let e=0;e<t.count;e++){let r=D(t.getX(e),t.getZ(e));t.setY(e,r),L(r,I),n[e*3]=I.r,n[e*3+1]=I.g,n[e*3+2]=I.b}return e.setAttribute(`color`,new u(n,3)),e.computeVertexNormals(),e},[])}function V(){let e=B(),t=(0,f.useRef)(),n=(0,f.useMemo)(()=>({uTime:{value:0}}),[]);(0,f.useEffect)(()=>{let e=window.matchMedia(`(prefers-reduced-motion: reduce)`),t=e=>{r.current=e.matches};return r.current=e.matches,e.addEventListener(`change`,t),()=>e.removeEventListener(`change`,t)},[]);let r=(0,f.useRef)(!1);return c(e=>{r.current||t.current&&(t.current.uniforms.uTime.value=e.clock.elapsedTime)}),(0,p.jsxs)(`group`,{children:[(0,p.jsx)(`mesh`,{geometry:e,children:(0,p.jsx)(`shaderMaterial`,{ref:t,vertexShader:R,fragmentShader:z,uniforms:n})}),(0,p.jsx)(`mesh`,{geometry:e,position:[0,.004,0],children:(0,p.jsx)(`meshBasicMaterial`,{color:`#ffffff`,wireframe:!0,transparent:!0,opacity:.045})})]})}function H(e,t){let n=document.createElement(`canvas`);n.width=256,n.height=64;let r=n.getContext(`2d`);r.font=`600 30px sans-serif`,r.fillStyle=t,r.textAlign=`center`,r.textBaseline=`middle`,r.fillText(e,128,34);let i=new s(n);return i.needsUpdate=!0,i}function U({x:e,z:t,kind:n,isGlobal:r}){let i=D(e,t),a=n===`min`?_:v,o=r?n===`min`?`Absolute Min`:`Absolute Max`:n===`min`?`local min`:`local max`,s=r?.42:.24,c=r?.05:.03,l=(0,f.useMemo)(()=>H(o,r?a:`#c9c9c9`),[o,a,r]);return(0,p.jsxs)(`group`,{position:[e,i,t],children:[(0,p.jsxs)(`mesh`,{position:[0,.001,0],children:[(0,p.jsx)(`sphereGeometry`,{args:[c,12,12]}),(0,p.jsx)(`meshStandardMaterial`,{color:a,emissive:a,emissiveIntensity:r?.9:.4,roughness:.35})]}),(0,p.jsxs)(`mesh`,{position:[0,s/2,0],children:[(0,p.jsx)(`cylinderGeometry`,{args:[.003,.003,s,6]}),(0,p.jsx)(`meshBasicMaterial`,{color:a,transparent:!0,opacity:r?.85:.4})]}),(0,p.jsx)(`sprite`,{position:[0,s+(r?.09:.05),0],scale:r?[.62,.16,1]:[.34,.09,1],children:(0,p.jsx)(`spriteMaterial`,{map:l,transparent:!0,depthWrite:!1})})]})}function W(){return(0,p.jsx)(`group`,{children:N.map((e,t)=>(0,p.jsx)(U,{x:e.x,z:e.z,kind:e.kind,isGlobal:e.isGlobal},t))})}function G(e,t){let n=document.createElement(`canvas`);n.width=512,n.height=128;let r=n.getContext(`2d`);r.fillStyle=`rgba(0, 0, 0, 0.35)`,r.beginPath(),r.roundRect(8,8,496,112,16),r.fill(),r.font=`italic 600 42px 'Times New Roman', Georgia, serif`,r.fillStyle=t,r.textAlign=`center`,r.textBaseline=`middle`,r.fillText(e,256,64);let i=new s(n);return i.needsUpdate=!0,i}function K(){let e=(0,f.useMemo)(()=>G(`g̃ = F⁻¹ ∇l(θ)`,`#ffffff`),[]),t=(0,f.useRef)();(0,f.useEffect)(()=>{let e=window.matchMedia(`(prefers-reduced-motion: reduce)`),t=e=>{n.current=e.matches};return n.current=e.matches,e.addEventListener(`change`,t),()=>e.removeEventListener(`change`,t)},[]);let n=(0,f.useRef)(!1);return c(e=>{n.current||t.current&&(t.current.position.y=2.1+Math.sin(e.clock.elapsedTime*.8)*.06)}),(0,p.jsx)(`group`,{ref:t,position:[0,2.1,0],children:(0,p.jsx)(`sprite`,{scale:[1.6,.4,1],children:(0,p.jsx)(`spriteMaterial`,{map:e,transparent:!0,depthWrite:!1,opacity:.95})})})}function q(){let e=(0,f.useMemo)(()=>Array.from({length:x},(e,t)=>{let n=t/x*Math.PI*2+Math.random()*.6,r=1.3+Math.random()*.5;return{x:Math.cos(n)*r,z:Math.sin(n)*r,trail:new Float32Array(84),trailColors:new Float32Array(84),filled:0,seed:Math.random()*100}}),[]),t=(0,f.useRef)([]),n=(0,f.useRef)([]);(0,f.useEffect)(()=>{let e=window.matchMedia(`(prefers-reduced-motion: reduce)`),t=e=>{r.current=e.matches};return r.current=e.matches,e.addEventListener(`change`,t),()=>e.removeEventListener(`change`,t)},[]);let r=(0,f.useRef)(!1);return c((i,a)=>{if(r.current)return;let s=Math.min(a,.05),c=i.clock.elapsedTime,l=.3,u=y*.97;e.forEach((e,r)=>{let i=.5+.5*Math.sin(c*.18+e.seed),[a,d]=O(e.x,e.z),f=Math.hypot(a,d);f>3&&(a=a/f*3,d=d/f*3);let p=Math.sin(c*3.1+e.seed*7.7)+Math.sin(c*5.3+e.seed*2.1),m=Math.cos(c*2.7+e.seed*4.4)+Math.cos(c*4.6+e.seed*9.3),h=.2*i;e.x+=(-a*l+p*h)*s,e.z+=(-d*l+m*h)*s,e.x=o.clamp(e.x,-2.134,u),e.z=o.clamp(e.z,-2.134,u);let g=D(e.x,e.z),_=g+.045,v=t.current[r];v&&(v.position.set(e.x,_,e.z),L(g,v.material.color),v.material.emissive.copy(v.material.color).multiplyScalar(.7));let y=e.trail,b=e.trailColors;y.copyWithin(0,3),b.copyWithin(0,3),y[81]=e.x,y[82]=_,y[83]=e.z,L(g,I),b[81]=I.r,b[82]=I.g,b[83]=I.b,e.filled<S&&(e.filled+=1);let x=n.current[r];x&&(x.attributes.position.needsUpdate=!0,x.attributes.color.needsUpdate=!0,x.setDrawRange(S-e.filled,e.filled))})}),(0,p.jsxs)(`group`,{children:[e.map((e,t)=>(0,p.jsxs)(`line`,{children:[(0,p.jsxs)(`bufferGeometry`,{ref:e=>n.current[t]=e,children:[(0,p.jsx)(`bufferAttribute`,{attach:`attributes-position`,count:S,array:e.trail,itemSize:3}),(0,p.jsx)(`bufferAttribute`,{attach:`attributes-color`,count:S,array:e.trailColors,itemSize:3})]}),(0,p.jsx)(`lineBasicMaterial`,{vertexColors:!0,transparent:!0,opacity:.75,blending:2,depthWrite:!1})]},`trail-${t}`)),e.map((e,n)=>(0,p.jsxs)(`mesh`,{ref:e=>t.current[n]=e,children:[(0,p.jsx)(`icosahedronGeometry`,{args:[.05,1]}),(0,p.jsx)(`meshStandardMaterial`,{color:m,emissive:m,emissiveIntensity:.7,roughness:.3})]},`walker-${n}`))]})}function J(){let e=(0,f.useRef)(),t=(0,f.useRef)(!1);return(0,f.useEffect)(()=>{let e=window.matchMedia(`(prefers-reduced-motion: reduce)`),n=e=>{t.current=e.matches};return t.current=e.matches,e.addEventListener(`change`,n),()=>e.removeEventListener(`change`,n)},[]),c((n,r)=>{t.current||(n.camera.lookAt(0,.15,0),e.current&&(e.current.rotation.y+=r*.1))}),(0,p.jsxs)(`group`,{ref:e,children:[(0,p.jsx)(V,{}),(0,p.jsx)(W,{}),(0,p.jsx)(q,{}),(0,p.jsx)(K,{})]})}function Y(){return(0,p.jsxs)(`div`,{style:{position:`absolute`,bottom:`14px`,left:`14px`,background:`rgba(10, 12, 18, 0.55)`,backdropFilter:`blur(10px)`,WebkitBackdropFilter:`blur(10px)`,border:`1px solid rgba(255,255,255,0.08)`,borderRadius:`12px`,padding:`14px 18px`,fontFamily:`'Times New Roman', Times, serif`,color:`#e2e8f0`,lineHeight:1.5,pointerEvents:`none`,userSelect:`none`,maxWidth:`320px`},children:[(0,p.jsx)(`div`,{style:{fontSize:`10px`,textTransform:`uppercase`,letterSpacing:`0.12em`,color:m,marginBottom:`6px`,fontFamily:`system-ui, sans-serif`,fontWeight:600},children:`Ising Energy`}),(0,p.jsxs)(`div`,{style:{fontSize:`17px`},children:[`E(`,(0,p.jsx)(`b`,{children:`s`}),`) = − Σ`,(0,p.jsx)(`sub`,{children:`i<j`}),` J`,(0,p.jsx)(`sub`,{children:`ij`}),` s`,(0,p.jsx)(`sub`,{children:`i`}),` s`,(0,p.jsx)(`sub`,{children:`j`}),`\xA0−\xA0 Σ`,(0,p.jsx)(`sub`,{children:`i`}),` h`,(0,p.jsx)(`sub`,{children:`i`}),` s`,(0,p.jsx)(`sub`,{children:`i`})]})]})}function X({active:e}){let{isDark:t}=a();return(0,p.jsxs)(d,{frameloop:e?`always`:`demand`,camera:{position:[0,3.1,4.7],fov:44},dpr:[1,1.6],gl:{antialias:!0,alpha:!0},children:[(0,p.jsx)(`ambientLight`,{intensity:t?.45:.85}),(0,p.jsx)(`pointLight`,{position:[3,3.5,2.5],intensity:.7,color:m}),(0,p.jsx)(`pointLight`,{position:[-3,2,-2.5],intensity:.25,color:`#5fd8ff`}),(0,p.jsx)(J,{})]})}var te=.25,Z=32e4,ne=1.5,Q=32e5,re=30,ie={dark:{c:[`#050404`,`#0d0706`,`#2a0c05`,`#e8690a`,`#ffd2a6`],gridLine:`#ffffff`,gridBase:`#2a1206`,gridOpacity:.4,gridBlend:`overlay`,veilMode:`multiply`,veilTint:`#26120b`,veilColor:`#0a0a0b`,veilStrength:1,veilFrom:.3,veilTo:.68},light:{c:[`#fffaf6`,`#ffe6d2`,`#ffc293`,`#ff9147`,`#e8690a`],gridLine:`#e8690a`,gridBase:`#000000`,gridOpacity:.4,gridBlend:`multiply`,veilMode:`fade`,veilTint:`#ffffff`,veilColor:`#f7f6f3`,veilStrength:.68,veilFrom:.3,veilTo:.68}},ae=`
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`,oe=`
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uMouse;   // cursor, 0..1, y up
  uniform vec2  uTrail;   // lagging copy of the cursor
  uniform float uHover;   // 0..1
  uniform vec3  uC0;      // coldest
  uniform vec3  uC1;
  uniform vec3  uC2;      // middle
  uniform vec3  uC3;
  uniform vec3  uC4;      // hottest

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(hash2(i), f);
    float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = r * p * 1.97 + vec2(11.3, 7.1);
      a *= 0.42;
    }
    return v;
  }

  float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p = r * p * 2.03 + vec2(11.3, 7.1);
      a *= 0.5;
    }
    return v;
  }

  vec3 ramp(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c = mix(uC0, uC1, smoothstep(0.0, 0.3, t));
    c = mix(c, uC2, smoothstep(0.22, 0.52, t));
    c = mix(c, uC3, smoothstep(0.48, 0.78, t));
    return mix(c, uC4, smoothstep(0.74, 1.0, t));
  }

  void main() {
    vec2 uv  = gl_FragCoord.xy / uRes;
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 p   = (uv - 0.5) * asp;
    vec2 m   = (uMouse - 0.5) * asp;
    vec2 tr  = (uTrail - 0.5) * asp;
    float t  = uTime;

    /* distance to the comet segment trail -> cursor */
    vec2 pa = p - tr;
    vec2 ba = m - tr;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    float d = length(pa - ba * h);

    /* convection: the field twists around the cursor */
    float sw = uHover * 0.9 * exp(-d * d * 26.0);
    float cs = cos(sw);
    float sn = sin(sw);
    vec2 rel = p - m;
    vec2 ps = m + vec2(cs * rel.x - sn * rel.y, sn * rel.x + cs * rel.y);

    /* ambient field: domain-warped noise drifting in several directions */
    vec2 s = ps * 1.2;
    vec2 q = vec2(fbm(s + t * vec2(0.034, 0.019)),
                  fbm(s + vec2(5.2, 1.3) - t * vec2(0.021, 0.03)));
    vec2 r = vec2(fbm(s + 2.1 * q + vec2(1.7, 9.2) + t * 0.047),
                  fbm(s + 2.1 * q + vec2(8.3, 2.8) - t * 0.04));
    float f = fbm(s + 1.6 * r);

    /* slow tide so hot and cold regions trade places across the slide */
    float tide = 0.5 * sin(t * 0.055 + p.x * 1.3 - p.y * 0.9)
               + 0.5 * sin(t * 0.041 - p.x * 0.8 + p.y * 1.5 + 1.7);

    float temp = 0.5 + f * 1.4 + tide * 0.2;

    /* soft ceiling: the drifting field tops out at bright orange, so the
       palest hot colour is reserved for the cursor */
    if (temp > 0.72) temp = 0.72 + (temp - 0.72) * 0.3;

    /* cursor: hot core, cold rim, edges wobble with the field */
    float R = 0.13;
    float dd = d + fbm3(p * 4.0 + t * 0.3) * 0.06;
    float core = exp(-(dd * dd) / (R * R)) * mix(0.6, 1.0, h);
    float x = (dd - R * 1.55) / (R * 0.6);
    float rim = exp(-x * x);
    temp += uHover * (0.85 * core - 0.38 * rim);

    gl_FragColor = vec4(ramp(temp), 1.0);
  }
`,se=`
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  uniform sampler2D uField;
  uniform vec2  uRes;          // canvas pixels
  uniform float uScale;        // canvas pixels per CSS pixel
  uniform float uHexSide;      // hexagon side, CSS px
  uniform vec3  uGridLine;
  uniform vec3  uGridBase;
  uniform float uGridOpacity;
  uniform float uGridMode;     // 0 overlay, 1 multiply
  uniform vec3  uVeilTint;
  uniform vec3  uVeilColor;
  uniform float uVeilMode;     // 0 multiply by tint, 1 fade to colour
  uniform float uVeilStrength;
  uniform vec2  uVeilRange;    // fade from .. to, as a fraction of the width

  /* distance (CSS px) to the nearest edge of a flat-top honeycomb */
  float hexEdge(vec2 p) {
    float k = 1.7320508 * uHexSide;
    vec2 q = p.yx / k;
    vec2 s = vec2(1.0, 1.7320508);
    vec4 c = floor(vec4(q, q - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
    vec4 h = vec4(q - c.xy * s, q - (c.zw + 0.5) * s);
    vec2 l = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? h.xy : h.zw;
    l = abs(l);
    return (0.5 - max(dot(l, s * 0.5), l.x)) * k;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec3 col = texture2D(uField, uv).rgb;

    /* fixed grid, anchored to the top-left corner, 1 CSS px lines */
    vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
    float d = hexEdge(p) * uScale;
    float w = 0.5 * uScale;
    float line = 1.0 - smoothstep(w - 0.6, w + 0.6, d);
    vec3 over = mix(2.0 * col * uGridLine,
                    1.0 - 2.0 * (1.0 - col) * (1.0 - uGridLine),
                    step(0.5, col));
    vec3 tinted = mix(over, col * uGridLine, uGridMode);
    col = mix(col, tinted, line * uGridOpacity) + uGridBase * line;

    /* calm the text side: multiply along a warm curve (stays saturated,
       never greys) or fade to a colour */
    float vm = (1.0 - smoothstep(uVeilRange.x, uVeilRange.y, uv.x)) * uVeilStrength;
    vec3 darkened = col * pow(max(uVeilTint, vec3(0.001)), vec3(vm));
    vec3 faded = mix(col, uVeilColor, vm);
    col = mix(darkened, faded, uVeilMode);

    /* dither against banding */
    col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;function ce(e){let t=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((e||``).trim());if(!t)return null;let n=t[1];n.length===3&&(n=n.replace(/./g,e=>e+e));let r=parseInt(n,16);return[(r>>16&255)/255,(r>>8&255)/255,(r&255)/255]}var $=null;function le(e){let t=(e||``).trim();if(!t)return null;let n=ce(t);if(n)return n;if($===null&&($=document.createElement(`canvas`).getContext(`2d`)||!1),!$)return null;$.fillStyle=`#010203`,$.fillStyle=t;let r=$.fillStyle;if(r===`#010203`)return null;if(r[0]===`#`)return ce(r);let i=/rgba?\(([^)]+)\)/.exec(r);if(!i)return null;let[a,o,s]=i[1].split(`,`).map(parseFloat);return[a/255,o/255,s/255]}function ue({active:e,isDark:t}){let n=(0,f.useRef)(null),r=(0,f.useRef)(null),i=(0,f.useRef)(e),a=(0,f.useRef)(t),o=(0,f.useRef)(()=>{});return(0,f.useEffect)(()=>{let e=n.current,t=r.current;if(!e||!t)return;let s={clientX:0,clientY:0,hasPointer:!1,lastInput:0,px:.5,py:.5,mx:.5,my:.5,tx:.5,ty:.5,hover:0,time:40,speed:1,hexSide:26,style:null,styleTarget:null},c=window.matchMedia(`(prefers-reduced-motion: reduce)`),l=c.matches,u=null,d=null,f=null,p=null,m=[],h=[],g=null,_=null,v=null,y={},b={},x=`idle`,S=0,C=0,w=1,T=0,E=0,D=!0,O=!0,k=!1,A=!1,j=null,M=(e,t)=>{let n=u.createProgram();return[[u.VERTEX_SHADER,ae],[u.FRAGMENT_SHADER,e]].forEach(([e,r])=>{let i=u.createShader(e);u.shaderSource(i,r),u.compileShader(i),u.attachShader(n,i),t.push(i)}),u.bindAttribLocation(n,0,`aPos`),u.linkProgram(n),n},N=()=>{let e={alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1,powerPreference:`low-power`};return u=t.getContext(`webgl`,e)||t.getContext(`experimental-webgl`,e),!u||u.isContextLost()?!1:(d=u.getExtension(`KHR_parallel_shader_compile`),m=[],h=[],f=M(oe,m),p=M(se,h),g=u.createBuffer(),u.bindBuffer(u.ARRAY_BUFFER,g),u.bufferData(u.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),u.STATIC_DRAW),u.enableVertexAttribArray(0),u.vertexAttribPointer(0,2,u.FLOAT,!1,0,0),_=u.createTexture(),v=u.createFramebuffer(),S=0,C=0,x=`compiling`,!0)},P=()=>{u&&!u.isContextLost()&&([f,p].forEach(e=>e&&u.deleteProgram(e)),[...m,...h].forEach(e=>u.deleteShader(e)),g&&u.deleteBuffer(g),_&&u.deleteTexture(_),v&&u.deleteFramebuffer(v)),f=p=g=_=v=null,m=[],h=[]},F=()=>{P(),x=`failed`,e.setAttribute(`data-fallback`,``)},ee=()=>{if(d){let e=e=>u.getProgramParameter(e,d.COMPLETION_STATUS_KHR);if(!e(f)||!e(p))return!1}let e=(e,t)=>u.getProgramParameter(e,u.LINK_STATUS)?!0:(console.warn(`[Scene4] heat shader:`,u.getProgramInfoLog(e),...t.map(e=>u.getShaderInfoLog(e))),!1);if(!e(f,m)||!e(p,h))return F(),!1;[...m,...h].forEach(e=>u.deleteShader(e)),m=[],h=[];let t=(e,t)=>t.reduce((t,n)=>({...t,[n]:u.getUniformLocation(e,n)}),{});return y=t(f,[`uRes`,`uTime`,`uMouse`,`uTrail`,`uHover`,`uC0`,`uC1`,`uC2`,`uC3`,`uC4`]),b=t(p,[`uField`,`uRes`,`uScale`,`uHexSide`,`uGridLine`,`uGridBase`,`uGridOpacity`,`uGridMode`,`uVeilTint`,`uVeilColor`,`uVeilMode`,`uVeilStrength`,`uVeilRange`]),u.useProgram(p),u.uniform1i(b.uField,0),x=`ready`,!0},I=()=>{let e=t.clientWidth,n=t.clientHeight;if(!e||!n)return;let r=Math.min(window.devicePixelRatio||1,ne);e*n*r*r>Q&&(r=Math.sqrt(Q/(e*n)));let i=Math.max(2,Math.round(e*r)),a=Math.max(2,Math.round(n*r));if((t.width!==i||t.height!==a)&&(t.width=i,t.height=a),w=i/e,!u||!_||u.isContextLost())return;let o=te;e*n*o*o>Z&&(o=Math.sqrt(Z/(e*n)));let s=Math.max(2,Math.round(e*o)),c=Math.max(2,Math.round(n*o));if(s===S&&c===C)return;S=s,C=c,u.bindTexture(u.TEXTURE_2D,_),u.texImage2D(u.TEXTURE_2D,0,u.RGBA,S,C,0,u.RGBA,u.UNSIGNED_BYTE,null),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_MIN_FILTER,u.LINEAR),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_MAG_FILTER,u.LINEAR),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_WRAP_S,u.CLAMP_TO_EDGE),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_WRAP_T,u.CLAMP_TO_EDGE),u.bindFramebuffer(u.FRAMEBUFFER,v),u.framebufferTexture2D(u.FRAMEBUFFER,u.COLOR_ATTACHMENT0,u.TEXTURE_2D,_,0);let l=u.checkFramebufferStatus(u.FRAMEBUFFER)===u.FRAMEBUFFER_COMPLETE;u.bindFramebuffer(u.FRAMEBUFFER,null),u.bindTexture(u.TEXTURE_2D,null),l||F()},L=()=>{O=!1;let t=getComputedStyle(e),n=e=>t.getPropertyValue(e).trim(),r=a.current?ie.dark:ie.light,i=(e,t)=>le(n(e))||le(t),o=(e,t)=>{let r=parseFloat(n(e));return Number.isFinite(r)?r:t},c=(e,t)=>n(e)||t;s.styleTarget=[...[0,1,2,3,4].flatMap(e=>i(`--s4-c${e}`,r.c[e])),...i(`--s4-grid-line`,r.gridLine),...i(`--s4-grid-base`,r.gridBase),o(`--s4-grid-opacity`,r.gridOpacity),+(c(`--s4-grid-blend`,r.gridBlend)===`multiply`),...i(`--s4-veil-tint`,r.veilTint),...i(`--s4-veil-color`,r.veilColor),+(c(`--s4-veil-mode`,r.veilMode)===`fade`),o(`--s4-veil-strength`,r.veilStrength),o(`--s4-veil-from`,r.veilFrom),o(`--s4-veil-to`,r.veilTo)],s.style||=s.styleTarget.slice(),s.speed=o(`--s4-flow-speed`,1),s.hexSide=Math.max(6,o(`--s4-grid-size`,26))},R=()=>{if(x===`ready`&&!u.isContextLost()){let n=s.style;u.bindTexture(u.TEXTURE_2D,null),u.bindFramebuffer(u.FRAMEBUFFER,v),u.viewport(0,0,S,C),u.useProgram(f),u.uniform2f(y.uRes,S,C),u.uniform1f(y.uTime,s.time),u.uniform2f(y.uMouse,s.mx,s.my),u.uniform2f(y.uTrail,s.tx,s.ty),u.uniform1f(y.uHover,s.hover);for(let e=0;e<5;e++)u.uniform3f(y[`uC${e}`],n[e*3],n[e*3+1],n[e*3+2]);u.drawArrays(u.TRIANGLES,0,3),u.bindFramebuffer(u.FRAMEBUFFER,null),u.viewport(0,0,t.width,t.height),u.useProgram(p),u.activeTexture(u.TEXTURE0),u.bindTexture(u.TEXTURE_2D,_),u.uniform2f(b.uRes,t.width,t.height),u.uniform1f(b.uScale,w),u.uniform1f(b.uHexSide,s.hexSide),u.uniform3f(b.uGridLine,n[15],n[16],n[17]),u.uniform3f(b.uGridBase,n[18],n[19],n[20]),u.uniform1f(b.uGridOpacity,n[21]),u.uniform1f(b.uGridMode,n[22]),u.uniform3f(b.uVeilTint,n[23],n[24],n[25]),u.uniform3f(b.uVeilColor,n[26],n[27],n[28]),u.uniform1f(b.uVeilMode,n[29]),u.uniform1f(b.uVeilStrength,n[30]),u.uniform2f(b.uVeilRange,n[31],n[32]),u.drawArrays(u.TRIANGLES,0,3),k||(k=!0,e.setAttribute(`data-ready`,``))}else e.style.setProperty(`--s4-mx`,`${(s.mx*100).toFixed(2)}%`),e.style.setProperty(`--s4-my`,`${((1-s.my)*100).toFixed(2)}%`),e.style.setProperty(`--s4-hover`,s.hover.toFixed(3))},z=t=>{if(T=0,A||x===`idle`)return;if(x===`compiling`&&(ee(),x===`compiling`)){T=requestAnimationFrame(z);return}if(!(D||t-s.lastInput<300)&&E&&t-E<1e3/re-2){T=requestAnimationFrame(z);return}let n=E?Math.min((t-E)/1e3,.1):1/60;E=t;let r=e=>1-Math.exp(-e*n);O&&L();let a=0;if(s.hasPointer){let t=e.getBoundingClientRect();if(t.width>0&&t.height>0){let e=(s.clientX-t.left)/t.width,n=1-(s.clientY-t.top)/t.height;e>=0&&e<=1&&n>=0&&n<=1&&(s.px=e,s.py=n,a=1)}}a&&s.hover<.02&&(s.mx=s.tx=s.px,s.my=s.ty=s.py);let o=r(12),c=r(2.6);s.mx+=(s.px-s.mx)*o,s.my+=(s.py-s.my)*o,s.tx+=(s.mx-s.tx)*c,s.ty+=(s.my-s.ty)*c,s.hover+=(a-s.hover)*r(a>s.hover?3.2:1.3);let u=!1,d=r(5);for(let e=0;e<s.style.length;e++){let t=s.styleTarget[e]-s.style[e];Math.abs(t)>.002&&(u=!0),s.style[e]+=t*d}i.current&&!l&&(s.time+=n*s.speed),R();let f=u||Math.abs(a-s.hover)>.003||Math.abs(s.px-s.tx)+Math.abs(s.py-s.ty)>5e-4;D=f;let p=x===`ready`&&!l;i.current&&(p||f)&&(T=requestAnimationFrame(z))},B=e=>{e&&(O=!0),!T&&!A&&(E=0,T=requestAnimationFrame(z))};o.current=B;let V=()=>{I(),B()},H=null;typeof ResizeObserver<`u`?(H=new ResizeObserver(V),H.observe(t)):window.addEventListener(`resize`,V);let U=e=>{s.clientX=e.clientX,s.clientY=e.clientY,s.hasPointer=!0,s.lastInput=performance.now(),i.current&&B()},W=e=>{e.pointerType!==`mouse`&&(s.hasPointer=!1,B())},G=e=>{e.relatedTarget||(s.hasPointer=!1,B())},K=()=>{s.hasPointer=!1,B()};window.addEventListener(`pointermove`,U,{passive:!0}),window.addEventListener(`pointerdown`,U,{passive:!0}),window.addEventListener(`pointerup`,W,{passive:!0}),window.addEventListener(`pointercancel`,W,{passive:!0}),document.addEventListener(`mouseout`,G),window.addEventListener(`blur`,K);let q=e=>{l=e.matches,B()};c.addEventListener(`change`,q);let J=t=>{t.preventDefault(),x=`lost`,f=p=g=_=v=null,k=!1,e.removeAttribute(`data-ready`),e.setAttribute(`data-fallback`,``)},Y=()=>{N()?(e.removeAttribute(`data-fallback`),I()):x=`failed`,B(!0)};t.addEventListener(`webglcontextlost`,J),t.addEventListener(`webglcontextrestored`,Y);let X=()=>{j=null,!A&&(N()||(x=`failed`,e.setAttribute(`data-fallback`,``)),I(),B(!0))};if(typeof window.requestIdleCallback==`function`){let e=window.requestIdleCallback(X,{timeout:300});j=()=>window.cancelIdleCallback(e)}else{let e=setTimeout(X,32);j=()=>clearTimeout(e)}return()=>{A=!0,j&&j(),T&&cancelAnimationFrame(T),T=0,o.current=()=>{},H?H.disconnect():window.removeEventListener(`resize`,V),window.removeEventListener(`pointermove`,U),window.removeEventListener(`pointerdown`,U),window.removeEventListener(`pointerup`,W),window.removeEventListener(`pointercancel`,W),document.removeEventListener(`mouseout`,G),window.removeEventListener(`blur`,K),c.removeEventListener(`change`,q),t.removeEventListener(`webglcontextlost`,J),t.removeEventListener(`webglcontextrestored`,Y),P(),x=`idle`,e.removeAttribute(`data-ready`),e.removeAttribute(`data-fallback`);let n=u&&!u.isContextLost()?u.getExtension(`WEBGL_lose_context`):null;n&&setTimeout(()=>{t.isConnected||n.loseContext()},0)}},[]),(0,f.useEffect)(()=>{i.current=e,o.current()},[e]),(0,f.useEffect)(()=>{a.current=t,o.current(!0)},[t]),(0,p.jsxs)(p.Fragment,{children:[(0,p.jsx)(`div`,{ref:n,className:`scene4-heat${e?``:` is-paused`}`,"aria-hidden":`true`,children:(0,p.jsx)(`canvas`,{ref:r,className:`scene4-heat-canvas`})}),(0,p.jsx)(`div`,{className:`scene4-heat-veil`,"aria-hidden":`true`})]})}function de(e){let[t,n]=(0,f.useState)(e);return(0,f.useEffect)(()=>{if(t)return;if(e){n(!0);return}if(typeof window.requestIdleCallback==`function`){let e=window.requestIdleCallback(()=>n(!0),{timeout:2500});return()=>window.cancelIdleCallback(e)}let r=setTimeout(()=>n(!0),1200);return()=>clearTimeout(r)},[e,t]),t||e}function fe({active:e}){let{t}=n(),{isDark:r}=a(),i=de(e);return(0,p.jsxs)(`div`,{className:`scene-inner scene4-root`,children:[(0,p.jsx)(ue,{active:e,isDark:r}),(0,p.jsx)(`div`,{className:`scene4-content`,children:(0,p.jsxs)(`div`,{className:`split`,children:[(0,p.jsxs)(`div`,{className:`scene-text`,children:[(0,p.jsxs)(`span`,{className:`eyebrow stroke-hair`,children:[(0,p.jsx)(`span`,{className:`eyebrow-dot`,style:{background:m}}),t(`scene4.eyebrow`)]}),(0,p.jsxs)(`div`,{style:{margin:`10px 0 20px`,whiteSpace:`nowrap`,display:`inline-flex`,alignItems:`baseline`,gap:`0.02em`},children:[(0,p.jsx)(`span`,{className:`letter-giant stroke-lg`,style:{color:m,flexShrink:0},children:`T`}),(0,p.jsx)(`span`,{className:`letter-suffix stroke-sm`,style:{flexShrink:0},children:`hermodynamic`})]}),(0,p.jsx)(`p`,{className:`body-line`,style:{maxWidth:`38ch`},children:t(`scene4.description`)})]}),(0,p.jsx)(`div`,{className:`visual-pane`,children:(0,p.jsxs)(`div`,{className:`instrument-frame`,style:{position:`relative`},children:[i?(0,p.jsx)(X,{active:e}):null,(0,p.jsx)(Y,{})]})})]})})]})}export{fe as default};