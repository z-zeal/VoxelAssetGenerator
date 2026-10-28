/**
 * Display maths for the review gallery.
 *
 * Kept out of the HTML so it can be tested in Node. The gallery has shipped two
 * display bugs of the same kind — the picture was right and the *presentation*
 * was wrong:
 *
 *   1. `image-rendering: pixelated` at an integer scale, so every runtime pixel
 *      became an 8×8 block and the vehicle vanished into a grid.
 *   2. plain CSS magnification of a 60-pixel-wide runtime sheet: the browser's
 *      bilinear filter turned a rotated turret into frosted glass.
 *
 * Both came from the same root cause — the live composite had far too few
 * pixels, and the page was papering over it. The baker now also writes review
 * sheets at `hiSheetScale` (4× by default), so there are four times as many
 * pixels before the browser gets involved.
 *
 * Scales here are in **source** (sheet) pixels, because that is the unit the
 * user can actually see: 1× means one sheet pixel per CSS pixel. The runtime
 * equivalent is reported alongside.
 */

/**
 * Auto-fit stops here: at most this many CSS pixels per *runtime* pixel, which
 * works out to one CSS pixel per design voxel (8 design voxels per runtime
 * pixel). Past it, stretching adds blur and no information.
 *
 * The cap is expressed in runtime pixels rather than sheet pixels on purpose.
 * A review sheet set is 4× finer than the runtime sheets, so a cap in source
 * pixels would either shrink the picture when the hi set loads (and the sprite
 * would jump on load) or blow the runtime fallback up. In runtime pixels both
 * sets land on the same on-screen size — the hi set just gets there with a
 * quarter of the magnification.
 */
export const AUTO_CSS_PER_RUNTIME = 8;

/**
 * @param {object} o
 * @param {number} o.cw  composite width in source pixels
 * @param {number} o.ch  composite height in source pixels
 * @param {number} o.stageW  stage width in CSS pixels
 * @param {number} o.stageH  stage height in CSS pixels
 * @param {number} o.zoom  requested CSS px per source pixel, 0 = fit
 * @param {boolean} o.crisp  snap to whole CSS pixels per source pixel
 * @param {number} o.srcScale  source pixels per runtime pixel (1 or hiSheetScale)
 */
export function computeLayout({ cw, ch, stageW, stageH, zoom, crisp = false, srcScale = 1 }) {
  const availW = Math.max(160, stageW - 48);
  const availH = Math.max(160, stageH - 48);

  // 1:1 that exactly fills the stage, and the automatic default.
  const fitCss = Math.min(availW / cw, availH / ch);
  const capCss = AUTO_CSS_PER_RUNTIME / srcScale;
  const auto = Math.min(fitCss, capCss);

  // Pinned scale: the preset is an exact multiple of a source pixel, still
  // clamped to the stage so a preset can never crop the sprite.
  let css = zoom > 0 ? Math.min(zoom, fitCss) : auto;
  if (crisp) css = Math.max(1, Math.floor(css + 1e-6));
  css = Math.max(css, 1 / 8);              // never shrink a sheet below 1/8 px

  return {
    cssW: Math.round(cw * css * 100) / 100,
    cssH: Math.round(ch * css * 100) / 100,
    css,
    // Everything the reviewer might want to quote, in both units.
    source: Math.round(css * 10) / 10,
    runtime: Math.round(css * srcScale * 10) / 10,
    fitCss: Math.round(fitCss * 10) / 10,
    auto: Math.round(auto * 10) / 10,
    pinned: zoom > 0,
  };
}

/**
 * Which sheet set a composite should use.
 *
 * All-or-nothing on purpose: mixing 1× and 4× sheets inside one composite is
 * possible, but then every number in the HUD is approximate and the fallback
 * stops being honest about what it is showing.
 */
export function pickSheetSet(manifest, partNames) {
  const hi = manifest?.hiSheetScale ?? 0;
  if (!hi) return { scale: 1, hi: false };
  for (const name of partNames) {
    const part = manifest.parts?.[name];
    if (!part) return { scale: 1, hi: false };
    for (const facing of Object.values(part.facings ?? {})) {
      if (!facing?.filesHi) return { scale: 1, hi: false };
    }
  }
  return { scale: hi, hi: true };
}
