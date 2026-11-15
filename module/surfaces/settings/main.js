// 설정 창. 알림 시점, 계절 알림, 묶음·상위 바다·해역별 진입음, 계절음과 내 소리를 정하고 storage에 저장한다.
import { audio, files, storage, world } from '@dho/sdk';
import { GROUPS, OTHER_GROUP_ID, SEASONS, SOUNDS, groupForParent, soundById, soundLabel } from '../../lib/catalog.js';
import { createPlayer } from '../../lib/player.js';
import {
  DEFAULT,
  INHERIT,
  MAX_USER_SOUNDS,
  OFF,
  PREFS_KEY,
  normalizePrefs,
  overrideCount,
  resolveGroupSound,
  resolveParentSound,
  resolveRegionSound,
  resolveSeasonSound,
  usagesOf,
  withChoice,
  withoutUserSound,
} from '../../lib/prefs.js';

const byId = (id) => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const ERROR_TEXT = {
  'request.rateLimited': '잠시 뒤 다시 눌러 주세요. 소리는 초당 2회까지 재생합니다.',
  'capability.denied': '권한이 꺼져 있습니다. Navigator Module 관리에서 이 Module의 권한을 확인하세요.',
  'files.userGestureRequired': '버튼을 직접 눌러 파일을 고르세요.',
  'storage.limitExceeded': '설정을 저장할 공간이 부족합니다.',
  'host.unavailable': 'Navigator가 아직 준비되지 않았습니다. 잠시 뒤 다시 시도하세요.',
};

let prefs = normalizePrefs(null);
let revision = null;
let userSignature = '';
/** 다시 그릴 선택 행: { select, kind, key, name, defaultLabel, info?, infoText? } */
const selectRows = [];
const regionsByParent = new Map();
const parentOfRegion = new Map();
const statusNode = byId('status');

const player = createPlayer(audio, () => prefs.userSounds);

function showStatus(text) {
  statusNode.textContent = text;
}

function errorText(code, fallback) {
  return ERROR_TEXT[code] ?? fallback;
}

// ── 저장 ──

/** 저장 snapshot의 설정에 `change`를 적용해 저장한다. 다른 창이 먼저 저장했으면 새 값에 다시 적용한다. */
async function update(change) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const next = change(prefs);
    try {
      await storage.batch({
        ...(revision === null ? {} : { expectedRevision: revision }),
        operations: [{ kind: 'set', key: PREFS_KEY, value: next }],
      });
      return true;
    } catch (error) {
      if (error?.code !== 'storage.conflict') {
        showStatus(errorText(error?.code, '설정을 저장하지 못했습니다.'));
        return false;
      }
      applySnapshot(await storage.getSnapshot());
    }
  }
  showStatus('설정을 저장하지 못했습니다. 창을 다시 열어 주세요.');
  return false;
}

function applySnapshot(snapshot) {
  revision = snapshot.revision;
  prefs = normalizePrefs(snapshot.values[PREFS_KEY]);
  render();
}

// ── 선택 상자 ──

function userSoundLabel(item) {
  const seconds = typeof item.durationMillis === 'number' ? ` (${(item.durationMillis / 1000).toFixed(1)}초)` : '';
  return `내 소리 ${item.number}${seconds}`;
}

function fillOptions(row) {
  const { select, kind, defaultLabel } = row;
  select.replaceChildren();
  const first = kind === 'group' || kind === 'season'
    ? new Option(`기본 · ${defaultLabel}`, DEFAULT)
    : new Option(kind === 'parent' ? '묶음 소리 따름' : '상위 바다 소리 따름', INHERIT);
  select.append(first);
  const builtin = el('optgroup');
  builtin.label = 'Module 소리';
  for (const sound of SOUNDS) builtin.append(new Option(soundLabel(sound), `sound:${sound.id}`));
  select.append(builtin);
  if (prefs.userSounds.length > 0) {
    const mine = el('optgroup');
    mine.label = '내 소리';
    for (const item of prefs.userSounds) mine.append(new Option(userSoundLabel(item), `user:${item.soundRef}`));
    select.append(mine);
  }
  select.append(new Option('끔', OFF));
}

function currentChoice(row) {
  const fallback = row.kind === 'group' || row.kind === 'season' ? DEFAULT : INHERIT;
  return prefs[row.key][row.name] ?? fallback;
}

/** 행이 지금 가리키는 실제 소리(듣기용). */
function effectiveSound(row) {
  if (row.kind === 'group') return resolveGroupSound(prefs, row.name);
  if (row.kind === 'parent') return resolveParentSound(prefs, row.name);
  if (row.kind === 'region') return resolveRegionSound(prefs, row.name, parentOfRegion.get(row.name) ?? null).soundRef;
  return resolveSeasonSound(prefs, row.name);
}

function createSelectRow(container, { kind, key, name, title, info, defaultLabel, ariaLabel }) {
  const node = el('div', 'sn-row');
  const label = el('div', 'sn-row__name');
  label.append(el('b', '', title));
  const small = el('small', '', info ?? '');
  if (info !== undefined) label.append(small);
  const select = el('select', 'sn-select');
  select.setAttribute('aria-label', ariaLabel ?? `${title} 소리`);
  const listen = el('button', 'sn-button', '듣기');
  listen.type = 'button';
  node.append(label, select, listen);
  container.append(node);

  const row = { select, kind, key, name, defaultLabel, small, info };
  fillOptions(row);
  select.value = currentChoice(row);
  select.addEventListener('change', () => {
    void update((base) => withChoice(base, key, name, select.value));
  });
  listen.addEventListener('click', async () => {
    const soundRef = effectiveSound(row);
    if (!soundRef) {
      showStatus('이 행은 소리를 끄도록 정해져 있습니다.');
      return;
    }
    const result = await player.play(soundRef);
    showStatus(result.played ? '' : errorText(result.code, '소리를 재생하지 못했습니다.'));
  });
  selectRows.push(row);
  return row;
}

// ── 진입음 ──

function overrideText(count) {
  return count > 0 ? ` · ${count}개 따로 지정` : '';
}

function renderRegionRows(container, parentName) {
  for (const regionName of regionsByParent.get(parentName) ?? []) {
    createSelectRow(container, {
      kind: 'region',
      key: 'regions',
      name: regionName,
      title: regionName,
      info: `해역 · ${parentName ?? '상위 바다 없음'}`,
    });
  }
}

function buildParentRows(container, group) {
  const parents = [...group.parents];
  if (group.id === OTHER_GROUP_ID) {
    for (const parent of regionsByParent.keys()) {
      if (parent !== null && !parents.includes(parent) && groupForParent(parent).id === OTHER_GROUP_ID) parents.push(parent);
    }
  }
  const rows = [];
  for (const parent of parents) {
    const regionCount = regionsByParent.get(parent)?.length ?? 0;
    const row = createSelectRow(container, {
      kind: 'parent',
      key: 'parents',
      name: parent,
      title: parent,
      info: regionCount > 0 ? `상위 바다 · 해역 ${regionCount}개` : '상위 바다',
    });
    row.regionCountText = row.small.textContent;
    rows.push(row);
    if (regionCount > 0) {
      const details = el('details', 'sn-details');
      details.append(el('summary', '', `${parent} 해역별로 바꾸기`));
      const sub = el('div', 'sn-sub');
      details.append(sub);
      details.addEventListener('toggle', () => {
        if (details.open && sub.childElementCount === 0) renderRegionRows(sub, parent);
      });
      container.append(details);
    }
  }
  if (group.id === OTHER_GROUP_ID && (regionsByParent.get(null)?.length ?? 0) > 0) {
    const details = el('details', 'sn-details');
    details.append(el('summary', '', `상위 바다가 없는 해역 ${regionsByParent.get(null).length}개`));
    const sub = el('div', 'sn-sub');
    details.append(sub);
    details.addEventListener('toggle', () => {
      if (details.open && sub.childElementCount === 0) renderRegionRows(sub, null);
    });
    container.append(details);
  }
  return { parents, rows };
}

const groupSummaries = [];

function buildRegionSection() {
  const container = byId('region-rows');
  container.replaceChildren();
  groupSummaries.length = 0;
  for (const group of GROUPS) {
    const defaultSound = soundById(group.defaultSound);
    createSelectRow(container, {
      kind: 'group',
      key: 'groups',
      name: group.id,
      title: group.label,
      info: group.id === OTHER_GROUP_ID ? '남태평양 · 상위 바다가 없는 해역' : group.parents.join(' · '),
      defaultLabel: defaultSound.mood,
    });
    const details = el('details', 'sn-details');
    const summary = el('summary', '', '상위 바다·해역별로 바꾸기');
    const badge = el('span', 'sn-override', '');
    summary.append(badge);
    const sub = el('div', 'sn-sub');
    details.append(summary, sub);
    container.append(details);
    const built = buildParentRows(sub, group);
    groupSummaries.push({ badge, parents: built.parents, parentRows: built.rows });
  }
}

function renderOverrideBadges() {
  for (const summary of groupSummaries) {
    const regionsOf = new Map(summary.parents.map((parent) => [parent, regionsByParent.get(parent) ?? []]));
    summary.badge.textContent = overrideText(overrideCount(prefs, summary.parents, regionsOf));
    for (const row of summary.parentRows) {
      const regionOverrides = (regionsByParent.get(row.name) ?? []).filter((region) => prefs.regions[region]).length;
      row.small.textContent = `${row.regionCountText}${overrideText(regionOverrides)}`;
    }
  }
}

async function loadRegions() {
  const status = byId('region-status');
  try {
    const data = await world.getSeaRegions();
    for (const region of data.regions) {
      const parent = region.parentRegion?.name ?? null;
      if (!regionsByParent.has(parent)) regionsByParent.set(parent, []);
      regionsByParent.get(parent).push(region.name);
      parentOfRegion.set(region.name, parent);
    }
    for (const names of regionsByParent.values()) names.sort((a, b) => a.localeCompare(b, 'ko'));
    status.hidden = true;
  } catch {
    status.textContent = '해역 목록을 불러오지 못해 해역별 설정은 숨겼습니다. 창을 다시 열면 다시 불러옵니다.';
    status.hidden = false;
  }
}

// ── 계절음 ──

function buildSeasonSection() {
  const container = byId('season-rows');
  container.replaceChildren();
  for (const season of SEASONS) {
    createSelectRow(container, {
      kind: 'season',
      key: 'seasons',
      name: season.id,
      title: season.label,
      defaultLabel: soundById(season.defaultSound).mood,
      ariaLabel: `${season.title} 소리`,
    });
  }
}

// ── 내 소리 ──

function renderUserSounds() {
  const container = byId('user-rows');
  container.replaceChildren();
  for (const item of prefs.userSounds) {
    const node = el('div', 'sn-row sn-row--user');
    const label = el('div', 'sn-row__name');
    const usages = usagesOf(prefs, item.soundRef);
    const seconds = typeof item.durationMillis === 'number' ? `${(item.durationMillis / 1000).toFixed(1)}초 · ` : '';
    // 공개 도구의 import 검사기는 중첩 template literal을 읽지 못하므로 문자열을 나눠 만든다.
    const usageText = usages.length > 0 ? usages.join(', ') + '에서 사용 중' : '사용 안 함';
    label.append(el('b', '', `내 소리 ${item.number}`), el('small', '', seconds + usageText));
    const listen = el('button', 'sn-button', '듣기');
    listen.type = 'button';
    listen.addEventListener('click', async () => {
      const result = await player.play(item.soundRef);
      showStatus(result.played ? '' : errorText(result.code, '소리를 재생하지 못했습니다.'));
    });
    const remove = el('button', 'sn-button', '지우기');
    remove.type = 'button';
    remove.addEventListener('click', async () => {
      remove.disabled = true;
      try {
        await files.removeAudio(item.soundRef);
      } catch (error) {
        showStatus(errorText(error?.code, '소리를 지우지 못했습니다.'));
        remove.disabled = false;
        return;
      }
      await update((base) => withoutUserSound(base, item.soundRef));
    });
    node.append(label, listen, remove);
    container.append(node);
  }
  byId('user-empty').hidden = prefs.userSounds.length > 0;
  byId('user-usage').textContent = `${prefs.userSounds.length} / ${MAX_USER_SOUNDS}개 · 합계 32 MiB까지`;
  byId('user-import').disabled = prefs.userSounds.length >= MAX_USER_SOUNDS;
}

byId('user-import').addEventListener('click', async () => {
  let result;
  try {
    result = await files.importAudio();
  } catch (error) {
    showStatus(errorText(error?.code, '소리 파일을 가져오지 못했습니다. ogg·mp3·wav, 4 MiB·10초 이하인지 확인하세요.'));
    return;
  }
  if (result.status !== 'selected') return;
  const saved = await update((base) => {
    const next = structuredClone(base);
    if (!next.userSounds.some((item) => item.soundRef === result.soundRef)) {
      next.userSounds.push({
        soundRef: result.soundRef,
        number: next.nextUserNumber,
        durationMillis: result.durationMillis,
        rmsDb: result.rmsDb,
      });
      next.nextUserNumber += 1;
    }
    return next;
  });
  if (saved) showStatus('소리를 가져왔습니다. 위 드롭다운의 "내 소리"에서 고르세요.');
});

// ── 알림 ──

const notifyRegion = byId('notify-region');
const notifySeason = byId('notify-season');
const timingInputs = [...document.querySelectorAll('input[name="timing"]')];

notifyRegion.addEventListener('change', () => {
  void update((base) => ({ ...structuredClone(base), notifyRegion: notifyRegion.checked }));
});
notifySeason.addEventListener('change', () => {
  void update((base) => ({ ...structuredClone(base), notifySeason: notifySeason.checked }));
});
for (const input of timingInputs) {
  input.addEventListener('change', () => {
    if (input.checked) void update((base) => ({ ...structuredClone(base), timing: input.value }));
  });
}

// ── 출처 ──

function buildCredits() {
  const list = byId('credits');
  list.replaceChildren();
  for (const sound of SOUNDS) {
    const item = el('li');
    item.append(el('b', '', soundLabel(sound)), document.createTextNode(` — "${sound.title}", ${sound.author}, ${sound.license}`));
    if (sound.sourceUrl) {
      item.append(el('br'), el('span', 'sn-credits__url', sound.sourceUrl));
    }
    list.append(item);
  }
}

// ── 그리기 ──

function render() {
  notifyRegion.checked = prefs.notifyRegion;
  notifySeason.checked = prefs.notifySeason;
  for (const input of timingInputs) input.checked = input.value === prefs.timing;
  for (const input of timingInputs) input.disabled = !prefs.notifyRegion;
  const signature = prefs.userSounds.map((item) => `${item.soundRef}:${item.number}:${item.durationMillis}`).join('|');
  const rebuild = signature !== userSignature;
  userSignature = signature;
  for (const row of selectRows) {
    if (rebuild) fillOptions(row);
    row.select.value = currentChoice(row);
  }
  renderOverrideBadges();
  renderUserSounds();
}

async function start() {
  buildCredits();
  await loadRegions();
  buildRegionSection();
  buildSeasonSection();
  const stop = await storage.subscribe(applySnapshot);
  globalThis.addEventListener('pagehide', () => stop(), { once: true });
}

start().catch((error) => {
  showStatus(errorText(error?.code, '설정을 불러오지 못했습니다. 창을 다시 열어 주세요.'));
});
