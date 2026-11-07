/** Presentation meshes in the existing HDR pass; no new renderer or frame loop. */
export type StoryObjectKind = "prism" | "ledger" | "archive";
export function objectShader(kind: StoryObjectKind): string {
  return /* wgsl */ `
@group(0) @binding(1) var behind: texture_2d<f32>;
@group(0) @binding(2) var linear: sampler;
struct ObjectSurface {
 @builtin(position) position: vec4f,
 @location(0) normal: vec3f,
 @location(1) world: vec3f,
 @location(2) @interpolate(flat) part: u32,
}
fn rotateObject(q:vec3f)->vec3f {
 let yaw=.35+scene.motion.z*.10+sin(scene.view.z*.18)*.025;
 let a=vec3f(cos(yaw)*q.x+sin(yaw)*q.z,q.y,-sin(yaw)*q.x+cos(yaw)*q.z);
 let pitch=.22;
 return vec3f(a.x,cos(pitch)*a.y-sin(pitch)*a.z,sin(pitch)*a.y+cos(pitch)*a.z);
}
@vertex fn vs_main(@builtin(vertex_index) v:u32,@builtin(instance_index) part:u32)->ObjectSurface{
 var q:vec3f;
 var normal:vec3f;
 ${
   kind === "prism"
     ? `
 let face=v/3u;
 let corner=v%3u;
 var belt=array<vec3f,4>(vec3f(-.8,-.08,0),vec3f(0,-.08,.8),vec3f(.8,-.08,0),vec3f(0,-.08,-.8));
 let a=belt[face%4u];let b=belt[(face+1u)%4u];
 let top=vec3f(0,select(1.10,-.6,face>=4u),0);
 var tri=array<vec3f,3>(a,b,top);q=tri[corner];normal=normalize(cross(b-a,top-a));
 `
     : `
 // Six bevelled cuboid faces, each a reusable plate with its own depth.
 let face=v/6u;let corner=stripCorner(v%6u);let xy=vec2f(corner.x*2.0-1.0,corner.y);
 var normals=array<vec3f,6>(vec3f(0,0,1),vec3f(0,0,-1),vec3f(1,0,0),vec3f(-1,0,0),vec3f(0,1,0),vec3f(0,-1,0));
 normal=normals[face];
 if(face<2u){q=vec3f(xy,normal.z);}else if(face<4u){q=vec3f(normal.x,xy.y,xy.x);}else{q=vec3f(xy.x,normal.y,xy.y);}
 ${
   kind === "ledger"
     ? `q*=vec3f(.78,.085,.52);q.y+=(f32(part)-1.0)*.43;`
     : `
 q*=vec3f(.65,.105,.52);q.y+=(f32(part)-2.0)*.26;
 q.x+=select(0.0,.10,part==3u);
 `
 }
 `
 }
 q=rotateObject(q);normal=rotateObject(normal);
 let projection=scene.ring.xy+q.xy*(5.0/(5.0-q.z))*scene.ring.z;
 var out:ObjectSurface;
 out.position=vec4f((projection-scene.band.xy)/scene.band.zw,.5-q.z*.2,1.0);
 out.normal=normal;out.world=q;out.part=part;return out;
}
@fragment fn fs_main(s:ObjectSurface)->@location(0)vec4f {
 let view=normalize(vec3f(0,0,5)-s.world);var n=normalize(s.normal);
 if(dot(n,view)<0.0){n=-n;}
 let key=normalize(vec3f(-.7,1,1));let h=normalize(key+view);
 let nv=max(dot(n,view),.001);let nl=max(dot(n,key),.0);let nh=max(dot(n,h),.001);
 let rough=.30;let a=rough*rough;let a2=a*a;
 let denominator=nh*nh*(a2-1.0)+1.0;
 let distribution=a2/(3.14159*denominator*denominator);
 let k=(rough+1.0)*(rough+1.0)/8.0;
 let geometry=(nv/(nv*(1.0-k)+k))*(nl/(nl*(1.0-k)+k));
 let base=${kind === "prism" ? "vec3f(.065,.030,.12)" : kind === "ledger" ? "vec3f(.10,.065,.025)" : "vec3f(.025,.075,.085)"};
 let fresnel=base+(1.0-base)*pow(1.0-max(dot(h,view),0.0),5.0);
 let specular=distribution*geometry*fresnel/(4.0*nv*max(nl,.001));
 let rim=pow(1.0-nv,4.0);
 var light=base*(.3+nl*.6)+specular*nl*.65+vec3f(.12,.3,.36)*rim*.12;
 ${
   kind === "prism"
     ? `
 let bend=n.xy*vec2f(1,-1)*.025;
 let seen=textureSampleLevel(behind,linear,toUv(scene.ring.xy+s.world.xy*scene.ring.z)+bend,0.0).rgb;
 light+=seen*.40+vec3f(.24,.12,.40)*rim*.15;
 `
     : `
 // Thin data inlays across the front of each physical layer.
 if(n.z>.5&&abs(s.world.y-${kind === "ledger" ? "(f32(s.part)-1.0)*.43" : "(f32(s.part)-2.0)*.26"})<.013){light+=vec3f(.05,.30,.33)*.6;}
 `
 }
 let direct=textureSampleLevel(behind,linear,toUv(scene.ring.xy+s.world.xy*scene.ring.z),0.0).rgb;
 return vec4f(light-direct,0.0);
}
`;
}
