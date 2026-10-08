# Unreal Engine 5.8 — Niagara / Material 연동

현재 제공되는 것은 **자동 에셋 생성기가 아니라 프레임 데이터와 UV 보조 코드**입니다. UE 5.8 에디터 내 자산 생성 및 Niagara 렌더 검증은 하지 않았습니다.

1. Glue Studio에서 RGBA 시트 PNG/TGA, `JSON 메타데이터`, `Unreal CSV`를 저장합니다.
2. UE Content Browser에 시트를 Import하고 Texture Sample용 Material을 제작합니다.
3. Material `Custom` 노드의 Output Type = `CMOT Float2`로 하고 `GlueFlipbookUV` 함수 **본문**을 복사합니다. 입력 `UV`, `Frame`, `SheetSize`, `TileSize`, `Columns`, `Gap`, `Padding`을 연결합니다.
4. Texture Sample의 UV에 Custom 결과를 입력하고, Frame에는 Niagara Particle Age/Lifetime과 JSON FPS를 이용한 0부터 시작하는 프레임 인덱스를 전달합니다.
5. Sprite Renderer의 SubImage만으로 사용하는 방식은 **Gap/Padding 없는 균일 그리드**일 때 적합합니다. 개별 Pivot은 CSV/JSON pivot을 읽어 Niagara Renderer 지원 범위에 맞게 적용하거나 World Position Offset에서 별도 처리해야 합니다.

`pivot`은 좌하단 원점 정규화, `rect`/UV는 좌상단 원점 기준입니다. GPU Sprite UV 및 컬러 설정은 프로젝트에 따라 검토하세요.
