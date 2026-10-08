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
