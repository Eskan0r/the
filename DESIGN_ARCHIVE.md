# Website designs

The homepage (`/`) opens directly into the original pixel and ASCII koi scene,
adapted from [ASCII Animals](https://github.com/Pawan-webdeveloper/Ascii-Animals-extension).
Click or tap the water to drop food. Fish gather to eat, then resume swimming.
The upstream MIT license is preserved in `src/lib/koi/LICENSE`.
There are no visible controls, extension features, or keyboard commands.
Animation pauses in hidden tabs and slows with reduced motion preferences.

Tail animation follows a rearward-traveling body wave, with a stable head and
greater movement toward the tail. Beat rate follows swimming speed; turn curvature
eases through the trailing body, and the caudal fin rotates with the local spine.
Existing steering, food seeking, pixel shading, palette, grid, and blur are retained.
This is a stylized kinematic model informed by
[fish-swimming research](https://pmc.ncbi.nlm.nih.gov/articles/PMC8670443/).
Run `node --test scripts/koi-tail.test.mjs` to verify the deformation and orientation.

The original portfolio is available at `/archive/original`, loaded only when that
route is opened. Run `npm run dev` to view either route locally.
