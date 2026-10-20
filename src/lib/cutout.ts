/* Knocks the flat studio backdrop out of a product shot in the browser so a
   shirt can hang on the rail as a real cut-out instead of a photo rectangle.
   Only touches shots that actually have a plain backdrop: the four corners
   must agree, and a result that eats nearly everything (or nearly nothing)
   is thrown away and the original photo is used instead. */

const cache = new Map<string, Promise<string | null>>();

const dist = (a: Uint8ClampedArray, i: number, r: number, g: number, b: number) =>
  Math.max(Math.abs(a[i] - r), Math.abs(a[i + 1] - g), Math.abs(a[i + 2] - b));

/** Fully transparent below this colour distance, fully opaque above the second. */
const SOFT_IN = 26;
const SOFT_OUT = 70;

function knockOut(img: HTMLImageElement): string | null {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;
  /* Work at a sane size: a 4000px shoot would cost more than it is worth. */
  const s = Math.min(1, 1200 / Math.max(w, h));
  const cw = Math.round(w * s), ch = Math.round(h * s);
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, cw, ch);

  let data: ImageData;
  try { data = ctx.getImageData(0, 0, cw, ch); } catch { return null; }
  const px = data.data;

  const corner = (x: number, y: number) => {
    const i = (y * cw + x) * 4;
    return [px[i], px[i + 1], px[i + 2]] as const;
  };
  const corners = [corner(2, 2), corner(cw - 3, 2), corner(2, ch - 3), corner(cw - 3, ch - 3)];
  const [r0, g0, b0] = corners[0];
  const plain = corners.every(([r, g, b]) => Math.max(Math.abs(r - r0), Math.abs(g - g0), Math.abs(b - b0)) < 22);
  if (!plain) return null;

  /* Flood from the edges so a white shirt panel in the middle survives. */
  const seen = new Uint8Array(cw * ch);
  const stack: number[] = [];
  for (let x = 0; x < cw; x++) { stack.push(x, x + (ch - 1) * cw); }
  for (let y = 0; y < ch; y++) { stack.push(y * cw, cw - 1 + y * cw); }

  let cleared = 0;
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    const d = dist(px, i, r0, g0, b0);
    if (d >= SOFT_OUT) continue;
    if (d <= SOFT_IN) { px[i + 3] = 0; cleared++; }
    else px[i + 3] = Math.round(((d - SOFT_IN) / (SOFT_OUT - SOFT_IN)) * px[i + 3]);
    const x = p % cw, y = (p / cw) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < cw - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - cw);
    if (y < ch - 1) stack.push(p + cw);
  }

  const share = cleared / (cw * ch);
  if (share < 0.04 || share > 0.93) return null;

  ctx.putImageData(data, 0, 0);
  try { return c.toDataURL("image/png"); } catch { return null; }
}

/** Resolves to a cut-out data URL, or null when the shot is better left alone. */
export function cutout(src: string): Promise<string | null> {
  if (!src || typeof window === "undefined") return Promise.resolve(null);
  const hit = cache.get(src);
  if (hit) return hit;
  const job = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => { try { resolve(knockOut(img)); } catch { resolve(null); } };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  cache.set(src, job);
  return job;
}
