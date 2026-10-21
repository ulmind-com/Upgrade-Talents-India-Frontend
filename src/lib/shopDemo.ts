export type DemoProduct = {
  _id: string; name: string; category: string; price: number; images: string[];
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  { _id: "d1", name: "Upgrade Talents Oversized Hoodie", category: "Hoodies", price: 2499, images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80"] },
  { _id: "d2", name: "Stage Crew Tee", category: "T-shirts", price: 999, images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"] },
  { _id: "d3", name: "Dancer Snapback Cap", category: "Caps", price: 799, images: ["https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80"] },
  { _id: "d4", name: "Rhythm Tote Bag", category: "Accessories", price: 599, images: ["https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80"] },
  { _id: "d5", name: "Champion Zip Hoodie", category: "Hoodies", price: 2899, images: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80"] },
  { _id: "d6", name: "Performer Joggers", category: "Bottoms", price: 1799, images: ["https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=800&q=80"] },
];
