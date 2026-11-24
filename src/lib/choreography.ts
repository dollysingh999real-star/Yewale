export const GLASS_HEIGHT = 1.72;
export const GLASS_HALF_HEIGHT = GLASS_HEIGHT * 0.5;
export const CAMERA_FOV_DEG = 30;
export const CAMERA_Z = 10;
export const VISIBLE_HEIGHT = 2 * CAMERA_Z * Math.tan((CAMERA_FOV_DEG * Math.PI) / 360); // 5.35898...

export function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(t: number): number {
  const u = clamp(t, 0, 1);
  return 1 - Math.pow(1 - u, 3);
}

export function easeInOutCubic(t: number): number {
  const u = clamp(t, 0, 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

export function easeOutBack(t: number, overshoot = 1.15): number {
  const u = clamp(t, 0, 1);
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
}

export interface SpringState {
  value: number;
  velocity: number;
}

/**
 * Critically damped spring sub-stepped at 240 Hz (scroll) or variable dt.
 * x'' + 2 * omega * x' + omega^2 * (x - target) = 0
 */
export function stepCriticallyDampedSpring(
  state: SpringState,
  target: number,
  omega: number,
  dt: number,
  subStepHz = 240
): SpringState {
  const clampedDt = Math.min(dt, 1.0);
  if (clampedDt <= 0) return state;

  const steps = Math.max(1, Math.ceil(clampedDt * subStepHz));
  const h = clampedDt / steps;
  let x = state.value;
  let v = state.velocity;

  for (let i = 0; i < steps; i++) {
    const accel = -2 * omega * v - omega * omega * (x - target);
    v += accel * h;
    x += v * h;
  }

  return { value: x, velocity: v };
}

export interface TimelineState {
  a: number;
  s: number;
  b: number;
  m: number;
  c: number;
  l: number;
  heroOpacity: number;
  storyOpacity: number;
  filmOpacity: number;
  phase: 'hero' | 'story' | 'manifesto' | 'lineup' | 'menu';
}

export function computeTimeline(Y: number, introProgress = 1): TimelineState {
  const aRaw = clamp(Y / 0.75, 0, 1);
  const a = easeInOutCubic(aRaw);
  const s = clamp((Y - 0.75) / (3.3 - 0.75), 0, 1);
  const bRaw = clamp((Y - 3.3) / (3.95 - 3.3), 0, 1);
  const b = easeInOutCubic(bRaw);
  const m = clamp((Y - 3.95) / (5.0 - 3.95), 0, 1);
  const cRaw = clamp((Y - 5.0) / (5.7 - 5.0), 0, 1);
  const c = easeInOutCubic(cRaw);
  const l = clamp((Y - 5.7) / (7.05 - 5.7), 0, 1);

  const heroBase = 1 - smoothstep(0.02, 0.35, Y);
  const heroOpacity = introProgress >= 0.75 ? heroBase * clamp((introProgress - 0.75) / 0.25, 0, 1) : 0;
  const storyOpacity = smoothstep(0.5, 0.8, Y) * (1 - smoothstep(3.3, 3.55, Y));
  const filmOpacity = 1 - smoothstep(7.25, 7.8, Y);

  let phase: TimelineState['phase'] = 'hero';
  if (Y >= 7.55) phase = 'menu';
  else if (Y >= 5.2) phase = 'lineup';
  else if (Y >= 3.6) phase = 'manifesto';
  else if (Y >= 0.45) phase = 'story';

  return { a, s, b, m, c, l, heroOpacity, storyOpacity, filmOpacity, phase };
}

export interface LayoutConstants {
  aspect: number;
  k: number;
  VH: number;
  W: number;
  hc: number;
  heroCenterY: number;
  s1: number;
  s2: number;
  storyStartScale: number;
  storyStartX: number;
  storyStartTopY: number;
  storyStartRotZ: number;
  storyCloseScale: number;
  storyCloseX: number;
  storyTargetRowY: number;
  manifestoScale: number;
  manifestoCenterY: number;
  lineupScale: number;
  lineupFloorY: number;
}

export function computeLayoutConstants(aspect: number): LayoutConstants {
  const safeAspect = Math.max(0.25, aspect);
  const k = smoothstep(0.72, 1.25, safeAspect);
  const VH = VISIBLE_HEIGHT;
  const W = VH * safeAspect;

  const maxHeroHeight = lerp(0.38, 0.5, k) * VH;
  const maxHeroWidth = lerp(0.36, 0.2, k) * W;
  // Cutting chai outer rim diameter is ~1.05 (saucer 1.48) at height 1.72.
  const heroHeight = Math.min(maxHeroHeight, (maxHeroWidth / 1.05) * GLASS_HEIGHT);
  const hc = heroHeight / GLASS_HEIGHT;
  const heroBottomY = lerp(-0.3, -0.35, k) * VH;
  const heroCenterY = heroBottomY + hc * GLASS_HALF_HEIGHT;

  const s1 = lerp(0.36, 0.15, k);
  const s2 = lerp(0.25, 0.104, k);

  const storyStartHeight = lerp(0.9, 1.08, k) * VH;
  const storyStartScale = storyStartHeight / GLASS_HEIGHT;
  const storyStartX = lerp(0, -0.17, k) * W;
  const storyStartTopY = lerp(0.15, 0.44, k) * VH;
  const storyStartRotZ = lerp(0.12, 0.3, k);

  const storyCloseScale = Math.min(
    storyStartScale * lerp(1.25, 1.22, k),
    (lerp(0.78, 0.36, k) * W) / 1.04
  );
  const storyCloseX = lerp(0, -0.165, k) * W;
  const storyTargetRowY = lerp(-0.19, 0, k) * VH;

  const manifestoHeight = Math.min(lerp(0.5, 0.7, k) * VH, (0.36 * W * GLASS_HEIGHT) / 1.05);
  const manifestoScale = manifestoHeight / GLASS_HEIGHT;
  const manifestoCenterY = lerp(-0.16, -0.1, k) * VH;

  const lineupHeight = lerp(0.42, 0.6, k) * VH;
  const lineupScale = lineupHeight / GLASS_HEIGHT;
  const lineupFloorY = -0.43 * VH * 0.86;

  return {
    aspect: safeAspect,
    k,
    VH,
    W,
    hc,
    heroCenterY,
    s1,
    s2,
    storyStartScale,
    storyStartX,
    storyStartTopY,
    storyStartRotZ,
    storyCloseScale,
    storyCloseX,
    storyTargetRowY,
    manifestoScale,
    manifestoCenterY,
    lineupScale,
    lineupFloorY,
  };
}

export function wrapSlotDistance(index: number, centerCar: number, count: number): number {
  const half = count / 2;
  let d = (((index - centerCar) % count) + count) % count;
  if (d > half) d -= count;
  return d;
}

export function modIndex(index: number, count: number): number {
  return ((Math.round(index) % count) + count) % count;
}

export interface GlassTransform {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

export function computeHeroArcTransform(
  d: number,
  i: number,
  tilt: number,
  layout: LayoutConstants,
  timeSec: number,
  reducedMotion: boolean
): GlassTransform {
  const absD = Math.abs(d);
  const signD = d < 0 ? -1 : d > 0 ? 1 : 0;

  const x = signD * (Math.min(absD, 1) * layout.s1 + Math.max(0, absD - 1) * layout.s2) * layout.W;
  const scale = layout.hc * (1 - 0.3 * Math.min(absD, 1) - 0.035 * Math.max(0, absD - 1));

  // Bottoms stay level; side glasses sit +0.05*VH higher smoothly
  const sideLift = smoothstep(0, 1, absD) * 0.05 * layout.VH;
  const heroBottomY = lerp(-0.3, -0.35, layout.k) * layout.VH;
  let y = heroBottomY + sideLift + scale * GLASS_HALF_HEIGHT;
  const z = -Math.min(absD, 6) * 0.32 + 0;

  let rotZ = tilt * smoothstep(0, 1, absD);
  let rotY = -d * 0.2;

  if (!reducedMotion) {
    y += Math.sin(1.1 * timeSec + 1.7 * i) * 0.035;
    rotZ += Math.sin(0.8 * timeSec + 2.3 * i) * 0.025;
    rotY += Math.sin(0.5 * timeSec + i) * 0.06;
  }

  return { x, y, z, scale, rotX: 0, rotY, rotZ };
}

export function computeLineupTransform(
  slot: number,
  l: number,
  layout: LayoutConstants
): GlassTransform {
  const u = slot - easeInOutCubic(l) * 2;
  const z = 1.4 - 1.55 * u;
  const xBase = lerp(-0.3 * layout.W * 0.86, 0.48 * layout.W * 3.19, u / 15);
  const xLeave = Math.min(0, u) * 0.35 * layout.W;
  const x = xBase + xLeave;
  const scale = layout.lineupScale;
  const y = layout.lineupFloorY + scale * GLASS_HALF_HEIGHT;
  const rotY = -0.38 + Math.sin(0.8 * u + 2.5 * l) * 0.12;

  return { x, y, z, scale, rotX: 0, rotY, rotZ: 0 };
}

export interface StoryPoseInfo {
  turn: number;
  step: number;
  frac: number;
  f: number;
  activeRow: number;
}

export function computeStoryPoseInfo(s: number): StoryPoseInfo {
  const turn = easeInOutCubic(clamp(s / 0.12, 0, 1));
  const scaled = clamp(s * 3, 0, 2.9999);
  const step = Math.floor(scaled);
  const frac = scaled - step;
  const f = Math.min(2, step + smoothstep(0.6, 1, frac));
  const activeRow = s >= 0.11 ? step : -1;

  return { turn, step, frac, f, activeRow };
}

const SCRAMBLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function scrambleTitleText(target: string, progress: number, tick: number): string {
  const p = clamp(progress, 0, 1);
  const len = target.length;
  const resolvedCount = Math.floor(p * len);
  let out = '';

  for (let i = 0; i < len; i++) {
    const ch = target[i];
    if (ch === ' ') {
      out += ' ';
    } else if (i < resolvedCount || p >= 1) {
      out += ch;
    } else {
      const idx = Math.abs((i * 17 + tick * 7) % SCRAMBLE_GLYPHS.length);
      out += SCRAMBLE_GLYPHS[idx];
    }
  }
  return out;
}
