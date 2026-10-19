/* One depth-buffered surface per product prevents CSS face compositing flicker. */
window.Wasay3D = function(canvas){
// Share a single GPU surface so long catalogues cannot exhaust browser context limits.
const surface=window.__wasayRenderSurface||(window.__wasayRenderSurface=document.createElement('canvas'));
const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});if(!gl)throw Error('WebGL unavailable');const output=canvas.getContext('2d');
const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
const shared=window.__wasay3DShared||(window.__wasay3DShared={});
if(!shared.program){const program=gl.createProgram();shared.program=program;
gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 p;attribute vec3 n;attribute vec2 uv;uniform vec2 angle;uniform float scale;uniform float aspect;varying vec2 v;varying vec3 normal;void main(){float cy=cos(angle.x),sy=sin(angle.x),cx=cos(angle.y),sx=sin(angle.y);mat3 ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy);mat3 rx=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx);vec3 pos=rx*ry*p;normal=rx*ry*n;float perspective=1.-pos.z/12.;gl_Position=vec4(pos.x*scale/aspect,pos.y*scale,-pos.z/12.,perspective);v=uv;}'));
gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 v;varying vec3 normal;uniform sampler2D photo;uniform vec3 color;uniform float textured;uniform float lighting;uniform float specular;void main(){vec4 c=mix(vec4(color,1.),texture2D(photo,v),textured);vec3 n=normalize(normal),l=normalize(vec3(-.4,.8,1.4));float light=.76+.24*max(0.,dot(n,l));vec3 h=normalize(l+vec3(0.,0.,1.));float shine=pow(max(0.,dot(n,h)),38.)*specular;gl_FragColor=vec4(c.rgb*mix(1.,light,lighting)+vec3(shine),c.a);}'));
gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);}
const program=shared.program;
const attrs=['p','n','uv'].map(n=>gl.getAttribLocation(program,n));const uniforms={};for(const n of ['angle','scale','aspect','photo','color','textured','lighting','specular'])uniforms[n]=gl.getUniformLocation(program,n);
const meshes=[];
function add(vertices,photo,color=[.89,.92,.91],lighting=1,specular=0){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);let texture=null;if(photo){texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}meshes.push({buffer,texture,color,lighting,specular,count:vertices.length/8});}
function draw(y,x,scale){const W=canvas.width,H=canvas.height;if(surface.width<W||surface.height<H){surface.width=Math.max(surface.width,W);surface.height=Math.max(surface.height,H);}gl.useProgram(program);gl.viewport(0,0,W,H);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform2f(uniforms.angle,y,x);gl.uniform1f(uniforms.scale,scale);gl.uniform1f(uniforms.aspect,canvas.width/canvas.height);for(const m of meshes){gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);attrs.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,i===2?2:3,gl.FLOAT,false,32,[0,12,24][i]);});gl.uniform3fv(uniforms.color,m.color);gl.uniform1f(uniforms.textured,m.texture?1:0);gl.uniform1f(uniforms.lighting,m.lighting);gl.uniform1f(uniforms.specular,m.specular);if(m.texture){gl.bindTexture(gl.TEXTURE_2D,m.texture);gl.uniform1i(uniforms.photo,0);}gl.drawArrays(gl.TRIANGLES,0,m.count);}output.clearRect(0,0,W,H);output.drawImage(surface,0,surface.height-H,W,H,0,0,W,H);}
return {add,draw};
};
window.Wasay3DQuad=function(points,normal){const vertices=[];for(const i of [0,1,2,0,2,3])vertices.push(...points[i],...normal,...[[0,0],[1,0],[1,1],[0,1]][i]);return vertices;};

/* The 3D canvas has empty space round the model, so a product floats well above the name under it and leaves a gap above it too.
   WasayFitMeasure finds the model's highest and lowest pixels (as fractions of the canvas), WasayFitNumbers turns that into --trim
   (how much shorter the tile can be) and --drop (how far the canvas moves, up) so the product stands a small distance above the
   bottom of its box with little spare above it. The numbers are measured ahead of time by scripts/render-cutouts.mjs and stored as
   "fit" in tablets-data.json and pastes-data.json, so tiles have their final height before their 3D model is built; WasayFit measures
   live for a product that has no stored fit. Rows are bottom-aligned, so the names stay on one line. */
window.WasayFitMeasure=function(canvas){try{const w=96,h=120,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(canvas,0,0,w,h);const d=x.getImageData(0,0,w,h).data;const has=r=>{for(let k=0;k<w;k++)if(d[(r*w+k)*4+3]>24)return true;return false;};let top=-1,bottom=-1;for(let r=0;r<h&&top<0;r++)if(has(r))top=r;for(let r=h-1;r>=0&&bottom<0;r--)if(has(r))bottom=r;if(top<0||bottom<0)return null;return{top:top/h,bottom:1-(bottom+1)/h};}catch(e){return null;}};
window.WasayFitNumbers=function(m,gap,H){H=H||320;const eT=m.top*H,eB=m.bottom*H;return[Math.max(0,Math.min(Math.round(H*.7),Math.round(eB+eT-gap-12))),Math.round(12-eT)];};
window.WasayFit=function(view,canvas,gap){const m=WasayFitMeasure(canvas);if(!m)return;const n=WasayFitNumbers(m,gap,canvas.getBoundingClientRect().height||320);view.style.setProperty('--trim',n[0]+'px');view.style.setProperty('--drop',n[1]+'px');};
