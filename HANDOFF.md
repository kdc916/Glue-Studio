# maxVFX Glue Studio — 누적 개발 / 인수인계 문서

## 1. 프로젝트 기본 정보
- **프로젝트**: maxVFX Glue Studio
- **버전**: `v1.0.0` (2026-10-08)
- **플랫폼**: HTML / CSS / JavaScript, 정적 브라우저 앱, 외부 서버/SDK/API 없음
- **요청 배경**: 2006년 GlueIT 1.06 방식의 시트 제작 기능을 웹으로 현대화하고, 기존 사용자 PixEffect 계열의 알파 제거 및 GIF 익스포트를 결합.
- **결과물 규칙**: 전체 ZIP + 본 MD 인수인계 제공. 독립 실행 HTML 추가 제공.
- **원본 비교**: GlueIT는 순서 설정/열 수/시트 생성/애니메이션 미리보기/PNG 등 저장 중심. 이 버전은 여기에 시트 분할, GIF, TGA, 알파랩, 확대/이동, 자동 해상도, 모바일 UI를 추가.

## 2. 완료 기능
### 입출력
- 파일 다중 로딩, 자연 정렬, 프레임 시퀀스 카드, 드래그 정렬, 삭제, 역순, 전체 초기화.
- 기존 아틀라스: 열/행 사용자 지정 후 동일 크기 타일로 쪼개어 불러오기.
- 원본 픽셀 해상도를 초기 기본 프레임/GIF 해상도에 반영(사용자가 이미 바꾼 값은 보존).
- PNG(RGBA 무손실), TGA(32bit BGRA on disk, top-left), GIF(프레임별 애니메이션) 저장.
- GIF: 재생 FPS, 출력 너비/높이, 투명 알파 기준, 디더링, 배경색 합성, 무한 반복.
- 시트: Columns, Gap, Padding, Preserve Aspect/Stretch/Cover, Pot 2, Trim.

### PixEffect 채널 기반 배경 제거 기능 계승
- `Max RGB -> Alpha, RGB / Alpha`: 검정 배경 VFX에 적용(이전 PixEffect Photoshop Channel Screen 방식).
- `Inverse Min RGB`: 흰색 배경 제거, 역합성 RGB 복원.
- `Chroma Key`: RGB 거리 기반 키, Feather, 스포이드, 역합성 decontam.
- `Alpha Off`: 원본 투명도 사용.
- `Remove Existing Alpha / Opaque`: Alpha=255로 변경.
- `Alpha Cleanup`: alpha cutoff.
- `Alpha Bleed`: 주변 불투명 RGB를 알파 0 픽셀에 6px 확장(값 자체는 RGBA 인코더가 유지).
- 알파 모드별 관용값 프로필: Black/White 0/0, Chroma 25/30, 마지막 사용자 설정 기억.

### 검토한 과거 구현
- `PixEffect_v1_2_1_Photoshop_Channel_Background_Removal.html`의 검정 배경 처리 핵심 원리를 확인하여 포팅.
- 과거 Texture Alpha Exporter 관련 워크플로우: 검정 배경, Max RGB/Unmultiply, PNG 알파 출력.
- 사용자 레퍼런스 GlueIT 1.06 EXE는 파일 리소스만 확인; 원본 EXE 재배포/수정 없음.

## 3. 코드 구조
| 파일 | 기능 |
|---|---|
| index.html | 편집기 UI, 입력 컨트롤, 뷰/출력 버튼 |
| styles.css | 데스크톱 사이드바 + 모바일 스택 반응형 스타일 |
| app.js | 앱 상태, 프레임 로딩, 렌더 캐시, 처리 파이프라인, 이벤트, 내보내기 |
| export-codec.js | PNG IHDR/IDAT/IEND, zlib/DEFLATE CompressionStream(fallback stored blocks), CRC32 / TGA BGRA 헤더 |
| gif-codec.js | RGB histogram → median-cut palette, palette mapping, GIF89a LZW, disposal method 2, NETSCAPE loop |
| maxVFX_Glue_Studio_Standalone.html | 위 네 소스를 전부 인라인 결합한 완전 독립 HTML |

주요 기능(`app.js`):
1. `loadFile()` / `addFiles()` / `sliceSheet()`: import.
2. `alphaProcess()` / `applyBleed()` / `calcTrim()`: pixel cleanup.
3. `buildFrame()` / `sheetRaw()`: 프레임 정규화 + RGBA 원본 시트 구성.
4. `redraw()`, `fitZoom()`, `setSelected()`, `togglePlay()`: preview.
5. `runExport()`: PNG/TGA raw 시트 또는 GIF frame array 생성.

일반적인 파이프라인:
`Input ImageBitmap → Crop/Trim → Contain/Cover/Stretch → RGBA 8bit → Background Alpha Process → Alpha Bleed → Output Tile → Sheet Assembler or GIF Frame Resize → Encoder → Download`.

## 4. 검증 결과
실행 환경: headless Chromium, Playwright 스크립트, Pillow 이미지 디코더. 단독 HTML을 브라우저 문서 내용으로 로드하여 실제 JS/다운로드 경로 점검.

| 검증 항목 | 결과 |
|---|---|
| 6 PNG 로딩 / 자연정렬 / 썸네일 | 통과 |
| 검정 배경 `(128,64,0)` 처리 → `(255,128,0,128)` | 통과 |
| 흰 배경 / 컬러 키 / 기존 알파 유지 / 완전 불투명화 | 통과 |
| 3열 × 2행 시트 → 192×128 PNG, TGA 출력 | 통과 (Pillow RGBA 픽셀 검증) |
| GIF 64×64 / 6프레임 / 10 FPS, PNG/GIF 디코딩 | 통과 |
| GIF gradient/random/solid/bands/transparency × 3 frames | 통과 (5 패턴 디코딩) |
| 기존 아틀라스 2×2 분할 / 영역 색상 일치 | 통과 |
| Trim / Bleed / Power-of-2 시트 출력 | 통과 |
| 알파 프리뷰 / 원본 프리뷰 / 애니메이션 재생 | 통과 |
| 모바일 375px 레이아웃 가로 오버플로 | 없음 |
| 브라우저 콘솔 JS runtime 예외 | 없음 (테스트 범위) |

**테스트 범위 주의:** 브라우저 자동화 기반 기능 검증을 수행했으며 모든 사용 장비·운영체제의 동작을 보증하지는 않습니다. 특히 극대형 시트 및 고해상도 512프레임 작업은 기기별 메모리 테스트가 필요합니다.

## 5. 제한과 주의
- GIF 팔레트가 256색이고 알파가 바이너리이므로 고품질 연기/글로우 엔진 텍스처는 RGBA PNG/TGA 우선.
- RGB 원본만 있는 검정 배경 이펙트는 포토샵의 `Max RGB → Unmultiply` 방식이 최적의 기본값이나 배경이 이미 복잡하게 합성된 이미지의 완벽한 배경 복원은 불가능할 수 있음.
- 모드 White/Chroma의 역합성 보정은 배경이 단색일 때만 정확하게 근사.
- GIF를 **입력**할 때 첫 프레임만 받음. GIF 다중 프레임 파서는 현재 미구현.
- 이미지 시퀀스 자체의 피벗, 원래 위치 정렬이 필요하면 `Trim`을 OFF로 설정할 것.
- PNG 직접 인코더는 CompressionStream('deflate')로 압축; 미지원 브라우저는 무압축 DEFLATE stored block fallback(용량 커짐).
- 시트 한 변 최대 8192px, 전체 4500만 픽셀, 프레임 최대 512장, GIF 프레임 총합 최대 1400만 픽셀.
- 파일과 이미지 리소스는 메모리에만 존재; F5 새로고침 시 목록이 초기화됨.
- 배포는 수행하지 않았음(사용자 GitHub 대상 저장소 미지정). 정적 호스팅에 `index.html` 및 JS/CSS 파일을 배치하면 됨.

## 6. 다음 개발 계획 (권장 우선순위)
**v1.1 품질 보강**
1. `RGBA`, `Alpha Only`, `RGB Only`, `Emissive` 개별 출력 및 일괄 다운로드 ZIP.
2. 채널별 R/G/B/A 출력 및 `Normal/Flow` 텍스처 출력 연계.
3. 검정·흰색 배경 제거에 대해 샘플 이미지 기반 정밀 복원 테스트, 알파 프리뷰 비교 슬라이더.
4. 대용량 이미지 비동기 처리(Web Worker/OffscreenCanvas), GIF Progress + Cancel.

**v1.2 프로덕션 파이프라인**
1. Sprite Sheet JSON/XML 메타데이터(프레임 rect / fps / pivot / name).
2. 트림 위치/원본 피벗 보존을 위한 Frame Offset metadata.
3. WebP/Animated WebP/APNG 익스포트 가능성 검토.
4. GIF 다중 프레임 디코딩 / 시트 자동 분석 / 시퀀스 파일 패턴 감지.
5. 저장 가능한 프로젝트 설정 JSON, 드래그 앤 드롭 폴더/ZIP, 대규모 일괄 처리.

## 7. 이후 개발자 시작 프롬프트
> `maxVFX Glue Studio` v1.0.0의 전체 ZIP과 HANDOFF.md를 분석해 주세요. v1.0.0의 PNG/TGA/GIF 익스포트, PixEffect Photoshop Channel Screen 알파 변환, GIF FPS/해상도, 시트 분할, 프레임 순서, 모바일 UI의 정상 동작을 유지하세요. 우선 v1.1의 RGBA/Alpha/RGB 시트 개별 출력 및 메타데이터 기능을 구현하고, 기존 Playwright + Pillow 기능 테스트를 다시 수행하세요. 산출물은 독립 실행 HTML, 소스 전체 ZIP, 누적 HANDOFF.md입니다.`

## 8. 누적 버전 히스토리
- **v1.0.0 (2026-10-08)** — 초기 구현. UI / 시트 / 알파랩 / GIF/TGA/PNG / 자동 해상도 / 스포이드 / 모바일 / 익스포트 검증.


---

## v1.1.0 개발 인수인계 (2026-10-08)

### 범위
- v1.0.0 렌더링·시퀀스·알파 알고리즘·GIF 인코더는 회귀 최소화를 위해 그대로 유지.
- 신규 `vfx-addon.js`: `__GlueTest.state` 및 `sheetRaw/readConf/dimensions`를 통해 기존 처리 결과를 재사용.
- 웹용 `index.html`에서 모듈 추가 로드, Standalone HTML에는 동 코드 인라인 번들.
- PNG/TGA RGB-only, Alpha-only 채널 익스포트. 기본 시트 PNG/TGA RGBA 그대로 유지.
- frame.id 기반 피벗 override Map과 공통 피벗 UI, 시트 클릭 배치 기능.
- 범용 Atlas JSON: UV/프레임/피벗/그리드/FPS/좌표계 안내.
- README 및 하단 버전 표기 최신화.

### 핵심 좌표 규약
- `frames[].rect`: 원점 Top-left, 픽셀 기준.
- `frames[].unityRect`: 원점 Bottom-left, 픽셀 기준 (Unity Editor Script 구현 시 사용).
- `frames[].uv`: 원점 Top-left, 정규화 UV. 프레임 간 Gap/Padding 및 Pow2 추가 공간도 고려.
- `frames[].pivot`: 프레임 좌하단 원점, 정규화; material 내 UV와 달리 Unity Sprite Pivot에 가까운 convention.
- RGBA 출력은 투명도와 RGB를 모두 유지. RGB Only는 Alpha 255. Alpha Only는 회색조 RGB와 Alpha 255.

### 검증/남은 작업
- 브라우저 자동화로 UI 초기화, 픽셀 채널 변환, Pivot override, JSON 좌표 및 PNG/TGA 다운로드 검증.
- 향후 v1.2: Unity Editor 자동 Slice JSON Importer, Niagara Dynamic Parameters / Pivot material helper, PNG sequence output, non-uniform per-frame duration.
- `.gitignore` 등을 포함하지 않는 정적 Pages 기본 유지.


### 검증 결과 (2026-10-08)
- JavaScript 구문 검사: `app.js`, `vfx-addon.js` PASS.
- Node.js VM 단위테스트: RGB/Alpha 변환, UV, Unity 좌표, 피벗 오버라이드와 재정렬 유지 PASS.
- Chromium 브라우저 자동 탐색: 개발 실행 환경의 `ERR_BLOCKED_BY_ADMINISTRATOR` 정책으로 미실행. 실제 브라우저 UI/파일 다운로드 검증은 필요.
- GitHub `main` 업데이트 및 Pages workflow 실행 확인. Pages 반영 상태는 별도 확인 필요.
- GitHub 원격 `vfx-addon.js`는 gzip 오프라인 로더, ZIP 내 `vfx-addon.js`는 가독성 있는 원본 소스(기능 동일); 브라우저 지원은 Chrome/Edge.

---

## v1.2.0 개발 인수인계 (2026-10-08)

### 요청 및 변경
- 사용자 추가 요청: **애니메이션 재생속도 조절**.
- 독립 미리보기 속도: 0.1~4.0× range/프리셋, 런타임 FPS = GIF FPS 설정값 × 배속. GIF 저장 FPS 변경 없음. `GIF FPS 반영` 클릭 시만 정수 1~50 FPS 복사.
- 새 `v12-addon.js`가 v1.0 플레이어 click/space 이벤트를 capture하여 기존 player와 중복 실행을 막고, RAF에서 경과 시간 기반으로 프레임을 건너뛰며 동작. 탭 숨김/저장/초기화/전체 제거 시 재생 중지. speed reset은 1×.
- Unreal CSV 익스포트: Top-left UV, 각 프레임 Rect, Bottom-left Pivot 정규화, GIF FPS 및 전체 시트 크기.
- Unity6 `GlueStudioAtlasImporter.cs`: Texture 선택 → JSON → SpriteMultiple/Rect+Pivot+NameFileID 적용. 기존 이름별 Sprite GUID 재활용 시도.
- Unreal5_8 `GlueStudio_Flipbook.ush`: Material Custom Node에서 UV Rect 계산. Pivot 보정은 Sprite 위치/World Position Offset을 별도로 조정해야 함.
- README, HANDOFF 누적 기록 갱신, standalone HTML 재번들, ZIP 구성.

### 데이터 규약과 제한
- 미리보기 배속은 산출 PNG/TGA/JSON의 FPS, UV, RGB, Alpha 픽셀에 영향을 미치지 않음.
- CSV는 UTF-8 BOM, CRLF, 필드 쌍따옴표 이스케이프. 동일 인덱스 순서를 출력.
- 기존의 피벗 override는 `frame.id` 기반으로 유지. JSON과 CSV 모두 동일한 피벗 좌표 사용.
- JSON `animation.fps`는 시트 사용자의 기본 FPS(GIF 재생 FPS)이며 미리보기 가변 배속은 기록하지 않음.
- Unity용 API는 공식 2D Sprite Data Provider 문서를 기준으로 작성했지만 Unity 6 에디터 자체 컴파일/실행을 이 컨테이너에서는 검증하지 못함.
- Unreal 엔진 자체 실행 검증 못함. Niagara Material Custom HLSL 샘플은 UV 입력 연동 보조이며 자동 Material/Paper2D 에셋 생성을 약속하지 않음.

### 검증 현황
- `node --check` v12-addon JS 문법 통과.
- `test_glue_v120_node.js`: 배속/ GIF FPS 분리, 프레임 advance/pause, CSV 요청 성공.
- `test_glue_v110_node.js`: 기존 RGB/Alpha 변환, UV/Rect, Pivot 재정렬 후 보존 검사 성공.
- Playwright/Chromium 실행 시 로컬 HTTP 및 file:// 네비게이션이 관리자 정책으로 차단되어 브라우저 E2E는 **검증하지 못함**. 실제 브라우저 UI 및 엔진 검증은 후속 수행 필수.

### 다음 과제
- GIF 개별 프레임 시간, APNG/WebP 애니메이션 출력, 캐시 최적화, 대용량 시트 청크 렌더링.
- Unity 6 Editor 내부에서 2D Sprite 버전별 임포터 컴파일/일괄 Import 테스트.
- Unreal 5.8에서 Niagara sprite pivot/WPO 및 Material Custom UV 샘플 직접 빌드/재생 테스트.
- Pages 배포 후 시퀀스 불러오기/배속/PNG/TGA/GIF 저장/CSV 테스트를 브라우저에서 확인.


---

## v1.3.0 (2026-10-08) — VFX Quality Update

### Baseline: v1.2.0
Previous files retained; frame imports, PNG/TGA/GIF outputs, PixEffect alpha processing, channel exports, pivot editor, playback 0.10-4x and engine metadata must remain functional.

### Implemented
1. `app.js` introduces optional `window.GlueV13.sourceRect`, `.process`, `.frameDelays` hooks. Core frame cache invalidated on v1.3 UI changes. Legacy default path remains untouched when controls OFF.
2. `v13-addon.js` includes source coordinate registration (keep untrimmed source), alpha bbox / alpha-weighted centroid recenter, explicit inverse-composite matte RGB correction (black/white/custom; enabled for existing-alpha mode only), source-vs-processed comparison dialog.
3. Per-frame duration `frame.durationMs` with 20-60000ms constraints, optional variable timing playback and v1.2 preview speed multiplier, reset-to-FPS. The custom playback captures click/space at Window only when enabled, leaving v1.2 player behavior intact otherwise.
4. `gif-codec.js` accepts optional `config.delaysMs` and writes per-frame centisecond GIF Graphic Control Extension. Defaults to old global FPS when missing.
5. `v13-addon.js` decorates legacy v1.1 metadata and intercepts Atlas JSON / Unreal CSV save clicks to add `frames[].durationMs`, `animation.variableTiming`, alignment and matte settings. v1.1 source remains untouched.
6. `index.html` and offline standalone include `v13-addon.js`. README and handoff updated. No external CDN.

### Coordinate and export compatibility
- Original/Pivot/UV conventions unchanged from v1.2 (Pivot bottom-left normalized, Rect top-left pixels).
- Auto recenter physically shifts RGBA pixels within output tile, without changing user-defined pivot metadata. If exact world-space registration required, use original/source alignment and stable pivot.
- Source alignment with Trim=ON deliberately uses original source rect, reducing benefit of trim to keep spatial registration.
- Edge RGB correction assumes the specified matte was composited onto originally straight-alpha colors; incorrect matte/color can cause clipping or halos.
- GIF frame delays rounded to 10ms; 20ms min, 60000ms UI max. Browser GIF decoders may impose timing floors.

### QA / limitations
- Node unit tests: bbox shift, alpha-weighted centroid, source registration, black-matte RGB inversion, opt-in timing and GIF GCE delay bytes.
- Chrome/Playwright navigation blocked by administrator policy (`ERR_BLOCKED_BY_ADMINISTRATOR`), so browser end-to-end was not available.
- Existing Unity6/UE5.8 importer/helper not run inside actual engines.

### Next v1.4 roadmap
- Save/load entire editing session incl. images and settings using portable project ZIP.
- Decode all GIF frames with individual duration; import animated WebP/APNG where supported.
- Export PNG sequence ZIP, Undo/Redo, bulk timeline editing.
- Proper GIF alpha-edge dithering, alpha QA heatmap, performance profiling and browser E2E in permitted environment.

### Deployment requirements
- Push all updated files (not just index): `app.js`, `gif-codec.js`, `vfx-addon.js`, `v13-addon.js`, `index.html`, standalone, README, HANDOFF.
- Check GitHub Pages action completion on exact main HEAD and runtime load.
- Ship ZIP plus cumulative standalone MD.


---
## v1.4.0 cumulative patch — 2026-10-08

**Project:** https://github.com/kdc916/Glue-Studio | **Branch:** main | **Baseline:** v1.3.0.

### Scope
- GIF87a/GIF89a full-frame decoder with LZW min code size 2–8, global and local palettes, transparency, disposal 1/2/3, interlaced GIF, GCE per-frame delay; full-canvas composited frames imported as Bitmap for same pipeline as PNG frames. GIF → PNG/TGA Sprite Sheet conversion.
- GIF button, drag/drop/file-input support. On first import auto tile dimensions and sqrt-based columns; preserving existing frame settings on append. Enables v1.3 variable timing for imported GIF.
- Export processed frames PNG ZIP (file naming, sorted order, metadata). Engine JSON already contains durationMs/pivot from v1.3; no changes to engine helper code.
- Save portable `.glueproj`: project.json manifest + individual original frames (PNG), layout, alpha settings, playback configuration, default and per-frame Pivot; restore validates schema, bounds, CRC then atomically replaces frame collection (keep existing on parse/decode failures).
- ZIP32 STORE reader/writer with UTF-8 names + CRC32; rejects unsupported DEFLATE, Zip64, encrypted/corrupt archives, path traversal and duplicates.
- New scripts: `gif-decoder.js`, `zip-codec.js`, `v14-addon.js`; update app.js to route file imports and expose safe existing utilities; update index.html, standalone HTML, README. v1.0-1.3 operations maintained.

### Engineering notes / limitations
- GIF parser stores full 32-bit composited RGBA frames. Cap cumulative pixels 32,000,000 and 512 frames, GIF input <=80MB. These caps avoid browser OOM. GIF 0cs delays normalized to 100ms; nonzero 1cs delay clamped to 20ms for GIF output compatibility.
- Pixel alignment and α decontamination are still v1.3 opt-in. GIF's 256-color/1-bit transparency cannot be repaired by exporting 32-bit PNG/TGA.
- `.glueproj` serializes bitmap via Canvas + PNG so zero-alpha RGB bytes are not promised bit-exact. Frame order/pivot/default pivot/duration/settings are restored; sprite engine references may need reimport.
- ZIP encoding uses STORE by design. Output files may be larger than optimized ZIP, but browser can work offline and files are standard ZIP compatible.
- Hard page refresh clears unsaved work. Project save is manual; autosave/undo remain backlog.

### Quality checks
- Run `node test_v140_node.js` and `node test_gif_pillow_compare.js` in the extracted project.
- GIF decoder vs Pillow disposal 1/2/3 and opaque frame RGBA, GIF timings, bad/truncated input.
- ZIP roundtrip & CRC/path validation tests.
- Verify GitHub Actions Pages latest commit Build+Deploy; no claim of live UI test without actual browser execution.

### Regression matrix for each release
- PNG sequence -> PNG sheet / TGA / GIF.
- GIF mixed disposal input -> frame count/timing -> PNG sheet & frame sequence ZIP.
- Alpha modes (black/white/chroma/off/opaque), trim, gap/padding, POT and edge matte.
- Per-frame Pivot and JSON/CSV after reorder and reopen project.
- Standalone `file://` and GitHub Pages, Chrome/Edge mobile responsiveness.
- Project corruption leaves original frames untouched; successful reopen restores duration & default/override pivots.

### v1.5 backlog
- Project autosave + undo/redo stack.
- Worker-based decode/export for very large sequences, cancel/progress, memory diagnostics.
- True per-frame durations editing on visual timeline and preview behavior quality.
- Animated WebP/APNG export (must preserve alpha and duration).
- Engine-editor import integration tests against Unity 6 and Unreal 5.8, GitHub Actions headless browser E2E.

## v1.5.0 — Undo/Redo + Atlas QA + Smart Grid (2026-10-08)

- Source added: `v15-addon.js` (plain-source offline addon loaded after v14).
- Updated `index.html`, `maxVFX_Glue_Studio_Standalone.html`, `README.md`, `HANDOFF.md`.
- 35-step scalar-only Undo/Redo stores frame IDs/order/timing, form values, global/per-frame pivots; refuses stale source IDs and avoids retaining removed ImageBitmaps. Image import/remove/project replacement is **not undoable**.
- Quality analyzer: sheet limits (8192px/45MP), estimate 4 bytes/pixel, blank/near-empty frames, suspect edge contact, sample-hash duplicates, gap/bleed/POT and trim risk; async yielding, max 64 frames/14M processed pixels/3.5M sampled pixels; >7.5M-pixel tiles skipped.
- Smart layout finds valid columns, optimizing area and aspect ratio while preserving each frame, Pivot, tile resolution, gap, padding and power-of-two mode.
- QA: legacy v1.4 GIF all-frame decoder disposal/ZIP+CRC tests and v1.5 pure layout/undo/quality smoke tests passed. Browser file:// navigation blocked by administrator policy, and Unity6/UE5.8 editor integration remains unverified.
- Next: run true browser E2E in CI, test on mobile memory-limited devices, consider opt-in auto recover via IndexedDB and worker-based image encoding.
