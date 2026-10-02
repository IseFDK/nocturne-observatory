export const noiseGLSL = /* glsl */`
float hash(vec3 p) { p = fract(p * .3183099 + vec3(.1, .2, .3)); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x) { vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p) { float a=.5, result=0.; for(int i=0;i<5;i++){result+=a*noise(p);p=p*2.03+vec3(4.4,1.8,6.1);a*=.5;}return result; }
`;
export const sphereVertex = /* glsl */`
varying vec3 vPosition; varying vec3 vNormal; varying vec3 vView;
void main(){vPosition=position; vec4 world=modelMatrix*vec4(position,1.); vNormal=normalize(mat3(modelMatrix)*normal); vView=cameraPosition-world.xyz; gl_Position=projectionMatrix*viewMatrix*world;}
`;
export const planetFragment = /* glsl */`
uniform float uKind; uniform float uLight; varying vec3 vPosition; varying vec3 vNormal; varying vec3 vView;
${noiseGLSL}
void main(){
 vec3 p=normalize(vPosition); float n=fbm(p*7.); vec3 color;
 if(uKind<.5){
  float turbulence=fbm(p*4.+vec3(0.,n*1.7,0.));
  float bands=sin(p.y*43.+turbulence*13.+sin(p.x*5.+p.z*6.)*1.1)*.5+.5;
  float fine=fbm(p*46.); float swirls=smoothstep(.34,.74,fbm(vec3(p.x*13.,p.y*29.,p.z*13.)));
  vec3 deep=vec3(.17,.115,.079); vec3 warm=vec3(.56,.37,.23); vec3 pale=vec3(.76,.64,.47);
  color=mix(deep,warm,bands*.8+.18);color=mix(color,pale,swirls*.38+n*.33);color*=.75+fine*.45;
 }else{
  float crust=fbm(p*5.6); float grain=fbm(p*48.);
  float fissure=abs(sin((p.y*3.2+p.x*2.+fbm(p*3.)*3.3)*13.));
  float crack=1.-smoothstep(.025,.11,fissure);
  color=mix(vec3(.12,.22,.25),vec3(.56,.65,.65),smoothstep(.24,.7,crust));
  color=mix(color,vec3(.035,.13,.17),crack*.65);color*=.75+grain*.42;
 }
 vec3 light=normalize(vec3(-.7,.8,.8)); float diffuse=max(dot(normalize(vNormal),light),0.);
 float rim=pow(1.-max(dot(normalize(vNormal),normalize(vView)),0.),3.5);
 vec3 shade=color*(.033+diffuse*uLight*.97);shade+=color*rim*.09;
 gl_FragColor=vec4(shade,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
export const ringVertex = /* glsl */`varying vec3 vPosition; varying vec3 vWorld; void main(){vPosition=position;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;
export const ringFragment = /* glsl */`
uniform float uLight; varying vec3 vPosition; varying vec3 vWorld; ${noiseGLSL}
void main(){
 float r=length(vPosition.xy);float unit=(r-1.87)/1.48;
 float stripes=.5+.5*sin(r*129.+sin(r*31.)*.8);float thin=.5+.5*sin(r*370.);
 float gap=1.-smoothstep(.017,.047,abs(r-2.69));
 float outer=smoothstep(0.,.12,unit)*(1.-smoothstep(.82,1.,unit));
 float dust=(.3+stripes*.24+thin*.15)*(1.-gap*.83)*outer;
 vec3 color=mix(vec3(.20,.165,.115),vec3(.62,.52,.36),stripes*.65+thin*.3);
 vec3 direction=normalize(vec3(-.7,.8,.8));float along=dot(vWorld,direction);float perp=length(vWorld-direction*along);
 float shadow=mix(.18,1.,clamp(smoothstep(1.42,1.65,perp)+step(0.,along),0.,1.));
 color*=shadow*uLight;
 gl_FragColor=vec4(color,dust);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
export const starFragment = /* glsl */`
uniform float uTime;uniform float uCool;uniform float uLight;varying vec3 vPosition;varying vec3 vNormal;varying vec3 vView;${noiseGLSL}
void main(){
 vec3 p=normalize(vPosition);float grain=fbm(p*9.+uTime*.025);float cells=fbm(p*31.+vec3(grain*2.));
 vec3 warm=mix(vec3(.72,.23,.065),vec3(1.,.78,.34),smoothstep(.23,.72,cells));
 vec3 cool=mix(vec3(.17,.42,.68),vec3(.69,.88,.97),smoothstep(.22,.65,cells));
 vec3 color=mix(warm,cool,uCool);float facing=max(dot(normalize(vNormal),normalize(vView)),0.);color*=.5+pow(facing,.3)*.65;
 gl_FragColor=vec4(color*uLight,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
export const glowVertex = sphereVertex;
export const glowFragment = /* glsl */`uniform vec3 uColor; uniform float uStrength; varying vec3 vNormal; varying vec3 vView; void main(){float f=max(dot(normalize(vNormal),normalize(vView)),0.);float rim=pow(1.-f,3.6);gl_FragColor=vec4(uColor,rim*uStrength);}`;
export const pointVertex = /* glsl */`attribute float aSize; varying float vAlpha; uniform float uScale; void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aSize*uScale/(-p.z),.65,3.2);vAlpha=clamp(aSize*.12,.12,.65);}`;
export const pointFragment = /* glsl */`uniform vec3 uColor; varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.1,.5,d))*vAlpha;gl_FragColor=vec4(uColor,a);}`;
