"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { IMG, DEFAULT_SHOP, inrNote, type ShopItem } from "./content";
import { isStatic } from "./lib/motion";
import { useCart } from "@/components/shop/CartProvider";

export default function ShopGrid({
  items = DEFAULT_SHOP,
}: {
  items?: ShopItem[];
}) {
  const root = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const { add: addToCart } = useCart();

  useEffect(() => {
    if (isStatic() || !head.current) return;
    const st = ScrollTrigger.create({
      trigger: head.current,
      start: "top top+=130",
      end: "bottom top+=40",
      scrub: true,
      onUpdate: (self) => {
        if (head.current) head.current.style.opacity = String(1 - self.progress);
      },
      onRefresh: (self) => {
        if (head.current) head.current.style.opacity = String(1 - self.progress);
      },
    });
    return () => st.kill();
  }, []);

  useEffect(() => {
    if (isStatic() || !root.current) return;
    const tiles = Array.from(root.current.querySelectorAll<HTMLElement>(".sh-tile"));
    if (tiles.length === 0) return;

    const order = tiles.map((_, i) => (i % 4) + Math.floor(i / 4));
    gsap.set(tiles, { opacity: 0, scale: 0.78, y: 40 });

    const play = () =>
      gsap.to(tiles, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.8,
        ease: "back.out(1.5)",
        delay: (i: number) => order[i] * 0.09,
        overwrite: true,
      });

    const out = () =>
      gsap.to(tiles, {
        opacity: 0,
        scale: 0.78,
        y: 40,
        duration: 0.35,
        overwrite: true,
      });

    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 65%",
      end: "bottom 15%",
      onEnter: play,
      onEnterBack: play,
      onLeaveBack: out,
      onLeave: out,
    });

    return () => st.kill();
  }, [items.length]);

  const handleQuickAdd = (e: React.MouseEvent, s: (typeof items)[0]) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(
      {
        productId: s.id || `item-${s.name}`,
        name: s.name,
        price: Number(s.price) || 0,
        image: IMG(s.front),
      },
      1
    );
  };

  return (
    <section ref={root} id="shop" data-nav="light" className="shop">
      <div className="container-x">
        <div ref={head} className="sh-head">
          <div>
            <p className="k-eyebrow">Merchandise Collection</p>
            <h2 className="k-h2">
              The full
              <br />
              drop
            </h2>
          </div>
          <p>Official Upgrade Talents apparel. Hover a tile to preview the reverse print.</p>
        </div>

        <div className="sh-grid">
          {items.map((s, i) => {
            const href = s.realProduct?._id
              ? `/shop/${s.realProduct._id}`
              : s.id
              ? `/shop/${s.id}`
              : "#product";

            return (
              <article key={s.id || i} className="sh-tile">
                <Link href={href} className="block cursor-pointer">
                  <div className="sh-img">
                    <img src={IMG(s.front)} alt={`${s.name}, ${s.sub}`} />
                    {s.back && <img className="b" src={IMG(s.back)} alt="" aria-hidden />}
                  </div>
                  <h3>{s.name}</h3>
                  <p>{s.sub}</p>
                </Link>

                <div
                  className="sh-mrp cursor-pointer"
                  onClick={(e) => handleQuickAdd(e, s)}
                >
                  <span>{inrNote(s.price)}</span>
                  <i title="Add to cart">+</i>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
