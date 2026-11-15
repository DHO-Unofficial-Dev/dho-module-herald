// 소리 묶음과 Module에 들어 있는 소리 목록. SDK를 쓰지 않는 순수 자료다.
// manifest.json의 sounds와 SOUNDS.md 출처 표가 이 목록과 같아야 한다(test/logic.test.mjs가 검사).

/** 상위 바다(내장 해역 데이터 24개)를 묶은 9개 묶음. 묶음에 없는 상위 바다와 상위 바다가 없는 해역은 `other`로 간다. */
export const GROUPS = Object.freeze([
  { id: 'med', label: '지중해', parents: ['서 지중해', '동 지중해'], defaultSound: 'med.buleria' },
  { id: 'north', label: '북유럽 바다', parents: ['북해', '유럽 극북', '극북대서양'], defaultSound: 'north.horn-fanfare' },
  { id: 'atlantic', label: '대서양', parents: ['북대서양', '남대서양'], defaultSound: 'atlantic.swell' },
  { id: 'africa', label: '아프리카·홍해', parents: ['아프리카 서쪽', '아프리카 동쪽', '홍해'], defaultSound: 'africa.djembe' },
  { id: 'indian', label: '인도양·동남아시아', parents: ['인도양', '동남아시아'], defaultSound: 'indian.tabla' },
  { id: 'east', label: '동아시아·극동', parents: ['동아시아', '유라시아 극동'], defaultSound: 'east.koto' },
  {
    id: 'americas',
    label: '아메리카',
    parents: ['카리브 해', '중남미 동해안', '중남미 서해안', '북미 서해안', '동캐나다', '서캐나다'],
    defaultSound: 'americas.marimba-jingle',
  },
  { id: 'polar', label: '극지', parents: ['그린란드', '베링 해', '유라시아 북쪽'], defaultSound: 'polar.wind' },
  { id: 'other', label: '남태평양·그 밖', parents: ['남태평양'], defaultSound: 'other.synth-horn' },
].map((group) => Object.freeze({ ...group, parents: Object.freeze([...group.parents]) })));

export const OTHER_GROUP_ID = 'other';

export const SEASONS = Object.freeze([
  { id: 'summer', label: '여름이 될 때', title: '여름', defaultSound: 'summer.steeldrum' },
  { id: 'winter', label: '겨울이 될 때', title: '겨울', defaultSound: 'winter.vibraphone' },
].map((season) => Object.freeze(season)));

/** 알림음은 앞 4초 안팎만 재생하고 그보다 긴 소리는 끝을 서서히 줄인다. */
export const CLIP_MS = 4000;
export const FADE_OUT_MS = 1000;

const CC0 = 'CC0 1.0';

/**
 * Module 소리. `area`·`mood`는 화면 이름, `lengthMs`는 원본의 실제 길이(파일 끝 granule 기준 실측)다.
 * 원본 파일을 그대로 넣었고 자르기·끝 줄이기·음량 맞춤은 재생 옵션으로 처리한다.
 */
export const SOUNDS = Object.freeze([
  s('med.buleria', 'fs-450206-miguelgc96-buleria-guitar-wav.ogg', '지중해', '플라멩코 기타', 4050, 'buleria_guitar.wav', 'miguelgc96', 'https://freesound.org/people/miguelgc96/sounds/450206/'),
  s('med.spanish-lick', 'fs-44367-debudding-spanish-lick-ii-acoustic-ab-split-stereo.ogg', '지중해', '스페인풍 기타 릭', 4140, 'Spanish Lick II, Acoustic- AB split stereo pair (Oktava).wav', 'debudding', 'https://freesound.org/people/debudding/sounds/44367/'),
  s('med.mandolin', 'fs-90107-lucasgonze-lucasgonze-homestylemandolin-22-aiff.ogg', '지중해', '만돌린', 4000, 'LucasGonze-HomestyleMandolin-22.aiff', 'lucasgonze', 'https://freesound.org/people/lucasgonze/sounds/90107/'),
  s('north.horn-fanfare', 'fs-803823-marlocarlo-french-horn-and-timpani-fanfare-short.ogg', '북유럽', '호른·팀파니 팡파르', 5250, 'French horn and Timpani Fanfare short', 'marlocarlo', 'https://freesound.org/people/marlocarlo/sounds/803823/'),
  s('north.celtic-harp', 'fs-580694-slippinonslime-gliss-celtic-harp-wav.ogg', '북유럽', '켈틱 하프', 2670, 'Gliss celtic harp.wav', 'SlippinOnSlime', 'https://freesound.org/people/SlippinOnSlime/sounds/580694/'),
  s('north.tin-whistle', 'fs-255835-neild101-tin-whistle-wav.ogg', '북유럽', '틴 휘슬', 3970, 'tin whistle.wav', 'neild101', 'https://freesound.org/people/neild101/sounds/255835/'),
  s('atlantic.swell', 'fs-218524-jordivburgel-movie-swell-2.ogg', '대서양', '현·호른 스웰', 5000, 'Movie Swell 2', 'jordivburgel', 'https://freesound.org/people/jordivburgel/sounds/218524/'),
  s('atlantic.nautical', 'fs-727234-octillionvg-nautical-sfx-short-with-fade-out.ogg', '대서양', '항해 사운드스케이프', 4660, 'Nautical SFX Short with Fade Out', 'OctillionVG', 'https://freesound.org/people/OctillionVG/sounds/727234/'),
  s('africa.djembe', 'fs-249194-insidebeat-bangui-flower-wav.ogg', '아프리카', '젬베 타악', 3850, 'bangui flower.wav', 'Insidebeat', 'https://freesound.org/people/Insidebeat/sounds/249194/'),
  s('africa.marimba', 'fs-488154-phonosupf-marimba-sequence.ogg', '아프리카', '마림바', 2630, 'marimba sequence', 'PhonosUPF', 'https://freesound.org/people/PhonosUPF/sounds/488154/'),
  s('redsea.snake-charmer', 'fs-260873-simonjsounds-primitive-snake-charmer-melody.ogg', '홍해', '뱀 부리기 선율', 5320, 'Primitive Snake Charmer Melody', 'simonjsounds', 'https://freesound.org/people/simonjsounds/sounds/260873/'),
  s('indian.tabla', 'fs429539-indian-percussion-loop.ogg', '인도양', '타블라풍 타악', 3970, 'Indian Percussion Loop 121 bpm', 'stevysound', 'https://freesound.org/s/429539/'),
  s('indian.bansuri', 'fs448458-bansuri-rag-jog.ogg', '인도', '반수리', 4000, 'bansuri_flute_rag_jog.wav', 'Ninad_P', 'https://freesound.org/s/448458/'),
  s('indian.sarod', 'fs9606-sarod-intro-riff.ogg', '인도', '사로드', 3770, 'sarod intro2.aif', 'bluedotproductions', 'https://freesound.org/s/9606/'),
  s('indian.santur', 'fs258090-santur-phrase.ogg', '인도', '산투르', 4090, 'Santur Phrase I', 'nsmusic', 'https://freesound.org/s/258090/'),
  s('indian.sitar', 'fs-32803-johnwally-sitar-j-wav.ogg', '인도', '시타르', 4350, 'sitar j.wav', 'JOHNWALLY', 'https://freesound.org/people/JOHNWALLY/sounds/32803/'),
  s('sea-asia.bali-gamelan', 'fs46622-bali-xylophone.ogg', '동남아', '발리 가믈란', 2970, 'Bali Xylophone 1.aiff', 'thedialogueproject', 'https://freesound.org/s/46622/'),
  s('east.koto', 'fs-175672-mondschein90-koto-hit.ogg', '동아시아', '고토 선율', 3660, 'Koto Hit', 'Mondschein90', 'https://freesound.org/people/Mondschein90/sounds/175672/'),
  s('east.shakuhachi', 'fs-157759-deleteduser-shakuhachi-with-echo.ogg', '동아시아', '샤쿠하치', 3730, 'Shakuhachi with Echo', '(탈퇴한 Freesound 사용자)', 'https://freesound.org/people/--DeletedUser--/sounds/157759/'),
  s('east.gong-flute', 'fs-213096-soundsexciting-gong-with-flute.ogg', '동아시아', '징과 피리', 5040, 'Gong with flute', 'SoundsExciting', 'https://freesound.org/people/SoundsExciting/sounds/213096/'),
  s('americas.marimba-jingle', 'fs-878610-qvantor-win-jingle.ogg', '아메리카', '마림바 징글', 2970, 'Win Jingle', 'Qvantor', 'https://freesound.org/people/Qvantor/sounds/878610/'),
  s('americas.steeldrum', 'kenney-jingles_STEEL07.ogg', '아메리카', '스틸드럼', 1550, 'Music Jingles (STEEL07)', 'Kenney Vleugels (Kenney.nl)', 'https://kenney.nl/assets/music-jingles'),
  s('polar.wind', 'fs-407016-ericssoundschmiede-wind-arctic-storm-breeze-006-wa.ogg', '극지', '겨울바람', 3750, 'Wind_Arctic_Storm_Breeze-006.wav', 'EricsSoundschmiede', 'https://freesound.org/people/EricsSoundschmiede/sounds/407016/'),
  s('polar.wind-chimes', 'fs-419594-djlprojects-mystical-wind-chimes-transition-fx.ogg', '극지', '윈드차임', 4860, 'Mystical Wind Chimes Transition FX', 'djlprojects', 'https://freesound.org/people/djlprojects/sounds/419594/'),
  s('polar.glockenspiel', 'fs-572980-nettuli-story-begins-tarina-alkaa-wav.ogg', '극지', '글로켄슈필', 4460, 'Story begins / Tarina alkaa.wav', 'nettuli', 'https://freesound.org/people/nettuli/sounds/572980/'),
  s('other.synth-horn', 'synth-horn-fanfare.wav', '합성', '뿔피리 팡파르', 4600, '합성 뿔피리 팡파르', '이 저장소 scripts/synth-horn-fanfare.mjs로 합성', '', 'CC0 1.0 (직접 합성)'),
  s('other.trumpet-fanfare', 'oga-gchoc-castlefanfare.ogg', '공통', '트럼펫 팡파르', 2420, 'Trumpet Fanfare', 'gchoc', 'https://opengameart.org/content/trumpet-fanfare'),
  s('other.fanfare-lick', 'oga-fvcalderan-classic-fanfare-lick.ogg', '공통', '클래식 팡파르 릭', 2930, 'Classic fanfare lick', 'fvcalderan', 'https://opengameart.org/content/classic-fanfare-lick'),
  s('summer.steeldrum', 'summer-kenney-jingles_STEEL01.ogg', '여름', '스틸드럼', 1380, 'Music Jingles (STEEL01)', 'Kenney Vleugels (Kenney.nl)', 'https://kenney.nl/assets/music-jingles'),
  s('summer.jingle', 'summer-oga-ezduzziteh-positive.ogg', '여름', '밝은 징글', 1290, 'Positive Sound', 'EZduzziteh', 'https://opengameart.org/content/positive-sound'),
  s('winter.vibraphone', 'winter-oga-cynicmusic-bell-arpeggio-24.wav', '겨울', '비브라폰 아르페지오', 2550, 'Bell Arpeggio 24', 'cynicmusic', 'https://opengameart.org/content/bell-arpeggio-24'),
  s('winter.harp', 'winter-oga-springspring-health_restore.wav', '겨울', '하프풍', 3040, 'Magic Words + Healing Sound Effect', 'Spring Spring', 'https://opengameart.org/content/magic-words-healing-sound-effect'),
]);

function s(id, file, area, mood, lengthMs, title, author, sourceUrl, license = CC0) {
  return Object.freeze({ id, path: `sounds/${file}`, area, mood, lengthMs, title, author, sourceUrl, license });
}

const SOUND_BY_ID = new Map(SOUNDS.map((sound) => [sound.id, sound]));
const GROUP_BY_PARENT = new Map(GROUPS.flatMap((group) => group.parents.map((parent) => [parent, group])));
const GROUP_BY_ID = new Map(GROUPS.map((group) => [group.id, group]));

export function soundById(id) {
  return SOUND_BY_ID.get(id) ?? null;
}

export function soundLabel(sound) {
  return `${sound.area} · ${sound.mood}`;
}

export function groupById(id) {
  return GROUP_BY_ID.get(id) ?? null;
}

/** 상위 바다 이름의 묶음. 모르는 이름이나 null이면 `other`. */
export function groupForParent(parentName) {
  return (parentName && GROUP_BY_PARENT.get(parentName)) || GROUP_BY_ID.get(OTHER_GROUP_ID);
}
