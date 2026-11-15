// 설정값 모양, 소리 결정 규칙과 알림 시점 판단. SDK를 쓰지 않는 순수 함수만 둔다.
import { CLIP_MS, FADE_OUT_MS, GROUPS, SEASONS, groupById, groupForParent, soundById } from './catalog.js';

export const PREFS_KEY = 'prefs';
export const PREFS_VERSION = 1;
export const MAX_USER_SOUNDS = 32;

/** 알림 시점. A: 해역마다 배너·소리, B: 배너는 해역마다·소리는 상위 바다가 바뀔 때, C: 상위 바다가 바뀔 때만 배너·소리. */
export const TIMINGS = Object.freeze(['A', 'B', 'C']);
export const DEFAULT_TIMING = 'B';

/**
 * 선택값.
 * - 묶음·계절 행: `default`(기본 소리), `off`, `sound:<id>`, `user:<soundRef>`
 * - 상위 바다·해역 행: 위 값에 더해 `inherit`(한 단계 위 설정을 따름, 저장하지 않음)
 */
export const INHERIT = 'inherit';
export const DEFAULT = 'default';
export const OFF = 'off';

export function defaultPrefs() {
  return {
    version: PREFS_VERSION,
    notifyRegion: true,
    timing: DEFAULT_TIMING,
    notifySeason: true,
    groups: {},
    parents: {},
    regions: {},
    seasons: {},
    userSounds: [],
    nextUserNumber: 1,
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validUserSound(value) {
  return isPlainObject(value)
    && typeof value.soundRef === 'string' && value.soundRef.startsWith('user.')
    && Number.isInteger(value.number) && value.number > 0;
}

/** 저장값을 읽어 알 수 없는 값은 버리고 기본값으로 채운다. */
export function normalizePrefs(raw) {
  const prefs = defaultPrefs();
  if (!isPlainObject(raw)) return prefs;
  if (typeof raw.notifyRegion === 'boolean') prefs.notifyRegion = raw.notifyRegion;
  if (TIMINGS.includes(raw.timing)) prefs.timing = raw.timing;
  if (typeof raw.notifySeason === 'boolean') prefs.notifySeason = raw.notifySeason;
  if (Array.isArray(raw.userSounds)) {
    const seen = new Set();
    for (const item of raw.userSounds) {
      if (!validUserSound(item) || seen.has(item.soundRef) || prefs.userSounds.length >= MAX_USER_SOUNDS) continue;
      seen.add(item.soundRef);
      prefs.userSounds.push({
        soundRef: item.soundRef,
        number: item.number,
        durationMillis: typeof item.durationMillis === 'number' ? item.durationMillis : null,
        rmsDb: typeof item.rmsDb === 'number' ? item.rmsDb : null,
      });
    }
  }
  const maxNumber = prefs.userSounds.reduce((max, item) => Math.max(max, item.number), 0);
  prefs.nextUserNumber = Number.isInteger(raw.nextUserNumber) && raw.nextUserNumber > maxNumber ? raw.nextUserNumber : maxNumber + 1;
  const userRefs = new Set(prefs.userSounds.map((item) => item.soundRef));
  const keep = (choice, allowInherit) => isValidChoice(choice, userRefs, allowInherit) && choice !== (allowInherit ? INHERIT : DEFAULT);
  for (const [key, allowInherit] of [['groups', false], ['parents', true], ['regions', true], ['seasons', false]]) {
    if (!isPlainObject(raw[key])) continue;
    for (const [name, choice] of Object.entries(raw[key])) {
      if (key === 'groups' && !groupById(name)) continue;
      if (key === 'seasons' && !SEASONS.some((season) => season.id === name)) continue;
      if (keep(choice, allowInherit)) prefs[key][name] = choice;
    }
  }
  return prefs;
}

export function isValidChoice(choice, userRefs, allowInherit) {
  if (typeof choice !== 'string') return false;
  if (choice === OFF) return true;
  if (choice === DEFAULT) return !allowInherit;
  if (choice === INHERIT) return allowInherit;
  if (choice.startsWith('sound:')) return soundById(choice.slice(6)) !== null;
  if (choice.startsWith('user:')) return userRefs.has(choice.slice(5));
  return false;
}

/** 선택값을 soundRef로 바꾼다. `off`면 null. */
function choiceToRef(choice, defaultSoundId) {
  if (choice === OFF) return null;
  if (choice.startsWith('sound:')) return choice.slice(6);
  if (choice.startsWith('user:')) return choice.slice(5);
  return defaultSoundId;
}

/**
 * 해역 진입음. 더 작은 단위가 우선한다: 해역 → 상위 바다 → 묶음 → 묶음 기본 소리.
 * 반환 `{ soundRef, level }`이며 `soundRef`가 null이면 소리를 내지 않는다.
 */
export function resolveRegionSound(prefs, regionName, parentName) {
  const group = groupForParent(parentName);
  const regionChoice = regionName ? prefs.regions[regionName] : undefined;
  if (regionChoice) return { soundRef: choiceToRef(regionChoice, group.defaultSound), level: 'region' };
  const parentChoice = parentName ? prefs.parents[parentName] : undefined;
  if (parentChoice) return { soundRef: choiceToRef(parentChoice, group.defaultSound), level: 'parent' };
  const groupChoice = prefs.groups[group.id] ?? DEFAULT;
  return { soundRef: choiceToRef(groupChoice, group.defaultSound), level: 'group' };
}

/** 묶음 행이 가리키는 소리(상위 바다 행 "묶음 소리 따름" 듣기용). */
export function resolveGroupSound(prefs, groupId) {
  const group = groupById(groupId);
  return choiceToRef(prefs.groups[groupId] ?? DEFAULT, group.defaultSound);
}

/** 상위 바다 행이 가리키는 소리(해역 행 "상위 바다 소리 따름" 듣기용). */
export function resolveParentSound(prefs, parentName) {
  return resolveRegionSound(prefs, null, parentName).soundRef;
}

export function resolveSeasonSound(prefs, seasonId) {
  const season = SEASONS.find((item) => item.id === seasonId);
  if (!season) return null;
  return choiceToRef(prefs.seasons[seasonId] ?? DEFAULT, season.defaultSound);
}

/** 알림 시점 판단. 상위 바다가 바뀌었는지에 따라 배너와 소리를 낼지 정한다. */
export function decideRegionNotice(timing, parentChanged) {
  if (timing === 'A') return { banner: true, sound: true };
  if (timing === 'C') return { banner: parentChanged, sound: parentChanged };
  return { banner: true, sound: parentChanged };
}

/** 가져온 소리를 지운 뒤의 설정. 그 소리를 쓰던 행은 묶음은 기본 소리로, 상위 바다·해역은 한 단계 위 설정으로 돌아간다. */
export function withoutUserSound(prefs, soundRef) {
  const next = structuredClone(prefs);
  const choice = `user:${soundRef}`;
  next.userSounds = next.userSounds.filter((item) => item.soundRef !== soundRef);
  for (const key of ['groups', 'parents', 'regions', 'seasons']) {
    for (const [name, value] of Object.entries(next[key])) if (value === choice) delete next[key][name];
  }
  return next;
}

/** 한 행의 선택을 바꾼 설정. 기본값(`default`·`inherit`)은 저장하지 않는다. */
export function withChoice(prefs, key, name, choice) {
  const next = structuredClone(prefs);
  if (choice === DEFAULT || choice === INHERIT) delete next[key][name];
  else next[key][name] = choice;
  return next;
}

/** 묶음 안에서 상위 바다·해역 단위로 따로 정한 수. */
export function overrideCount(prefs, parents, regionsByParent) {
  let count = 0;
  for (const parent of parents) {
    if (prefs.parents[parent]) count += 1;
    for (const region of regionsByParent.get(parent) ?? []) if (prefs.regions[region]) count += 1;
  }
  return count;
}

/** 이 소리를 쓰는 행 이름(내 소리 목록의 "사용 중" 표시). */
export function usagesOf(prefs, soundRef) {
  const choice = `user:${soundRef}`;
  const names = [];
  for (const group of GROUPS) if (prefs.groups[group.id] === choice) names.push(group.label);
  for (const [name, value] of Object.entries(prefs.parents)) if (value === choice) names.push(name);
  for (const [name, value] of Object.entries(prefs.regions)) if (value === choice) names.push(name);
  for (const season of SEASONS) if (prefs.seasons[season.id] === choice) names.push(season.title);
  return names;
}

/** 배너 부제. 글자 사이를 띄워 넓은 자간처럼 보이게 한다("북대서양" → "북 대 서 양"). */
export function spaced(text) {
  // 공개 도구의 import 검사기가 export 문 안의 `.from`을 import 구문으로 읽으므로 spread를 쓴다.
  return [...text.trim()]
    .map((char) => (char === ' ' ? '  ' : char))
    .join(' ')
    .replace(/ {3,}/g, '   ');
}

/**
 * 재생 옵션. 평균 음량을 −40 dB RMS(볼륨 게이지 50% 기준)에 맞추고, 4초보다 긴 소리는 앞 4초만 재생하며 끝 1초를 줄인다.
 * `rmsDb`를 모르면(예: Workbench 미리보기) 0 dB로 둔다.
 */
export function playbackOptions({ rmsDb, lengthMs }) {
  const options = { maxDurationMs: CLIP_MS };
  if (typeof rmsDb === 'number' && Number.isFinite(rmsDb)) {
    options.gainDb = Math.max(-60, Math.min(6, Math.round((-40 - rmsDb) * 10) / 10));
  }
  if (typeof lengthMs === 'number' && lengthMs > CLIP_MS) options.fadeOutMs = FADE_OUT_MS;
  return options;
}
