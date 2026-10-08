# maxVFX Glue Studio v1.7.4

**GlueIT 방식의 스프라이트 시트 편집기를 현대적인 로컬 웹 앱으로 재구현한 독립 프로젝트**입니다. 설치, 로그인, 서버 통신 없이 브라우저에서 이미지 시퀀스를 시트로 묶거나 GIF 애니메이션으로 저장할 수 있습니다.

## 바로 실행

- **가장 쉬운 방법:** `maxVFX_Glue_Studio_Standalone.html` 더블클릭 → Chrome/Edge로 열기.
- **웹 호스팅 / 개발용:** `index.html`, `styles.css`, `app.js`, `gif-codec.js`, `export-codec.js`, `vfx-addon.js`, `v12-addon.js`, `v13-addon.js`, `gif-decoder.js`, `zip-codec.js`, `v14-addon.js`를 같은 폴더에 배치하여 `index.html` 열기. GitHub Pages 또는 일반 정적 호스팅 가능.
- 외부 라이브러리와 CDN이 없으며 모든 소스 이미지는 로컬 브라우저 메모리에서 처리됩니다.

## 기본 제작 순서

1. `＋ 시퀀스 추가`: PNG/JPG/WEBP/BMP를 여러 장 선택합니다. 파일명 기준 자연 정렬(`1`, `2`, `10`) 후 추가됩니다. GIF 입력 시 모든 프레임과 프레임별 지속시간을 가져옵니다.
2. 이미 묶인 시트라면 `▦ 시트 분할`에서 **열/행**을 입력해 프레임으로 분할합니다. 시트 너비/높이가 그리드로 정확히 나뉘어야 합니다.
3. 프레임 너비/높이, 열 수, Gap, Padding, `2의 거듭제곱` 등을 설정합니다. 처음 불러온 이미지의 해상도가 기본값(256×256)을 자동 대체합니다.
4. 배경 제거가 필요하면 `알파 처리 · Alpha Lab`에서 모드를 선택합니다.
5. 화면 상단에서 시트 / 애니메이션 / 알파 / 원본을 미리보고 아래 시퀀스 카드를 드래그해 순서를 바꿉니다.
6. 출력 센터에서 **PNG 시트 / TGA 시트 / 애니메이션 GIF**를 저장합니다.

## 알파 처리 모드

| 모드 | 동작 |
|---|---|
| 원본 알파 유지 | 알파가 있는 PNG를 그대로 유지. 미세 알파 정리 및 RGB 확장은 필요시 선택 가능. |
| 검정 배경 제거 · Max RGB | PixEffect의 포토샵 채널 방식: `Alpha = Max(R,G,B)` 및 `RGB / Alpha` 복원. 기존 이미지의 알파도 반영. 검정 배경 화염/글로우에 적합. |
| 흰색 배경 제거 | `Alpha = 255 - Min(R,G,B)`, 흰색 배경 합성을 역산. |
| 지정 색상 제거 · Chroma Key | 배경색 지정, 허용 범위 및 Feather 조절, 반투명 가장자리 역산. 스포이드 기능 포함. |
| 기존 알파 제거 · 불투명화 | 모든 픽셀을 Alpha=255로 설정해 완전히 불투명하게 출력. |

**세부 조절:** 제거 허용 범위, Feather, 미세 알파 정리(Clip), 6px Alpha Bleed(완전 투명한 픽셀의 숨겨진 RGB를 주변 색으로 확장). PNG/TGA 자체 인코더를 사용하여 숨겨진 RGB를 유지할 수 있습니다.

검정 배경 모드의 기본 `허용 범위=0`, `Feather=0`은 이전 PixEffect와 동일한 핵심 변환을 사용합니다. Chroma Key 진입 시 기본 프로필은 `허용 범위=25`, `Feather=30`으로 설정됩니다. 검은 배경이 이미 이미지에 소성된 경우 알파 결과는 원본 제작 방식에 따라 달라질 수 있습니다.

## 파일 포맷과 제한

| 출력 | 스펙 | 용도 |
|---|---|---|
| **PNG** | RGBA 8-bit/channel, 무손실 | Unity/Unreal Flipbook, UI 이펙트 |
| **TGA** | RGBA 32-bit, 비압축, top-left origin | DCC/게임 엔진용 텍스처 |
| **GIF** | GIF89a, 글로벌 적응형 팔레트 최대 256색, 루프, FPS/해상도 지정 | 프로토타입 / 공유 / 시퀀스 미리보기 |

- 시트 제한: 한 변 최대 **8192px**, 전체 최대 **4,500만 픽셀**.
- 프레임 수 최대 **512장**. GIF 작업량 최대 **1,400만 픽셀(프레임 너비 × 높이 × 프레임 수)**.
- GIF는 **알파 1비트(투명/불투명)**만 지원. `투명 기준`으로 경계 선택, `GIF 투명 배경 사용`을 끄면 배경색에 합성합니다.
- 웹 브라우저 메모리와 기기 성능에 따라 실무 처리 가능 해상도는 달라집니다.
- GIF를 입력하면 **전체 프레임**을 불러옵니다.
- `Trim`은 프레임별 알파를 기준으로 테두리를 잘라 스프라이트 영역을 셀에 맞게 배치합니다. 정렬 중심이 필요한 시퀀스에서는 **Trim OFF** 권장.
- 브라우저 이미지 로더가 지원하는 형식만 입력할 수 있습니다. PSD, EXR, HEIC는 현재 지원하지 않습니다.

## 파일 구성

```
maxVFX_Glue_Studio_Standalone.html  <- 한 파일로 실행 / 공유
index.html                         <- 정적 호스팅 진입 파일
styles.css                         <- 반응형 UI
app.js                             <- 프레임 관리, 알파 편집, 프리뷰, 익스포트 흐름
gif-codec.js                       <- 적응형 팔레트 / GIF89a LZW 인코더
export-codec.js                    <- PNG / TGA 자체 인코더
examples/                          <- 기능 확인용 샘플 이미지
README.md                          <- 사용 설명서
HANDOFF.md                         <- 개발계획, 구현/검증/히스토리 인수인계
```

> GlueIT 원본 EXE/코드는 패키지에 포함하지 않았습니다. 기존 GlueIT의 UI 흐름을 참조해 새로 작성한 독립 구현입니다.

## v1.1.0 기능
- **채널 PNG/TGA**: RGB Only(RGB 유지·불투명), Alpha Only(알파 흑백·불투명) 별도 출력.
- **Pivot Editor**: (0,0) 좌하단, (1,1) 우상단 정규화 좌표; 공통 피벗 및 프레임별 피벗 지원.
- **Atlas JSON**: 타일 픽셀/UV, Unity 하단 원점 좌표, 피벗, FPS, 패딩, 간격 기록.
- **Unity/Unreal**: JSON은 데이터 교환용이며 실제 에디터 자동 슬라이싱·Niagara 피벗 반영은 별도 임포터가 필요합니다.
- **Offline**: Chrome/Edge에서 모든 처리는 로컬 수행. GitHub Pages용 v1.1 확장 모듈은 오프라인 압축 로더(CompressionStream API 역변환)로 제공하며, 개발용 원본은 ZIP에 동봉됩니다.


## v1.2.0 — 미리보기 배속 / Unity·Unreal 연동

- **미리보기 재생속도**: 0.10×~4.00× 슬라이더 및 0.25× / 0.5× / 1× / 2× / 4× 프리셋. 재생 중 변경 가능.
- **GIF FPS 분리**: 미리보기 배속은 GIF FPS를 바꾸지 않습니다. 필요한 경우 `GIF FPS 반영` 버튼으로 현재 실효 FPS(1~50으로 제한)를 GIF FPS 필드에 복사합니다.
- **Unreal CSV**: JSON과 동일한 Rect / UV / Pivot / FPS / 시트 크기 / 열·행 데이터 저장.
- **Unity 6 Slice**: `engine/Unity6/GlueStudioAtlasImporter.cs`를 프로젝트 `Assets/Editor/`에 복사하고 `Tools > maxVFX Glue Studio > Import Atlas JSON`를 사용하세요. `2D Sprite` 패키지 필요.
- **Unreal 5.8 UV**: `engine/Unreal5_8/GlueStudio_Flipbook.ush`는 Padding/Gap/POT 반영을 위한 Material UV 계산을 제공합니다. Niagara/Paper2D 에셋 자동 생성 기능은 아닙니다.

Unity 6·Unreal 5.8 에디터 런타임 테스트는 수행되지 않았습니다. 각 `engine/` 폴더 README를 확인하세요.

### v1.2 신규 구성

```text
v12-addon.js                        — 재생속도 및 Unreal CSV UI (CDN 미사용)
engine/Unity6/GlueStudioAtlasImporter.cs — Unity Sprite Editor JSON Import
engine/Unreal5_8/GlueStudio_Flipbook.ush — Unreal Material UV Helper
```


## v1.3.0 — VFX Quality Update (2026-10-08)

- Frame alignment: Legacy (default), Source Registration (untrimmed original coordinates), Alpha Bounding Box Center, Alpha Weighted Center. Auto centering can cancel intended animation movement.
- Edge Matte: existing-alpha images only, black/white/custom background RGB inverse correction 0-100%; alpha preserved, near-zero alpha protected. Default OFF.
- Compare dialog: original versus processed frame with checker background.
- Per-frame time: opt-in 20-60000ms/frame; RAF preview honors variable durations and the existing 0.1-4x preview speed. With toggle OFF, former fixed FPS is kept.
- GIF: per-frame GIF89a GCE delays rounded to 10ms, minimum 20ms.
- Atlas JSON / Unreal CSV: new durationMs, variableTiming, alignment and alpha matte fields; existing UV and pivot unchanged.
- Source file: v13-addon.js; GitHub Pages uses an offline gzip bootstrapper requiring browser DecompressionStream. Readable source shipped in ZIP.
- QA: Node unit verification passed. Chrome automated navigation blocked by administrator policy; Unity/UE runtime tests not executed.


## v1.4.0 — GIF → 스프라이트 시트 / 포터블 프로젝트

**GIF → 시트**를 눌러 애니메이션 GIF를 넣으면 전체 프레임과 프레임별 재생시간이 자동 추출됩니다. 합성된 GIF 프레임(Disposal 1/2/3, 로컬 팔레트, 인터레이스 포함)을 기존 Alpha Lab · 정렬 · Pivot · 시트 레이아웃에서 편집합니다. **PNG 시트** 또는 **TGA 시트**를 누르면 GIF→Flipbook 변환이 완료됩니다. 처음 가져올 때 프레임 크기/열 수 자동 설정을 지원하며 기존 시퀀스에 이어 붙이기도 가능합니다.

- **PNG 시퀀스 ZIP**: 현재 처리 결과를 frame_0000.png 순서로 출력하며 atlas.json 포함
- **프로젝트 저장**: `.glueproj` (ZIP32 STORE) 프로젝트에 원본 프레임, 프레임 순서/이름/지속시간, Pivot, 알파 설정, 출력 해상도/그리드, 미리보기 배속 포함
- **프로젝트 불러오기**: 파일을 드래그하거나 불러오기 버튼 선택. ZIP CRC, 스키마, 프레임/크기 검증. 프로젝트를 교체하기 전에 확인
- **완전 오프라인**: 외부 라이브러리 없이 `gif-decoder.js`, `zip-codec.js`, `v14-addon.js`를 로컬 사용. 단독 HTML도 동일 구현 포함

**주의:** GIF의 색상 제한(256색/1비트 투명도)은 PNG 변환 후에도 복구되지 않습니다. GIF 최대 80MB/512프레임/총 3,200만 픽셀. 프로젝트 파일 최대 300MB. 프로젝트 PNG 재저장 시 완전 투명 픽셀의 숨은 RGB는 브라우저 처리에 따라 달라질 수 있습니다. 외부 DEFLATE ZIP을 `.glueproj`로 이름만 바꿔 불러오는 방식은 지원하지 않습니다.

**검증:** Pillow 기준 GIF disposal 1/2/3/불투명 프레임 RGBA 비교, ZIP roundtrip/CRC/경로 검증, v1.3 회귀 테스트 통과. 자동 브라우저 UI 및 실제 Unity/Unreal 런타임 테스트는 실행 환경 제한으로 미완료.


## v1.5.0 — Atlas QA / Smart Grid / Undo & Redo

- **Undo/Redo (최대 35단계):** 설정값, FPS, 알파 보정, Pivot, 프레임별 지속시간, 프레임 정렬/역순/드래그 이동을 복원합니다. Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y (텍스트 필드 내부는 브라우저 기본 Undo).
- **이력 범위:** 이미지 추가·삭제·프로젝트 교체는 Undo 대상이 아닙니다. 이미지 데이터는 복제하지 않으며 소스 프레임 집합이 변경되면 이력을 초기화합니다.
- **출력 품질 검사:** 해상도 제한, 예상 RGBA MiB, 매우 투명한 프레임, 가장자리 잘림 가능성, 샘플 유사 프레임, Trim 위치 흔들림, POT 공백 낭비, Gap/Alpha Bleed 등을 점검합니다. 결과 JSON 다운로드 및 문제 프레임 선택 가능.
- **자동 그리드 최적화:** 타일 크기/프레임 순서를 유지하며 최대 128열 후보, 8192px/45MP 제한과 실제 Padding·Gap·POT를 고려하여 시트 면적과 화면비를 최적화합니다.
- **성능 보호:** 검사 대상 최대 64프레임/1,400만 렌더 픽셀/350만 샘플, 750만 픽셀 초과 단일 프레임은 스캔 생략. 스캔 수를 명확히 표시합니다.
- **배포:** v14-addon.js 뒤에 v15-addon.js를 읽습니다. 외부 라이브러리가 필요 없는 읽기 쉬운 JavaScript입니다. 단독 HTML도 포함합니다.
- **검증 범위:** Node 회귀 테스트로 GIF disposal/ZIP/Undo/품질 분석 기본 로직을 확인했습니다. 브라우저 자동 E2E는 실행 환경의 관리자 정책으로 차단되어 실제 GUI 검증이 필요합니다.


## v1.6.0 — 자동 복구 및 대용량 처리 안정화

- **자동 복구(선택):** 기본 OFF. 사용자가 활성화하면 원본 PNG 프레임과 편집 설정, Pivot, 프레임별 시간을 IndexedDB 저장소에 단일 `.glueproj` 호환 스냅샷으로 보관. 편집 중단 후 약 25초 또는 120초 간격의 미저장 변경 확인. 저장본은 수동으로 복원하고, 삭제 시 자동 복구도 함께 꺼집니다. 서버 전송 없음.
- **자동 저장 한도:** 최대 80프레임, 원본 총 1,200만 픽셀, PNG 데이터 합계 48MiB. 저장 공간 부족/권한 거절은 오류로 표시. 사이트 데이터 삭제나 브라우저 정책에 의해 복구본은 사라질 수 있으므로 `.glueproj` 수동 저장을 병행해야 합니다.
- **Web Worker PNG/TGA:** 인코딩을 브라우저 작업 스레드에 맡겨 UI 스레드 정체를 줄입니다. Worker 미지원 또는 오류 시 기존 PNG/TGA 인코더로 복귀하며 전송된 RGBA 버퍼는 시트 재생성 후 재시도합니다.
- **LRU 캐시 96MiB:** 처리 프레임 메모리의 상한이며 전체 시트/원본 저장 공간까지 제한하는 것은 아닙니다.
- **회귀 검사:** Node 코덱 정합성 테스트 및 Playwright 브라우저 GIF 변환/PNG 저장/IndexedDB 복구·삭제 테스트를 별도 `.github/workflows/browser-regression.yml`에서 실행. GitHub Pages 배포와 독립된 CI입니다.
- 단독 실행 HTML에도 같은 기능이 포함됩니다. `file://`의 IndexedDB는 브라우저마다 제한될 수 있습니다.


## v1.7.0 — 파일 선택 긴급 복구 / GIF Worker (2026-10-08)
- GitHub Pages에서 비동기로 복호화하던 vfx-addon.js/v12-addon.js/v13-addon.js를 일반 JavaScript 원본으로 교체. 로딩 의존성 불안정과 CSP/압축 API 문제 가능성을 줄였습니다.
- 파일 선택은 사용자 클릭 이벤트에서 `showPicker()` 또는 `.click()`으로 처리. 네이티브 `label for=fileInput`을 대체 경로로 제공합니다. 오류/프레임 현황을 화면에 표시합니다.
- GIF는 Web Worker에서 인코딩하며, Worker 오류/미지원 시 원래 인코더로 복귀합니다. 원래 FPS와 투명도, GIF 제한 사항 동일. 프레임 사본 생성으로 순간 메모리 사용량이 증가할 수 있습니다.
- PNG/GIF 불러오기, 시트 분할, 프로젝트 파일, PNG/TGA/GIF 출력을 브라우저 회귀 테스트로 보호합니다.

**원인 확정:** GitHub 배포본의 `app.js` 파일 끝에 잘못된 HTML `</script><script>`가 포함되어 `SyntaxError: Unexpected token '<'`가 발생했습니다. 이로 인해 기본 UI 초기화와 파일 선택 이벤트가 막혔습니다. 해당 태그를 제거하고 JS 문법 검사를 CI에 추가했습니다.


## v1.7.1 — GIF 새 작업 기본 모드

- GIF 입력 시 기존 프레임을 이어 붙이는 대신 **새 작업으로 교체**합니다. 이어 붙이기는 선택 옵션으로 유지했습니다.
- 기존 작업이 있을 때 교체 확인을 표시합니다. 취소, 파일 디코딩 실패 등에서는 기존 프레임과 설정을 보존합니다.
- 새 GIF를 적용하면 이전 Pivot, Trim, Alpha 보정, 여백, 재생 배속, 실행 취소 이력을 초기화합니다. GIF 크기와 프레임 수로 타일 및 그리드를 다시 계산하고 프레임별 재생시간은 유지합니다.
- 여러 GIF를 한 번에 추가하는 경우 첫 GIF에서만 교체하고 뒤의 파일은 새 작업에 추가합니다.
- 브라우저 테스트: PNG 2프레임 → GIF 6프레임 교체, 12프레임 이어 붙이기, 취소, 잘못된 GIF 데이터 보존, PNG 저장 확인.


## v1.7.4 통합 불러오기
GIF 및 PNG/JPG/WEBP/BMP에 공통 **새 작업 / 이어 붙이기** 선택 메뉴 적용. 여러 PNG를 하나의 배치로 디코딩 후 단 한 번 교체. 기존 작업 교체 확인, 오류 시 원본 보존, 파일 선택이 이어지는 새로 만들기 버튼, 기존 PNG/TGA/GIF 저장과 알파 기능 유지. 자동 브라우저 테스트 추가.
