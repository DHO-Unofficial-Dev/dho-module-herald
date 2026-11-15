// 항해 이벤트를 받아 배너와 소리를 낼지 정한다. SDK 호출은 주입받은 함수로만 한다.
import { SEASONS } from './catalog.js';
import { decideRegionNotice, resolveRegionSound, resolveSeasonSound, spaced } from './prefs.js';

const UNKNOWN_PARENT_BODY = '해 역';
const SEASON_BODY = spaced('계절이 바뀌었습니다');

/**
 * @param {{
 *   getPrefs: () => object,
 *   isShown: () => boolean,
 *   notify: (input: { title: string, body: string }) => Promise<unknown>,
 *   play: (soundRef: string | null) => Promise<unknown>,
 * }} deps
 */
export function createNotifier({ getPrefs, isShown, notify, play }) {
  // undefined: 아직 모름, null: 상위 바다가 없는 해역.
  let lastParent;
  let lastRevision = -1;

  function setCurrentParent(parentName) {
    if (lastParent === undefined) lastParent = parentName ?? null;
  }

  async function regionChanged(data) {
    const name = typeof data.name === 'string' ? data.name : null;
    const parent = typeof data.parentRegion === 'string' ? data.parentRegion : null;
    const parentChanged = lastParent === undefined ? true : lastParent !== parent;
    lastParent = parent;
    const prefs = getPrefs();
    if (!prefs.notifyRegion || !name) return { banner: false, sound: false };
    const decision = decideRegionNotice(prefs.timing, parentChanged);
    // HUD가 꺼져 있거나 게임 창이 최소화·분리되면 배너도 소리도 내지 않는다.
    if (!isShown()) return { banner: false, sound: false };
    const tasks = [];
    if (decision.banner) tasks.push(notify({ title: name, body: parent ? spaced(parent) : UNKNOWN_PARENT_BODY }));
    if (decision.sound) tasks.push(play(resolveRegionSound(prefs, name, parent).soundRef));
    await Promise.allSettled(tasks);
    return decision;
  }

  async function seasonChanged(data) {
    const season = SEASONS.find((item) => item.id === data.season);
    const prefs = getPrefs();
    if (!season || !prefs.notifySeason || !isShown()) return { banner: false, sound: false };
    await Promise.allSettled([
      notify({ title: season.title, body: SEASON_BODY }),
      play(resolveSeasonSound(prefs, season.id)),
    ]);
    return { banner: true, sound: true };
  }

  /** `events.subscribe` listener. 같은 이벤트를 두 번 받으면 무시한다. */
  async function handleEvent(event) {
    if (typeof event?.revision === 'number') {
      if (event.revision <= lastRevision) return null;
      lastRevision = event.revision;
    }
    const data = event?.data ?? {};
    if (event?.kind === 'region.changed') return regionChanged(data);
    if (event?.kind === 'parentRegion.changed') {
      // region.changed가 먼저 오므로 보통 같은 값이다. 순서가 어긋나도 마지막 상위 바다를 맞춘다.
      if (typeof data.name === 'string') lastParent = data.name;
      return null;
    }
    if (event?.kind === 'season.changed') return seasonChanged(data);
    return null;
  }

  return { handleEvent, setCurrentParent };
}
