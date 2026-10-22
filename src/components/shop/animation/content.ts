// Content and dynamic adapter for 3D Animated Clothing Experience

export const IMG = (n: string) => {
  if (!n) return "/images/kerbcode/hoodie-front-cut.webp";
  if (n.startsWith("http") || n.startsWith("/")) return n;
  return `/images/kerbcode/${n}${n === "fabric-macro" ? "" : "-cut"}.webp`;
};

export const PLINTH = "/images/kerbcode/kerb-plinth.png";

export type PieceItem = {
  id: string;
  name: string;
  word: string;
  price: number;
  front: string;
  back: string | null;
  note: string;
  realProduct?: any;
};

export type ShopItem = {
  id: string;
  name: string;
  sub: string;
  price: number;
  front: string;
  back: string | null;
  realProduct?: any;
};

export type AlsoItem = {
  id: string;
  name: string;
  price: number;
  img: string;
  stars: number;
  back: string | null;
  realProduct?: any;
};

export const DEFAULT_PIECES: PieceItem[] = [
  { id: "hoodie", name: "Drop 07 Hoodie", word: "HOODIE", price: 4990, front: "hoodie-front", back: "hoodie-back", note: "480 GSM brushed fleece. Boxy, dropped shoulder." },
  { id: "puffer", name: "Kerb Puffer", word: "PUFFER", price: 8990, front: "puffer-front", back: "puffer-back", note: "Matte shell, wide baffles, high collar." },
  { id: "tee", name: "Heavy Tee", word: "TEE", price: 1990, front: "tee-front", back: "tee-back", note: "260 GSM cotton. Thick rib neck." },
  { id: "cargo", name: "Wide Cargo", word: "CARGO", price: 4490, front: "cargo-front", back: "cargo-back", note: "Cotton twill, deep thigh pockets." },
  { id: "cap", name: "Six-Panel Cap", word: "CAP", price: 1290, front: "cap-front", back: null, note: "Washed twill. One size, curved brim." },
  { id: "socks", name: "Rib Socks", word: "SOCKS", price: 690, front: "socks-front", back: null, note: "Tall rib crew. Two pairs a pack." },
];

export const COLOURWAYS = [
  { id: "ink", name: "Ink", hex: "#141516", img: "hoodie-front" },
  { id: "ember", name: "Ember", hex: "#EC6A2C", img: "hoodie-ember" },
  { id: "chalk", name: "Chalk", hex: "#F6F6F4", img: "hoodie-chalk" },
  { id: "navy", name: "Navy", hex: "#1B2537", img: "hoodie-navy" },
  { id: "teal", name: "Teal", hex: "#2F5A5E", img: "hoodie-teal" },
];

export const SIZES = ["S", "M", "L", "XL"] as const;

export const DEFAULT_NIGHT_SLOTS = [
  { name: "Drop 07 Hoodie", front: "hoodie-front", back: "hoodie-back", flat: "#141516" },
  { name: "Kerb Puffer", front: "puffer-front", back: "puffer-back", flat: "#1a1b1d" },
  { name: "Heavy Tee", front: "tee-front", back: "tee-back", flat: "#15171a" },
  { name: "Wide Cargo", front: "cargo-front", back: "cargo-back", flat: "#3A3C40" },
  { name: "Six-Panel Cap", front: "cap-front", back: null, flat: "#B81F25" },
  { name: "Rib Socks", front: "socks-front", back: null, flat: "#E9EDEF" },
  { name: "Heavy Tee Chalk", front: "tee-chalk", back: "tee-back", flat: "#E9EDEF" },
];

export const DEFAULT_SHOP: ShopItem[] = [
  { id: "s1", name: "Drop 07 Hoodie", sub: "Ink", price: 4990, front: "hoodie-front", back: "hoodie-back" },
  { id: "s2", name: "Kerb Puffer", sub: "Ink", price: 8990, front: "puffer-front", back: "puffer-back" },
  { id: "s3", name: "Heavy Tee", sub: "Ink", price: 1990, front: "tee-front", back: "tee-back" },
  { id: "s4", name: "Wide Cargo", sub: "Charcoal", price: 4490, front: "cargo-front", back: "cargo-back" },
  { id: "s5", name: "Drop 07 Hoodie", sub: "Ember", price: 4990, front: "hoodie-ember", back: null },
  { id: "s6", name: "Drop 07 Hoodie", sub: "Chalk", price: 4990, front: "hoodie-chalk", back: null },
  { id: "s7", name: "Drop 07 Hoodie", sub: "Navy", price: 4990, front: "hoodie-navy", back: null },
  { id: "s8", name: "Drop 07 Hoodie", sub: "Teal", price: 4990, front: "hoodie-teal", back: null },
];

export const DEFAULT_ALSO: AlsoItem[] = [
  { id: "a1", name: "Kerb Puffer", price: 8990, img: "puffer-front", stars: 5, back: "puffer-back" },
  { id: "a2", name: "Heavy Tee", price: 1990, img: "tee-front", stars: 4, back: "tee-back" },
  { id: "a3", name: "Wide Cargo", price: 4490, img: "cargo-front", stars: 5, back: "cargo-back" },
  { id: "a4", name: "Six-Panel Cap", price: 1290, img: "cap-front", stars: 4, back: null },
];

export const LOOKS = [
  {
    name: "Night shift",
    pieces: [
      { id: "hoodie", name: "Drop 07 Hoodie", price: 4990, img: "hoodie-front", look: "-170,-30,-6" },
      { id: "cargo", name: "Wide Cargo", price: 4490, img: "cargo-front", look: "40,30,4" },
      { id: "cap", name: "Six-Panel Cap", price: 1290, img: "cap-front", look: "250,-90,9" },
    ],
  },
  {
    name: "Kerb walk",
    pieces: [
      { id: "puffer", name: "Kerb Puffer", price: 8990, img: "puffer-front", look: "-190,-60,5" },
      { id: "tee", name: "Heavy Tee", price: 1990, img: "tee-front", look: "20,40,-4" },
      { id: "socks", name: "Rib Socks", price: 690, img: "socks-front", look: "230,-70,-8" },
    ],
  },
];

export const FIT = {
  S: { chest: 58, length: 68, sleeve: 62 },
  M: { chest: 61, length: 70, sleeve: 64 },
  L: { chest: 64, length: 72, sleeve: 66 },
  XL: { chest: 67, length: 74, sleeve: 68 },
} as const;

export const PAST = [
  { drop: "Drop 06", name: "Slate Puffer", img: "puffer-front", price: 8490 },
  { drop: "Drop 05", name: "Ember Hoodie", img: "hoodie-ember", price: 4790 },
  { drop: "Drop 05", name: "Chalk Tee", img: "tee-chalk", price: 1890 },
  { drop: "Drop 04", name: "Kerb Cargo", img: "cargo-front", price: 4290 },
  { drop: "Drop 04", name: "Teal Hoodie", img: "hoodie-teal", price: 4790 },
  { drop: "Drop 03", name: "Red Cap", img: "cap-front", price: 1190 },
  { drop: "Drop 03", name: "Navy Hoodie", img: "hoodie-navy", price: 4690 },
  { drop: "Drop 02", name: "Rib Socks", img: "socks-front", price: 590 },
];

export const FABRIC = [
  { id: "weight", label: "480 GSM", sub: "brushed fleece", x: 0.36, y: 0.34, side: "l" },
  { id: "rib", label: "2×2 rib", sub: "cuff + hem", x: 0.78, y: 0.28, side: "r" },
  { id: "stitch", label: "Flatlock", sub: "seams, no bulk", x: 0.52, y: 0.66, side: "r" },
  { id: "hood", label: "Double hood", sub: "lined, drawcords", x: 0.2, y: 0.74, side: "l" },
] as const;

export const DROP_DATE = new Date("2026-12-05T20:00:00+05:30");

export const inrNote = (n: number) => "MRP ₹" + Math.round(n).toLocaleString("en-IN") + " · sample";
export const inrS = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/**
 * Merges API products into the 3D animation structures so that any products added
 * or edited in the admin panel dynamically flow into the lineup, shop grid, etc.
 */
export function getDynamicPieces(apiProducts: any[]): PieceItem[] {
  if (!apiProducts || apiProducts.length === 0) return DEFAULT_PIECES;

  return DEFAULT_PIECES.map((piece, i) => {
    const matched = apiProducts[i];
    if (!matched) return piece;
    return {
      ...piece,
      id: matched._id || matched.id || piece.id,
      name: matched.name || piece.name,
      price: Number(matched.price) || piece.price,
      front: matched.images?.[0] || piece.front,
      back: matched.images?.[1] || piece.back,
      note: matched.description || piece.note,
      realProduct: matched,
    };
  });
}

export function getDynamicShop(apiProducts: any[]): ShopItem[] {
  if (!apiProducts || apiProducts.length === 0) return DEFAULT_SHOP;

  return DEFAULT_SHOP.map((tile, i) => {
    const matched = apiProducts[i % apiProducts.length];
    if (!matched) return tile;
    return {
      ...tile,
      id: matched._id || matched.id || tile.id,
      name: matched.name || tile.name,
      sub: matched.category || tile.sub,
      price: Number(matched.price) || tile.price,
      front: matched.images?.[0] || tile.front,
      back: matched.images?.[1] || tile.back,
      realProduct: matched,
    };
  });
}

export function getDynamicAlso(apiProducts: any[]): AlsoItem[] {
  if (!apiProducts || apiProducts.length === 0) return DEFAULT_ALSO;

  return DEFAULT_ALSO.map((item, i) => {
    const matched = apiProducts[(i + 2) % apiProducts.length];
    if (!matched) return item;
    return {
      ...item,
      id: matched._id || matched.id || item.id,
      name: matched.name || item.name,
      price: Number(matched.price) || item.price,
      img: matched.images?.[0] || item.img,
      back: matched.images?.[1] || item.back,
      realProduct: matched,
    };
  });
}
