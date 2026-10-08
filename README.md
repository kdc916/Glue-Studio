# maxVFX Glue Studio v1.4.0

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
