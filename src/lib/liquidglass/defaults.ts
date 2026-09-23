/**
 * Default configuration values for the liquid glass effect.
 * These can be overridden per-element via dataset.config (JSON string)
 * or globally via LiquidGlass.init({ defaults: { ... } }).
 */

/** Per-element glass configuration. */
export interface GlassConfig {
	/** Background blur strength (0 = sharp, 1 = maximum blur). */
	blurAmount: number;
	/** Refraction strength — how much the glass bends the image behind it */
	refraction: number;
	/** Chromatic aberration — color fringing at edges */
	chromAberration: number;
	/** Edge highlight intensity (inner glow / rim lighting) */
	edgeHighlight: number;
	/** Specular highlight intensity (Blinn-Phong) */
	specular: number;
	/** Fresnel reflection intensity at grazing angles */
	fresnel: number;
	/** Micro-distortion noise strength */
	distortion: number;
	/** Corner radius in CSS pixels */
	cornerRadius: number;
	/** Z-radius (bevel depth) — controls the curvature of the pill bevel */
	zRadius: number;
	/** Overall opacity of the glass panel */
	opacity: number;
	/** Saturation adjustment (-1 = desaturated, 0 = normal, 1 = vivid) */
	saturation: number;
	/** Tint strength — cool blue-ish glass tint */
	tintStrength: number;
	/** Brightness adjustment (-0.5 to 0.5) */
	brightness: number;
	/** Shadow opacity (0 = no shadow, 1 = full black) */
	shadowOpacity: number;
	/** Shadow spread in CSS pixels */
	shadowSpread: number;
	/** Shadow vertical offset in CSS pixels */
	shadowOffsetY: number;
	/** Whether this glass element can be dragged around (Pointer Events) */
	floating: boolean;
	/** Whether this glass element behaves as a button (hover lift + press effect) */
	button: boolean;
	/**
	 * Bevel mode: 0 = biconvex pill (half-circle cross-section, default),
	 * 1 = dome (flat bottom, quarter-circle top — use with cornerRadius = zRadius
	 * for a perfect half-sphere magnifier effect).
	 */
	bevelMode: number;
	/**
	 * Water-edge wobble amplitude in CSS pixels (0 = classic static
	 * rounded rect). Small values (4-8) read as living water;
	 * keep well below content padding so text never clips.
	 */
	flowAmp: number;
	/** Water-edge animation speed multiplier. */
	flowSpeed: number;
	/** Per-element phase offset for the water edge (vary between glasses). */
	flowSeed: number;
	/**
	 * Mouse dent strength in CSS pixels (0 = off). Carves a hollow
	 * in the glass edge where the pointer passes.
	 */
	mouseAmp: number;
}

export const DEFAULTS: GlassConfig = {
	blurAmount: 0.00,
	refraction: 0.69,
	chromAberration: 0.05,
	edgeHighlight: 0.05,
	specular: 0.00,
	fresnel: 1.00,
	distortion: 0.00,
	cornerRadius: 65,
	zRadius: 40,
	opacity: 1.00,
	saturation: 0.00,
	tintStrength: 0.00,
	brightness: 0.00,
	shadowOpacity: 0.30,
	shadowSpread: 10,
	shadowOffsetY: 1,
	floating: false,
	button: false,
	bevelMode: 0,
	flowAmp: 6,
	flowSpeed: 1,
	flowSeed: 0,
	mouseAmp: 12,
};

/** Number of Gaussian blur passes (higher = smoother but slower) */
export const BLUR_ITERATIONS = 6;

/** Extra padding around each panel for rendering the drop shadow (px) */
export const SHADOW_PAD = 20;
