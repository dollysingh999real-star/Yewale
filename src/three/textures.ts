import * as THREE from 'three';
import { STORY_STEPS, TeaSpec } from '../data/yewale';

function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createDropletNormalMap(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hCtx = heightCanvas.getContext('2d')!;
  hCtx.fillStyle = '#000000';
  hCtx.fillRect(0, 0, size, size);

  const rng = createSeededRng(198301);
  for (let i = 0; i < 520; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1.5 + Math.pow(rng(), 1.6) * 5.5;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const cx = x + ox * size;
        const cy = y + oy * size;
        if (cx + r < 0 || cx - r > size || cy + r < 0 || cy - r > size) continue;
        const grad = hCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.55, 'rgba(170,170,170,0.8)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        hCtx.fillStyle = grad;
        hCtx.beginPath();
        hCtx.arc(cx, cy, r, 0, Math.PI * 2);
        hCtx.fill();
      }
    }
  }

  const hData = hCtx.getImageData(0, 0, size, size).data;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d')!;
  const out = nCtx.createImageData(size, size);
  const strength = 1.4;

  const sampleH = (px: number, py: number) => {
    const wx = ((px % size) + size) % size;
    const wy = ((py % size) + size) % size;
    return hData[(wy * size + wx) * 4] / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hL = sampleH(x - 1, y);
      const hR = sampleH(x + 1, y);
      const hU = sampleH(x, y - 1);
      const hD = sampleH(x, y + 1);
      let nx = (hL - hR) * strength;
      let ny = (hU - hD) * strength;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * size + x) * 4;
      out.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      out.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(out, 0, 0);

  const texture = new THREE.CanvasTexture(nCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 3);
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createChaiFoamTexture(
  tea: TeaSpec,
  hasMilkFroth: boolean,
  anisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size * 0.5;
  const cy = size * 0.5;

  const baseCol = new THREE.Color(tea.liquid);
  const creamCol = baseCol.clone().lerp(new THREE.Color('#FFF4DF'), hasMilkFroth ? 0.62 : 0.25);
  const darkCol = baseCol.clone().multiplyScalar(0.76);

  const grad = ctx.createRadialGradient(cx, cy, size * 0.04, cx, cy, size * 0.5);
  grad.addColorStop(0, `#${darkCol.getHexString()}`);
  grad.addColorStop(0.58, `#${baseCol.getHexString()}`);
  grad.addColorStop(0.86, `#${creamCol.getHexString()}`);
  grad.addColorStop(1, `#${creamCol.clone().lerp(new THREE.Color('#FFF8EC'), 0.35).getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  if (hasMilkFroth) {
    const rng = createSeededRng(9001 + tea.id * 97);
    // Froth micro-bubbles clustered toward outer rim and subtle center swirls
    for (let i = 0; i < 420; i++) {
      const ang = rng() * Math.PI * 2;
      const distNorm = 0.55 + Math.pow(rng(), 0.45) * 0.43;
      const x = cx + Math.cos(ang) * distNorm * (size * 0.48);
      const y = cy + Math.sin(ang) * distNorm * (size * 0.48);
      const r = 1.5 + rng() * 6.5;

      ctx.fillStyle = `rgba(255, 248, 234, ${0.18 + rng() * 0.38})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(120, 70, 28, ${0.12 + rng() * 0.14})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Center delicate crema wisps
    for (let i = 0; i < 65; i++) {
      const ang = rng() * Math.PI * 2;
      const distNorm = rng() * 0.48;
      const x = cx + Math.cos(ang) * distNorm * (size * 0.46);
      const y = cy + Math.sin(ang) * distNorm * (size * 0.46);
      const r = 2 + rng() * 8;
      const bGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
      bGrad.addColorStop(0, 'rgba(255, 245, 224, 0.32)');
      bGrad.addColorStop(1, 'rgba(255, 245, 224, 0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function beginFrostedBand(ctx: CanvasRenderingContext2D, w: number, h: number, opacity = 0.56) {
  ctx.clearRect(0, 0, w, h);

  // Warm sandblasted frosted-glass tint (matches chai amber & cream, never stark white)
  const hGrad = ctx.createLinearGradient(0, 0, w, 0);
  hGrad.addColorStop(0.0, 'rgba(248, 229, 200, 0)');
  hGrad.addColorStop(0.24, `rgba(248, 229, 200, ${opacity})`);
  hGrad.addColorStop(0.76, `rgba(248, 229, 200, ${opacity})`);
  hGrad.addColorStop(1.0, 'rgba(248, 229, 200, 0)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, w, h);

  // Soft vertical edge feathering so there are zero hard sticker lines top or bottom
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  const vGrad = ctx.createLinearGradient(0, 0, 0, h);
  vGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  vGrad.addColorStop(0.16, 'rgba(255, 255, 255, 1)');
  vGrad.addColorStop(0.84, 'rgba(255, 255, 255, 1)');
  vGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawFrontBandCanvas(canvas: HTMLCanvasElement, tea: TeaSpec): void {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;

  beginFrostedBand(ctx, w, h, 0.56);

  // Brand lockup: येवले YEWALE (baked ceramic Yewale crimson)
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#B81812';
  ctx.font = '700 112px "Baloo 2", sans-serif';
  const devaText = 'येवले';
  const devaW = ctx.measureText(devaText).width;
  ctx.font = 'italic 900 132px "Barlow Condensed", Impact, sans-serif';
  const latinText = 'YEWALE';
  const latinW = ctx.measureText(latinText).width;
  const gap = 28;
  const totalBrandW = devaW + gap + latinW;
  const startX = (w - totalBrandW) * 0.5;

  ctx.textAlign = 'left';
  ctx.font = '700 112px "Baloo 2", sans-serif';
  ctx.fillText(devaText, startX, 224);
  ctx.font = 'italic 900 132px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText(latinText, startX + devaW + gap, 228);

  // Subtle tea-accent hairline under brand
  ctx.fillStyle = tea.accent;
  ctx.fillRect(w * 0.27, 322, w * 0.46, 7);

  // Tea name in crisp deep roasted espresso (#180B06)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#180B06';
  const words = tea.name.split(' ');
  const maxTextW = w - 460;
  ctx.font = 'italic 900 264px "Barlow Condensed", Impact, sans-serif';

  if (words.length >= 3 && ctx.measureText(tea.name).width > maxTextW) {
    const line1 = words[0];
    const line2 = words.slice(1).join(' ');
    let f2 = 184;
    ctx.font = `italic 900 ${f2}px "Barlow Condensed", Impact, sans-serif`;
    while (
      (ctx.measureText(line1).width > maxTextW || ctx.measureText(line2).width > maxTextW) &&
      f2 > 128
    ) {
      f2 -= 6;
      ctx.font = `italic 900 ${f2}px "Barlow Condensed", Impact, sans-serif`;
    }
    ctx.fillText(line1, w * 0.5, 470);
    ctx.fillText(line2, w * 0.5, 646);
  } else {
    let fontSize = 266;
    ctx.font = `italic 900 ${fontSize}px "Barlow Condensed", Impact, sans-serif`;
    while (ctx.measureText(tea.name).width > maxTextW && fontSize > 144) {
      fontSize -= 6;
      ctx.font = `italic 900 ${fontSize}px "Barlow Condensed", Impact, sans-serif`;
    }
    ctx.fillText(tea.name, w * 0.5, 554);
  }

  // Subtle etched divider above price
  ctx.fillStyle = 'rgba(24, 11, 6, 0.24)';
  ctx.fillRect(w * 0.3, 766, w * 0.4, 5);

  // Bold price in Yewale crimson
  ctx.fillStyle = '#B81812';
  ctx.font = 'italic 900 310px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText(tea.price, w * 0.5, 962);
}

export function createFrontBandTexture(tea: TeaSpec, anisotropy: number): {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
} {
  // 2048 x 1260 matches the 2.12 rad * 0.422 avg radius / 0.56 height sleeve aspect (~1.60:1)
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1260;
  drawFrontBandCanvas(canvas, tea);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture, canvas };
}

function drawBackBandRowIcon(ctx: CanvasRenderingContext2D, idx: number, cx: number, cy: number) {
  ctx.save();
  ctx.strokeStyle = '#B81812';
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#180B06';
  ctx.lineWidth = 5.5;

  if (idx === 0) {
    // Cup icon
    ctx.beginPath();
    ctx.moveTo(cx - 21, cy - 17);
    ctx.lineTo(cx + 21, cy - 17);
    ctx.lineTo(cx + 14, cy + 19);
    ctx.lineTo(cx - 14, cy + 19);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy + 27);
    ctx.lineTo(cx + 26, cy + 27);
    ctx.stroke();
  } else if (idx === 1) {
    // Leaf icon
    ctx.beginPath();
    ctx.moveTo(cx - 19, cy + 19);
    ctx.quadraticCurveTo(cx - 21, cy - 17, cx + 21, cy - 21);
    ctx.quadraticCurveTo(cx + 19, cy + 19, cx - 19, cy + 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 21, cy + 21);
    ctx.lineTo(cx + 10, cy - 10);
    ctx.stroke();
  } else {
    // Sun icon
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.stroke();
    for (let r = 0; r < 8; r++) {
      const ang = (r / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 21, cy + Math.sin(ang) * 21);
      ctx.lineTo(cx + Math.cos(ang) * 29, cy + Math.sin(ang) * 29);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export interface BackBandAssets {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  rowBoundsUV: [THREE.Vector2, THREE.Vector2, THREE.Vector2];
  rowCenterRatioY: [number, number, number];
}

export function drawBackBandCanvas(canvas: HTMLCanvasElement): {
  rowBoundsUV: [THREE.Vector2, THREE.Vector2, THREE.Vector2];
  rowCenterRatioY: [number, number, number];
} {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;

  beginFrostedBand(ctx, w, h, 0.76);

  // Brand header inside frosted area
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#B81812';
  ctx.font = '700 66px "Baloo 2", sans-serif';
  const deva = 'येवले';
  const devaW = ctx.measureText(deva).width;
  ctx.font = 'italic 900 78px "Barlow Condensed", Impact, sans-serif';
  const latin = 'YEWALE';
  const latinW = ctx.measureText(latin).width;
  const brandStart = (w - (devaW + 22 + latinW)) * 0.5;
  ctx.textAlign = 'left';
  ctx.font = '700 66px "Baloo 2", sans-serif';
  ctx.fillText(deva, brandStart, 138);
  ctx.font = 'italic 900 78px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText(latin, brandStart + devaW + 22, 142);

  const rowHeight = 258;
  const rowTopStart = 206;
  const rowBoundsUV: [THREE.Vector2, THREE.Vector2, THREE.Vector2] = [
    new THREE.Vector2(),
    new THREE.Vector2(),
    new THREE.Vector2(),
  ];
  const rowCenterRatioY: [number, number, number] = [0, 0, 0];

  STORY_STEPS.forEach((step, idx) => {
    const yTop = rowTopStart + idx * rowHeight;
    const yBottom = yTop + rowHeight;
    const cy = (yTop + yBottom) * 0.5;

    if (idx > 0) {
      ctx.fillStyle = 'rgba(24, 11, 6, 0.16)';
      ctx.fillRect(280, yTop, w - 560, 4);
    }

    drawBackBandRowIcon(ctx, idx, 340, cy);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#180B06';
    ctx.font = 'italic 800 104px "Barlow Condensed", Impact, sans-serif';
    ctx.fillText(step.bandTitle, 440, cy - 38);

    ctx.fillStyle = 'rgba(24, 11, 6, 0.92)';
    ctx.font = '600 50px "Manrope", system-ui, sans-serif';
    ctx.fillText(step.bandDetail, 440, cy + 48);

    const vMin = 1 - yBottom / h;
    const vMax = 1 - yTop / h;
    rowBoundsUV[idx].set(vMin, vMax);
    rowCenterRatioY[idx] = 0.5 - cy / h;
  });

  // Footer
  ctx.fillStyle = 'rgba(24, 11, 6, 0.16)';
  ctx.fillRect(280, rowTopStart + 3 * rowHeight, w - 560, 4);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#180B06';
  ctx.font = '700 48px "Manrope", system-ui, sans-serif';
  ctx.fillText('650+ outlets · 13 states · Since 1983', w * 0.5, 1068);

  return { rowBoundsUV, rowCenterRatioY };
}

export function createBackBandTexture(anisotropy: number): BackBandAssets {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1260;
  const { rowBoundsUV, rowCenterRatioY } = drawBackBandCanvas(canvas);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture, canvas, rowBoundsUV, rowCenterRatioY };
}

export function createSteamTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    2,
    size * 0.5,
    size * 0.5,
    size * 0.5
  );
  grad.addColorStop(0, 'rgba(255, 250, 244, 0.72)');
  grad.addColorStop(0.45, 'rgba(255, 246, 232, 0.34)');
  grad.addColorStop(1, 'rgba(255, 246, 232, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createRadialGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5
  );
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.55)');
  grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.14)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createRowGlowTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const hGrad = ctx.createLinearGradient(0, 0, w, 0);
  hGrad.addColorStop(0, 'rgba(255,255,255,0)');
  hGrad.addColorStop(0.22, 'rgba(255,255,255,0.85)');
  hGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
  hGrad.addColorStop(0.78, 'rgba(255,255,255,0.85)');
  hGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'destination-in';
  const vGrad = ctx.createLinearGradient(0, 0, 0, h);
  vGrad.addColorStop(0, 'rgba(255,255,255,0)');
  vGrad.addColorStop(0.35, 'rgba(255,255,255,1)');
  vGrad.addColorStop(0.65, 'rgba(255,255,255,1)');
  vGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function drawManifestoCanvas(canvas: HTMLCanvasElement, blurPx: number): void {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let fontSize = 420;
  ctx.font = `italic 900 ${fontSize}px "Barlow Condensed", Impact, sans-serif`;
  const maxW = 1880;
  while (
    (ctx.measureText('BREWED SLOW').width > maxW ||
      ctx.measureText('SERVED HOT').width > maxW) &&
    fontSize > 160
  ) {
    fontSize -= 6;
    ctx.font = `italic 900 ${fontSize}px "Barlow Condensed", Impact, sans-serif`;
  }

  ctx.fillText('BREWED SLOW', w * 0.5, h * 0.34);
  ctx.fillText('SERVED HOT', w * 0.5, h * 0.7);
  ctx.restore();
}

export function createManifestoTextures(): {
  sharp: THREE.CanvasTexture;
  soft: THREE.CanvasTexture;
  sharpCanvas: HTMLCanvasElement;
  softCanvas: HTMLCanvasElement;
} {
  const make = (blurPx: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    drawManifestoCanvas(canvas, blurPx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return { tex, canvas };
  };

  const sharp = make(5);
  const soft = make(26);
  return {
    sharp: sharp.tex,
    soft: soft.tex,
    sharpCanvas: sharp.canvas,
    softCanvas: soft.canvas,
  };
}
