/** Low-poly procedural mesh, not a raster portrait. 26 reusable parts, 8,320 triangles. */
export const ROBOT_PARTS = 26;
export const ROBOT_VERTICES = 16 * 10 * 6;
export const ROBOT = /* wgsl */ `
@group(0) @binding(1) var behind: texture_2d<f32>;
@group(0) @binding(2) var linear: sampler;
struct RobotSurface {
 @builtin(position) position: vec4f,
 @location(0) normal: vec3f,
 @location(1) world: vec3f,
 @location(2) @interpolate(flat) part: u32,
 @location(3) local: vec3f,
}
fn turn(q: vec3f, yaw: f32, pitch: f32) -> vec3f {
 let a = vec3f(cos(yaw)*q.x+sin(yaw)*q.z,q.y,-sin(yaw)*q.x+cos(yaw)*q.z);
 return vec3f(a.x,cos(pitch)*a.y-sin(pitch)*a.z,sin(pitch)*a.y+cos(pitch)*a.z);
}
const TASK_REACTION = true;
// Same phase as the incoming planning thread. The reaction is an illustration, not telemetry.
fn taskNotice() -> f32 {
 if(!TASK_REACTION){return 0.0;}
 let speed = .09 + hash(4.7)*.045;
 let phase = fract(1.0-scene.view.z*speed+hash(2.3));
 let distance = min(phase,1.0-phase);
 return exp(-pow(distance/.045,2.0));
}
@vertex fn vs_main(@builtin(vertex_index) v: u32,@builtin(instance_index) part: u32) -> RobotSurface {
 var centers = array<vec3f,26>(
 vec3f(0,.94,0), vec3f(0,.23,0), vec3f(0,-.22,0),vec3f(0,-.4,0),
 vec3f(-.42,.43,0),vec3f(.42,.43,0),vec3f(-.48,.08,0),vec3f(.48,.08,0),
 vec3f(-.51,-.28,.02),vec3f(.51,-.28,.02),vec3f(-.52,-.51,.07),vec3f(.52,-.51,.07),
 vec3f(-.17,-.67,0),vec3f(.17,-.67,0),vec3f(-.17,-.98,0),vec3f(.17,-.98,0),
 vec3f(-.17,-1.25,.07),vec3f(.17,-1.25,.07),vec3f(0,.95,.18),vec3f(0,.26,.205),
 vec3f(0,.67,0),vec3f(-.43,.43,.10),vec3f(.43,.43,.10),vec3f(0,.04,.18),vec3f(-.195,.94,0),vec3f(.195,.94,0));
 var sizes = array<vec3f,26>(
 vec3f(.18,.225,.17),vec3f(.32,.34,.18),vec3f(.17,.12,.12),vec3f(.25,.14,.14),
 vec3f(.13,.14,.14),vec3f(.13,.14,.14),vec3f(.085,.23,.09),vec3f(.085,.23,.09),
 vec3f(.07,.17,.08),vec3f(.07,.17,.08),vec3f(.065,.09,.055),vec3f(.065,.09,.055),
 vec3f(.10,.23,.115),vec3f(.10,.23,.115),vec3f(.07,.16,.08),vec3f(.07,.16,.08),
 vec3f(.09,.07,.18),vec3f(.09,.07,.18),vec3f(.15,.09,.020),vec3f(.065,.065,.015),
 vec3f(.07,.10,.07),vec3f(.065,.06,.018),vec3f(.065,.06,.018),vec3f(.15,.11,.024),vec3f(.035,.075,.08),vec3f(.035,.075,.08));
 let corner=stripCorner(v%6u);
 let quad=v/6u;
 let theta=(f32(quad%16u)+corner.x)/16.0*TAU;
 let phi=(f32(quad/16u)+corner.y*.5+.5)/10.0*3.1415927;
 let sphere=vec3f(sin(phi)*cos(theta),cos(phi),sin(phi)*sin(theta));
 var q=sphere*sizes[part];
 var normal=normalize(sphere/sizes[part]);
 if(part==0u||part==1u||part==3u||part==4u||part==5u||part==16u||part==17u){
  q=sign(sphere)*pow(abs(sphere),vec3f(.55))*sizes[part];
  normal=normalize(sign(sphere)*pow(abs(sphere),vec3f(1.45))/sizes[part]);
  if(part==0u){q.x*=.85+.15*sphere.y;}
  if(part==1u){q.x*=.75+.22*sphere.y;}
 }

 let notice=taskNotice();
 let head=part==0u||part==18u||part==24u||part==25u;
 let torso=part==1u||part==19u||part==23u;
 // Pointer already has exponential damping in the shared frame loop.
 let taskPhase=fract(1.0-scene.view.z*(.09+hash(4.7)*.045)+hash(2.3));
 let dispatch=select(0.0,exp(-pow((taskPhase-.91)/.035,2.0)),TASK_REACTION);
 let headYaw=scene.motion.z*.38-notice*.22+dispatch*.17+sin(scene.view.z*.43)*.018;
 let headPitch=-scene.motion.w*.18+notice*.06;
 if(head){q=turn(q,headYaw,headPitch);normal=turn(normal,headYaw,headPitch);}
 var center=centers[part];
 if(part==18u||part==24u||part==25u){center=centers[0]+turn(center-centers[0],headYaw,headPitch);}
 let breath=sin(scene.view.z*1.3)*.008;
 if(torso||head||part==20u){center.y+=breath;}
 q+=center;
 let bodyYaw=.20+scene.motion.z*.065+sin(scene.view.z*.37)*.016;
 q=turn(q,bodyYaw,0.0);
 normal=turn(normal,bodyYaw,0.0);
 // A slight shift of weight; no continuous React updates or physics.
 q.x+=sin(scene.view.z*.6)*.007;
 var out:RobotSurface;
 let projection=scene.ring.xy+q.xy*(5.0/(5.0-q.z))*scene.ring.z;
 out.position=vec4f((projection-scene.band.xy)/scene.band.zw,.5-q.z*.2,1.0);
 out.normal=normal;out.world=q;out.part=part;out.local=sphere;
 return out;
}
@fragment fn fs_main(s:RobotSurface)->@location(0) vec4f{
 let n=normalize(s.normal);
 let view=normalize(vec3f(0,0,5)-s.world);
 let key=normalize(vec3f(-.7,.9,1.2));
 let edge=normalize(vec3f(.9,.15,-.3));
 let diffuse=max(dot(n,key),0.0);
 let rim=pow(1.0-max(dot(n,view),0.0),3.0);
 let h=normalize(key+view);let nv=max(dot(n,view),.001);let nh=max(dot(n,h),.001);
 let rough=.32;let a=rough*rough;let a2=a*a;let d=nh*nh*(a2-1.0)+1.0;
 let distribution=a2/(3.14159*d*d);let k=(rough+1.0)*(rough+1.0)/8.0;
 let geometry=(nv/(nv*(1.0-k)+k))*(diffuse/(diffuse*(1.0-k)+k));
 let cool=max(dot(n,edge),0.0);
 var base=vec3f(.008,.012,.017);
 if(s.part==0u||s.part==1u||s.part==4u||s.part==5u){base=vec3f(.02,.027,.033);}
  let fresnel=base+(1.0-base)*pow(1.0-max(dot(h,view),0.0),5.0);
 if(s.part==24u||s.part==25u){base=vec3f(.08,.045,.014);}
 var light=base*(.4+diffuse*.8)+distribution*geometry*fresnel/(4.0*nv*max(diffuse,.001))*diffuse*.8+vec3f(.22,.52,.63)*(cool*.025+rim*.045);
 if(s.part==18u){
  light=vec3f(.003,.009,.015)+vec3f(.04,.10,.13)*rim;
  if(abs(s.local.y-.25)<.10&&abs(s.local.x)>.15&&abs(s.local.x)<.82){light+=vec3f(.04,.25,.34);}
 }
 if(s.part==19u){light=vec3f(1.,.56,.18)*(.12+taskNotice()*.6+.02*sin(scene.view.z*1.3));}
 if(s.part==21u||s.part==22u){light=vec3f(.37,.27,.68)*(.45+rim);}
 // The lower torso has a thin smoky glass inset, using the existing scene refraction texture.
 let uv=toUv(scene.ring.xy+s.world.xy*scene.ring.z);
 let direct=textureSampleLevel(behind,linear,uv,0.0).rgb;
 if(s.part==23u){light=direct*.3+vec3f(.004,.01,.013)+vec3f(.22,.52,.63)*rim*.04;}
 return vec4f(light-direct,0.0);
}
`;
