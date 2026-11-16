# Herald

해역·계절 알림. DHO Navigator 2.2.0용 예제 Module입니다. 배가 새 해역에 들어서면 게임 화면 위쪽에 해역 이름을 크게 띄우고
은은한 진입음을 냅니다. 여름·겨울 계절이 바뀔 때도 알립니다.

- 제목은 해역 이름, 부제는 상위 바다 이름입니다(예: 비스케이만 / 북 해).
- 진입음은 상위 바다를 묶은 9개 묶음마다 분위기에 맞는 소리가 기본으로 정해져 있습니다.
- 소리는 묶음, 상위 바다, 해역 단위로 바꿀 수 있습니다. 직접 가져온 소리 파일도 쓸 수 있습니다.
- HUD 전용입니다. HUD가 꺼져 있거나 게임 창이 최소화되면 배너도 소리도 나지 않습니다.

## 설치

1. [Releases](../../releases)에서 `herald-<버전>.dho-module`을 받습니다.
2. DHO Navigator에서 Navigator 로고 도구 서랍의 Module 관리를 열고 받은 파일을 설치합니다.
3. 설치 화면에서 권한을 확인합니다.
   - `navigation.read`: 해역·계절 변경 이벤트와 해역 목록 읽기
   - `notifications.show`: 게임 화면 banner 알림
   - `audio.play`: 진입음·계절음 재생
   - `storage.local`: 설정 저장
   - `files.user`: 내 소리 파일 가져오기·지우기
4. HUD를 켜 두면 해역이 바뀔 때부터 알림이 나옵니다. 켠 직후의 첫 해역은 알리지 않습니다.

## 설정

Module 관리에서 이 Module의 "설정" 창을 엽니다.

| 항목 | 내용 |
| --- | --- |
| 해역 진입 알림 | 해역 알림 전체를 켜고 끕니다. |
| 알림 시점 | 기본은 "배너는 해역마다, 소리는 상위 바다가 바뀔 때만"입니다. "해역마다 배너와 소리", "상위 바다가 바뀔 때만 배너와 소리"로 바꿀 수 있습니다. |
| 계절 전환 알림 | 여름 ↔ 겨울이 바뀔 때 배너와 계절음을 냅니다. |
| 진입음 | 묶음마다 드롭다운에서 기본 소리, Module에 들어 있는 다른 소리, 내 소리, 끔 중 하나를 고릅니다. 펼치면 상위 바다·해역별로 따로 정할 수 있고 더 작은 단위의 설정이 우선합니다. "듣기"로 실제 알림과 같은 길이·크기로 들어 봅니다. |
| 계절 전환음 | 여름이 될 때, 겨울이 될 때 소리를 고릅니다. |
| 내 소리 | ogg·mp3·wav 파일(4 MiB·10초 이하)을 32개까지 가져옵니다. 지우면 그 소리를 쓰던 곳은 기본 설정으로 돌아갑니다. Module을 제거하면 가져온 소리도 함께 지워집니다. |

볼륨과 음소거는 Navigator 설정의 Module 소리(기본 50%)에서 정합니다.

### 진입음 묶음

| 묶음 | 상위 바다 | 기본 소리 |
| --- | --- | --- |
| 지중해 | 서 지중해, 동 지중해 | 플라멩코 기타 |
| 북유럽 바다 | 북해, 유럽 극북, 극북대서양 | 호른·팀파니 팡파르 |
| 대서양 | 북대서양, 남대서양 | 현·호른 스웰 |
| 아프리카·홍해 | 아프리카 서쪽, 아프리카 동쪽, 홍해 | 젬베 타악 |
| 인도양·동남아시아 | 인도양, 동남아시아 | 타블라풍 타악 |
| 동아시아·극동 | 동아시아, 유라시아 극동 | 고토 선율 |
| 아메리카 | 카리브 해, 중남미 동해안, 중남미 서해안, 북미 서해안, 동캐나다, 서캐나다 | 안데스 팬플루트 |
| 극지 | 그린란드, 베링 해, 유라시아 북쪽 | 겨울바람 |
| 남태평양·그 밖 | 남태평양, 상위 바다가 없거나 묶음에 없는 해역 | 합성 뿔피리 팡파르 |

계절음 기본값은 여름 스틸드럼, 겨울 비브라폰 아르페지오입니다.

### 소리 크기와 길이

- 모든 소리를 같은 체감 크기로 맞춥니다. Navigator가 잰 앞 4초 평균 음량(`rmsDb`)으로 재생 이득을
  `gainDb = −40 − rmsDb`로 정해 볼륨 게이지 50%에서 평균 −40 dB RMS 정도로 들리게 합니다.
- 앞 4초(안데스 팬플루트는 3.5초)만 재생하고, 그보다 긴 소리는 끝 1초를 서서히 줄입니다.
- 원본 파일은 그대로 넣었고 자르기·끝 줄이기·음량 맞춤은 모두 재생 옵션으로 처리합니다.

## 소리 출처

모든 소리는 CC0 1.0이거나 이 저장소에서 직접 합성한 소리입니다. 저작자와 출처 URL 전체 목록은
[SOUNDS.md](SOUNDS.md)에 있습니다. 설정 창의 "소리 출처(CC0) 보기"에서도 볼 수 있습니다.

| 출처 | 소리 수 | 라이선스 |
| --- | --- | --- |
| Freesound (miguelgc96, debudding, lucasgonze, marlocarlo, SlippinOnSlime, neild101, jordivburgel, OctillionVG, Insidebeat, PhonosUPF, simonjsounds, stevysound, Ninad_P, bluedotproductions, nsmusic, JOHNWALLY, thedialogueproject, Mondschein90, 탈퇴한 사용자, SoundsExciting, tootoos24, Qvantor, EricsSoundschmiede, djlprojects, nettuli) | 25 | CC0 1.0 |
| OpenGameArt (gchoc, EZduzziteh, cynicmusic, Spring Spring) | 4 | CC0 1.0 |
| Kenney Music Jingles (Kenney Vleugels, Kenney.nl) | 2 | CC0 1.0 |
| 직접 합성 (`scripts/synth-horn-fanfare.mjs`) | 1 | CC0 1.0 |

## 빌드

필요한 것: Node.js 20.11.1 이상, DHO Module 공개 Node 도구(`dho-module-node-tools.zip`).

```sh
# 1. 공개 도구를 받아 저장소 밖이나 .tools/에 풉니다.
curl -fsSL -o dho-module-node-tools.zip \
  https://github.com/DHO-Unofficial-Dev/DHO-Manager/releases/latest/download/dho-module-node-tools.zip
unzip -q dho-module-node-tools.zip -d .tools

# 2. 로직 검사
node --test test/

# 3. 검증, 빌드, archive 검사
node .tools/tools/validate-module.mjs module
node .tools/tools/build-module.mjs module dist/herald-1.0.0.dho-module
node .tools/tools/verify-module.mjs dist/herald-1.0.0.dho-module
```

각 명령은 한 줄 JSON을 출력하며 `status`가 `valid`면 통과입니다. 편집기 타입 지원이 필요하면 공개 도구의
`sdk/index.d.ts`를 `.dho-sdk/index.d.ts`로 복사합니다(archive에는 넣지 않습니다).

합성 소리를 다시 만들려면 다음을 실행합니다. 같은 byte의 파일이 나옵니다.

```sh
node scripts/synth-horn-fanfare.mjs module/sounds/synth-horn-fanfare.wav
```

### 프로젝트 구조

```text
module/                  Module 프로젝트(이 폴더만 archive에 들어갑니다)
  manifest.json
  assets/dock-icon.svg
  lib/catalog.js         묶음·소리 목록과 출처
  lib/prefs.js           설정 모양, 소리 결정 규칙, 알림 시점 판단
  lib/notifier.js        이벤트 → 배너·소리
  lib/player.js          음량 맞춤 재생
  surfaces/hud/          HUD Surface(화면은 비어 있고 알림만 냅니다)
  surfaces/settings/     설정 window Surface
  sounds/                소리 32개
scripts/synth-horn-fanfare.mjs
test/logic.test.mjs
```

공개 도구는 Surface 파일 이름을 `surfaces/<name>/index.html`, `main.css`, `main.js`로만 받습니다. 또 JavaScript의
import 검사기가 `export` 문 안의 `.from` 호출(예: `Array.from`)을 import 구문으로 잘못 읽으므로 이 저장소는 그 형태를
쓰지 않습니다.

## 릴리즈

`v<버전>` 태그를 push하면 GitHub Actions(`.github/workflows/release.yml`)가 공개 Node 도구로 검증·빌드한 뒤
`.dho-module`과 sha256 파일을 Release에 첨부합니다. 태그는 `module/manifest.json`의 `version`과 같아야 합니다.

- 공개 도구는 DHO-Manager 저장소의 최신 Release(`releases/latest/download/dho-module-node-tools.zip`)에서 받습니다.
  DHO Navigator 2.2.0 정식 릴리즈 전에는 이 자산이 없어 job이 실패합니다.
- 항상 최신 도구를 쓰므로 나중에 도구 규칙이 바뀌면 같은 태그라도 결과가 달라질 수 있습니다. job 로그에 받은 도구 zip의
  sha256을 남깁니다.

## 라이선스

코드는 MIT, 소리는 CC0 1.0입니다. 자세한 내용은 [LICENSE](LICENSE)와 [SOUNDS.md](SOUNDS.md)를 보세요.
