/* Some product shots come with a hanger already in the picture. Drawing ours
   on top of those gives the piece two hangers, so the rail asks the image
   first: a hook is a narrow spike at the top of the subject, while a hood or
   a collar fills most of the width. Measures only -- the pixels are never
   touched -- and any shot it cannot read keeps the drawn hanger. */

const cache = new Map<string, Promise<boolean>>();

/** A hook is this slim compared with the garment under it. */
const HOOK_MAX_WIDTH = 0.16;
/** The slice of the subject's height that counts as "the top". */
const TOP_BAND = 0.09;

function look(img: HTMLImageElement): boolean {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return false;
  const s = Math.min(1, 220 / Math.max(w, h));
  const cw = Math.max(8, Math.round(w * s)), ch = Math.max(8, Math.round(h * s));
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, cw, ch);

  let px: Uint8ClampedArray;
  try { px = ctx.getImageData(0, 0, cw, ch).data; } catch { return false; }

  /* On a cut-out the subject is simply what is opaque; on a photo it is
     whatever differs from the colour in the corner. */
  const cut = px[3] < 40 && px[(cw - 1) * 4 + 3] < 40;
  const [r0, g0, b0] = [px[0], px[1], px[2]];
  const filled = (i: number) =>
    cut
      ? px[i + 3] > 40
      : px[i + 3] > 40 &&
        Math.max(Math.abs(px[i] - r0), Math.abs(px[i + 1] - g0), Math.abs(px[i + 2] - b0)) > 30;

  let top = -1, bottom = -1, left = cw, right = -1;
  const rowWidth: number[] = [];
  for (let y = 0; y < ch; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < cw; x++) {
      if (filled((y * cw + x) * 4)) { if (lo < 0) lo = x; hi = x; }
    }
    rowWidth.push(lo < 0 ? 0 : hi - lo + 1);
    if (lo >= 0) {
      if (top < 0) top = y;
      bottom = y;
      if (lo < left) left = lo;
      if (hi > right) right = hi;
    }
  }
  if (top < 0 || right <= left) return false;

  const subjectW = right - left + 1;
  const band = Math.max(1, Math.round((bottom - top + 1) * TOP_BAND));
  const widest = Math.max(...rowWidth.slice(top, top + band));
  return widest / subjectW < HOOK_MAX_WIDTH;
}

/** True when the shot already contains a hanger hook of its own. */
export function hasOwnHanger(src: string): Promise<boolean> {
  if (!src || typeof window === "undefined") return Promise.resolve(false);
  const hit = cache.get(src);
  if (hit) return hit;
  const job = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => { try { resolve(look(img)); } catch { resolve(false); } };
    img.onerror = () => resolve(false);
    img.src = src;
  });
  cache.set(src, job);
  return job;
}
