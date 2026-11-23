# Intro backdrop

`background.png` is the static, side-on pond backdrop. It was created with the
built-in image generation tool and compressed losslessly to 928,920 bytes. The
image is 1672 x 941 pixels. Replacing it does not require rebuilding the fish.

The browser requests it at low priority after the first fish paint. Loading or
decoding this PNG never gates the fish, pond readiness, or reveal. The water-color
fallback remains available when the image is slow or missing.

Bubbles and grasses are animated separately in
`src/lib/koi/intro-scenery.ts` and its CSS. Fish and gaze animation live in
`src/lib/koi/intro.ts` and `src/lib/koi/side-view.ts`.

## Final image-generation prompt

The final pass edited the initial generated pond composition with this prompt:

> Edit the generated underwater pond backdrop. Preserve its composition, open turquoise center, upper-left light, and mossy rocks along the bottom. This is an optimization pass for a website loading screen: produce a genuinely LOW RESOLUTION opaque PNG, actual output canvas 640 by 360 pixels if supported, not just low-resolution-looking art on a large canvas. Use only a small flat palette of about 24 solid colors. Remove fine noise, grain, tiny texture variations and all subtle continuous gradients. Large flat pixel clusters and clean stepped color bands. Keep it polished and calm, with no fish, plants, bubbles, text or UI. Preserve the simple roomy center for the live koi. File size must be small for quick loading.

The generator retained its larger output dimensions. The final compression pass
preserves every decoded pixel and the PNG metadata.
