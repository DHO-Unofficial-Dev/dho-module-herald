// 소리 재생. SDK `audio`를 인자로 받아 Module 소리와 내 소리를 같은 크기로 맞춰 재생한다.
import { soundById } from './catalog.js';
import { playbackOptions } from './prefs.js';

/**
 * @param {{ play: Function, getInfo: Function }} audio SDK `audio`
 * @param {() => ReadonlyArray<{ soundRef: string, rmsDb: number | null, durationMillis: number | null }>} userSounds
 */
export function createPlayer(audio, userSounds) {
  const infoCache = new Map();

  async function loudness(soundRef) {
    const user = userSounds().find((item) => item.soundRef === soundRef);
    if (user && typeof user.rmsDb === 'number') return user.rmsDb;
    if (!infoCache.has(soundRef)) {
      infoCache.set(soundRef, audio.getInfo(soundRef).then((info) => info?.rmsDb ?? null, () => null));
    }
    return infoCache.get(soundRef);
  }

  /** 소리 하나를 재생한다. 실패(빈도 상한 등)는 오류 code로 돌려준다. */
  async function play(soundRef) {
    if (!soundRef) return { played: false, code: null };
    const builtin = soundById(soundRef);
    const user = builtin ? null : userSounds().find((item) => item.soundRef === soundRef);
    if (!builtin && !user) return { played: false, code: 'sound.missing' };
    const options = playbackOptions({
      rmsDb: await loudness(soundRef),
      lengthMs: builtin ? builtin.lengthMs : user.durationMillis,
      ...(builtin ? { clipMs: builtin.clipMs } : {}),
    });
    try {
      await audio.play(soundRef, options);
      return { played: true, code: null };
    } catch (error) {
      return { played: false, code: typeof error?.code === 'string' ? error.code : 'audio.failed' };
    }
  }

  return { play };
}
