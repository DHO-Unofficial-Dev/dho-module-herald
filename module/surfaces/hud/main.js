// HUD Surface. 화면에는 아무것도 그리지 않고 해역·계절 이벤트를 받아 banner 알림과 진입음을 낸다.
import { audio, events, game, notifications, storage, world } from '@dho/sdk';
import { createNotifier } from '../../lib/notifier.js';
import { createPlayer } from '../../lib/player.js';
import { PREFS_KEY, normalizePrefs } from '../../lib/prefs.js';

let prefs = normalizePrefs(null);
let shown = false;

const player = createPlayer(audio, () => prefs.userSounds);
const notifier = createNotifier({
  getPrefs: () => prefs,
  isShown: () => shown,
  notify: ({ title, body }) => notifications.show({ title, body, level: 'info', presentation: 'banner' }),
  play: (soundRef) => player.play(soundRef),
});

const stops = [];
function stopAll() {
  for (const stop of stops.splice(0)) {
    try {
      stop();
    } catch {
      // 이미 끝난 구독은 무시한다.
    }
  }
}
globalThis.addEventListener('pagehide', stopAll, { once: true });

async function start() {
  stops.push(await storage.subscribe((snapshot) => {
    prefs = normalizePrefs(snapshot.values[PREFS_KEY]);
  }));
  stops.push(await game.subscribe((snapshot) => {
    shown = snapshot.hud.shown === true;
  }));
  try {
    const snapshot = await world.getSnapshot();
    const region = snapshot.currentRegion;
    if (region.value && (region.quality === 'live' || region.quality === 'held')) {
      notifier.setCurrentParent(region.value.parentRegion?.name ?? null);
    }
  } catch {
    // 시작 해역을 모르면 첫 해역 변경 때 상위 바다가 바뀐 것으로 본다.
  }
  // 첫 관측은 이벤트가 없으므로 시작할 때는 알림을 내지 않는다.
  stops.push(await events.subscribe(['region.changed', 'parentRegion.changed', 'season.changed'], (event) => {
    void notifier.handleEvent(event);
  }));
}

start().catch(() => {
  // 권한이 없거나 Host가 준비되지 않으면 아무것도 하지 않는다. HUD를 다시 켜면 새로 시작한다.
  stopAll();
});
