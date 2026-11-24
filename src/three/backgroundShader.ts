import * as THREE from 'three';
import { lerp, TimelineState } from '../lib/choreography';

interface PhasePalette {
  top: THREE.Color;
  bottom: THREE.Color;
  glow: THREE.Color;
  glowPos: THREE.Vector2;
  glowAmt: number;
  glowRad: number;
  clouds: number;
  floor: number;
}

const PALETTES: Record<'hero' | 'story' | 'manifesto' | 'lineup', PhasePalette> = {
  hero: {
    top: new THREE.Color('#F6C89F'),
    bottom: new THREE.Color('#FDEBD7'),
    glow: new THREE.Color('#FFD8C4'),
    glowPos: new THREE.Vector2(0.5, 0.2),
    glowAmt: 0.42,
    glowRad: 2.4,
    clouds: 0,
    floor: 0,
  },
  story: {
    top: new THREE.Color('#F9D9B8'),
    bottom: new THREE.Color('#F5B39A'),
    glow: new THREE.Color('#FFE6D8'),
    glowPos: new THREE.Vector2(0.36, 0.5),
    glowAmt: 0.5,
    glowRad: 1.6,
    clouds: 0,
    floor: 0,
  },
  manifesto: {
    top: new THREE.Color('#E8604A'),
    bottom: new THREE.Color('#D7261E'),
    glow: new THREE.Color('#FFD2C2'),
    glowPos: new THREE.Vector2(0.5, 0.42),
    glowAmt: 0.45,
    glowRad: 1.8,
    clouds: 1,
    floor: 0,
  },
  lineup: {
    top: new THREE.Color('#2B1A12'),
    bottom: new THREE.Color('#1A0F0A'),
    glow: new THREE.Color('#7A2E1A'),
    glowPos: new THREE.Vector2(0.3, 0.05),
    glowAmt: 0,
    glowRad: 2.0,
    clouds: 0,
    floor: 1,
  },
};

export interface BackgroundRig {
  mesh: THREE.Mesh;
  update: (timeline: TimelineState, aspect: number, timeSec: number, manifestoSharp: number, manifestoDriftX: number) => void;
  dispose: () => void;
}

export function createBackgroundQuad(
  txtSharp: THREE.Texture,
  txtSoft: THREE.Texture
): BackgroundRig {
  const uniforms = {
    uTop: { value: PALETTES.hero.top.clone() },
    uBottom: { value: PALETTES.hero.bottom.clone() },
    uGlow: { value: PALETTES.hero.glow.clone() },
    uGlowPos: { value: PALETTES.hero.glowPos.clone() },
    uGlowAmt: { value: PALETTES.hero.glowAmt },
    uGlowRad: { value: PALETTES.hero.glowRad },
    uClouds: { value: 0 },
    uFloor: { value: 0 },
    uAspect: { value: 16 / 9 },
    uTime: { value: 0 },
    uTxtSharp: { value: txtSharp },
    uTxtSoft: { value: txtSoft },
    uTxtAmount: { value: 0 },
    uTxtSharpness: { value: 0 },
    uTxtY: { value: 0.5 },
    uTxtW: { value: 0.92 },
    uTxtDriftX: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.9999, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;

      uniform vec3 uTop;
      uniform vec3 uBottom;
      uniform vec3 uGlow;
      uniform vec2 uGlowPos;
      uniform float uGlowAmt;
      uniform float uGlowRad;
      uniform float uClouds;
      uniform float uFloor;
      uniform float uAspect;
      uniform float uTime;

      uniform sampler2D uTxtSharp;
      uniform sampler2D uTxtSoft;
      uniform float uTxtAmount;
      uniform float uTxtSharpness;
      uniform float uTxtY;
      uniform float uTxtW;
      uniform float uTxtDriftX;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = rot * p * 2.02;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        vec3 col = mix(uBottom, uTop, uv.y);

        // Radial glow
        vec2 d = (uv - uGlowPos) * vec2(uAspect, 1.0);
        col += uGlow * uGlowAmt * exp(-dot(d, d) * uGlowRad);

        // Floor sheen for dark lineup
        col += uGlow * uFloor * smoothstep(0.5, 0.0, uv.y) * 0.55;

        // Clouds
        if (uClouds > 0.001) {
          vec2 cUv = vec2(uv.x * uAspect, uv.y) * 1.35 + vec2(0.022, 0.011) * uTime;
          float n = fbm(cUv) + 0.32 * fbm(cUv * 1.8);
          float cloudMask = smoothstep(0.42, 0.86, n);
          col = mix(col, vec3(1.0, 0.902, 0.855), cloudMask * uClouds * 0.5);
        }

        // Manifesto typography
        if (uTxtAmount > 0.001) {
          float boxW = uTxtW;
          float boxH = boxW * 0.5 * uAspect;
          vec2 tUv = vec2(
            (uv.x - (0.5 + uTxtDriftX)) / boxW + 0.5,
            (uv.y - uTxtY) / boxH + 0.5
          );
          if (tUv.x >= 0.0 && tUv.x <= 1.0 && tUv.y >= 0.0 && tUv.y <= 1.0) {
            float s = texture2D(uTxtSharp, tUv).a;
            float b = texture2D(uTxtSoft, tUv).a;
            float txt = mix(b, s, uTxtSharpness);
            float grain = mix(0.82, 1.18, hash(gl_FragCoord.xy + fract(uTime * 17.3)));
            vec3 txtTint = vec3(1.0, 0.945, 0.91);
            col = mix(col, txtTint, clamp(txt * grain * uTxtAmount * 0.78, 0.0, 1.0));
          }
        }

        // Global subtle film grain ±0.0225
        float g = (hash(gl_FragCoord.xy + fract(uTime * 29.1)) - 0.5) * 0.045;
        col = clamp(col + g, 0.0, 1.0);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;

  const update = (
    tl: TimelineState,
    aspect: number,
    timeSec: number,
    manifestoSharp: number,
    manifestoDriftX: number
  ) => {
    const k = Math.max(0, Math.min(1, (aspect - 0.72) / (1.25 - 0.72)));
    const smoothK = k * k * (3 - 2 * k);

    // Blend hero -> story -> manifesto -> lineup
    const blendPalette = (p0: PhasePalette, p1: PhasePalette, w: number) => {
      uniforms.uTop.value.copy(p0.top).lerp(p1.top, w);
      uniforms.uBottom.value.copy(p0.bottom).lerp(p1.bottom, w);
      uniforms.uGlow.value.copy(p0.glow).lerp(p1.glow, w);
      uniforms.uGlowPos.value.copy(p0.glowPos).lerp(p1.glowPos, w);
      uniforms.uGlowAmt.value = lerp(p0.glowAmt, p1.glowAmt, w);
      uniforms.uGlowRad.value = lerp(p0.glowRad, p1.glowRad, w);
      uniforms.uClouds.value = lerp(p0.clouds, p1.clouds, w);
      uniforms.uFloor.value = lerp(p0.floor, p1.floor, w);
    };

    if (tl.c > 0) {
      blendPalette(PALETTES.manifesto, PALETTES.lineup, tl.c);
    } else if (tl.b > 0) {
      blendPalette(PALETTES.story, PALETTES.manifesto, tl.b);
    } else {
      blendPalette(PALETTES.hero, PALETTES.story, tl.a);
    }

    uniforms.uAspect.value = aspect;
    uniforms.uTime.value = timeSec;
    uniforms.uTxtAmount.value = tl.b * (1 - tl.c);
    uniforms.uTxtSharpness.value = manifestoSharp;
    uniforms.uTxtY.value = lerp(0.47, 0.5, smoothK);
    uniforms.uTxtW.value = lerp(1.02, 0.92, smoothK);
    uniforms.uTxtDriftX.value = manifestoDriftX;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
    txtSharp.dispose();
    txtSoft.dispose();
  };

  return { mesh, update, dispose };
}
