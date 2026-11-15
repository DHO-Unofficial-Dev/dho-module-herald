// SDK 없이 도는 순수 로직 검사. 실행: node --test test/
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { GROUPS, SEASONS, SOUNDS, groupForParent, soundById } from '../module/lib/catalog.js';
import { createNotifier } from '../module/lib/notifier.js';
import {
  decideRegionNotice,
  normalizePrefs,
  playbackOptions,
  resolveRegionSound,
  resolveSeasonSound,
  spaced,
  usagesOf,
  withChoice,
  withoutUserSound,
} from '../module/lib/prefs.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const moduleDir = join(root, 'module');

// 내장 해역 데이터의 상위 바다 24개(DHO Navigator 2.2.0 기준).
const PARENTS = [
  '서 지중해', '동 지중해', '북해', '유럽 극북', '극북대서양', '북대서양', '남대서양', '아프리카 서쪽',
  '아프리카 동쪽', '홍해', '인도양', '동남아시아', '동아시아', '유라시아 극동', '카리브 해', '중남미 동해안',
  '중남미 서해안', '북미 서해안', '동캐나다', '서캐나다', '그린란드', '베링 해', '유라시아 북쪽', '남태평양',
];

test('상위 바다 24개가 모두 한 묶음에 들어 있다', () => {
  const listed = GROUPS.flatMap((group) => group.parents);
  assert.equal(listed.length, 24);
  assert.deepEqual([...listed].sort(), [...PARENTS].sort());
  assert.equal(groupForParent(null).id, 'other');
  assert.equal(groupForParent('모르는 바다').id, 'other');
  assert.equal(groupForParent('베링 해').id, 'polar');
});

test('소리 목록, manifest, 파일, SOUNDS.md가 서로 맞다', () => {
  const manifest = JSON.parse(readFileSync(join(moduleDir, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.sounds, SOUNDS.map((sound) => ({ id: sound.id, path: sound.path })));
  assert.ok(SOUNDS.length <= 32);
  assert.equal(new Set(SOUNDS.map((sound) => sound.id)).size, SOUNDS.length);
  const credits = readFileSync(join(root, 'SOUNDS.md'), 'utf8');
  for (const sound of SOUNDS) {
    assert.ok(existsSync(join(moduleDir, sound.path)), sound.path);
    assert.ok(credits.includes(sound.path.slice('sounds/'.length)), `SOUNDS.md에 ${sound.path}`);
    assert.ok(sound.lengthMs > 0 && sound.lengthMs <= 10000);
  }
  for (const group of GROUPS) assert.ok(soundById(group.defaultSound), group.id);
  for (const season of SEASONS) assert.ok(soundById(season.defaultSound), season.id);
});

test('더 작은 단위의 설정이 우선한다', () => {
  let prefs = normalizePrefs(null);
  assert.deepEqual(resolveRegionSound(prefs, '에게 해', '동 지중해'), { soundRef: 'med.buleria', level: 'group' });
  prefs = withChoice(prefs, 'groups', 'med', 'sound:med.mandolin');
  assert.equal(resolveRegionSound(prefs, '에게 해', '동 지중해').soundRef, 'med.mandolin');
  prefs = withChoice(prefs, 'parents', '동 지중해', 'sound:indian.sitar');
  assert.deepEqual(resolveRegionSound(prefs, '에게 해', '동 지중해'), { soundRef: 'indian.sitar', level: 'parent' });
  assert.equal(resolveRegionSound(prefs, '티레니아 해', '서 지중해').soundRef, 'med.mandolin');
  prefs = withChoice(prefs, 'regions', '에게 해', 'off');
  assert.deepEqual(resolveRegionSound(prefs, '에게 해', '동 지중해'), { soundRef: null, level: 'region' });
  prefs = withChoice(prefs, 'regions', '에게 해', 'inherit');
  assert.equal(prefs.regions['에게 해'], undefined);
  assert.equal(resolveRegionSound(prefs, '이상한 바다', null).soundRef, 'other.synth-horn');
  assert.equal(resolveSeasonSound(prefs, 'winter'), 'winter.vibraphone');
});

test('알림 시점 A·B·C', () => {
  assert.deepEqual(decideRegionNotice('A', false), { banner: true, sound: true });
  assert.deepEqual(decideRegionNotice('B', false), { banner: true, sound: false });
  assert.deepEqual(decideRegionNotice('B', true), { banner: true, sound: true });
  assert.deepEqual(decideRegionNotice('C', false), { banner: false, sound: false });
  assert.deepEqual(decideRegionNotice('C', true), { banner: true, sound: true });
});

test('내 소리를 지우면 쓰던 행이 기본·상위 설정으로 돌아간다', () => {
  let prefs = normalizePrefs({
    userSounds: [{ soundRef: 'user.aaaa', number: 1, durationMillis: 3100, rmsDb: -18 }],
    groups: { med: 'user:user.aaaa' },
    parents: { 북해: 'user:user.aaaa' },
    regions: { '에게 해': 'user:user.aaaa', 발트해: 'sound:north.tin-whistle' },
    seasons: { summer: 'user:user.aaaa' },
  });
  assert.deepEqual(usagesOf(prefs, 'user.aaaa').sort(), ['북해', '에게 해', '여름', '지중해'].sort());
  prefs = withoutUserSound(prefs, 'user.aaaa');
  assert.deepEqual(prefs.userSounds, []);
  assert.deepEqual(prefs.groups, {});
  assert.deepEqual(prefs.parents, {});
  assert.deepEqual(prefs.regions, { 발트해: 'sound:north.tin-whistle' });
  assert.deepEqual(prefs.seasons, {});
});

test('저장값 정규화는 알 수 없는 값을 버린다', () => {
  const prefs = normalizePrefs({
    timing: 'Z',
    notifyRegion: 'yes',
    groups: { med: 'sound:없는-소리', nope: 'off', north: 'default' },
    parents: { 북해: 'default', 홍해: 'off' },
    regions: { '에게 해': 'user:user.missing' },
    userSounds: [{ soundRef: 'bad' }, { soundRef: 'user.b', number: 3 }],
    nextUserNumber: 1,
  });
  assert.equal(prefs.timing, 'B');
  assert.equal(prefs.notifyRegion, true);
  assert.deepEqual(prefs.groups, {});
  assert.deepEqual(prefs.parents, { 홍해: 'off' });
  assert.deepEqual(prefs.regions, {});
  assert.equal(prefs.userSounds.length, 1);
  assert.equal(prefs.nextUserNumber, 4);
});

test('부제 자간과 재생 옵션', () => {
  assert.equal(spaced('북대서양'), '북 대 서 양');
  assert.equal(spaced('서 지중해'), '서   지 중 해');
  assert.deepEqual(playbackOptions({ rmsDb: -22, lengthMs: 5250 }), { maxDurationMs: 4000, gainDb: -18, fadeOutMs: 1000 });
  assert.deepEqual(playbackOptions({ rmsDb: -10, lengthMs: 1500 }), { maxDurationMs: 4000, gainDb: -30 });
  assert.deepEqual(playbackOptions({ rmsDb: -50, lengthMs: 3000 }), { maxDurationMs: 4000, gainDb: 6 });
  assert.deepEqual(playbackOptions({ rmsDb: null, lengthMs: 3000 }), { maxDurationMs: 4000 });
});

function harness({ timing = 'B', shown = true, prefs = {} } = {}) {
  const log = [];
  const state = { prefs: normalizePrefs({ timing, ...prefs }), shown };
  const notifier = createNotifier({
    getPrefs: () => state.prefs,
    isShown: () => state.shown,
    notify: async (input) => { log.push(['banner', input.title, input.body]); },
    play: async (soundRef) => { log.push(['sound', soundRef]); },
  });
  let revision = 0;
  const send = (kind, data) => notifier.handleEvent({ kind, revision: ++revision, data });
  return { log, state, notifier, send };
}

test('B: 배너는 해역마다, 소리는 상위 바다가 바뀔 때만', async () => {
  const { log, notifier, send } = harness();
  notifier.setCurrentParent('남대서양');
  await send('region.changed', { name: '리스본 앞바다', parentRegion: '북대서양' });
  await send('parentRegion.changed', { from: '남대서양', name: '북대서양' });
  await send('region.changed', { name: '비스케이만', parentRegion: '북대서양' });
  await send('region.changed', { name: '북해', parentRegion: '북해' });
  assert.deepEqual(log, [
    ['banner', '리스본 앞바다', '북 대 서 양'],
    ['sound', 'atlantic.swell'],
    ['banner', '비스케이만', '북 대 서 양'],
    ['banner', '북해', '북 해'],
    ['sound', 'north.horn-fanfare'],
  ]);
});

test('C와 A 시점', async () => {
  const c = harness({ timing: 'C' });
  c.notifier.setCurrentParent('북대서양');
  await c.send('region.changed', { name: '비스케이만', parentRegion: '북대서양' });
  await c.send('region.changed', { name: '북해', parentRegion: '북해' });
  assert.deepEqual(c.log, [['banner', '북해', '북 해'], ['sound', 'north.horn-fanfare']]);
  const a = harness({ timing: 'A' });
  a.notifier.setCurrentParent('북대서양');
  await a.send('region.changed', { name: '비스케이만', parentRegion: '북대서양' });
  assert.deepEqual(a.log, [['banner', '비스케이만', '북 대 서 양'], ['sound', 'atlantic.swell']]);
});

test('HUD가 꺼져 있으면 배너도 소리도 내지 않고 상위 바다만 기억한다', async () => {
  const { log, state, notifier, send } = harness({ shown: false });
  notifier.setCurrentParent('북대서양');
  await send('region.changed', { name: '북해', parentRegion: '북해' });
  assert.deepEqual(log, []);
  state.shown = true;
  await send('region.changed', { name: '유틀란드 반도 앞바다', parentRegion: '북해' });
  assert.deepEqual(log, [['banner', '유틀란드 반도 앞바다', '북 해']]);
});

test('계절 전환, 끈 설정, 같은 이벤트 중복', async () => {
  const { log, state, notifier } = harness();
  await notifier.handleEvent({ kind: 'season.changed', revision: 5, data: { season: 'winter' } });
  await notifier.handleEvent({ kind: 'season.changed', revision: 5, data: { season: 'winter' } });
  assert.deepEqual(log, [['banner', '겨울', spaced('계절이 바뀌었습니다')], ['sound', 'winter.vibraphone']]);
  state.prefs = normalizePrefs({ notifySeason: false, notifyRegion: false });
  await notifier.handleEvent({ kind: 'season.changed', revision: 6, data: { season: 'summer' } });
  await notifier.handleEvent({ kind: 'region.changed', revision: 7, data: { name: '북해', parentRegion: '북해' } });
  assert.equal(log.length, 2);
});

test('끔으로 정한 해역은 배너만 낸다', async () => {
  const { log, notifier, send } = harness({ prefs: { regions: { 북해: 'off' } } });
  notifier.setCurrentParent('북대서양');
  await send('region.changed', { name: '북해', parentRegion: '북해' });
  assert.deepEqual(log, [['banner', '북해', '북 해'], ['sound', null]]);
});
