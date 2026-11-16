# Interactive pond surface

Mouse motion represents a small pressure footprint skimming the water, rather
than a sequence of painted rings. The existing pixel pond is rendered through
the resulting height field. Clicking/tapping applies a short pressure impulse
while retaining fish feeding.

## Research and model selection

The key difference between water and a simple membrane ripple effect is
**dispersion**: different wavelengths propagate at different speeds. A constant
speed wave equation cannot reproduce both gravity and capillary wake structure.
The implementation therefore evolves Fourier modes of the linear, finite-depth
free-surface equations:

```
omega(k)^2 = (g*k + sigma/rho*k^3) * tanh(k*depth)

eta_hat'' + 2*beta(k)*eta_hat' + omega(k)^2*eta_hat
    = -k*tanh(k*depth)/rho * p_hat(k,t)

beta(k) = 2*nu*k^2 + pondLoss
```

Here eta is displacement in metres, p is surface pressure in pascals, and k is
angular wavenumber in radians/metre. The pressure forcing follows by eliminating
the surface velocity potential from the linear kinematic and dynamic boundary
conditions. Its zero mode is zero, so interaction does not add net water volume.

Each mode uses the analytical **damped, forced oscillator solution** over a
1/120-second interval with pressure held constant at the path midpoint.
Positions interpolate over the elapsed simulation steps; pressure eases over
45 ms. A Gaussian footprint has an analytical Fourier transform, so moving the
source does not require FFTs of a newly rasterized force image. One inverse 2D
FFT reconstructs the height field per rendered update. There is no hardcoded
V, wake angle, expanding radius, or artificial ring speed.

The natural response includes gravity/capillary dispersion, superposition,
interference, a trailing wake, transient waves when starting/stopping/turning,
and wavelength-dependent viscous attenuation. Deep clean water has a minimum
phase speed near 0.23 m/s; the dispersion relation includes this behavior rather
than imposing a speed threshold. Below that speed a *steady* pressure source
does not radiate a steady far-field wake; starting/stopping can still radiate
transient waves. A universal 19.47-degree wake angle would be inappropriate:
finite source size, speed, capillarity, and depth affect the visible wake.

## Physical parameters and presentation choices

| Parameter | Value | Interpretation |
| --- | --- | --- |
| Gravity | 9.81 m/s² | Terrestrial gravity |
| Density | 998.2 kg/m³ | Fresh water around room temperature |
| Surface tension | 0.0728 N/m | Clean water approximation |
| Kinematic viscosity | 1.004e-6 m²/s | Room-temperature water approximation |
| Uniform depth | 0.35 m | Assumed pond depth |
| Scale | 700 CSS pixels/m | Assumed scene scale; independent of device pixel ratio |
| Pressure footprint radius | max(0.012 m, 1.05 grid spacings) | Smooth source, widened when needed to resolve it |
| Moving source peak pressure | up to 26 Pa | Interaction tuning, proportional to speed below 0.65 m/s |
| Click pressure | 260 Pa for 1/120 s | Small pressure impulse, not a resolved falling droplet |
| Additional pond loss | 0.45 s⁻¹ | Phenomenological attenuation; not molecular viscosity |

The Fourier domain is twice the visible width and height. The central viewport
is displayed, allowing waves to travel beyond the visible edges before any
periodic return. Damping attenuates those returns; this is **not** an exact
absorbing shoreline boundary. Resolution is capped at 256×256 modes for browser
performance. The Gaussian footprint suppresses short wavelengths, and Nyquist
forcing modes are excluded to preserve conjugate symmetry for arbitrary source
positions. The flat mode stays zero.

Submerged scenery and fish refract together. For the top-down view, the apparent
sampling shift uses the small-slope, near-normal Snell approximation:

```
shift ~= apparentDepth * (1 - 1/1.333) * surfaceSlope
```

The apparent rendering depth is 0.22 m. Lighting is an artistic approximation of
directional sky reflection based on the same slope, with stronger contrast for
readability on the dark pixel background. This is not a radiometrically accurate
Fresnel/caustics renderer. Food and lily pads render above the refracted layer.
Reduced-motion mode scales input amplitudes to 20%, retaining physical wave
timing. Leaving/blurring clears pointer history so reentry cannot draw a streak
across the pond. A fish carrying the cursor does not continuously force waves.

## Scope and limitations

This is a small-amplitude, constant-depth, linear free-surface simulation, not
a full Navier–Stokes fluid. It does not resolve overturning/breaking, splashes,
foam, turbulence, currents, nonlinear wave interactions, or scattering around
individual rocks and lily pads. Scenery is not a bathymetry/obstacle mesh.
Short capillary wavelengths below the grid limit are filtered out. The existing
ambient bottom-light animation and fish trail/bite glyphs remain decorative;
they are not derived from this solver. Pixel refraction uses nearest samples
to retain the established art style.

## Sources

1. [University of Texas, Surface Tension](https://farside.ph.utexas.edu/teaching/336L/Fluidhtml/node156.html).
   Linear finite-depth gravity–capillary dispersion and pressure boundary condition.
2. [Cambridge Mathematical Tripos, fluid dynamics](https://www.damtp.cam.ac.uk/user/hinch/teaching/D24c.pdf).
   Independent check of the finite-depth gravity–capillary dispersion relation.
3. [Wave Resistance for Capillary Gravity Waves: Finite Size Effects](https://arxiv.org/abs/1109.6200).
   Moving pressure disturbances, minimum phase velocity, and importance of footprint size.
4. [Moisy and Rabaud, Mach-like capillary-gravity wakes](https://arxiv.org/abs/1406.0422).
   Experimental wakes and numerical Gaussian pressure-source model; speed and size affect angle.
5. [Pethiyagoda, McCue and Moroney, Wake angle for surface gravity waves on a finite depth fluid](https://arxiv.org/abs/1505.04336).
   Depth-dependent wake patterns and distinction between apparent and bounding wake angle.
6. [The Generation of Gravity-Capillary Solitary Waves by a Pressure Source Moving at a Trans-critical Speed](https://arxiv.org/abs/1606.00457).
   Experiments and simulations near the minimum phase speed; a reminder that nonlinear
   solitary waves lie outside the present linear approximation.
7. [Berhanu, Impact of the Dissipation on the Nonlinear Interactions and Turbulence of Gravity-Capillary Waves](https://www.mdpi.com/2311-5521/7/4/137).
   Viscous amplitude damping rate 2*nu*k² and additional real-world damping mechanisms.
8. [NVIDIA GPU Gems, Effective Water Simulation from Physical Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models).
   Height-field derivatives and normals for water rendering. Used for rendering concepts,
   not as the dynamical solver.

## Verification

Run `node --test scripts/koi-*.test.mjs` and `npm run build`.
The water tests check physical dispersion limits and minimum phase speed,
an analytical damped Fourier mode and inverse FFT reconstruction, a calm pond,
splash symmetry and zero mean, energy decay, trailing wake energy, 30/60/120 Hz
agreement, pointer reentry, and reduced-motion amplitude scaling.

Local Chromium checks exercised desktop mouse wakes/coasting, click feeding,
mobile taps at device scale factor 2, and reduced motion with no browser
exceptions. At 1440×900, the instrumented local run averaged approximately 7 ms
for wave updates and 1.2 ms for refraction; these are development-machine
measurements, not a guarantee for other hardware. Screenshots were inspected
at desktop and mobile sizes and the lighting adjusted for visibility.
