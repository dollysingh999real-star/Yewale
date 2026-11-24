import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHeroArcTransform,
  computeLayoutConstants,
  computeLineupTransform,
  computeStoryPoseInfo,
  computeTimeline,
  modIndex,
  scrambleTitleText,
  stepCriticallyDampedSpring,
  wrapSlotDistance,
} from './choreography';

test('critically damped spring converges without overshoot', () => {
  let state = { value: 0, velocity: 0 };
  for (let i = 0; i < 90; i++) {
    state = stepCriticallyDampedSpring(state, 10, 5.6, 1 / 60);
    assert.ok(state.value <= 10.001, `Expected no overshoot, got ${state.value}`);
  }
  assert.ok(Math.abs(state.value - 10) < 0.05);
});

test('timeline breakpoints map phases and film exit accurately', () => {
  const hero = computeTimeline(0, 1);
  assert.equal(hero.phase, 'hero');
  assert.equal(hero.heroOpacity, 1);
  assert.equal(hero.storyOpacity, 0);
  assert.equal(hero.filmOpacity, 1);

  const story = computeTimeline(1.5, 1);
  assert.equal(story.phase, 'story');
  assert.equal(story.a, 1);
  assert.ok(story.storyOpacity > 0.99);
  assert.equal(story.heroOpacity, 0);

  const manifesto = computeTimeline(4.5, 1);
  assert.equal(manifesto.phase, 'manifesto');
  assert.ok(manifesto.m > 0 && manifesto.m < 1);

  const lineup = computeTimeline(6.5, 1);
  assert.equal(lineup.phase, 'lineup');
  assert.ok(lineup.l > 0 && lineup.l < 1);
  assert.equal(lineup.filmOpacity, 1);

  const lineupComplete = computeTimeline(7.1, 1);
  assert.equal(lineupComplete.phase, 'lineup');
  assert.equal(lineupComplete.l, 1);
  assert.equal(lineupComplete.filmOpacity, 1);

  const menu = computeTimeline(8.0, 1);
  assert.equal(menu.phase, 'menu');
  assert.equal(menu.filmOpacity, 0);
});

test('slot wrapping and modulo indexing handle negative and wraparound indices', () => {
  assert.equal(modIndex(-1, 16), 15);
  assert.equal(modIndex(17, 16), 1);
  assert.equal(wrapSlotDistance(15, 0, 16), -1);
  assert.equal(wrapSlotDistance(0, 15, 16), 1);
  assert.equal(wrapSlotDistance(8, 0, 16), 8);
});

test('hero arc positions center glass at x=0 and side glasses symmetrically', () => {
  const layout = computeLayoutConstants(1440 / 900);
  const center = computeHeroArcTransform(0, 0, 0.1, layout, 0, true);
  const right = computeHeroArcTransform(1, 1, -0.15, layout, 0, true);
  const left = computeHeroArcTransform(-1, 15, -0.1, layout, 0, true);

  assert.equal(center.x, 0);
  assert.equal(center.z, 0);
  assert.ok(right.x > 0);
  assert.ok(Math.abs(right.x + left.x) < 1e-6);
  assert.ok(right.scale < center.scale);
});

test('story pose activates rows 0, 1, 2 across s=0..1 and highlights after s>=0.11', () => {
  assert.equal(computeStoryPoseInfo(0.05).activeRow, -1);
  assert.equal(computeStoryPoseInfo(0.2).activeRow, 0);
  assert.equal(computeStoryPoseInfo(0.5).activeRow, 1);
  assert.equal(computeStoryPoseInfo(0.9).activeRow, 2);
});

test('lineup sweeps 2 slots left over l=0..1', () => {
  const layout = computeLayoutConstants(16 / 9);
  const start = computeLineupTransform(2, 0, layout);
  const end = computeLineupTransform(2, 1, layout);
  assert.ok(end.x < start.x);
  assert.ok(end.z > start.z);
});

test('scrambleTitleText preserves spaces and resolves cleanly at progress=1', () => {
  const target = 'STANDARDIZED RECIPE';
  const mid = scrambleTitleText(target, 0.5, 3);
  assert.equal(mid.length, target.length);
  assert.equal(mid[12], ' ');
  assert.equal(scrambleTitleText(target, 1, 3), target);
});
