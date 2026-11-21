import { VERTEX, fitPlate, platePercent } from "@amsborse/arsenal-scene";
import { PLATE_LIFE_MAPS, type LifeMap, type PlateName, type PlateTheme } from "./plateLifeMaps.ts";

const f = (value: number) => (Number.isInteger(value) ? `${value}.0` : String(value));
const vec = (x: number, y: number) => `vec2(${f(x)}, ${f(y)})`;
const box = (r: { x0: number; y0: number; x1: number; y1: number }) =>
  `vec4(${[r.x0, r.y0, r.x1, r.y1].map(f).join(",")})`;

/** Specialise the same single-pass plate pattern as the hero, without editing its package.
 * Geometry is baked into the shader; there are no dynamic loops or per-frame allocations. */
export function buildLifeFragment(map: LifeMap, theme: PlateTheme): string {
  const light = theme === "light";
  return `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec4 uView;
const vec2 PLATE = vec2(${f(map.width)}, ${f(map.height)});
const vec3 WARM = vec3(1.0, 0.66, 0.28);
float rect(vec2 p, vec4 r, float soft) {
  vec2 a = smoothstep(r.xy - soft, r.xy + soft, p);
  vec2 b = 1.0 - smoothstep(r.zw - soft, r.zw + soft, p);
  return a.x * a.y * b.x * b.y;
}
float spot(vec2 p, vec2 c, vec2 radius) { vec2 q = (p-c)/radius; return exp(-dot(q,q)*2.0); }
float breathe(float seed) {
  return 0.56 + 0.24*sin(uTime*0.73+seed) + 0.13*sin(uTime*1.173+seed*2.1) + 0.07*sin(uTime*2.317+seed);
}
${map.land
  .map(
    (polygon, i) => `float land${i}(vec2 p) {
  bool inside = false;
  ${polygon
    .map((a, j) => {
      const b = polygon[(j + 1) % polygon.length];
      if (a.y === b.y) return "";
      return `if ((${f(a.y)} > p.y) != (${f(b.y)} > p.y)) {
      if (p.x < ${f(a.x)} + (p.y-${f(a.y)})*${f((b.x - a.x) / (b.y - a.y))}) inside = !inside;
    }`;
    })
    .join("\n")}
  return inside ? 1.0 : 0.0;
}`
  )
  .join("\n")}
void main() {
  vec2 p = uView.xy + vec2(vUv.x, 1.0-vUv.y)*uView.zw;
  float t = uTime;
  float water = smoothstep(${f(map.horizon)}, ${f(map.horizon + 16)}, p.y);
  if (water > 0.0) {
    ${map.land.map((_, i) => `water *= 1.0-land${i}(p);`).join("\n")}
  }
  float reflection = 0.0;
  ${map.lanterns.map((l) => `reflection += spot(p, ${vec(l.reflection.x, l.reflection.y)}, vec2(${f(Math.max(18, l.rx * 1.3))},90.0));`).join("\n")}
  float wave = sin(p.y*0.075+t*0.81+sin(p.x*0.008+t*0.17))*0.55 + sin(p.y*0.139-t*0.57+p.x*0.013)*0.25;
  vec2 offset = vec2(wave, sin(p.x*0.023+t*0.43)*0.12)*water*(0.65+reflection*0.8);
  ${map.ripples
    .map(
      (r) => `{
    vec2 q = (p-${vec(r.x, r.y)})*vec2(0.24,1.0);
    float d = length(q);
    float ripple = sin(d*0.21-t*0.65)*exp(-d/${f(r.radius * 0.25)});
    offset.x += ripple*water*0.4;
  }`
    )
    .join("\n")}
  ${map.mist.map((m) => `offset.x += rect(p,${box(m)},22.0)*sin(t*0.081+p.y*0.018)*2.5;`).join("\n")}
  vec3 col = texture2D(uTex, clamp((p+offset)/PLATE,0.0,1.0)).rgb;
  float luminance = dot(col,vec3(0.299,0.587,0.114));
  ${map.lanterns
    .map(
      (l, i) => `{
    float pulse = breathe(${f(i * 2.43 + 0.7)})-0.5;
    ${l.oil ? `pulse += sin(t*3.13+sin(t*0.79))*0.09;` : ""}
    float windowLight = spot(p,${vec(l.x, l.y)},${vec(l.rx, l.ry)});
    float reflectedLight = spot(p,${vec(l.reflection.x, l.reflection.y)},${vec(Math.max(18, l.rx * 1.3), 90)})*water;
    col += WARM*pulse*(windowLight*${light ? "0.045" : "0.14"}+reflectedLight*luminance*${light ? "0.08" : "0.23"});
  }`
    )
    .join("\n")}
  ${map.falls
    .map(
      (r, i) => `{
    float fall = rect(p,${box(r)},3.0);
    float streak = sin(p.y*0.19-t*2.4+sin(p.x*0.4+${f(i)}))*0.5+0.5;
    col += vec3(0.8,0.85,0.81)*fall*streak*luminance*${light ? "0.035" : "0.085"};
    col += vec3(0.83,0.86,0.8)*spot(p,${vec((r.x0 + r.x1) / 2, r.y1)},${vec((r.x1 - r.x0) * 0.85, 7)})*(0.6+0.4*sin(t*0.87+${f(i)}))*${light ? "0.012" : "0.025"};
  }`
    )
    .join("\n")}
  ${map.rings
    .map(
      (r) => `{
    vec2 q = p-${vec(r.cx, r.cy)};
    float a = ${f((r.rot * Math.PI) / 180)};
    q = vec2(q.x*cos(a)+q.y*sin(a),-q.x*sin(a)+q.y*cos(a))/${vec(r.a, r.b)};
    float rim = exp(-pow((length(q)-1.0)*${f(Math.min(r.a, r.b) / 2)},2.0));
    ${r.clip ? `rim *= rect(p,${box(r.clip)},8.0);` : ""}
    float sweep = pow(0.5+0.5*cos(atan(q.y,q.x)-t*0.13),12.0);
    col += WARM*rim*sweep*${light ? "0.025" : "0.075"};
  }`
    )
    .join("\n")}
  ${map.orb ? `col += WARM*spot(p,${vec(map.orb.x, map.orb.y)},vec2(${f(map.orb.r)}))*(0.5+0.5*sin(t*0.53))*${light ? "0.012" : "0.035"};` : ""}
  ${
    light
      ? ""
      : Array.from({ length: 8 }, (_, i) => {
          const area = map.foliage;
          const x = area.x0 + (area.x1 - area.x0) * ((i * 0.61803398875 + 0.17) % 1);
          const y = area.y0 + (area.y1 - area.y0) * ((i * 0.41421356237 + 0.31) % 1);
          return `{
      vec2 mote = ${vec(x, y)}+vec2(sin(t*${f(0.093 + i * 0.007)}+${f(i * 2.1)})*14.0,sin(t*${f(0.067 + i * 0.009)}+${f(i)})*9.0);
      float fade = pow(0.5+0.5*sin(t*${f(0.37 + i * 0.027)}+${f(i * 1.9)}),3.0);
      col += WARM*spot(p,mote,vec2(1.8))*fade*0.32;
    }`;
        }).join("\n")
  }
  gl_FragColor = vec4(col,1.0);
}`;
}

export interface LifeRenderer {
  setImage(image: HTMLImageElement, name: PlateName, theme: PlateTheme): void;
  resize(width: number, height: number, dpr: number, position: string): void;
  draw(time: number): void;
  dispose(): void;
}

/** One context, texture and fullscreen triangle per section. Theme updates replace only the
 * shader program and texture. Explicit loss on disposal releases the browser's context slot. */
export function createLifeRenderer(canvas: HTMLCanvasElement): LifeRenderer {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) throw new Error("Plate life: WebGL is unavailable");
  let program: WebGLProgram | null = null;
  let timeUniform: WebGLUniformLocation | null = null;
  let viewUniform: WebGLUniformLocation | null = null;
  let map = PLATE_LIFE_MAPS.about.dark;
  let textureWidth = map.width;
  let textureHeight = map.height;
  let signature = "";
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const dispose = () => {
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    gl.deleteTexture(texture);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  if (!buffer || !texture) {
    dispose();
    throw new Error("Plate life: could not allocate GPU resources");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Plate life: could not allocate shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Plate life: shader compilation failed: ${log}`);
    }
    return shader;
  };
  return {
    setImage(image, name, theme) {
      map = PLATE_LIFE_MAPS[name][theme];
      textureWidth = image.naturalWidth;
      textureHeight = image.naturalHeight;
      if (signature !== `${name}:${theme}`) {
        const next = gl.createProgram();
        if (!next) throw new Error("Plate life: could not allocate program");
        const shaders: WebGLShader[] = [];
        try {
          shaders.push(compile(gl.VERTEX_SHADER, VERTEX));
          shaders.push(compile(gl.FRAGMENT_SHADER, buildLifeFragment(map, theme)));
          shaders.forEach((shader) => gl.attachShader(next, shader));
          gl.linkProgram(next);
          if (!gl.getProgramParameter(next, gl.LINK_STATUS))
            throw new Error(`Plate life: program link failed: ${gl.getProgramInfoLog(next)}`);
        } catch (error) {
          gl.deleteProgram(next);
          throw error;
        } finally {
          shaders.forEach((shader) => gl.deleteShader(shader));
        }
        gl.deleteProgram(program);
        program = next;
        signature = `${name}:${theme}`;
        gl.useProgram(program);
        const position = gl.getAttribLocation(program, "aPos");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        timeUniform = gl.getUniformLocation(program, "uTime");
        viewUniform = gl.getUniformLocation(program, "uView");
        gl.uniform1i(gl.getUniformLocation(program, "uTex"), 0);
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      if (gl.getError() !== gl.NO_ERROR) throw new Error("Plate life: texture upload failed");
    },
    resize(width, height, dpr, position) {
      const w = Math.max(1, Math.round(width * dpr));
      const h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      // Match the existing CSS cover, including its per-chapter object-position. A zero-size
      // focus prevents the hero helper's subject-preserving shrink from changing CSS cover.
      const fit = fitPlate(
        { width: textureWidth, height: textureHeight, focus: { x0: 0, y0: 0, x1: 0, y1: 0 } },
        width,
        height,
        {
          topSlack: 0,
        }
      );
      const anchor = position.split(" ").map((value) => Number.parseFloat(value) / 100);
      const percent = platePercent(map, {
        x: map.width * (anchor[0] || 0),
        y: map.height * (anchor[1] || 0),
      });
      const px = Number.parseFloat(percent.left) / 100;
      const py = Number.parseFloat(percent.top) / 100;
      // Responsive files have independently rounded dimensions (e.g. 960×540). Fit their
      // actual aspect ratio, then express the visible UV range in the full plate's pixels.
      const visibleWidth = (width / fit.scale / textureWidth) * map.width;
      const visibleHeight = (height / fit.scale / textureHeight) * map.height;
      gl.uniform4f(
        viewUniform,
        (map.width - visibleWidth) * px,
        (map.height - visibleHeight) * py,
        visibleWidth,
        visibleHeight
      );
    },
    draw(time) {
      gl.uniform1f(timeUniform, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose,
  };
}

/** Use unthrottled rAF gaps, not the intentionally capped draw cadence. Sustained slowness
 * first reduces resolution, then leaves the original still. Pauses reset the sample window. */
export function createLifeGovernor() {
  let last = 0;
  let warmup = 4;
  let longFrames = 0;
  const gaps: number[] = [];
  return {
    reset() {
      last = 0;
      warmup = 4;
      gaps.length = 0;
      longFrames = 0;
    },
    record(now: number) {
      const gap = last ? now - last : 0;
      last = now;
      if (warmup-- > 0 || !gap) return false;
      longFrames = gap > 90 ? longFrames + 1 : 0;
      if (longFrames >= 3) {
        longFrames = 0;
        gaps.length = 0;
        return true;
      }
      gaps.push(gap);
      if (gaps.length < 24) return false;
      const median = [...gaps].sort((a, b) => a - b)[12];
      gaps.length = 0;
      return median > 45;
    },
  };
}
