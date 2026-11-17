# Pond fish behavior

The live scene uses `src/lib/koi/behavior.ts`. The older `motion.ts` food-seeking
experiment is not the scene's controller.

The earlier controller repeatedly selected headings around a fixed upward
direction and translated at a constant speed. Its short-range separation ignored
fish at sufficiently different depths. Those choices produced repeated turns,
edge accumulation, and visible overlap between depth layers.

## Movement and space

- Each fish keeps its own destination, swimming rhythm, speed, and angular
  velocity. Destinations are spread across a broad central ellipse. Twenty-two
  percent of destination selections explore the outer pond; the center is a
  preference, not a shared point or a hard enclosure. Destination selection favors
  positions ahead of the fish, with a minimum six-to-eleven-second commitment to
  each course. The wider destination and spawn areas avoid central congestion.
- Small, slowly varying deviations curve the approach. Angular velocity and
  speed ease toward their targets with bounded acceleration. Ordinary turns are
  slower, retain forward preference, and ignore course errors below about six
  degrees; collision avoidance and food retain quicker responses. Individual push
  phases alternate with longer glides, and propulsive tail motion softens while
  the fish keeps moving. The established cruise-speed setting remains unchanged.
- Neighbors are observed from the same frame snapshot. Separation considers
  projected crossings up to three seconds ahead, visible body size, and all depth
  layers. Fish yield speed when another fish is ahead. Deterministic opposite
  steering resolves head-on or coincident pairs without teleportation.
- New fish choose spacious positions in the central area. Food and cursor
  curiosity override ordinary roaming, while retaining some separation.
- A fish keeps its pellet target, and other fish choose unclaimed pellets.
  Pellets underneath a fish trigger a pass and another approach. The existing
  pause, extended lunge, recovery, and larger idle-cursor detection radius remain.
  The short bite animation takes priority over normal separation, so fish can
  briefly cross while feeding; this is a preference for space, not rigid collision
  geometry.

These are behavioral animation rules, not a calibrated biological or
hydrodynamic simulation. In particular, center preference and avoidance across
depth layers serve the composition and the requested visible personal space.

## Research

- [Wu, Yang and Zeng, 2007, koi burst-and-coast swimming](https://pubmed.ncbi.nlm.nih.gov/17562892/):
  direct observations of alternating propulsion and coasting in koi. This
  motivates the rhythm, rather than imposing continuous identical tail beats.
- [Katz et al., 2011, interactions in schooling fish](https://pmc.ncbi.nlm.nih.gov/articles/PMC3219116/):
  golden shiner interactions include speed adjustment and close-range avoidance.
  The pond adapts those principles; it does not claim koi-specific spacing data.
- [Reynolds, steering behaviors](https://www.red3d.com/cwr/papers/1999/gdc99steer.pdf):
  persistent wandering, separation, and predicted interaction guide the
  implementation. A hard circular orbit or uniform flock alignment is not used.

## Verification

`scripts/koi-behavior.test.mjs` checks bounded acceleration and turning at 20,
60, and 120 Hz, head-on encounters, coincident fish, and five-minute seeded
desktop/mobile simulations. The simulations measure central occupancy, actual
peripheral visits, and close pair frequency. Browser checks also exercise the
live controller and pellet captures, so checks are not limited to the unused
legacy movement experiment.
