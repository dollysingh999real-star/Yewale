import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLASS_COUNT, INSTANCE_TILTS, TEAS } from '../data/yewale';
import {
  CAMERA_FOV_DEG,
  CAMERA_Z,
  clamp,
  computeHeroArcTransform,
  computeLayoutConstants,
  computeLineupTransform,
  computeStoryPoseInfo,
  computeTimeline,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  GLASS_HALF_HEIGHT,
  lerp,
  modIndex,
  smoothstep,
  SpringState,
  stepCriticallyDampedSpring,
  wrapSlotDistance,
} from '../lib/choreography';
import { createBackgroundQuad } from './backgroundShader';
import {
  ChaiGlassInstance,
  createChaiGlassInstance,
  createSharedGlassResources,
} from './chaiGlass';
import {
  createBackBandTexture,
  createChaiFoamTexture,
  createDropletNormalMap,
  createFrontBandTexture,
  createManifestoTextures,
  createRadialGlowTexture,
  createRowGlowTexture,
  createSteamTexture,
  drawBackBandCanvas,
  drawFrontBandCanvas,
  drawManifestoCanvas,
} from './textures';

export interface StageController {
  stepCarousel: (delta: number) => void;
  scrollToStoryStep: (stepIndex: number) => void;
  scrollToMenu: () => void;
  scrollToPhaseTop: (vh: number) => void;
}

interface ChaiStageProps {
  navOverlayRef: React.RefObject<HTMLElement | null>;
  heroOverlayRef: React.RefObject<HTMLDivElement | null>;
  storyOverlayRef: React.RefObject<HTMLDivElement | null>;
  onCenterTeaChange: (teaIndex: number, direction: number) => void;
  onStoryStepChange: (stepIndex: number) => void;
  controllerRef: React.MutableRefObject<StageController | null>;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#2c1b17');

  const specs: Array<{
    w: number;
    h: number;
    color: string;
    intensity: number;
    pos: [number, number, number];
  }> = [
    { w: 0.9, h: 16, color: '#ffffff', intensity: 4.6, pos: [-5.5, 0, 4.2] },
    { w: 0.5, h: 16, color: '#f8fbff', intensity: 3.3, pos: [4.8, 0.5, 3.6] },
    { w: 0.32, h: 16, color: '#fff8f2', intensity: 2.5, pos: [1.4, 0, 6.5] },
    { w: 12, h: 2.8, color: '#f5f8fc', intensity: 2.2, pos: [0, 7.5, 1.5] },
    { w: 10, h: 9, color: '#ffab85', intensity: 1.0, pos: [0, -1, -8] },
    { w: 7, h: 8, color: '#ffd8c4', intensity: 0.95, pos: [-8, -1, -3] },
    { w: 7, h: 8, color: '#e6ecf5', intensity: 0.9, pos: [8, -1, -2] },
  ];

  const geos: THREE.PlaneGeometry[] = [];
  const mats: THREE.MeshBasicMaterial[] = [];

  for (const spec of specs) {
    const geo = new THREE.PlaneGeometry(spec.w, spec.h);
    const col = new THREE.Color(spec.color).multiplyScalar(spec.intensity);
    const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    mesh.lookAt(0, 0, 0);
    envScene.add(mesh);
    geos.push(geo);
    mats.push(mat);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromScene(envScene, 0.035);
  pmrem.dispose();
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  return envRT.texture;
}

export const ChaiStage: React.FC<ChaiStageProps> = ({
  navOverlayRef,
  heroOverlayRef,
  storyOverlayRef,
  onCenterTeaChange,
  onStoryStepChange,
  controllerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const teaCbRef = useRef(onCenterTeaChange);
  const storyCbRef = useRef(onStoryStepChange);
  teaCbRef.current = onCenterTeaChange;
  storyCbRef.current = onStoryStepChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;
    const autostart = new URLSearchParams(window.location.search).get('autostart') === '1';

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    let currentDpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(currentDpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV_DEG,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      100
    );
    camera.position.set(0, 0, CAMERA_Z);
    camera.lookAt(0, 0, 0);

    const envTexture = createStudioEnvironment(renderer);
    scene.environment = envTexture;

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(-3, 5, 6);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight('#ffe8dc', 0.35));

    // Procedural textures (high anisotropy for crystal-clear curved glass labels)
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const anisotropy = Math.min(8, maxAniso);
    const dropletNormalMap = createDropletNormalMap(anisotropy);
    const backBandAssets = createBackBandTexture(anisotropy);
    const frontBandPairs = TEAS.map((tea) => createFrontBandTexture(tea, anisotropy));
    const foamTextures = TEAS.map((tea) =>
      createChaiFoamTexture(tea, ![3, 4, 6].includes(tea.id), anisotropy)
    );
    const steamTex = createSteamTexture();
    const radialGlowTex = createRadialGlowTexture();
    const rowGlowTex = createRowGlowTexture();
    const manifestoTex = createManifestoTextures();

    // Background shader quad
    const bgRig = createBackgroundQuad(manifestoTex.sharp, manifestoTex.soft);
    scene.add(bgRig.mesh);

    // Shared glass resources + 16 glass instances
    const shared = createSharedGlassResources(backBandAssets);
    const glasses: ChaiGlassInstance[] = [];
    const interactables: THREE.Mesh[] = [];

    for (let i = 0; i < GLASS_COUNT; i++) {
      const teaIdx = i % TEAS.length;
      const tea = TEAS[teaIdx];
      const inst = createChaiGlassInstance(
        i,
        tea,
        shared,
        frontBandPairs[teaIdx].texture,
        foamTextures[teaIdx],
        tea.isCold ? dropletNormalMap : null,
        steamTex
      );
      scene.add(inst.group);
      glasses.push(inst);
      interactables.push(inst.glassMesh);
    }

    // Re-draw all canvas typography once web fonts (Barlow Condensed, Baloo 2, Manrope) finish loading
    let disposed = false;
    const redrawAllLabelFonts = () => {
      if (disposed) return;
      frontBandPairs.forEach((pair, idx) => {
        drawFrontBandCanvas(pair.canvas, TEAS[idx]);
        pair.texture.needsUpdate = true;
      });
      drawBackBandCanvas(backBandAssets.canvas);
      backBandAssets.texture.needsUpdate = true;
      drawManifestoCanvas(manifestoTex.sharpCanvas, 5);
      manifestoTex.sharp.needsUpdate = true;
      drawManifestoCanvas(manifestoTex.softCanvas, 26);
      manifestoTex.soft.needsUpdate = true;
    };

    Promise.allSettled([
      document.fonts.load('italic 900 120px "Barlow Condensed"'),
      document.fonts.load('italic 800 112px "Barlow Condensed"'),
      document.fonts.load('700 104px "Baloo 2"'),
      document.fonts.load('500 58px "Manrope"'),
      document.fonts.ready,
    ]).then(() => {
      redrawAllLabelFonts();
    });

    // Subtle floor aura beneath center glass (no saucer/base ring)
    const saucerGlowGroup = new THREE.Group();
    const floorGlowGeo = new THREE.PlaneGeometry(2.1, 0.75);
    const floorGlowMat = new THREE.MeshBasicMaterial({
      map: radialGlowTex,
      color: new THREE.Color(TEAS[0].accent),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const floorGlowMesh = new THREE.Mesh(floorGlowGeo, floorGlowMat);
    floorGlowMesh.rotation.x = -Math.PI * 0.42;
    floorGlowMesh.position.y = -0.02;
    saucerGlowGroup.add(floorGlowMesh);
    saucerGlowGroup.renderOrder = 5;
    scene.add(saucerGlowGroup);

    // Row glow additive cylinder attached to center glass when in story
    const rowGlowMat = new THREE.MeshBasicMaterial({
      map: rowGlowTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const rowGlowMesh = new THREE.Mesh(shared.rowGlowGeo, rowGlowMat);
    rowGlowMesh.renderOrder = 6;
    rowGlowMesh.visible = false;
    scene.add(rowGlowMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // State variables
    let scrollSpring: SpringState = {
      value: window.scrollY / Math.max(1, window.innerHeight),
      velocity: 0,
    };
    let carSpring: SpringState = { value: 0, velocity: 0 };
    let carTarget = 0;

    let activeCenterSlot = 0;
    let lastReportedTea = 0;
    let lastStoryStep = 0;
    let lastRowIndex = -1;
    let currentAccentColor = new THREE.Color(TEAS[0].accent);
    const targetAccentColor = new THREE.Color(TEAS[0].accent);
    const whiteColor = new THREE.Color('#ffffff');

    // Back band sweep & streak state
    const rowSweep = [0, 0, 0];
    const rowDim = [0, 0, 0];
    let streakTimer = 10;
    let currentRowGlowLocalY = shared.rowLocalY[0];

    // Intro state
    let introDone = autostart || reducedMotion;
    let introElapsed = introDone ? 1.9 : 0;
    let introUiShown = introDone;

    if (introDone) {
      document.body.classList.add('ready', 'intro-ui');
      if (autostart) {
        document.body.classList.add('autostart');
      }
    } else {
      Promise.race([
        document.fonts.ready,
        new Promise<void>((resolve) => window.setTimeout(resolve, 1400)),
      ]).then(() => {
        document.body.classList.add('ready');
      });
    }

    // Hover & Drag state
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let isDragging = false;
    let dragStartX = 0;
    let dragLastX = 0;
    let dragLastTime = 0;
    let dragVelocity = 0;
    let dragMoved = 0;
    let hoveredGlassIndex = -1;
    let lastHoverCheck = 0;
    let wheelTimer = 0;

    const hoverLift = new Float32Array(GLASS_COUNT);

    // Exposing controller methods for UI buttons
    controllerRef.current = {
      stepCarousel: (delta: number) => {
        carTarget += delta;
      },
      scrollToStoryStep: (stepIndex: number) => {
        const vh = 0.75 + (3.3 - 0.75) * ((stepIndex + 0.5) / 3);
        window.scrollTo({
          top: vh * window.innerHeight,
          behavior: reducedMotion ? 'auto' : 'smooth',
        });
      },
      scrollToMenu: () => {
        const el = document.getElementById('menu-sections');
        if (el) {
          el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
        }
      },
      scrollToPhaseTop: (vh: number) => {
        window.scrollTo({
          top: vh * window.innerHeight,
          behavior: reducedMotion ? 'auto' : 'smooth',
        });
      },
    };

    const getScrollYVh = () => window.scrollY / Math.max(1, window.innerHeight);

    const onPointerDown = (e: PointerEvent) => {
      if (scrollSpring.value > 0.38 || e.button !== 0) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragLastX = e.clientX;
      dragLastTime = performance.now();
      dragVelocity = 0;
      dragMoved = 0;
      canvas.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const layout = computeLayoutConstants(window.innerWidth / Math.max(1, window.innerHeight));

      if (isDragging) {
        const dx = e.clientX - dragLastX;
        dragMoved += Math.abs(dx);
        const dtMs = Math.max(1, now - dragLastTime);
        const stepPx = Math.max(80, layout.s1 * window.innerWidth);
        const slotDelta = -dx / stepPx;
        carTarget += slotDelta;
        carSpring.value += slotDelta;
        const instantVel = (slotDelta / dtMs) * 1000;
        dragVelocity = lerp(dragVelocity, clamp(instantVel, -14, 14), 0.35);
        dragLastX = e.clientX;
        dragLastTime = now;
        return;
      }

      if (scrollSpring.value <= 0.35 && now - lastHoverCheck > 40) {
        lastHoverCheck = now;
        pointerNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointerNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(interactables, false);
        hoveredGlassIndex = hits.length > 0 ? (hits[0].object.userData.glassIndex as number) : -1;
        canvas.style.cursor = hoveredGlassIndex >= 0 ? 'pointer' : 'grab';
      } else if (scrollSpring.value > 0.35) {
        hoveredGlassIndex = -1;
        canvas.style.cursor = 'default';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      const now = performance.now();
      if (dragMoved < 6) {
        // Click raycast
        pointerNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointerNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(interactables, false);
        if (hits.length > 0) {
          const clickedIdx = hits[0].object.userData.glassIndex as number;
          const d = wrapSlotDistance(clickedIdx, carSpring.value, GLASS_COUNT);
          if (Math.abs(d) > 0.1) {
            carTarget = Math.round(carSpring.value + d);
          }
        }
      } else {
        const restedMs = now - dragLastTime;
        const v = restedMs > 90 ? 0 : clamp(dragVelocity, -14, 14);
        carTarget = Math.round(carSpring.value + v * 0.22);
      }
      canvas.style.cursor = hoveredGlassIndex >= 0 ? 'pointer' : 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      if (scrollSpring.value > 0.35) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 2) {
        e.preventDefault();
        const deltaSlot = e.deltaX / 220;
        carTarget += deltaSlot;
        window.clearTimeout(wheelTimer);
        wheelTimer = window.setTimeout(() => {
          carTarget = Math.round(carTarget);
        }, 130);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (scrollSpring.value > 0.35) return;
      if (e.key === 'ArrowRight') {
        carTarget += 1;
      } else if (e.key === 'ArrowLeft') {
        carTarget -= 1;
      }
    };

    const onResize = () => {
      const w = window.innerWidth;
      const h = Math.max(1, window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      if (isSoftwareGl) {
        renderer.render(scene, camera);
      }
    };

    const onReducedMotionChange = (ev: MediaQueryListEvent) => {
      reducedMotion = ev.matches;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    reducedMotionQuery.addEventListener('change', onReducedMotionChange);

    // Adaptive DPR tracking
    let frameId = 0;
    let lastTs = performance.now();
    let frameTimeAvg = 16.6;
    let dprLockUntil = 0;
    let fastTimeAccum = 0;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = (now: number) => {
      if (disposed) return;
      const rawDt = (now - lastTs) / 1000;
      lastTs = now;
      const dt = Math.min(Math.max(rawDt, 0.001), isSoftwareGl ? 1.0 : 0.05);
      const timeSec = now * 0.001;

      // Adaptive DPR (real GPU only)
      if (!isSoftwareGl && rawDt > 0 && rawDt < 0.2) {
        const ms = rawDt * 1000;
        frameTimeAvg = lerp(frameTimeAvg, ms, 0.1);
        if (frameTimeAvg > 19.5 && currentDpr > 0.7) {
          currentDpr = Math.max(0.7, +(currentDpr - 0.15).toFixed(2));
          renderer.setPixelRatio(currentDpr);
          dprLockUntil = now + 8000;
          fastTimeAccum = 0;
        } else if (now > dprLockUntil && frameTimeAvg < 17.3 && currentDpr < Math.min(window.devicePixelRatio || 1, 1.5)) {
          fastTimeAccum += dt;
          if (fastTimeAccum >= 1.2) {
            currentDpr = Math.min(Math.min(window.devicePixelRatio || 1, 1.5), +(currentDpr + 0.05).toFixed(2));
            renderer.setPixelRatio(currentDpr);
            fastTimeAccum = 0;
          }
        } else {
          fastTimeAccum = 0;
        }
      }

      // Intro progression (1.9s)
      if (!introDone && document.body.classList.contains('ready')) {
        introElapsed += dt;
        const introProg = clamp(introElapsed / 1.9, 0, 1);
        if (introProg >= 0.7 && !introUiShown) {
          introUiShown = true;
          document.body.classList.add('intro-ui');
        }
        if (introProg >= 1) {
          introDone = true;
        }
      }
      const introProg = introDone ? 1 : clamp(introElapsed / 1.9, 0, 1);

      // Springs
      const scrollOmega = reducedMotion ? 40 : 5.6;
      scrollSpring = stepCriticallyDampedSpring(scrollSpring, getScrollYVh(), scrollOmega, dt, 240);
      const Y = scrollSpring.value;

      if (!isDragging) {
        const carOmega = reducedMotion ? 24 : Math.sqrt(46);
        carSpring = stepCriticallyDampedSpring(carSpring, carTarget, carOmega, dt, 120);
      }

      const tl = computeTimeline(Y, introProg);
      const aspect = window.innerWidth / Math.max(1, window.innerHeight);
      const layout = computeLayoutConstants(aspect);

      // Center glass discrete identity
      const newCenterSlot = modIndex(carSpring.value, GLASS_COUNT);
      const newTeaIdx = newCenterSlot % TEAS.length;
      if (newTeaIdx !== lastReportedTea) {
        const dir = wrapSlotDistance(newCenterSlot, activeCenterSlot, GLASS_COUNT) >= 0 ? 1 : -1;
        lastReportedTea = newTeaIdx;
        teaCbRef.current(newTeaIdx, dir);
      }
      activeCenterSlot = newCenterSlot;

      // Story pose & active row
      const storyInfo = computeStoryPoseInfo(tl.s);
      if (storyInfo.step !== lastStoryStep && tl.storyOpacity > 0.02) {
        lastStoryStep = storyInfo.step;
        storyCbRef.current(storyInfo.step);
      }

      // Update body telemetry attributes for testability (hidden, non-visual)
      document.body.dataset.phase = tl.phase;
      document.body.dataset.activeTea = TEAS[lastReportedTea].name;
      document.body.dataset.storyStep = String(storyInfo.step);

      // Update film exit opacity on canvas and overlays
      const canvasAlpha = clamp(tl.filmOpacity, 0, 1);
      if (document.body.classList.contains('ready')) {
        canvas.style.opacity = String(canvasAlpha);
      }
      canvas.style.pointerEvents = canvasAlpha > 0.05 && Y < 7.85 ? 'auto' : 'none';

      if (navOverlayRef.current) {
        const rawY = getScrollYVh();
        const navAlpha = Math.min(
          1 - smoothstep(7.05, 7.35, Y),
          1 - smoothstep(7.15, 7.35, rawY)
        );
        navOverlayRef.current.style.opacity = navAlpha < 0.999 ? String(navAlpha) : '';
        navOverlayRef.current.style.visibility = navAlpha < 0.01 ? 'hidden' : 'visible';
        navOverlayRef.current.style.pointerEvents = navAlpha < 0.05 ? 'none' : '';
      }
      if (heroOverlayRef.current) {
        const hOp = tl.heroOpacity * canvasAlpha;
        heroOverlayRef.current.style.opacity = String(hOp);
        heroOverlayRef.current.style.visibility = hOp < 0.01 ? 'hidden' : 'visible';
      }
      if (storyOverlayRef.current) {
        const sOp = tl.storyOpacity * canvasAlpha;
        storyOverlayRef.current.style.opacity = String(sOp);
        storyOverlayRef.current.style.visibility = sOp < 0.01 ? 'hidden' : 'visible';
      }

      // Accent cross-fade
      targetAccentColor.set(TEAS[lastReportedTea].accent);
      const accentFade = 1 - Math.exp(-4 * dt);
      currentAccentColor.lerp(targetAccentColor, accentFade);
      const hexAccent = `#${currentAccentColor.getHexString()}`;
      document.documentElement.style.setProperty('--sc', hexAccent);
      document.documentElement.style.setProperty(
        '--sg',
        `rgba(${Math.round(currentAccentColor.r * 255)}, ${Math.round(currentAccentColor.g * 255)}, ${Math.round(currentAccentColor.b * 255)}, 0.48)`
      );

      // Background shader update
      const manifestoSharp = tl.m > 0 ? easeOutCubic(tl.m) * 0.62 : 0;
      const manifestoDriftX = tl.m > 0 ? (tl.m - 0.5) * 0.03 : 0;
      bgRig.update(tl, aspect, timeSec, manifestoSharp, manifestoDriftX);

      // Back-band highlight uniforms
      const activeRow = tl.s >= 0.11 && tl.b < 0.5 ? storyInfo.activeRow : -1;
      if (activeRow !== lastRowIndex) {
        if (activeRow >= 0) {
          streakTimer = 0;
        }
        lastRowIndex = activeRow;
      }
      streakTimer = Math.min(10, streakTimer + dt);
      const streakNorm = clamp(streakTimer / 0.95, 0, 1);
      shared.backBandUniforms.uStreakPos.value = lerp(-0.15, 1.15, easeOutCubic(streakNorm));
      shared.backBandUniforms.uStreakInt.value = activeRow >= 0 && streakNorm < 1 ? Math.sin(Math.PI * streakNorm) * 0.6 : 0;

      for (let r = 0; r < 3; r++) {
        if (r === activeRow) {
          rowSweep[r] = Math.min(1, rowSweep[r] + dt / 0.6);
          rowDim[r] = lerp(rowDim[r], 0, 1 - Math.exp(-7 * dt));
        } else {
          rowSweep[r] = Math.max(0, rowSweep[r] - (dt * 1.4) / 0.6);
          const targetDim = activeRow >= 0 ? 1 : 0;
          rowDim[r] = lerp(rowDim[r], targetDim, 1 - Math.exp(-7 * dt));
        }
      }
      shared.backBandUniforms.uSweep.value.set(
        easeInOutCubic(rowSweep[0]),
        easeInOutCubic(rowSweep[1]),
        easeInOutCubic(rowSweep[2])
      );
      shared.backBandUniforms.uDim.value.set(rowDim[0], rowDim[1], rowDim[2]);

      // Story target row Y interpolation
      const fIdx = Math.floor(storyInfo.f);
      const fNext = Math.min(2, fIdx + 1);
      const fFrac = storyInfo.f - fIdx;
      const activeLocalRowY = lerp(shared.rowLocalY[fIdx], shared.rowLocalY[fNext], fFrac);

      // Center glass story pose
      const storyZoomX = lerp(layout.storyStartX, layout.storyCloseX, storyInfo.turn);
      const storyZoomScale = lerp(layout.storyStartScale, layout.storyCloseScale, storyInfo.turn);
      const storyStartCenterY = layout.storyStartTopY - layout.storyStartScale * GLASS_HALF_HEIGHT;
      const storyCloseCenterY = layout.storyTargetRowY - activeLocalRowY * storyZoomScale;
      const storyZoomY = lerp(storyStartCenterY, storyCloseCenterY, storyInfo.turn);
      const storyZoomRotZ = lerp(layout.storyStartRotZ, 0.025, storyInfo.turn);
      const storySwayY = reducedMotion ? 0 : Math.sin(0.7 * timeSec) * 0.025;
      const storyZoomRotY =
        storyInfo.turn * Math.PI + storyInfo.turn * ((storyInfo.f - 1) * 0.14 + storySwayY);

      // Center glass manifesto pose
      const manifestoRotY = Math.PI * 2 + (reducedMotion ? 0 : easeInOutCubic(tl.m) * Math.PI * 2);

      // Position each of the 16 glasses
      for (let i = 0; i < GLASS_COUNT; i++) {
        const glass = glasses[i];
        const d = wrapSlotDistance(i, carSpring.value, GLASS_COUNT);
        const absD = Math.abs(d);
        const isCenter = i === activeCenterSlot;

        // Smooth hover lift
        const targetHover = !isCenter && i === hoveredGlassIndex && Y < 0.35 ? 1 : 0;
        hoverLift[i] = lerp(hoverLift[i], targetHover, 1 - Math.exp(-10 * dt));

        // Base Hero Arc pose
        const heroPose = computeHeroArcTransform(
          d,
          i,
          INSTANCE_TILTS[i],
          layout,
          timeSec,
          reducedMotion
        );

        // Apply intro animation during initial 1.9s
        if (introProg < 1) {
          const gp = clamp((introProg - 0.06 * absD) / 0.62, 0, 1);
          if (absD < 0.5) {
            const e = easeOutCubic(gp);
            heroPose.y = lerp(heroPose.y - 0.75 * layout.VH, heroPose.y, e);
          } else {
            const e = easeOutBack(gp, 1.15);
            const signD = d >= 0 ? 1 : -1;
            heroPose.x = lerp(signD * 0.85 * layout.W, heroPose.x, e);
            heroPose.rotZ = lerp(signD * 0.5, heroPose.rotZ, e);
          }
        }

        // Hover lift
        heroPose.y += hoverLift[i] * 0.09;

        // Lighting falloff in hero
        const heroLit = clamp(1 - Math.min(absD, 2) * 0.45 + hoverLift[i] * 0.35, 0.15, 1);
        const finalLit = lerp(heroLit, 1, clamp(tl.a + tl.c, 0, 1));
        glass.setLightingMultiplier(finalLit, tl.c);
        if (isCenter) {
          shared.backBandUniforms.uLightMul.value = finalLit;
        }

        // Lineup target slot relative to activeCenterSlot
        const lineupSlot = (i - activeCenterSlot + GLASS_COUNT) % GLASS_COUNT;
        const lineupPose = computeLineupTransform(lineupSlot, tl.l, layout);

        let px = heroPose.x;
        let py = heroPose.y;
        let pz = heroPose.z;
        let pScale = heroPose.scale;
        let pRotZ = heroPose.rotZ;
        let pRotY = heroPose.rotY;

        if (isCenter) {
          // Hero -> Story (a)
          px = lerp(heroPose.x, storyZoomX, tl.a);
          py = lerp(heroPose.y, storyZoomY, tl.a);
          pz = lerp(heroPose.z, 0, tl.a);
          pScale = lerp(heroPose.scale, storyZoomScale, tl.a);
          pRotZ = lerp(heroPose.rotZ, storyZoomRotZ, tl.a);
          pRotY = lerp(heroPose.rotY, storyZoomRotY, tl.a);

          // Story -> Manifesto (b)
          if (tl.b > 0) {
            px = lerp(px, 0, tl.b);
            py = lerp(py, layout.manifestoCenterY, tl.b);
            pz = lerp(pz, 0, tl.b);
            pScale = lerp(pScale, layout.manifestoScale, tl.b);
            pRotZ = lerp(pRotZ, 0, tl.b);
            pRotY = lerp(pRotY, manifestoRotY, tl.b);
          }

          // Manifesto -> Lineup (c)
          if (tl.c > 0) {
            px = lerp(px, lineupPose.x, tl.c);
            py = lerp(py, lineupPose.y, tl.c);
            pz = lerp(pz, lineupPose.z, tl.c);
            pScale = lerp(pScale, lineupPose.scale, tl.c);
            pRotZ = lerp(pRotZ, lineupPose.rotZ, tl.c);
            pRotY = lerp(pRotY, lineupPose.rotY, tl.c);
          }
        } else {
          // Side glasses slide out during a
          const signD = d >= 0 ? 1 : -1;
          px = heroPose.x + signD * 0.9 * layout.W * tl.a;
          pScale = heroPose.scale * (1 - 0.25 * tl.a);

          // Hide side glasses during story/manifesto, slide back in during c
          if (tl.c > 0) {
            const stagger = ((lineupSlot % 5) / 5) * 0.15;
            const cLocal = easeInOutCubic(clamp((tl.c - stagger) / (1 - stagger), 0, 1));
            const enterSide = lineupSlot % 2 === 0 ? -1 : 1;
            const startX = enterSide * 1.25 * layout.W;
            const startY = lineupPose.y + 0.05 * layout.VH;
            const startRotY = lineupPose.rotY + enterSide * 1.2;

            px = lerp(startX, lineupPose.x, cLocal);
            py = lerp(startY, lineupPose.y, cLocal);
            pz = lineupPose.z;
            pScale = lineupPose.scale;
            pRotZ = lineupPose.rotZ;
            pRotY = lerp(startRotY, lineupPose.rotY, cLocal);
            glass.group.visible = cLocal > 0.005;
          } else {
            glass.group.visible = tl.a < 0.99;
          }
        }

        glass.group.position.set(px, py, pz);
        glass.group.scale.setScalar(pScale);
        glass.group.rotation.set(0, pRotY, pRotZ);

        // Steam update
        if (reducedMotion) {
          glass.updateSteam(timeSec, 0, 0);
        } else if (tl.c > 0.5) {
          glass.updateSteam(timeSec, 0.22 * tl.c, 0);
        } else if (isCenter) {
          const steamStrength = tl.b > 0 ? 0.9 : 1 - tl.a * 0.75;
          const spinFac = tl.m > 0 && tl.m < 1 ? Math.sin(Math.PI * tl.m) : 0;
          glass.updateSteam(timeSec, steamStrength, spinFac);
        } else {
          glass.updateSteam(timeSec, 0, 0);
        }

        // Row glow follows active center glass in story
        if (isCenter) {
          const showRowGlow = activeRow >= 0 && tl.b < 0.2 && tl.s >= 0.11;
          rowGlowMesh.visible = showRowGlow;
          if (showRowGlow) {
            currentRowGlowLocalY = lerp(
              currentRowGlowLocalY,
              shared.rowLocalY[activeRow],
              1 - Math.exp(-8 * dt)
            );
            rowGlowMesh.position.set(px, py + currentRowGlowLocalY * pScale, pz);
            rowGlowMesh.scale.setScalar(pScale);
            rowGlowMesh.rotation.set(0, pRotY, pRotZ);
            rowGlowMat.opacity = (0.2 + 0.05 * Math.sin(2.2 * timeSec)) * (1 - tl.b * 5);
          }
        }
      }

      // Hero saucer glow assembly
      const glowVisible = tl.a < 0.99 && canvasAlpha > 0.01;
      saucerGlowGroup.visible = glowVisible;
      if (glowVisible) {
        const centerGlass = glasses[activeCenterSlot];
        const introGlow = introProg < 1 ? easeOutCubic(clamp(introProg / 0.75, 0, 1)) : 1;
        const sinkY = -0.35 * layout.VH * tl.a - (1 - introGlow) * 0.75 * layout.VH;
        saucerGlowGroup.position.set(
          centerGlass.group.position.x,
          centerGlass.group.position.y - GLASS_HALF_HEIGHT * centerGlass.group.scale.y + sinkY,
          centerGlass.group.position.z
        );
        saucerGlowGroup.scale.set(layout.hc * 1.1, layout.hc * 1.05, layout.hc * 1.1);

        floorGlowMat.color.copy(currentAccentColor);
        floorGlowMat.opacity = 0.3 * (1 - tl.a) * introGlow;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(() => {
          if (!disposed) tick(performance.now());
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick(performance.now());
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.clearTimeout(wheelTimer);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      reducedMotionQuery.removeEventListener('change', onReducedMotionChange);

      glasses.forEach((g) => g.dispose());
      shared.dispose();
      bgRig.dispose();
      dropletNormalMap.dispose();
      frontBandPairs.forEach((p) => p.texture.dispose());
      foamTextures.forEach((t) => t.dispose());
      steamTex.dispose();
      radialGlowTex.dispose();
      rowGlowTex.dispose();
      floorGlowGeo.dispose();
      floorGlowMat.dispose();
      rowGlowMat.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, [controllerRef, heroOverlayRef, navOverlayRef, storyOverlayRef]);

  return (
    <canvas
      id="gl"
      ref={canvasRef}
      data-testid="chai-stage-canvas"
      aria-label="Interactive 3D Yewale Amruttulya cutting chai glass showcase"
    />
  );
};
