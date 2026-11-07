/// <reference types="@webgpu/types" />
import {
  ADDITIVE,
  BLOOM,
  BLOOM_STRENGTH,
  BLOOM_WEIGHT,
  createKit,
  DOWNSAMPLE,
  HALF,
  openGpu,
  PREFILTER,
  TONE,
  UPSAMPLE,
} from "@/components/sutra/gpu-stage";
import { nextTier, TIERS, type Tier } from "@/components/sutra/hero-quality";
import type { PageMotif } from "./PageStage";

const vertex = `struct Out{@builtin(position) p:vec4f,@location(0) uv:vec2f}; @vertex fn vs(@builtin(vertex_index) i:u32)->Out{let q=vec2f(f32((i<<1u)&2u),f32(i&2u));var o:Out;o.p=vec4f(q*2.-1.,0.,1.);o.uv=vec2f(q.x,1.-q.y);return o;}`;
const BASE = `struct Out{@builtin(position) p:vec4f,@location(0) uv:vec2f}; struct View{size:vec2f,time:f32,opening:f32,pointer:vec2f,pad:vec2f}; @group(0) @binding(0) var<uniform> v:View;
fn sq(x:f32)->f32{return x*x;} fn q4(x:f32)->f32{return sq(sq(x));} fn hash2(p:vec2f)->f32{return fract(sin(dot(p,vec2f(127.1,311.7)))*43758.5453);}
fn seg(p:vec2f,a:vec2f,b:vec2f)->f32{let q=p-a;let d=b-a;return length(q-d*clamp(dot(q,d)/max(dot(d,d),1e-5),0.,1.));}
fn dust(p:vec2f,scale:f32,seed:f32,speed:f32)->f32{let cell=floor(p*vec2f(scale*1.55,scale*.55));let h=hash2(cell+seed);let centre=(cell+vec2f(.18+hash2(cell+seed+2.)*.64,.18+hash2(cell+seed+5.)*.64))/vec2f(scale*1.55,scale*.55);let drift=vec2f(sin(v.time*.18+seed+h*6.)*.002,sin(v.time*speed+h*6.)*.008);let delta=(p-centre-drift)*vec2f(scale*1.55,scale*.55);return exp(-dot(delta,delta)*1700.)*smoothstep(.93,.99,h);}
fn haze(p:vec2f,subject:vec2f)->f32{let q=(p-subject)*vec2f(1.25,1.);let d=length(q);let n=sin(p.x*10.+v.time*.08+sin(p.y*13.))*sin(p.y*8.-v.time*.06);let n2=sin(p.x*23.-v.time*.04+sin(p.y*19.))*sin(p.y*17.);return exp(-d*3.4)*(.58+.2*n+.12*n2);}
fn clearOfCopy(x:f32)->f32{return select(1.,smoothstep(.34,.43,x),v.size.x/v.size.y>1.6);}
fn treeBranch(level:u32,index:u32,aspect:f32)->vec4f{var a=vec2f(.7*aspect,.97);var angle=-1.5708;var len=.25;for(var k:u32=1u;k<=level;k=k+1u){a+=vec2f(cos(angle),sin(angle))*len;len*=.7;let prefix=index>>(level-k);angle+=select(-.52,.52,(prefix&1u)==1u)+(hash2(vec2f(f32(k),f32(prefix)))-.5)*.42+sin(v.time*.17+f32(prefix)*1.7+f32(k))*.025;}return vec4f(a,a+vec2f(cos(angle),sin(angle))*len);}`;
export const motifs: Record<PageMotif, string> = {
  about: `let p=uv;let t=v.time;let merge=smoothstep(.4,.62,p.x);var c=vec3f(0.);for(var i:u32=0u;i<4u;i=i+1u){let front=i==0u||i==2u;let phase=f32(i)*1.5708+t*.22;let base=.34+f32(i)*.105;let amp=.105*(1.-smoothstep(.36,.66,p.x));let yy=base+sin((p.x-.42)*13.+phase)*amp+select(-.004,.004,front)*v.pointer.x;let dist=abs(p.y-yy);let depth=select(.48,1.,front);let line=exp(-dist*select(560.,900.,front))*depth*(1.-merge);c+=vec3f(.12,.74,.66)*line*2.15;}let goldY=.49+sin(t*.22)*.008;let gold=exp(-abs(p.y-goldY)*760.)*smoothstep(.39,.62,p.x);let glint=exp(-sq((p.x-(.69+fract(t*.055)*.24))/.014))*gold*2.;c+=vec3f(1.7,1.14,.54)*gold*1.5+vec3f(2.2,1.6,.82)*glint;return c;`,
  experience: `let p=uv;let t=v.time;let flowY=.56+sin(p.x*4.2-t*.12)*.018+(p.x-.58)*.025;let river=exp(-abs(p.y-flowY)*400.)*select(1.,smoothstep(.43,.5,p.x),v.size.x/v.size.y>1.6);var c=vec3f(.08,.58,.55)*river*.65;let pulse=fract(t*.105);let pulseX=.43+pulse*.54;let pulseBeam=exp(-sq((p.x-pulseX)/.018))*river;c+=vec3f(.42,1.15,.92)*pulseBeam*2.;let echoX=.43+fract(pulse+.48)*.54;c+=vec3f(.13,.42,.4)*exp(-sq((p.x-echoX)/.024))*river*.8;for(var i:u32=0u;i<%COUNT%u;i=i+1u){let f=select(f32(i)/f32(max(%COUNT%u-1u,1u)),.5,%COUNT%u==1u);let x=.48+f*.46;let scale=mix(.64,1.24,f);let centre=vec2f(x,flowY+(p.x-x)*.07);let q=(p-centre)*vec2f(1.65,1.);let radius=mix(.020,.035,f);let ellipse=abs(length(q/vec2f(radius*1.8,radius))-1.);let nearest=select(.5,1.,i==%COUNT%u-1u);let passing=exp(-sq((pulseX-x)/.055));let rim=exp(-ellipse*120.)*scale;let inner=exp(-abs(length(q/vec2f(radius*1.45,radius*.81))-1.)*170.)*scale;c+=vec3f(1.25,.78,.35)*rim*(.46+nearest*.72+passing*.8)+vec3f(.18,.92,.83)*inner*.75;}return c;`,
  writing: `let p=uv;let t=v.time;let start=.48;let duration=2.25;let current=u32(floor(t/duration))%6u;let progress=fract(t/duration);let planeY=.52+(p.x-start)*.06;let plane=smoothstep(.39,.48,p.x)*(1.-smoothstep(.84,.93,p.x))*exp(-q4((p.y-planeY)/.34));var c=vec3f(.008,.023,.023)*plane;let fold=exp(-abs(p.y-planeY-.18)*24.)*.026*plane;c+=vec3f(.08,.16,.14)*fold;for(var i:u32=0u;i<6u;i=i+1u){let order=(current+6u-i)%6u;let isActive=order==0u;let y=.31+f32(i)*.071+(p.x-start)*.055;let phase=p.x*31.+sin(p.x*17.+f32(i)*2.)*.36+sin(p.x*69.+f32(i)*.7)*.075+sin(p.x*113.+f32(i)*1.7)*.025;let lineY=y+sin(p.x*9.+f32(i)*1.2)*.009+sin(p.x*21.+f32(i))*.003;let d=abs(p.y-lineY);let settled=exp(-f32(min(order,6u-order))*.88);let write=select(settled,smoothstep(progress-.025,progress+.015,(p.x-start)/.37),isActive);let stroke=exp(-d*1300.)*smoothstep(start,start+.016,p.x)*step(p.x,start+.37);let pigment=.26+.14*(.5+.5*sin(phase));let ink=stroke*write*.82;c+=vec3f(.24,.73,.65)*ink*pigment;let tipX=start+clamp(progress,0.,1.)*.37;let tip=exp(-sq((p.x-tipX)/.006))*exp(-d*420.)*select(0.,1.,isActive)*step(start,p.x)*step(p.x,start+.37);c+=vec3f(1.55,1.18,.68)*tip;}let mote=dust(p+vec2f(0.,sin(t*.025)*.01),4.2,9.,.025);return c+vec3f(.22,.4,.36)*mote*.32;`,
  learning: `let aspect=v.size.x/v.size.y;let p=vec2f(uv.x*aspect,uv.y);var c=vec3f(0.);for(var level:u32=0u;level<4u;level=level+1u){for(var j:u32=0u;j<(1u<<level);j=j+1u){let b=treeBranch(level,j,aspect);let growth=clamp((v.time-.35-f32(level)*.54)*1.35,0.,1.);let end=mix(b.xy,b.zw,growth);let d=seg(p,b.xy,end);let width=mix(.0022,.0011,f32(level)/3.);let core=exp(-d/width);let living=smoothstep(0.,.1,growth);c+=vec3f(.15,.82,.73)*core*living*.9;let node=exp(-sq(length(p-end)/.009))*smoothstep(.82,1.,growth);let breathe=.78+.22*sin(v.time*1.1+f32(j)*2.+f32(level));c+=vec3f(1.65,1.12,.48)*node*breathe;}}let root=exp(-sq(length((p-vec2f(.7*aspect,.97))*vec2f(1.,1.6))/.025));return c+vec3f(1.25,.78,.34)*root;`,
  contact: `let p=uv;let t=v.time;let start=vec2f(.57,.56);let dx=p.x-start.x;let y=.56-.18*sin(clamp(dx/.38,0.,1.)*3.1416);let d=abs(p.y-y);let path=step(start.x,p.x)*step(p.x,.96);let beam=exp(-d*410.)*path;let pulseX=start.x+fract(t*.11)*.39;let pulse=exp(-sq((p.x-pulseX)/.019))*beam;let echoX=start.x+.39-fract(t*.11+.24)*.39;let echo=exp(-sq((p.x-echoX)/.024))*beam;let r=length((p-start)*vec2f(1.2,1.));let emitter=exp(-r*39.);let starX=exp(-abs(p.y-start.y)*85.)*exp(-abs(p.x-start.x)*11.);let starY=exp(-abs(p.x-start.x)*85.)*exp(-abs(p.y-start.y)*12.);let pool=exp(-sq((p.x-start.x)/.12))*exp(-sq((p.y-.72)/.09));return vec3f(.08,.57,.53)*beam*.72+vec3f(1.1,.68,.32)*pulse*1.5+vec3f(.13,.48,.44)*echo*.62+vec3f(1.5,1.13,.65)*emitter+vec3f(.52,.75,.68)*(starX+starY)*.13+vec3f(.86,.49,.22)*pool*.6;`,
};
const bloomScene = `struct BloomScene{view:vec4f,extra:vec4f}; @group(0) @binding(0) var<uniform> scene:BloomScene;`;
const prefilterCode = `${bloomScene}${BLOOM}${PREFILTER}`;
const downsampleCode = `${BLOOM}${DOWNSAMPLE}`;
const upsampleCode = `${BLOOM}${UPSAMPLE}`;
export const toneCode = `${vertex} struct Tone{size:vec2f,time:f32,pad:f32}; @group(0) @binding(0) var hdr:texture_2d<f32>; @group(0) @binding(1) var bloom:texture_2d<f32>; @group(0) @binding(2) var smp:sampler; @group(0) @binding(3) var<uniform> frame:Tone; fn luma(c:vec3f)->f32{return dot(c,vec3f(.2126,.7152,.0722));} ${TONE} @fragment fn fs_main(i:Out)->@location(0) vec4f{let a=textureSampleLevel(hdr,smp,i.uv,0.).rgb;let b=textureSampleLevel(bloom,smp,i.uv,0.).rgb;var light=a+b*${BLOOM_STRENGTH}/${BLOOM_WEIGHT};light*=mix(vec3f(.9,1.02,1.05),vec3f(1.05,1.,.9),smoothstep(.02,1.5,luma(light)));var c=encode(agx(light));let d=i.uv-.5;let edge=smoothstep(.35,.95,length(d*vec2f(1.,1.3)));c*=1.-edge*.35;let n=fract(sin(dot(vec3f(floor(i.p.xy),floor(frame.time*24.)),vec3f(12.9898,78.233,37.719)))*43758.5453)-.5;c=max(c+n*.035*(.2+c*(1.-c)*2.5),vec3f(0.));return vec4f(c,1.);}`;

export async function createPageScene(
  canvas: HTMLCanvasElement,
  { small, motif, count }: { small: boolean; motif: PageMotif; count: number }
) {
  const gpu = await openGpu(canvas);
  const { device, context, format, failed } = gpu;
  let disposed = false;
  let running = false;
  let raf = 0;
  let last = 0;
  let time = 0;
  let tier: Tier = small ? "half" : "full";
  let samples: number[] = [];
  let aim: [number, number] = [0, 0];
  const pointer: [number, number] = [0, 0];
  let size: [number, number] = [1, 1];
  try {
    const { full, bind, texture, pass } = createKit(device);
    const uniform = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const sampler = device.createSampler({ minFilter: "linear", magFilter: "linear" });
    const motifCode =
      motif === "experience"
        ? motifs.experience.replaceAll("%COUNT%", String(count))
        : motifs[motif];
    const code = `${BASE} fn color(uv:vec2f)->vec3f{${motifCode}} @fragment fn fs_main(i:Out)->@location(0) vec4f{let aspect=v.size.x/v.size.y;let uv=i.uv+v.pointer*.012;let subject=vec2f(.73,.53);let clear=clearOfCopy(uv.x);let mobile=select(.35,1.,aspect>1.6);let opened=smoothstep(0.,1.,v.opening);let dist=length((uv-subject)*vec2f(1.,.92));let reveal=1.-smoothstep(opened*1.45-.04,opened*1.45+.04,dist);let base=mix(vec3f(.003,.011,.014),vec3f(.008,.023,.028),smoothstep(.02,.92,uv.y));let pool=exp(-sq(length((uv-subject)*vec2f(1.15,.9))*3.2))*opened;let volume=haze(uv,subject)*pool;let dustField=dust(uv+v.pointer*.008,3.6,1.,.018)+dust(uv+v.pointer*.014,6.3,7.,.032)+dust(uv+v.pointer*.021,8.1,13.,.048);let ground=exp(-sq((uv.y-.82)/.025))*exp(-sq((uv.x-.72)/.38))*.018*opened;let scene=base+vec3f(.015,.07,.068)*volume+vec3f(.1,.19,.16)*dustField*(.16+.84*opened)+vec3f(.48,.25,.11)*ground;let subjectLight=color(uv)*clear*mobile*reveal;return vec4f(scene+subjectLight,1.);}`;
    const scene = await full(code, [{ format: HALF }]);
    const prefilter = await full(prefilterCode, [{ format: HALF }]);
    const downsample = await full(downsampleCode, [{ format: HALF }]);
    const upsample = await full(upsampleCode, [{ format: HALF, blend: ADDITIVE }]);
    const tone = await full(toneCode, [
      {
        format,
        blend: {
          color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
        },
      },
    ]);
    let hdrTex: GPUTexture, bloomTex: GPUTexture;
    let bloomLevels: GPUTexture[] = [];
    let sg: GPUBindGroup,
      pg: GPUBindGroup,
      dg: GPUBindGroup[],
      ug: GPUBindGroup[],
      tg: GPUBindGroup;
    const bloomUniform = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const fit = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio, TIERS[tier].dpr);
      size = [Math.max(1, Math.floor(box.width * dpr)), Math.max(1, Math.floor(box.height * dpr))];
      canvas.width = size[0];
      canvas.height = size[1];
      context.configure({ device, format, alphaMode: "premultiplied" });
      if (hdrTex) hdrTex.destroy();
      bloomLevels.forEach((level) => level.destroy());
      hdrTex = texture(size, HALF);
      bloomLevels = [1, 2, 3].map((level) =>
        texture([Math.max(1, size[0] >> level), Math.max(1, size[1] >> level)], HALF)
      );
      bloomTex = bloomLevels[0]!;
      device.queue.writeBuffer(
        bloomUniform,
        0,
        new Float32Array([size[0], size[1], 1, 2, 1, 1, 1, 1])
      );
      sg = bind(code, { v: { buffer: uniform } });
      pg = bind(prefilterCode, {
        scene: { buffer: bloomUniform },
        src: hdrTex.createView(),
        linear: sampler,
      });
      dg = [0, 1].map((index) =>
        bind(downsampleCode, { src: bloomLevels[index]!.createView(), linear: sampler })
      );
      ug = [2, 1].map((index) =>
        bind(upsampleCode, { src: bloomLevels[index]!.createView(), linear: sampler })
      );
      tg = bind(toneCode, {
        hdr: hdrTex.createView(),
        bloom: bloomTex.createView(),
        smp: sampler,
        frame: { buffer: uniform },
      });
    };
    fit();
    const render = (now: number) => {
      if (disposed || document.hidden) return;
      if (running) raf = requestAnimationFrame(render);
      if (running && now - last < 1000 / 30 - 1) return;
      const dt = running ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (running) time += dt;
      const started = performance.now();
      const ease = 1 - Math.exp(-dt * 2.2);
      pointer[0] += (aim[0] - pointer[0]) * ease;
      pointer[1] += (aim[1] - pointer[1]) * ease;
      device.queue.writeBuffer(
        uniform,
        0,
        new Float32Array([
          size[0],
          size[1],
          time,
          Math.min(1, time / 2.2),
          pointer[0],
          pointer[1],
          0,
          0,
        ])
      );
      const enc = device.createCommandEncoder();
      const p = enc.beginRenderPass(pass([hdrTex.createView()]));
      p.setPipeline(scene);
      p.setBindGroup(0, sg);
      p.draw(3);
      p.end();
      const pre = enc.beginRenderPass(pass([bloomLevels[0]!.createView()]));
      pre.setPipeline(prefilter);
      pre.setBindGroup(0, pg);
      pre.draw(3);
      pre.end();
      for (let level = 1; level < 3; level++) {
        const down = enc.beginRenderPass(pass([bloomLevels[level]!.createView()]));
        down.setPipeline(downsample);
        down.setBindGroup(0, dg[level - 1]!);
        down.draw(3);
        down.end();
      }
      for (let level = 1; level >= 0; level--) {
        const up = enc.beginRenderPass(pass([bloomLevels[level]!.createView()], "load"));
        up.setPipeline(upsample);
        up.setBindGroup(0, ug[1 - level]!);
        up.draw(3);
        up.end();
      }
      const out = enc.beginRenderPass(pass([context.getCurrentTexture().createView()]));
      out.setPipeline(tone);
      out.setBindGroup(0, tg);
      out.draw(3);
      out.end();
      device.queue.submit([enc.finish()]);
      if (running) {
        samples.push(performance.now() - started);
        if (samples.length === 20) {
          const next = nextTier(tier, samples);
          samples = [];
          if (next !== tier) {
            tier = next;
            fit();
            canvas.dataset.tier = tier;
          }
        }
      }
    };
    const start = () => {
      if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(render);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    };
    canvas.addEventListener(
      "pointermove",
      (e) => {
        const r = canvas.getBoundingClientRect();
        aim = [((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1];
      },
      { passive: true }
    );
    canvas.addEventListener("pointerleave", () => {
      aim = [0, 0];
    });
    const resize = new ResizeObserver(fit);
    resize.observe(canvas);
    void failed.then(() => stop());
    return {
      lost: failed,
      start,
      stop,
      still() {
        stop();
        if (time === 0) time = 2.2;
        render(performance.now());
      },
      dispose() {
        disposed = true;
        stop();
        resize.disconnect();
        hdrTex.destroy();
        bloomLevels.forEach((level) => level.destroy());
        gpu.close();
      },
    };
  } catch (error) {
    gpu.close();
    throw error;
  }
}
