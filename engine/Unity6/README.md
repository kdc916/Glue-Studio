# Unity 6 — Sprite Slice 자동화

1. Unity Package Manager에서 **2D Sprite** (`com.unity.2d.sprite`) 설치 여부를 확인합니다.
2. `GlueStudioAtlasImporter.cs`를 Unity 프로젝트 `Assets/Editor/`에 복사합니다.
3. Glue Studio에서 **RGBA PNG/TGA 시트**와 **JSON 메타데이터**를 저장합니다.
4. Unity Project에서 시트 Texture2D를 선택하고 **Tools > maxVFX Glue Studio > Import Atlas JSON**를 클릭해 JSON을 선택합니다.
5. 임포터가 Sprite / Multiple로 설정한 후 JSON Rect·Pivot을 적용합니다.

같은 이름의 Sprite는 GUID를 가능한 한 재사용합니다. 처리 전 텍스처와 `.meta` 백업 권장. Unity 6 실제 에디터 컴파일/임포트는 이 환경에서 수행하지 못했으며, 공식 Sprite Editor Data Provider API를 기준으로 작성했습니다.
