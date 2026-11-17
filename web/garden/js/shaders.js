// @ts-check
export const voxelVertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in uvec4 a;
uniform mat4 vp,model,lightVP;
uniform sampler2D palette;
uniform float time,animated;
out vec3 world,normal;
out vec4 tint;
out vec4 lightPos;
out float ao,emission,material;
const vec3 N[6]=vec3[6](vec3(1,0,0),vec3(-1,0,0),vec3(0,1,0),vec3(0,-1,0),vec3(0,0,1),vec3(0,0,-1));
void main(){
 uint id=a.w&255u; material=float(id);
 vec4 info=texelFetch(palette,ivec2(int(id),1),0);
 vec3 p=vec3(a.xyz);
 if(animated>0.5) p.x+=sin(p.z*0.65+time*4.)*max(0.,p.z-3.)*.13;
 p.x+=sin(time*1.3+p.y*.12+p.z*.15)*info.r*.35;
 world=(model*vec4(p,1)).xyz;
 normal=mat3(model)*N[(a.w>>8u)&7u];
 tint=texelFetch(palette,ivec2(int(id),0),0);
 ao=float((a.w>>11u)&3u)/3.; emission=info.g;
 lightPos=lightVP*vec4(world,1);
 gl_Position=vp*vec4(world,1);
}`;
export const voxelFragment = `#version 300 es
precision highp float;
in vec3 world,normal;
in vec4 tint,lightPos;
in float ao,emission,material;
uniform highp sampler2DShadow shadowMap;
uniform vec3 eye;
uniform float time,waterPass;
out vec4 color;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float shadow(){
 vec3 p=lightPos.xyz/lightPos.w*.5+.5;
 if(any(lessThan(p,vec3(0)))||any(greaterThan(p,vec3(1)))) return 1.;
 float s=0.;float bias=max(.0004,.0012*(1.-dot(normal,normalize(vec3(-.7,1.,.4)))));
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++) s+=texture(shadowMap,vec3(p.xy+vec2(x,y)/2048.,p.z-bias));
 return s/9.;
}
void main(){
 vec3 n=normalize(normal),sun=normalize(vec3(-.7,1.,.4));
 float d=max(dot(n,sun),0.),sh=shadow();
 float jitter=(hash(floor(world-n*.01))-.5)*tint.a*1.6;
 vec3 base=tint.rgb*(1.+jitter);
 vec3 lit=base*(vec3(.39,.46,.48)*(0.62+0.38*max(n.y,0.))*(.58+.42*ao)+vec3(1.02,.78,.47)*d*(.2+.8*sh));
 // Warm pools cast by the porch and the stone lantern.
 vec3 lamps[3]=vec3[3](vec3(29,45,87),vec3(105,45,87),vec3(66,39,131));
 for(int i=0;i<3;i++){float dist=length(lamps[i]-world);lit+=base*vec3(1.,.44,.12)*max(0.,1.-dist/28.)*.55;}
 lit=mix(lit,base*1.25+vec3(.15,.055,.005),emission);
 // Fine seams make merged surfaces read as tiny individual voxels.
 vec3 q=abs(fract(world)-.5);float edge=max(n.x*n.x>.5?0.:q.x,max(n.y*n.y>.5?0.:q.y,n.z*n.z>.5?0.:q.z));
 float fade=1.-smoothstep(480.,1050.,length(eye-world));lit*=1.-smoothstep(.46,.50,edge)*.075*fade;
 if(waterPass>.5){
   float wave=sin(world.x*.31+world.z*.38+time*1.4)+sin(world.z*.82-time*1.8);
   float ripple=pow(max(0.,sin(world.x*.4+world.z*.67+wave*.6+time)),16.);
   float fres=pow(1.-max(dot(normalize(eye-world),n),0.),3.);
   lit=mix(vec3(.055,.24,.29),vec3(.34,.58,.62),fres*.7)+ripple*vec3(.13,.21,.2);
   // Scattered reflected sunset lines.
   lit+=pow(max(0.,sin(world.z*1.7+time*.6+wave)),38.)*.10*vec3(1.,.73,.42);
 }
 float fog=smoothstep(300.,1250.,length(eye-world))*.19;
 lit=mix(lit,vec3(.61,.66,.68),fog);
 color=vec4(pow(max(lit,vec3(0)),vec3(.89)),waterPass>.5?.69:1.);
}`;
export const depthVertex = `#version 300 es
precision highp float;
layout(location=0) in uvec4 a;
uniform mat4 vp;
void main(){gl_Position=vp*vec4(vec3(a.xyz),1);}`;
export const depthFragment = `#version 300 es
precision highp float;
void main(){}`;
export const skyVertex = `#version 300 es
out vec2 uv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,.999,1.);}`;
export const skyFragment = `#version 300 es
precision highp float;
in vec2 uv;
uniform vec2 resolution;
out vec4 color;
float ridge(float x,float layer){
 x=floor(x*180.)/180.;
 return .26+layer*.045+sin(x*12.+layer*1.6)*.028+sin(x*29.+layer)*.018+sin(x*62.)*.005;
}
void main(){
 vec2 p=uv;vec3 col=mix(vec3(.89,.76,.64),vec3(.42,.51,.63),smoothstep(.2,1.,p.y));
 col=mix(col,vec3(.96,.75,.60),exp(-pow((p.y-.51)*4.,2.))*.55);
 vec2 delta=(p-vec2(.74,.60))*vec2(resolution.x/resolution.y,1.);
 float sun=1.-smoothstep(.032,.035,length(delta));
 col+=vec3(.17,.105,.03)*exp(-length(delta)*13.);col=mix(col,vec3(1.,.88,.61),sun*.8);
 for(int i=2;i>=0;i--){float f=float(i);float r=ridge(p.x,f);float mask=1.-smoothstep(r,r+.003,p.y);col=mix(col,mix(vec3(.33,.43,.49),vec3(.55,.60,.65),f/3.),mask*.43);}
 col=mix(col,vec3(.73,.75,.72),smoothstep(.27,0.,p.y)*.7);
 float vignette=1.-dot((p-.5)*vec2(.7,1.),(p-.5)*vec2(.7,1.))*.18;
 color=vec4(col*vignette,1.);
}`;
export const petalVertex = `#version 300 es
precision highp float;
layout(location=0) in vec4 seed;
uniform mat4 vp;
uniform float time,pixelRatio;
out float glow,phase;
void main(){
 float t=time*.65+seed.w*23.;
 bool firefly=seed.w>.76;
 vec3 p=seed.xyz;
 if(firefly){p+=vec3(sin(t*.8)*4.,sin(t*1.4)*2.,cos(t*.6)*4.);}
 else{p.y=24.+mod(seed.y-24.-t*1.6,76.);p.x+=sin(t*.23+seed.w*8.)*9.+(100.-p.y)*.13;p.z+=cos(t*.3+seed.w*7.)*6.;}
 gl_Position=vp*vec4(p,1.);
 gl_PointSize=(firefly?3.:3.6)*pixelRatio;
 glow=firefly?(sin(t*1.6)*.3+.7):0.;phase=seed.w;
}`;
export const petalFragment = `#version 300 es
precision highp float;
in float glow,phase;
out vec4 color;
void main(){
 vec2 p=gl_PointCoord-.5;
 float a=1.-smoothstep(.23,.49,length(p*vec2(1.,1.3)));
 if(a<.05)discard;
 vec3 c=glow>0.?vec3(1.,.89,.46):mix(vec3(.94,.63,.71),vec3(1.,.83,.86),phase);
 color=vec4(c,a*(glow>0.?glow:.78));
}`;
