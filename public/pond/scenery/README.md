# Editable pond artwork

The site renders these PNGs directly. Fish, caustics, wakes, feeding, and movement
remain animated in code.

- `background.png`: water and pond-floor color, without scenery or baked light.
- `rocks/`: eight river-rock and six mossy-bank variants.
- `lilypads/`: six lily-pad orientations with transparent edges and shadows.
- `flowers/`: separate pink and ivory flowers.
- `leaves/`: four fallen maple leaves.
- `pier/`: desktop/mobile pier PNGs and their crop/placement metadata.

Keep each filename, canvas dimensions, transparent background, and centered
anchor when replacing a sprite. Positions and sizes are in
`src/lib/koi/environment.ts`; asset paths are in `src/lib/koi/assets.ts`.
Moss-rock caustic masks are derived automatically from PNG transparency.

Normal builds use the PNG files as-is. To regenerate the original artwork,
start Vite on port 5180 and local Chromium debugging on port 9336, then run:

```text
node scripts/bake-koi-scenery.mjs
```

Regeneration replaces the PNGs with exports from `src/lib/koi/artwork.ts` and
`src/lib/koi/pier-artwork.ts`. Those generators are not part of the running page.
