# maxVFX Glue Studio — Cumulative Handoff
Project: https://github.com/kdc916/Glue-Studio
Base branch: main
Stack: Vanilla HTML / CSS / JavaScript, offline Canvas API.

## v1.0.0 baseline (2026-10-08)
- Multi-image import, frame ordering and sheet slicing
- Flipbook grid, frame resolution, gap, padding, trim, power-of-two
- PixEffect-inspired black / white background alpha reconstruction, chroma key, opaque, bleed
- Sprite-sheet PNG/TGA export and animated GIF export with FPS, resolution and transparency options
- Standalone HTML distribution and static Pages project

## v1.1.0 patch (2026-10-08)
- `vfx-addon.js` appended after `app.js` on GitHub Pages
- RGB Only sheet PNG/TGA export with forced opaque alpha
- Alpha Only sheet PNG/TGA export as opaque grayscale
- Shared normalized pivot and per-frame override using stable frame IDs
- Preview click placement in sheet and animation views; sheet cell positions include padding/gap
- Atlas JSON includes pixel rectangles, normalized UV, Unity bottom-left rectangle, normalized per-frame pivot, FPS
- `index.html`, `README.md`, standalone HTML updated for v1.1
- GitHub Pages extension module uses an offline gzip transport loader that decompresses in modern Chrome/Edge (DecompressionStream); downloadable ZIP contains the plain-source `vfx-addon.js`.

## Coordinate conventions
- rect: top-left pixel origin (x right, y down)
- unityRect: bottom-left pixel origin (x right, y up)
- uv: top-left normalized texture coordinates, with gap/padding and power-of-two sheet accounted for
- pivot: bottom-left normalized within individual frame, 0-1

## Important limitations
- Generic Atlas JSON is not a native Unity Sprite Editor or Unreal import file; import helpers remain future work.
- A standard Unreal Niagara flipbook grid does not independently consume per-frame pivot metadata.
- GIF remains an 8-bit indexed-color / one-bit transparency format.
- Trim changes alignment and may change apparent pivot relative to an untrimmed source image.
- Local automated browser navigation in the development sandbox was blocked by browser administrator policy. JavaScript syntax and structural tests are possible, but browser-level feature verification must be repeated in a normal desktop browser.

## QA checklist
1. Confirm new Pivot Editor and Channel & Metadata Export panels appear in Pages.
2. Import a short PNG sequence; export PNG, TGA, GIF and Alpha/RGB channels.
3. Change global pivot, apply per-frame pivot, reorder frames, verify JSON matches the frames.
4. Inspect a 4x4 sheet with spacing and power-of-two enabled; verify UV coordinates.
5. Check `Standalone.html` with file:// local loading and Chrome/Edge offline.
6. Verify GitHub Pages serves current `index.html` and `vfx-addon.js` after build.

## v1.2 plan
- Unity 6 editor importer to slice sprite arrays from JSON
- Unreal 5.8 Niagara material/module helper for per-frame pivot offsets
- Export frame PNG sequence ZIP and standalone animation import
- Alpha edge diagnostics and automatic quality gate
- Multi-frame GIF input decode and per-frame duration support

Keep future changes regression-safe against v1.0 / v1.1 and always ship ZIP plus cumulative handoff MD.


---

## v1.2.0 개발 인수인계 (2026-10-08)

### 요구사항 및 구현
- 실시간 미리보기 재생 배속 0.10×~4.00×, 0.25/0.5/1/2/4× 프리셋, GIF FPS 독립 및 명시적인 동기화 버튼.
- `v12-addon.js`가 기존 플레이어의 click/space 이벤트를 capture 방식으로 교체. elapsed time 기반 RAF 프레임 진행, 선택/재생/일시정지 유지.
- GIF 내보내기, PNG/TGA 시트, 알파 제거 및 기존 v1.1 Pivot/채널 Export 기능 유지.
- Unreal CSV: 각 frame rect(좌상단 기준), UV(좌상단 원점), pivot(좌하단 기준), GIF FPS, sheet 크기, columns/rows.
- Unity 6: 2D Sprite Data Provider API 기반 `engine/Unity6/GlueStudioAtlasImporter.cs` 선택 텍스처+JSON -> Multiple SpriteRects & Pivot; 동일 이름 GUID 유지 시도.
- Unreal 5.8: `engine/Unreal5_8/GlueStudio_Flipbook.ush` Material Custom UV helper; Gap/Padding/PowerOfTwo 텍스처 atlas 대응. per-frame pivot은 mesh/WPO 연계 별도 처리해야 함.
- index.html, Standalone HTML, README 갱신. standalone에는 압축된 추가 모듈을 오프라인 스크립트로 포함.

### 변경 파일
- 신규 v12-addon.js
- 신규 engine/Unity6/GlueStudioAtlasImporter.cs 및 engine/Unity6/README.md
- 신규 engine/Unreal5_8/GlueStudio_Flipbook.ush 및 engine/Unreal5_8/README.md
- 갱신 index.html, maxVFX_Glue_Studio_Standalone.html, README.md, HANDOFF.md

### 회귀 체크 및 제한
- Node 검증: 신규 배속과 GIF FPS 분리, 프레임 advance, pause, CSV export 호출 통과.
- 기존 v1.1 alpha channel/UV/pivot 재정렬 테스트 통과.
- Playwright Chromium은 이 실행 환경 보안 정책으로 HTTP와 file:// 네비게이션 둘 다 차단되어 실 브라우저 E2E 미실시.
- Unity6 C# 및 UE5.8 HLSL은 실제 엔진 내 빌드/실행 미검증. 수동 도입 후 검증 권장.
- GitHub에서 v12-addon.js는 GitHub Pages용 gzip self-extract loader. 읽기 쉬운 원본은 제공 ZIP의 v12-addon.js에 동봉.
- GitHub 압축형 모듈은 외부 CDN을 쓰지 않지만 구형 브라우저의 DecompressionStream 지원이 필요함.

### 향후 작업
- frame별 duration, GIF 반투명 디더링 개선, Unity6 임포터 실제 Sprite 참고호환 테스트, Unreal5.8 Niagara VFX Material 실제 연동/자동 import, Pages end-to-end 확인.


## v1.3.0 cumulative patch (2026-10-08)
Baseline v1.2.0. Changed app.js (optional sourceRect/process/frameDelays hooks), gif-codec.js (per-frame GIF GCE timing), index.html, standalone, README, HANDOFF; added v13-addon.js.
Visual alignment: legacy/source registration/alpha bbox/weighted alpha; edge matte black/white/custom RGB reconstruction of existing-alpha images only (alpha unchanged), default OFF. Original vs processed compare dialog. Optional per-frame duration 20-60000ms affects variable RAF playback with existing speed multiplier, GIF centisecond delays, atlas JSON & Unreal CSV durationMs. Existing pivot/UV remain unmodified; auto-centering may alter intended VFX motion.
Tested with Node: bbox, weighted center, source registration, inverse-matte alpha preservation, default time fallback, GIF89a GCE timing. Chromium E2E blocked by administrator policy; Unity6/UE5.8 editors not executed. v1.4 backlog: portable project ZIP, multiframe GIF import, undo/redo, PNG sequence ZIP, browser E2E.
