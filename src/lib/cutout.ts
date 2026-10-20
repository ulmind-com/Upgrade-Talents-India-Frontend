/* Lifts a flat studio backdrop off a product shot so the piece can hang on
   the rail instead of inside a pale box.

   It is deliberately timid, because the previous attempt was not: a shot that
   already carries transparency is never touched, a backdrop that is not flat
   is left alone, the tolerance is chosen per shot so a pale garment is never
   eaten, and any result that removes almost nothing or almost everything is
   thrown away. Anything it declines keeps its original file. */

type Mask = Uint8Array;

/** Flood `allowed` from the frame's edge. */
function floodFromEdge(allowed: Mask, w: number, h: number): Mask {
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let n = 0;
  const push = (p: number) => { if (allowed[p] && !seen[p]) { seen[p] = 1; stack[n++] = p; } };
  for (let x = 0; x < w; x++) { push(x); push(x + (h - 1) * w); }
  for (let y = 0; y < h; y++) { push(y * w); push(w - 1 + y * w); }
  while (n > 0) {
    const p = stack[--n];
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * h - w) push(p + w);
  }
  return seen;
}

function draw(img: HTMLImageElement, maxSide: number) {
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(8, Math.round(img.naturalWidth * s));
  const h = Math.max(8, Math.round(img.naturalHeight * s));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  try { return { c, ctx, w, h, data: ctx.getImageData(0, 0, w, h) }; } catch { return null; }
}

/** Distance of every pixel from the backdrop, plus that backdrop's lightness. */
function backdrop(px: Uint8ClampedArray, w: number, h: number) {
  const ring: number[][] = [];
  for (let x = 0; x < w; x += Math.max(1, (w / 40) | 0)) {
    ring.push([px[x * 4], px[x * 4 + 1], px[x * 4 + 2]]);
    const b = ((h - 1) * w + x) * 4;
    ring.push([px[b], px[b + 1], px[b + 2]]);
  }
  for (let y = 0; y < h; y += Math.max(1, (h / 40) | 0)) {
    const l = y * w * 4, r = (y * w + w - 1) * 4;
    ring.push([px[l], px[l + 1], px[l + 2]]);
    ring.push([px[r], px[r + 1], px[r + 2]]);
  }
  const med = (k: number) => {
    const v = ring.map((c) => c[k]).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  return [med(0), med(1), med(2)] as const;
}

const CORNER_SPREAD = 26;
const TOLERANCES = [70, 54, 42, 32, 24, 17];

export function knockOut(img: HTMLImageElement): string | null {
  const probe = draw(img, 200);
  if (!probe) return null;
  const { data: small, w: sw, h: sh } = probe;
  const sp = small.data;

  /* Already a cut-out? Then there is nothing to lift, and touching it is
     exactly how the last attempt ruined good files. */
  const corners = [0, (sw - 1) * 4, (sh - 1) * sw * 4, (sh * sw - 1) * 4];
  if (corners.some((i) => sp[i + 3] < 250)) return null;

  const bg = backdrop(sp, sw, sh);
  const far = corners.some((i) =>
    Math.max(Math.abs(sp[i] - bg[0]), Math.abs(sp[i + 1] - bg[1]), Math.abs(sp[i + 2] - bg[2])) > CORNER_SPREAD
  );
  if (far) return null;   // not a plain backdrop

  const dist = (px: Uint8ClampedArray, i: number) =>
    Math.max(Math.abs(px[i] - bg[0]), Math.abs(px[i + 1] - bg[1]), Math.abs(px[i + 2] - bg[2]));

  /* The widest tolerance that still leaves the middle of the frame standing:
     a white garment on a grey wall needs a much tighter one than a navy tee. */
  let tol = 0;
  const y0 = (sh * 0.33) | 0, y1 = (sh * 0.67) | 0, x0 = (sw * 0.33) | 0, x1 = (sw * 0.67) | 0;
  for (const t of TOLERANCES) {
    const allowed = new Uint8Array(sw * sh);
    for (let p = 0; p < sw * sh; p++) allowed[p] = dist(sp, p * 4) < t ? 1 : 0;
    const gone = floodFromEdge(allowed, sw, sh);
    let inside = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (gone[y * sw + x]) inside++;
    if (inside / Math.max(1, (y1 - y0) * (x1 - x0)) < 0.12) { tol = t; break; }
  }
  if (!tol) return null;

  const full = draw(img, 900);
  if (!full) return null;
  const { c, ctx, w, h, data } = full;
  const px = data.data;
  const total = w * h;

  const allowed = new Uint8Array(total);
  for (let p = 0; p < total; p++) allowed[p] = dist(px, p * 4) < tol ? 1 : 0;
  let gone = floodFromEdge(allowed, w, h);

  /* A hood opening or the gap under a sleeve is enclosed by the garment, so
     the frame's edge cannot reach it: whatever is left unreachable stays. */
  const soft = tol * 0.34;
  let cleared = 0;
  for (let p = 0; p < total; p++) {
    if (!gone[p]) continue;
    const i = p * 4;
    const d = dist(px, i);
    if (d <= soft) { px[i + 3] = 0; cleared++; }
    else px[i + 3] = Math.round(px[i + 3] * ((d - soft) / Math.max(tol - soft, 1)));
  }

  const share = cleared / total;
  if (share < 0.04 || share > 0.93) return null;

  ctx.putImageData(data, 0, 0);
  try { return c.toDataURL("image/png"); } catch { return null; }
}
