import * as THREE from 'three';
import { TeaSpec } from '../data/yewale';
import { GLASS_HALF_HEIGHT, smoothstep } from '../lib/choreography';
import { BackBandAssets } from './textures';

export interface SharedGlassResources {
  outerGlassGeo: THREE.BufferGeometry;
  innerGlassGeo: THREE.LatheGeometry;
  chaiGeo: THREE.LatheGeometry;
  chaiTopGeo: THREE.CircleGeometry;
  frothGeo: THREE.TorusGeometry;
  frontBandGeo: THREE.CylinderGeometry;
  backBandGeo: THREE.CylinderGeometry;
  rowGlowGeo: THREE.CylinderGeometry;
  backBandMat: THREE.MeshStandardMaterial;
  backBandUniforms: {
    uSweep: { value: THREE.Vector3 };
    uDim: { value: THREE.Vector3 };
    uStreakPos: { value: number };
    uStreakInt: { value: number };
    uLightMul: { value: number };
    uRowBounds: { value: THREE.Vector2[] };
    uCreamColor: { value: THREE.Color };
  };
  rowBoundsUV: [THREE.Vector2, THREE.Vector2, THREE.Vector2];
  rowLocalY: [number, number, number];
  dispose: () => void;
}

const BAND_BOTTOM_Y = 0.48;
const BAND_HEIGHT = 0.56;
const BAND_CENTER_LOCAL_Y = -GLASS_HALF_HEIGHT + BAND_BOTTOM_Y + BAND_HEIGHT * 0.5;
const CHAI_FILL_Y = 1.48;

// Authentic Indian cutting-chai silhouette: 1.05 rim width x 1.72 height (~1 : 1.64 stout taper)
const GLASS_CONTROL_POINTS = [
  new THREE.Vector2(0.0, 0.0),
  new THREE.Vector2(0.295, 0.0),
  new THREE.Vector2(0.335, 0.03),
  new THREE.Vector2(0.348, 0.14),
  new THREE.Vector2(0.365, 0.32),
  new THREE.Vector2(0.4, 0.65),
  new THREE.Vector2(0.442, 1.0),
  new THREE.Vector2(0.484, 1.32),
  new THREE.Vector2(0.512, 1.56),
  new THREE.Vector2(0.525, 1.68),
  new THREE.Vector2(0.516, 1.72),
];

/**
 * Builds the 12-flute Indian cutting-chai outer glass geometry with arched concave
 * vertical facets, crisp ridges, thick base heel, and rolled drinking lip.
 */
function createFlutedOuterGlassGeometry(): THREE.BufferGeometry {
  const curve = new THREE.SplineCurve(GLASS_CONTROL_POINTS);
  const profilePts = curve.getPoints(112); // 113 rings
  const radialSegs = 144; // 12 segments per flute across 12 arched flutes
  const rings = profilePts.length;

  const positions = new Float32Array(rings * (radialSegs + 1) * 3);
  const uvs = new Float32Array(rings * (radialSegs + 1) * 2);
  const indices: number[] = [];

  for (let iy = 0; iy < rings; iy++) {
    const pt = profilePts[iy];
    const baseR = Math.max(0, pt.x);
    const yWorld = pt.y;
    const yLocal = yWorld - GLASS_HALF_HEIGHT;
    const v = iy / (rings - 1);

    // Rolled drinking lip bead at top rim
    const rimBead = Math.sin(smoothstep(1.64, 1.72, yWorld) * Math.PI) * 0.008;

    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const theta = u * Math.PI * 2;

      // 12 classic arched cutting-chai facets: highest arch at each flute center, lower at ridge
      const archTop = 1.24 - 0.065 * Math.cos(theta * 12);
      const fluteEnv =
        smoothstep(0.18, 0.28, yWorld) * (1 - smoothstep(archTop - 0.08, archTop, yWorld));
      const valley = Math.pow(0.5 - 0.5 * Math.cos(theta * 12), 0.72);
      const fluteOffset = (0.004 - 0.021 * valley) * fluteEnv;

      const r = baseR > 0.001 ? Math.max(0.001, baseR + fluteOffset + rimBead) : 0;

      const vertIdx = iy * (radialSegs + 1) + ix;
      positions[vertIdx * 3] = r * Math.sin(theta);
      positions[vertIdx * 3 + 1] = yLocal;
      positions[vertIdx * 3 + 2] = r * Math.cos(theta);

      uvs[vertIdx * 2] = u;
      uvs[vertIdx * 2 + 1] = v;
    }
  }

  for (let iy = 0; iy < rings - 1; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * (radialSegs + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (radialSegs + 1) + ix;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeTangents();
  return geo;
}

/**
 * Builds the inner glass cavity wall starting above a heavy solid glass base punt (y = 0.24)
 * up to the rounded rim lip (y = 1.72), showing unmistakable cutting-glass wall thickness.
 */
function createInnerGlassGeometry(): THREE.LatheGeometry {
  const innerPoints = [
    new THREE.Vector2(0.0, 0.24),
    new THREE.Vector2(0.285, 0.24),
    new THREE.Vector2(0.328, 0.29),
    new THREE.Vector2(0.362, 0.65),
    new THREE.Vector2(0.406, 1.0),
    new THREE.Vector2(0.45, 1.32),
    new THREE.Vector2(0.48, 1.56),
    new THREE.Vector2(0.496, 1.69),
    new THREE.Vector2(0.506, 1.72),
  ];
  const curve = new THREE.SplineCurve(innerPoints);
  const pts = curve
    .getPoints(80)
    .map((p) => new THREE.Vector2(Math.max(0, p.x), p.y - GLASS_HALF_HEIGHT));
  const geo = new THREE.LatheGeometry(pts, 72);
  geo.computeVertexNormals();
  return geo;
}

export function createSharedGlassResources(backAssets: BackBandAssets): SharedGlassResources {
  const outerGlassGeo = createFlutedOuterGlassGeometry();
  const innerGlassGeo = createInnerGlassGeometry();

  // Chai inner liquid profile (sits above thick 0.24 base, filled to y = 1.48)
  const chaiProfile = [
    new THREE.Vector2(0, 0.25),
    new THREE.Vector2(0.284, 0.25),
    new THREE.Vector2(0.326, 0.3),
    new THREE.Vector2(0.36, 0.65),
    new THREE.Vector2(0.404, 1.0),
    new THREE.Vector2(0.448, 1.32),
    new THREE.Vector2(0.468, CHAI_FILL_Y),
    new THREE.Vector2(0, CHAI_FILL_Y),
  ].map((p) => new THREE.Vector2(p.x, p.y - GLASS_HALF_HEIGHT));
  const chaiGeo = new THREE.LatheGeometry(chaiProfile, 96);
  chaiGeo.computeVertexNormals();

  // Chai foam/crema top surface disc
  const chaiTopGeo = new THREE.CircleGeometry(0.467, 64);
  chaiTopGeo.rotateX(-Math.PI / 2);

  // Wet meniscus froth ring hugging the inner glass wall at CHAI_FILL_Y
  const frothGeo = new THREE.TorusGeometry(0.456, 0.015, 16, 72);
  frothGeo.rotateX(Math.PI / 2);

  // Tapered frosted glass arcs hugging outer flute ridges cleanly without wrapping past silhouette
  const frontBandArc = 1.8;
  const frontBandGeo = new THREE.CylinderGeometry(
    0.454,
    0.389,
    BAND_HEIGHT,
    72,
    1,
    true,
    -frontBandArc * 0.5,
    frontBandArc
  );

  const backBandArc = 1.76;
  const backBandGeo = new THREE.CylinderGeometry(
    0.454,
    0.389,
    BAND_HEIGHT,
    72,
    1,
    true,
    Math.PI - backBandArc * 0.5,
    backBandArc
  );

  const rowGlowArc = 1.68;
  const rowGlowGeo = new THREE.CylinderGeometry(
    0.462,
    0.397,
    0.19,
    48,
    1,
    true,
    Math.PI - rowGlowArc * 0.5,
    rowGlowArc
  );

  const backBandUniforms = {
    uSweep: { value: new THREE.Vector3(0, 0, 0) },
    uDim: { value: new THREE.Vector3(0, 0, 0) },
    uStreakPos: { value: -0.2 },
    uStreakInt: { value: 0 },
    uLightMul: { value: 1 },
    uRowBounds: { value: backAssets.rowBoundsUV },
    uCreamColor: { value: new THREE.Color('#F8E5C8').convertSRGBToLinear() },
  };

  const backBandMat = new THREE.MeshStandardMaterial({
    map: backAssets.texture,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.01,
    roughness: 0.78,
    metalness: 0.0,
    envMapIntensity: 0.14,
    side: THREE.FrontSide,
  });

  backBandMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSweep = backBandUniforms.uSweep;
    shader.uniforms.uDim = backBandUniforms.uDim;
    shader.uniforms.uStreakPos = backBandUniforms.uStreakPos;
    shader.uniforms.uStreakInt = backBandUniforms.uStreakInt;
    shader.uniforms.uLightMul = backBandUniforms.uLightMul;
    shader.uniforms.uRowBounds = backBandUniforms.uRowBounds;
    shader.uniforms.uCreamColor = backBandUniforms.uCreamColor;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vBandUv;`
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        vBandUv = uv;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vBandUv;
        uniform vec3 uSweep;
        uniform vec3 uDim;
        uniform float uStreakPos;
        uniform float uStreakInt;
        uniform float uLightMul;
        uniform vec2 uRowBounds[3];
        uniform vec3 uCreamColor;`
      )
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vMapUv, -0.85 );
          diffuseColor *= sampledDiffuseColor;
        #endif
        {
          float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          float paper = smoothstep(0.58, 0.78, luma);
          float featherX = smoothstep(0.14, 0.30, vBandUv.x) * (1.0 - smoothstep(0.70, 0.86, vBandUv.x));

          for (int r = 0; r < 3; r++) {
            float v0 = uRowBounds[r].x;
            float v1 = uRowBounds[r].y;
            float inRow = step(v0, vBandUv.y) * step(vBandUv.y, v1);
            if (inRow > 0.5) {
              float p = (r == 0) ? uSweep.x : (r == 1 ? uSweep.y : uSweep.z);
              float d = (r == 0) ? uDim.x : (r == 1 ? uDim.y : uDim.z);

              float edge = mix(0.12, 0.90, p);
              float sweepMask = (1.0 - smoothstep(edge - 0.03, edge + 0.03, vBandUv.x)) * featherX * step(0.001, p);

              vec3 sweptPaper = mix(diffuseColor.rgb, vec3(1.0), sweepMask * 0.85 * paper);
              diffuseColor.rgb = mix(sweptPaper * (1.0 - sweepMask * 0.25), sweptPaper, paper);

              float rowVNorm = (vBandUv.y - v0) / max(0.001, v1 - v0);
              float diag = vBandUv.x + (rowVNorm - 0.5) * 0.25;
              float streak = exp(-pow((diag - uStreakPos) * 7.5, 2.0)) * uStreakInt * paper * step(0.05, p);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), clamp(streak, 0.0, 1.0));

              diffuseColor.rgb = mix(diffuseColor.rgb, uCreamColor, d * 0.28);
            }
          }
          diffuseColor.rgb *= uLightMul;
        }`
      );
  };

  const rowLocalY: [number, number, number] = [
    BAND_CENTER_LOCAL_Y + backAssets.rowCenterRatioY[0] * BAND_HEIGHT,
    BAND_CENTER_LOCAL_Y + backAssets.rowCenterRatioY[1] * BAND_HEIGHT,
    BAND_CENTER_LOCAL_Y + backAssets.rowCenterRatioY[2] * BAND_HEIGHT,
  ];

  const dispose = () => {
    outerGlassGeo.dispose();
    innerGlassGeo.dispose();
    chaiGeo.dispose();
    chaiTopGeo.dispose();
    frothGeo.dispose();
    frontBandGeo.dispose();
    backBandGeo.dispose();
    rowGlowGeo.dispose();
    backBandMat.dispose();
    backAssets.texture.dispose();
  };

  return {
    outerGlassGeo,
    innerGlassGeo,
    chaiGeo,
    chaiTopGeo,
    frothGeo,
    frontBandGeo,
    backBandGeo,
    rowGlowGeo,
    backBandMat,
    backBandUniforms,
    rowBoundsUV: backAssets.rowBoundsUV,
    rowLocalY,
    dispose,
  };
}

export interface SteamParticle {
  sprite: THREE.Sprite;
  phase: number;
  speed: number;
  xBias: number;
  zBias: number;
  wobbleFreq: number;
  baseScale: number;
}

export interface ChaiGlassInstance {
  index: number;
  tea: TeaSpec;
  group: THREE.Group;
  glassMesh: THREE.Mesh;
  chaiMat: THREE.MeshPhysicalMaterial;
  chaiTopMat: THREE.MeshStandardMaterial;
  frothMat: THREE.MeshStandardMaterial;
  frontBandMat: THREE.MeshStandardMaterial;
  baseChaiColor: THREE.Color;
  steamParticles: SteamParticle[];
  updateSteam: (timeSec: number, intensity: number, spinFactor?: number) => void;
  setLightingMultiplier: (lit: number, darkMix?: number) => void;
  dispose: () => void;
}

export function createChaiGlassInstance(
  index: number,
  tea: TeaSpec,
  shared: SharedGlassResources,
  frontBandTex: THREE.CanvasTexture,
  foamTex: THREE.CanvasTexture,
  dropletNormalMap: THREE.Texture | null,
  steamTex: THREE.CanvasTexture
): ChaiGlassInstance {
  const group = new THREE.Group();

  // Outer 12-flute soda-lime cutting glass with clean Fresnel, rolled lip, and solid base punt
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x050a08,
    roughness: tea.isCold ? 0.08 : 0.028,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: tea.isCold ? 0.06 : 0.025,
    envMapIntensity: 1.45,
    ior: 1.52,
    reflectivity: 1.0,
  });

  if (tea.isCold && dropletNormalMap) {
    glassMat.normalMap = dropletNormalMap;
    glassMat.normalScale = new THREE.Vector2(0.16, 0.16);
  }

  glassMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vLocalY;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vLocalY = position.y;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vLocalY;`
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        float ywFresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.6);
        float ywSpec = smoothstep(0.42, 1.35, max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b)));
        // Thick glass base punt (y=-0.86..-0.62) and rolled lip (y=+0.76..+0.86)
        float ywBasePunt = (1.0 - smoothstep(-0.86, -0.60, vLocalY)) * 0.24;
        float ywRimLip = smoothstep(0.76, 0.86, vLocalY) * 0.22;
        gl_FragColor.rgb += vec3(0.06, 0.09, 0.075) * (ywBasePunt + ywRimLip) * (0.4 + ywFresnel);
        gl_FragColor.a = clamp(gl_FragColor.a + ywFresnel * 0.36 + ywSpec * 0.68 + ywBasePunt + ywRimLip, 0.0, 1.0);`
      );
  };

  const glassMesh = new THREE.Mesh(shared.outerGlassGeo, glassMat);
  glassMesh.renderOrder = 4;
  glassMesh.userData.glassIndex = index;

  // Inner glass wall (visible glass wall thickness above tea line + solid base cavity)
  const innerGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x060b09,
    roughness: 0.045,
    transparent: true,
    opacity: 0.04,
    depthWrite: false,
    clearcoat: 0.8,
    envMapIntensity: 1.2,
    side: THREE.BackSide,
  });
  innerGlassMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
      float innerF = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.8);
      float innerSpec = smoothstep(0.42, 1.25, max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b)));
      gl_FragColor.a = clamp(gl_FragColor.a + innerF * 0.16 + innerSpec * 0.38, 0.0, 0.6);`
    );
  };
  const innerGlassMesh = new THREE.Mesh(shared.innerGlassGeo, innerGlassMat);
  innerGlassMesh.renderOrder = 3;

  // Inner chai liquid with subsurface vertical warmth gradient
  const baseChaiColor = new THREE.Color(tea.liquid);
  const chaiMat = new THREE.MeshPhysicalMaterial({
    color: baseChaiColor.clone(),
    roughness: 0.18,
    emissive: baseChaiColor.clone(),
    emissiveIntensity: 0.36,
    clearcoat: 0.72,
    clearcoatRoughness: 0.1,
  });
  chaiMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vChaiY;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vChaiY = position.y;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vChaiY;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float hNorm = clamp((vChaiY + 0.61) / 1.23, 0.0, 1.0);
        diffuseColor.rgb *= mix(0.82, 1.14, smoothstep(0.0, 0.85, hNorm));`
      );
  };
  const chaiMesh = new THREE.Mesh(shared.chaiGeo, chaiMat);
  chaiMesh.renderOrder = 1;

  // Textured chai foam/crema top surface
  const hasMilkFroth = ![3, 4, 6].includes(tea.id);
  const chaiTopMat = new THREE.MeshStandardMaterial({
    map: foamTex,
    roughness: hasMilkFroth ? 0.45 : 0.14,
    metalness: 0.0,
    emissive: baseChaiColor.clone(),
    emissiveIntensity: 0.2,
  });
  const chaiTopMesh = new THREE.Mesh(shared.chaiTopGeo, chaiTopMat);
  chaiTopMesh.position.y = CHAI_FILL_Y + 0.001 - GLASS_HALF_HEIGHT;
  chaiTopMesh.renderOrder = 2;

  // Meniscus froth ring around inner rim
  const frothColor = baseChaiColor
    .clone()
    .lerp(new THREE.Color('#FFF6E8'), hasMilkFroth ? 0.58 : 0.22);
  const frothMat = new THREE.MeshStandardMaterial({
    color: frothColor,
    roughness: hasMilkFroth ? 0.55 : 0.18,
    emissive: frothColor.clone(),
    emissiveIntensity: 0.22,
  });
  const frothMesh = new THREE.Mesh(shared.frothGeo, frothMat);
  frothMesh.position.y = CHAI_FILL_Y - GLASS_HALF_HEIGHT;
  frothMesh.renderOrder = 2;

  // Front band: translucent sandblasted frosted-glass label with crisp -0.85 mipmap LOD bias
  const frontBandMat = new THREE.MeshStandardMaterial({
    map: frontBandTex,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.01,
    roughness: 0.76,
    metalness: 0.0,
    envMapIntensity: 0.16,
    emissiveMap: frontBandTex,
    emissive: new THREE.Color('#f4d4aa'),
    emissiveIntensity: 0.14,
    side: THREE.FrontSide,
  });
  frontBandMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vMapUv, -0.85 );
          diffuseColor *= sampledDiffuseColor;
        #endif`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#ifdef USE_EMISSIVEMAP
          vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv, -0.85 );
          totalEmissiveRadiance *= emissiveColor.rgb;
        #endif`
      );
  };
  const frontBandMesh = new THREE.Mesh(shared.frontBandGeo, frontBandMat);
  frontBandMesh.position.y = BAND_CENTER_LOCAL_Y;
  frontBandMesh.renderOrder = 5;

  // Back band
  const backBandMesh = new THREE.Mesh(shared.backBandGeo, shared.backBandMat);
  backBandMesh.position.y = BAND_CENTER_LOCAL_Y;
  backBandMesh.renderOrder = 5;

  group.add(
    chaiMesh,
    chaiTopMesh,
    frothMesh,
    innerGlassMesh,
    glassMesh,
    frontBandMesh,
    backBandMesh
  );

  // Steam system (12 sprites for the 7 hot teas, none for Cold Tea)
  const steamParticles: SteamParticle[] = [];
  if (!tea.isCold) {
    for (let p = 0; p < 12; p++) {
      const spMat = new THREE.SpriteMaterial({
        map: steamTex,
        color: 0xfff8f0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spMat);
      sprite.renderOrder = 6;
      const phase = p / 12 + ((index * 0.13) % 1);
      const baseScale = 0.24 + (p % 4) * 0.065;
      group.add(sprite);
      steamParticles.push({
        sprite,
        phase,
        speed: 0.32 + (p % 3) * 0.04,
        xBias: ((p % 5) - 2) * 0.052,
        zBias: (((p * 3) % 5) - 2) * 0.04,
        wobbleFreq: 2.2 + (p % 4) * 0.5,
        baseScale,
      });
    }
  }

  const updateSteam = (timeSec: number, intensity: number, spinFactor = 0) => {
    if (steamParticles.length === 0) return;
    const show = intensity > 0.01;
    for (let i = 0; i < steamParticles.length; i++) {
      const sp = steamParticles[i];
      sp.sprite.visible = show;
      if (!show) continue;
      const u = (timeSec * sp.speed + sp.phase) % 1;
      const y = 1.62 - GLASS_HALF_HEIGHT + u * 1.1;
      const wobble =
        Math.sin(u * Math.PI * 2 + timeSec * sp.wobbleFreq + i) * (0.045 + u * 0.09);
      const spiral = spinFactor * Math.sin(u * Math.PI * 2.5 + timeSec * 3.0) * 0.12;
      sp.sprite.position.set(
        sp.xBias + wobble + spiral,
        y,
        sp.zBias + Math.cos(u * 4 + i) * 0.04
      );
      const s = sp.baseScale * (0.65 + u * 1.15);
      sp.sprite.scale.set(s, s * 1.25, 1);
      const fade = Math.sin(u * Math.PI);
      sp.sprite.material.opacity = fade * fade * 0.42 * intensity;
    }
  };

  const setLightingMultiplier = (lit: number, darkMix = 0) => {
    const chaiMul = 0.52 + 0.48 * lit;
    chaiMat.color.copy(baseChaiColor).multiplyScalar(chaiMul);
    chaiMat.emissiveIntensity = (0.12 + 0.26 * lit) * (1 - 0.22 * darkMix);
    const foamMul = 0.62 + 0.38 * lit;
    chaiTopMat.color.setRGB(foamMul, foamMul, foamMul);
    const bandMul = (0.76 + 0.24 * lit) * (1 - 0.26 * darkMix);
    frontBandMat.color.setRGB(bandMul, bandMul, bandMul);
    frontBandMat.emissiveIntensity = (0.08 + 0.08 * lit) * (1 - 0.45 * darkMix);
  };

  const dispose = () => {
    glassMat.dispose();
    innerGlassMat.dispose();
    chaiMat.dispose();
    chaiTopMat.dispose();
    frothMat.dispose();
    frontBandMat.dispose();
    steamParticles.forEach((sp) => sp.sprite.material.dispose());
  };

  return {
    index,
    tea,
    group,
    glassMesh,
    chaiMat,
    chaiTopMat,
    frothMat,
    frontBandMat,
    baseChaiColor,
    steamParticles,
    updateSteam,
    setLightingMultiplier,
    dispose,
  };
}
