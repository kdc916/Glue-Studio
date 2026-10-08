// maxVFX Glue Studio v1.2.0 — Unity 6 Editor helper.
// Requires com.unity.2d.sprite; put this file into Assets/Editor.
#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.U2D.Sprites;
using UnityEngine;

public static class GlueStudioAtlasImporter
{
    [Serializable] private class Atlas { public Sheet sheet; public Frame[] frames; }
    [Serializable] private class Sheet { public int width; public int height; public int frameWidth; public int frameHeight; }
    [Serializable] private class Frame { public int index; public string name; public RectData rect; public PivotData pivot; }
    [Serializable] private class RectData { public float x; public float y; public float width; public float height; }
    [Serializable] private class PivotData { public float x; public float y; }

    [MenuItem("Tools/maxVFX Glue Studio/Import Atlas JSON")]
    private static void Apply()
    {
        var selected = Selection.activeObject as Texture2D;
        if (!selected) { EditorUtility.DisplayDialog("Glue Studio", "먼저 Project에서 PNG/TGA 시트 텍스처를 선택하세요.", "OK"); return; }
        string path = AssetDatabase.GetAssetPath(selected);
        var importer = AssetImporter.GetAtPath(path) as TextureImporter;
        if (importer == null) { Debug.LogError("Glue Studio: TextureImporter를 찾지 못했습니다."); return; }
        string jsonPath = EditorUtility.OpenFilePanel("Glue Studio atlas JSON 선택", Path.GetDirectoryName(Application.dataPath), "json");
        if (string.IsNullOrEmpty(jsonPath)) return;
        try
        {
            Atlas atlas = JsonUtility.FromJson<Atlas>(File.ReadAllText(jsonPath));
            if (atlas == null || atlas.sheet == null || atlas.frames == null || atlas.frames.Length == 0)
                throw new InvalidDataException("Atlas JSON 구조가 올바르지 않습니다.");
            if (atlas.sheet.width != selected.width || atlas.sheet.height != selected.height)
                throw new InvalidDataException($"텍스처 크기({selected.width}x{selected.height})와 JSON({atlas.sheet.width}x{atlas.sheet.height})이 다릅니다.");
            if (importer.textureType != TextureImporterType.Sprite || importer.spriteImportMode != SpriteImportMode.Multiple)
            {
                importer.textureType = TextureImporterType.Sprite;
                importer.spriteImportMode = SpriteImportMode.Multiple;
                importer.SaveAndReimport();
            }
            var factory = new SpriteDataProviderFactories();
            factory.Init();
            var provider = factory.GetSpriteEditorDataProviderFromObject(AssetImporter.GetAtPath(path));
            if (provider == null) throw new InvalidOperationException("2D Sprite 패키지의 Data Provider를 사용할 수 없습니다.");
            provider.InitSpriteEditorDataProvider();
            var existingIds = provider.GetSpriteRects().GroupBy(s => s.name).ToDictionary(g => g.Key, g => g.First().spriteID);
            var sprites = new List<SpriteRect>();
            var usedNames = new HashSet<string>();
            foreach (var frame in atlas.frames.OrderBy(f => f.index))
            {
                if (frame.rect == null) throw new InvalidDataException($"Frame {frame.index}: rect 누락");
                var r = frame.rect;
                if (r.width <= 0 || r.height <= 0 || r.x < 0 || r.y < 0 || r.x + r.width > atlas.sheet.width || r.y + r.height > atlas.sheet.height)
                    throw new InvalidDataException($"Frame {frame.index}: rect 범위 오류");
                var rawName = Path.GetFileNameWithoutExtension(frame.name ?? $"frame_{frame.index:D3}");
                var safeName = string.IsNullOrWhiteSpace(rawName) ? $"frame_{frame.index:D3}" : rawName;
                string name = safeName;
                for (int n = 1; !usedNames.Add(name); n++) name = $"{safeName}_{n}";
                var pivot = frame.pivot == null ? new Vector2(.5f,.5f) :
                    new Vector2(Mathf.Clamp01(frame.pivot.x), Mathf.Clamp01(frame.pivot.y));
                sprites.Add(new SpriteRect {
                    name = name,
                    spriteID = existingIds.TryGetValue(name,out var knownId) ? knownId : GUID.Generate(),
                    rect = new Rect(r.x, atlas.sheet.height - r.y - r.height, r.width, r.height),
                    alignment = SpriteAlignment.Custom,
                    pivot = pivot
                });
            }
            provider.SetSpriteRects(sprites.ToArray());
            var nameIds = provider.GetDataProvider<ISpriteNameFileIdDataProvider>();
            if (nameIds == null) throw new InvalidOperationException("SpriteNameFileId Provider 없음 — 2D Sprite 패키지 확인 필요");
            nameIds.SetNameFileIdPairs(sprites.Select(s => new SpriteNameFileIdPair(s.name,s.spriteID)).ToList());
            provider.Apply();
            importer.SaveAndReimport();
            Debug.Log($"Glue Studio: {sprites.Count} sprites sliced (pivot, padding & gap preserved): {path}");
            EditorUtility.DisplayDialog("Glue Studio", $"{sprites.Count}개 스프라이트를 Slice 했습니다.", "OK");
        }
        catch (Exception e) { Debug.LogException(e); EditorUtility.DisplayDialog("Glue Studio Import 실패", e.Message, "OK"); }
    }
    [MenuItem("Tools/maxVFX Glue Studio/Import Atlas JSON", true)]
    private static bool Validate() => Selection.activeObject is Texture2D;
}
#endif
