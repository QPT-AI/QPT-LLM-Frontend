import{r as e}from"./rolldown-runtime-hePW80VL.js";import{m as t,n,t as r}from"./jsx-runtime-DJ73XKeI.js";import{Ot as i,St as a,_ as o,a as s,b as c,h as l,t as u}from"./react-three-fiber.esm-CTFwH2-c.js";/* empty css               */var d=e(t(),1),f=r(),p=`#e8690a`,m=`#22434f`,h=`#ffdd9e`,g=`
  varying vec2  vUv;
  varying vec3  vPos;
  varying vec3  vNorm;
  uniform float uTime;
  uniform float uProb;
  uniform float uEntropy;

  void main() {
    vUv   = uv;
    vNorm = normal;
    vec3 pos = position;

    /* Entropy-driven turbulence: rougher when uncertain (p≈0.5) */
    float t = uTime;
    float wave = sin(pos.x * 5.0 + t * 1.4)
               * sin(pos.y * 5.0 - t * 1.2)
               * sin(pos.z * 5.0 + t * 0.8);
    pos += normal * wave * uEntropy * 0.18;

    /* Probability bias deforms the sphere into a slight prolate /
       oblate shape depending on how far p is from 0.5            */
    float bias = (uProb - 0.5) * 2.0;          // −1 … +1
    pos.z *= 1.0 + bias * 0.12;
    pos.xy *= 1.0 - abs(bias) * 0.06;

    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`,_=`
  varying vec2  vUv;
  varying vec3  vPos;
  varying vec3  vNorm;
  uniform float uTime;
  uniform float uProb;
  uniform float uEntropy;
  uniform vec3  uCool;
  uniform vec3  uMid;
  uniform vec3  uHot;

  void main() {
    /* Map the original normal z-coordinate to the bit-state axis:
       south pole (z = −1)  →  |0⟩   (p = 0)
       north pole (z = +1)  →  |1⟩   (p = 1)                       */
    float z = vNorm.z;
    float pMap = z * 0.5 + 0.5;

    /* Shift the colour gradient by the current probability */
    float mixFactor = smoothstep(0.0, 1.0, pMap + (uProb - 0.5) * 0.4);

    vec3 color = mix(uCool, uMid, smoothstep(0.0, 0.5, mixFactor));
    color      = mix(color, uHot, smoothstep(0.5, 1.0, mixFactor));

    /* Equator glow — brightest when entropy is maximal */
    float equator = 1.0 - abs(z);
    float glow = equator * uEntropy * 1.6;
    color += vec3(1.0, 0.85, 0.5) * glow;

    /* Subtle surface shimmer */
    float shimmer = sin(vPos.x * 10.0 + uTime * 2.0) * 0.015;
    color += shimmer;

    gl_FragColor = vec4(color, 1.0);
  }
`;function v({text:e,position:t,color:n=`#ffffff`,size:r=.35}){let i=(0,d.useMemo)(()=>{let t=document.createElement(`canvas`);t.width=512,t.height=512;let r=t.getContext(`2d`);r.fillStyle=n,r.font=`bold 80px 'Times New Roman', serif`,r.textAlign=`center`,r.textBaseline=`middle`,r.fillText(e,256,256);let i=new o(t);return i.needsUpdate=!0,i},[e,n]);return(0,f.jsx)(`sprite`,{position:t,scale:[r,r,1],children:(0,f.jsx)(`spriteMaterial`,{map:i,transparent:!0,depthTest:!1,opacity:.9})})}function y(){let e=(0,d.useMemo)(()=>{let e=1.9;return[new l().setFromPoints([new a(-1.9,0,0),new a(e,0,0)]),new l().setFromPoints([new a(0,-1.9,0),new a(0,e,0)]),new l().setFromPoints([new a(0,0,-1.9),new a(0,0,e)])]},[]);return(0,f.jsxs)(`group`,{children:[(0,f.jsx)(`line`,{geometry:e[0],children:(0,f.jsx)(`lineBasicMaterial`,{color:`#e74c3c`})}),(0,f.jsx)(`line`,{geometry:e[1],children:(0,f.jsx)(`lineBasicMaterial`,{color:`#2ecc71`})}),(0,f.jsx)(`line`,{geometry:e[2],children:(0,f.jsx)(`lineBasicMaterial`,{color:`#3498db`})}),(0,f.jsx)(v,{text:`x`,position:[2.05,0,0],color:`#e74c3c`,size:.22}),(0,f.jsx)(v,{text:`y`,position:[0,2.05,0],color:`#2ecc71`,size:.22}),(0,f.jsx)(v,{text:`z`,position:[0,0,2.05],color:`#3498db`,size:.22}),(0,f.jsxs)(`mesh`,{position:[0,0,-1.35],children:[(0,f.jsx)(`sphereGeometry`,{args:[.04,16,16]}),(0,f.jsx)(`meshBasicMaterial`,{color:m})]}),(0,f.jsx)(v,{text:`|0⟩  p≈0`,position:[.3,.15,-1.5],color:m,size:.32}),(0,f.jsxs)(`mesh`,{position:[0,0,1.35],children:[(0,f.jsx)(`sphereGeometry`,{args:[.04,16,16]}),(0,f.jsx)(`meshBasicMaterial`,{color:h})]}),(0,f.jsx)(v,{text:`|1⟩  p≈1`,position:[.3,.15,1.5],color:h,size:.32})]})}function b(){let e=(0,d.useRef)();return s(t=>{if(!e.current)return;e.current.rotation.z=t.clock.elapsedTime*.08;let n=1+Math.sin(t.clock.elapsedTime*.4)*.015;e.current.scale.set(n,n,n)}),(0,f.jsxs)(`mesh`,{ref:e,rotation:[Math.PI/2,0,0],children:[(0,f.jsx)(`torusGeometry`,{args:[1.32,.007,16,120]}),(0,f.jsx)(`meshBasicMaterial`,{color:p,transparent:!0,opacity:.3})]})}function x(){let e=(0,d.useRef)(),t=(0,d.useRef)(),n=(0,d.useRef)(),r=(0,d.useMemo)(()=>({uTime:{value:0},uProb:{value:.5},uEntropy:{value:.693},uCool:{value:new c(m)},uMid:{value:new c(p)},uHot:{value:new c(h)}}),[]);return s(r=>{let i=r.clock.elapsedTime,a=.5+.35*Math.sin(i*.22),o=Math.max(.001,Math.min(.999,a)),s=-(o*Math.log(o)+(1-o)*Math.log(1-o));n.current&&(n.current.uniforms.uTime.value=i,n.current.uniforms.uProb.value=a,n.current.uniforms.uEntropy.value=s),e.current&&(e.current.rotation.y=i*.12),t.current&&(t.current.rotation.y=i*.12)}),(0,f.jsxs)(`group`,{children:[(0,f.jsxs)(`mesh`,{ref:e,children:[(0,f.jsx)(`icosahedronGeometry`,{args:[1.3,6]}),(0,f.jsx)(`shaderMaterial`,{ref:n,vertexShader:g,fragmentShader:_,uniforms:r})]}),(0,f.jsxs)(`mesh`,{ref:t,scale:1.015,children:[(0,f.jsx)(`icosahedronGeometry`,{args:[1.3,1]}),(0,f.jsx)(`meshBasicMaterial`,{color:`#ffffff`,wireframe:!0,transparent:!0,opacity:.06})]}),(0,f.jsx)(y,{}),(0,f.jsx)(b,{})]})}function S({active:e}){let{isDark:t}=i();return(0,f.jsxs)(u,{frameloop:e?`always`:`demand`,camera:{position:[2.4,1.6,3.6],fov:40},dpr:[1,1.6],gl:{antialias:!0,alpha:!0},children:[(0,f.jsx)(`ambientLight`,{intensity:t?.4:.8}),(0,f.jsx)(`pointLight`,{position:[3,2,3],intensity:.7,color:p}),(0,f.jsx)(`pointLight`,{position:[-3,-2,-3],intensity:.25,color:m}),(0,f.jsx)(x,{})]})}var ee=.25,C=32e4,te=1.5,w=32e5,ne=30,T={dark:{c:[`#050404`,`#0d0706`,`#2a0c05`,`#e8690a`,`#ffd2a6`],gridLine:`#ffffff`,gridBase:`#2a1206`,gridOpacity:.4,gridBlend:`overlay`,veilMode:`multiply`,veilTint:`#26120b`,veilColor:`#0a0a0b`,veilStrength:1,veilFrom:.3,veilTo:.68},light:{c:[`#fffaf6`,`#ffe6d2`,`#ffc293`,`#ff9147`,`#e8690a`],gridLine:`#e8690a`,gridBase:`#000000`,gridOpacity:.4,gridBlend:`multiply`,veilMode:`fade`,veilTint:`#ffffff`,veilColor:`#f7f6f3`,veilStrength:.68,veilFrom:.3,veilTo:.68}},re=`
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`,ie=`
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
`,E=`
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
`;function D(e){let t=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((e||``).trim());if(!t)return null;let n=t[1];n.length===3&&(n=n.replace(/./g,e=>e+e));let r=parseInt(n,16);return[(r>>16&255)/255,(r>>8&255)/255,(r&255)/255]}var O=null;function k(e){let t=(e||``).trim();if(!t)return null;let n=D(t);if(n)return n;if(O===null&&(O=document.createElement(`canvas`).getContext(`2d`)||!1),!O)return null;O.fillStyle=`#010203`,O.fillStyle=t;let r=O.fillStyle;if(r===`#010203`)return null;if(r[0]===`#`)return D(r);let i=/rgba?\(([^)]+)\)/.exec(r);if(!i)return null;let[a,o,s]=i[1].split(`,`).map(parseFloat);return[a/255,o/255,s/255]}function A({active:e,isDark:t}){let n=(0,d.useRef)(null),r=(0,d.useRef)(null),i=(0,d.useRef)(e),a=(0,d.useRef)(t),o=(0,d.useRef)(()=>{});return(0,d.useEffect)(()=>{let e=n.current,t=r.current;if(!e||!t)return;let s={clientX:0,clientY:0,hasPointer:!1,lastInput:0,px:.5,py:.5,mx:.5,my:.5,tx:.5,ty:.5,hover:0,time:40,speed:1,hexSide:26,style:null,styleTarget:null},c=window.matchMedia(`(prefers-reduced-motion: reduce)`),l=c.matches,u=null,d=null,f=null,p=null,m=[],h=[],g=null,_=null,v=null,y={},b={},x=`idle`,S=0,D=0,O=1,A=0,j=0,M=!0,N=!0,P=!1,F=!1,I=null,L=(e,t)=>{let n=u.createProgram();return[[u.VERTEX_SHADER,re],[u.FRAGMENT_SHADER,e]].forEach(([e,r])=>{let i=u.createShader(e);u.shaderSource(i,r),u.compileShader(i),u.attachShader(n,i),t.push(i)}),u.bindAttribLocation(n,0,`aPos`),u.linkProgram(n),n},R=()=>{let e={alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1,powerPreference:`low-power`};return u=t.getContext(`webgl`,e)||t.getContext(`experimental-webgl`,e),!u||u.isContextLost()?!1:(d=u.getExtension(`KHR_parallel_shader_compile`),m=[],h=[],f=L(ie,m),p=L(E,h),g=u.createBuffer(),u.bindBuffer(u.ARRAY_BUFFER,g),u.bufferData(u.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),u.STATIC_DRAW),u.enableVertexAttribArray(0),u.vertexAttribPointer(0,2,u.FLOAT,!1,0,0),_=u.createTexture(),v=u.createFramebuffer(),S=0,D=0,x=`compiling`,!0)},z=()=>{u&&!u.isContextLost()&&([f,p].forEach(e=>e&&u.deleteProgram(e)),[...m,...h].forEach(e=>u.deleteShader(e)),g&&u.deleteBuffer(g),_&&u.deleteTexture(_),v&&u.deleteFramebuffer(v)),f=p=g=_=v=null,m=[],h=[]},B=()=>{z(),x=`failed`,e.setAttribute(`data-fallback`,``)},ae=()=>{if(d){let e=e=>u.getProgramParameter(e,d.COMPLETION_STATUS_KHR);if(!e(f)||!e(p))return!1}let e=(e,t)=>u.getProgramParameter(e,u.LINK_STATUS)?!0:(console.warn(`[Scene4] heat shader:`,u.getProgramInfoLog(e),...t.map(e=>u.getShaderInfoLog(e))),!1);if(!e(f,m)||!e(p,h))return B(),!1;[...m,...h].forEach(e=>u.deleteShader(e)),m=[],h=[];let t=(e,t)=>t.reduce((t,n)=>({...t,[n]:u.getUniformLocation(e,n)}),{});return y=t(f,[`uRes`,`uTime`,`uMouse`,`uTrail`,`uHover`,`uC0`,`uC1`,`uC2`,`uC3`,`uC4`]),b=t(p,[`uField`,`uRes`,`uScale`,`uHexSide`,`uGridLine`,`uGridBase`,`uGridOpacity`,`uGridMode`,`uVeilTint`,`uVeilColor`,`uVeilMode`,`uVeilStrength`,`uVeilRange`]),u.useProgram(p),u.uniform1i(b.uField,0),x=`ready`,!0},V=()=>{let e=t.clientWidth,n=t.clientHeight;if(!e||!n)return;let r=Math.min(window.devicePixelRatio||1,te);e*n*r*r>w&&(r=Math.sqrt(w/(e*n)));let i=Math.max(2,Math.round(e*r)),a=Math.max(2,Math.round(n*r));if((t.width!==i||t.height!==a)&&(t.width=i,t.height=a),O=i/e,!u||!_||u.isContextLost())return;let o=ee;e*n*o*o>C&&(o=Math.sqrt(C/(e*n)));let s=Math.max(2,Math.round(e*o)),c=Math.max(2,Math.round(n*o));if(s===S&&c===D)return;S=s,D=c,u.bindTexture(u.TEXTURE_2D,_),u.texImage2D(u.TEXTURE_2D,0,u.RGBA,S,D,0,u.RGBA,u.UNSIGNED_BYTE,null),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_MIN_FILTER,u.LINEAR),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_MAG_FILTER,u.LINEAR),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_WRAP_S,u.CLAMP_TO_EDGE),u.texParameteri(u.TEXTURE_2D,u.TEXTURE_WRAP_T,u.CLAMP_TO_EDGE),u.bindFramebuffer(u.FRAMEBUFFER,v),u.framebufferTexture2D(u.FRAMEBUFFER,u.COLOR_ATTACHMENT0,u.TEXTURE_2D,_,0);let l=u.checkFramebufferStatus(u.FRAMEBUFFER)===u.FRAMEBUFFER_COMPLETE;u.bindFramebuffer(u.FRAMEBUFFER,null),u.bindTexture(u.TEXTURE_2D,null),l||B()},oe=()=>{N=!1;let t=getComputedStyle(e),n=e=>t.getPropertyValue(e).trim(),r=a.current?T.dark:T.light,i=(e,t)=>k(n(e))||k(t),o=(e,t)=>{let r=parseFloat(n(e));return Number.isFinite(r)?r:t},c=(e,t)=>n(e)||t;s.styleTarget=[...[0,1,2,3,4].flatMap(e=>i(`--s4-c${e}`,r.c[e])),...i(`--s4-grid-line`,r.gridLine),...i(`--s4-grid-base`,r.gridBase),o(`--s4-grid-opacity`,r.gridOpacity),+(c(`--s4-grid-blend`,r.gridBlend)===`multiply`),...i(`--s4-veil-tint`,r.veilTint),...i(`--s4-veil-color`,r.veilColor),+(c(`--s4-veil-mode`,r.veilMode)===`fade`),o(`--s4-veil-strength`,r.veilStrength),o(`--s4-veil-from`,r.veilFrom),o(`--s4-veil-to`,r.veilTo)],s.style||=s.styleTarget.slice(),s.speed=o(`--s4-flow-speed`,1),s.hexSide=Math.max(6,o(`--s4-grid-size`,26))},se=()=>{if(x===`ready`&&!u.isContextLost()){let n=s.style;u.bindTexture(u.TEXTURE_2D,null),u.bindFramebuffer(u.FRAMEBUFFER,v),u.viewport(0,0,S,D),u.useProgram(f),u.uniform2f(y.uRes,S,D),u.uniform1f(y.uTime,s.time),u.uniform2f(y.uMouse,s.mx,s.my),u.uniform2f(y.uTrail,s.tx,s.ty),u.uniform1f(y.uHover,s.hover);for(let e=0;e<5;e++)u.uniform3f(y[`uC${e}`],n[e*3],n[e*3+1],n[e*3+2]);u.drawArrays(u.TRIANGLES,0,3),u.bindFramebuffer(u.FRAMEBUFFER,null),u.viewport(0,0,t.width,t.height),u.useProgram(p),u.activeTexture(u.TEXTURE0),u.bindTexture(u.TEXTURE_2D,_),u.uniform2f(b.uRes,t.width,t.height),u.uniform1f(b.uScale,O),u.uniform1f(b.uHexSide,s.hexSide),u.uniform3f(b.uGridLine,n[15],n[16],n[17]),u.uniform3f(b.uGridBase,n[18],n[19],n[20]),u.uniform1f(b.uGridOpacity,n[21]),u.uniform1f(b.uGridMode,n[22]),u.uniform3f(b.uVeilTint,n[23],n[24],n[25]),u.uniform3f(b.uVeilColor,n[26],n[27],n[28]),u.uniform1f(b.uVeilMode,n[29]),u.uniform1f(b.uVeilStrength,n[30]),u.uniform2f(b.uVeilRange,n[31],n[32]),u.drawArrays(u.TRIANGLES,0,3),P||(P=!0,e.setAttribute(`data-ready`,``))}else e.style.setProperty(`--s4-mx`,`${(s.mx*100).toFixed(2)}%`),e.style.setProperty(`--s4-my`,`${((1-s.my)*100).toFixed(2)}%`),e.style.setProperty(`--s4-hover`,s.hover.toFixed(3))},H=t=>{if(A=0,F||x===`idle`)return;if(x===`compiling`&&(ae(),x===`compiling`)){A=requestAnimationFrame(H);return}if(!(M||t-s.lastInput<300)&&j&&t-j<1e3/ne-2){A=requestAnimationFrame(H);return}let n=j?Math.min((t-j)/1e3,.1):1/60;j=t;let r=e=>1-Math.exp(-e*n);N&&oe();let a=0;if(s.hasPointer){let t=e.getBoundingClientRect();if(t.width>0&&t.height>0){let e=(s.clientX-t.left)/t.width,n=1-(s.clientY-t.top)/t.height;e>=0&&e<=1&&n>=0&&n<=1&&(s.px=e,s.py=n,a=1)}}a&&s.hover<.02&&(s.mx=s.tx=s.px,s.my=s.ty=s.py);let o=r(12),c=r(2.6);s.mx+=(s.px-s.mx)*o,s.my+=(s.py-s.my)*o,s.tx+=(s.mx-s.tx)*c,s.ty+=(s.my-s.ty)*c,s.hover+=(a-s.hover)*r(a>s.hover?3.2:1.3);let u=!1,d=r(5);for(let e=0;e<s.style.length;e++){let t=s.styleTarget[e]-s.style[e];Math.abs(t)>.002&&(u=!0),s.style[e]+=t*d}i.current&&!l&&(s.time+=n*s.speed),se();let f=u||Math.abs(a-s.hover)>.003||Math.abs(s.px-s.tx)+Math.abs(s.py-s.ty)>5e-4;M=f;let p=x===`ready`&&!l;i.current&&(p||f)&&(A=requestAnimationFrame(H))},U=e=>{e&&(N=!0),!A&&!F&&(j=0,A=requestAnimationFrame(H))};o.current=U;let W=()=>{V(),U()},G=null;typeof ResizeObserver<`u`?(G=new ResizeObserver(W),G.observe(t)):window.addEventListener(`resize`,W);let K=e=>{s.clientX=e.clientX,s.clientY=e.clientY,s.hasPointer=!0,s.lastInput=performance.now(),i.current&&U()},q=e=>{e.pointerType!==`mouse`&&(s.hasPointer=!1,U())},J=e=>{e.relatedTarget||(s.hasPointer=!1,U())},Y=()=>{s.hasPointer=!1,U()};window.addEventListener(`pointermove`,K,{passive:!0}),window.addEventListener(`pointerdown`,K,{passive:!0}),window.addEventListener(`pointerup`,q,{passive:!0}),window.addEventListener(`pointercancel`,q,{passive:!0}),document.addEventListener(`mouseout`,J),window.addEventListener(`blur`,Y);let X=e=>{l=e.matches,U()};c.addEventListener(`change`,X);let Z=t=>{t.preventDefault(),x=`lost`,f=p=g=_=v=null,P=!1,e.removeAttribute(`data-ready`),e.setAttribute(`data-fallback`,``)},Q=()=>{R()?(e.removeAttribute(`data-fallback`),V()):x=`failed`,U(!0)};t.addEventListener(`webglcontextlost`,Z),t.addEventListener(`webglcontextrestored`,Q);let $=()=>{I=null,!F&&(R()||(x=`failed`,e.setAttribute(`data-fallback`,``)),V(),U(!0))};if(typeof window.requestIdleCallback==`function`){let e=window.requestIdleCallback($,{timeout:300});I=()=>window.cancelIdleCallback(e)}else{let e=setTimeout($,32);I=()=>clearTimeout(e)}return()=>{F=!0,I&&I(),A&&cancelAnimationFrame(A),A=0,o.current=()=>{},G?G.disconnect():window.removeEventListener(`resize`,W),window.removeEventListener(`pointermove`,K),window.removeEventListener(`pointerdown`,K),window.removeEventListener(`pointerup`,q),window.removeEventListener(`pointercancel`,q),document.removeEventListener(`mouseout`,J),window.removeEventListener(`blur`,Y),c.removeEventListener(`change`,X),t.removeEventListener(`webglcontextlost`,Z),t.removeEventListener(`webglcontextrestored`,Q),z(),x=`idle`,e.removeAttribute(`data-ready`),e.removeAttribute(`data-fallback`);let n=u&&!u.isContextLost()?u.getExtension(`WEBGL_lose_context`):null;n&&setTimeout(()=>{t.isConnected||n.loseContext()},0)}},[]),(0,d.useEffect)(()=>{i.current=e,o.current()},[e]),(0,d.useEffect)(()=>{a.current=t,o.current(!0)},[t]),(0,f.jsxs)(f.Fragment,{children:[(0,f.jsx)(`div`,{ref:n,className:`scene4-heat${e?``:` is-paused`}`,"aria-hidden":`true`,children:(0,f.jsx)(`canvas`,{ref:r,className:`scene4-heat-canvas`})}),(0,f.jsx)(`div`,{className:`scene4-heat-veil`,"aria-hidden":`true`})]})}function j(e){let[t,n]=(0,d.useState)(e);return(0,d.useEffect)(()=>{if(t)return;if(e){n(!0);return}if(typeof window.requestIdleCallback==`function`){let e=window.requestIdleCallback(()=>n(!0),{timeout:2500});return()=>window.cancelIdleCallback(e)}let r=setTimeout(()=>n(!0),1200);return()=>clearTimeout(r)},[e,t]),t||e}function M({active:e}){let{t}=n(),{isDark:r}=i(),a=j(e);return(0,f.jsxs)(`div`,{className:`scene-inner scene4-root`,children:[(0,f.jsx)(A,{active:e,isDark:r}),(0,f.jsx)(`div`,{className:`scene4-content`,children:(0,f.jsxs)(`div`,{className:`split`,children:[(0,f.jsxs)(`div`,{className:`scene-text`,children:[(0,f.jsxs)(`span`,{className:`eyebrow stroke-hair`,children:[(0,f.jsx)(`span`,{className:`eyebrow-dot`,style:{background:p}}),t(`scene4.eyebrow`)]}),(0,f.jsxs)(`div`,{style:{margin:`10px 0 20px`,whiteSpace:`nowrap`,display:`inline-flex`,alignItems:`baseline`,gap:`0.02em`},children:[(0,f.jsx)(`span`,{className:`letter-giant stroke-lg`,style:{color:p,flexShrink:0},children:`T`}),(0,f.jsx)(`span`,{className:`letter-suffix stroke-sm`,style:{flexShrink:0},children:`hermodynamic`})]}),(0,f.jsx)(`p`,{className:`body-line`,style:{maxWidth:`38ch`},children:t(`scene4.description`)})]}),(0,f.jsx)(`div`,{className:`visual-pane`,children:(0,f.jsx)(`div`,{className:`instrument-frame`,children:a?(0,f.jsx)(S,{active:e}):null})})]})})]})}export{M as default};