# Intro backdrop

`background.png` is the static, side-on pond backdrop. It was created with the
built-in image generation tool and compressed losslessly to 928,920 bytes. The
image is 1672 x 941 pixels. Replacing it does not require rebuilding the fish.

On `/fish`, the initial HTML requests the PNG at low priority with
asynchronous decoding. The HTML shows a loading bar over a water-color gradient
while the image and fish module load independently. Each visit chooses one of
eight fill patterns. The bar completes when the pond draws its first lit frame.

After the first fish paint, `src/lib/koi/intro-scenery.ts` and its CSS add
ambient bubbles, swaying kelp, branching coral, and distant fish. Hero fish
and gaze animation live in
`src/lib/koi/intro.ts` and `src/lib/koi/side-view.ts`.

## Final image-generation prompt

The final pass edited the initial generated pond composition with this prompt:

> Edit the generated underwater pond backdrop. Preserve its composition, open turquoise center, upper-left light, and mossy rocks along the bottom. This is an optimization pass for a website loading screen: produce a genuinely LOW RESOLUTION opaque PNG, actual output canvas 640 by 360 pixels if supported, not just low-resolution-looking art on a large canvas. Use only a small flat palette of about 24 solid colors. Remove fine noise, grain, tiny texture variations and all subtle continuous gradients. Large flat pixel clusters and clean stepped color bands. Keep it polished and calm, with no fish, plants, bubbles, text or UI. Preserve the simple roomy center for the live koi. File size must be small for quick loading.

The generator retained its larger output dimensions. The final compression pass
preserves every decoded pixel and the PNG metadata.
