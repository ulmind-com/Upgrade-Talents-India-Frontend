import { knockOut } from "@/lib/cutout";

/* What a product shot is actually made of: whether it brings its own hanger,
   and how much of the file the garment fills -- a shot with wide empty
   margins would otherwise hang much smaller than its neighbours. Drawing ours
   on top of those gives the piece two hangers, so the rail asks the image
   first: a hook is a narrow spike at the top of the subject, while a hood or
   a collar fills most of the width. Measures only -- the pixels are never
   touched -- and any shot it cannot read keeps the drawn hanger. */

export type Shot = {
  /** The shot already contains a hanger hook of its own. */
  hanger: boolean;
  /** Where the garment starts and how tall it is, as fractions of the file. */
  top: number;
  height: number;
  /** Set when a flat backdrop was lifted off and this copy should be shown. */
  src?: string;
};

const cache = new Map<string, Promise<Shot | null>>();

/** A hook is this slim compared with the garment under it. */
const HOOK_MAX_WIDTH = 0.16;
/** The slice of the subject's height that counts as "the top". */
const TOP_BAND = 0.09;

function look(img: HTMLImageElement): Shot | null {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;
  const s = Math.min(1, 220 / Math.max(w, h));
  const cw = Math.max(8, Math.round(w * s)), ch = Math.max(8, Math.round(h * s));
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, cw, ch);

  let px: Uint8ClampedArray;
  try { px = ctx.getImageData(0, 0, cw, ch).data; } catch { return null; }

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
  if (top < 0 || right <= left) return null;

  const subjectW = right - left + 1;
  const band = Math.max(1, Math.round((bottom - top + 1) * TOP_BAND));
  const widest = Math.max(...rowWidth.slice(top, top + band));
  return {
    hanger: widest / subjectW < HOOK_MAX_WIDTH,
    top: top / ch,
    height: (bottom - top + 1) / ch,
  };
}

/** What the rail needs to know about a product shot before hanging it. */
export function measureShot(src: string): Promise<Shot | null> {
  if (!src || typeof window === "undefined") return Promise.resolve(null);
  const hit = cache.get(src);
  if (hit) return hit;
  const job = new Promise<Shot | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const lifted = knockOut(img);
        if (!lifted) { resolve(look(img)); return; }
        /* Measure the cut-out, not the original: its margins are different. */
        const clean = new Image();
        clean.onload = () => {
          const m = look(clean);
          resolve(m ? { ...m, src: lifted } : { hanger: false, top: 0, height: 1, src: lifted });
        };
        clean.onerror = () => resolve(look(img));
        clean.src = lifted;
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  cache.set(src, job);
  return job;
}
