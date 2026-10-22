"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { IMG, COLOURWAYS, SIZES, DEFAULT_ALSO, inrS, type AlsoItem } from "./content";
import { isStatic, tick } from "./lib/motion";
import { useCart } from "@/components/shop/CartProvider";

const ACC = [
  [
    "Details",
    "480 GSM brushed cotton fleece, boxy fit, dropped shoulders, double-layer hood, flat drawcords, kangaroo pocket, 2×2 rib cuffs and hem.",
  ],
  ["Care", "Wash cold, inside out. Hang dry. Do not tumble dry the rib."],
  ["Delivery", "Ships in 3–5 working days after the drop opens. Free shipping across India."],
];

export default function Product({
  alsoItems = DEFAULT_ALSO,
  mainProduct,
}: {
  alsoItems?: AlsoItem[];
  mainProduct?: any;
}) {
  const root = useRef<HTMLElement>(null);
  const [ci, setCi] = useState(0);
  const [size, setSize] = useState(1);
  const [fav, setFav] = useState(false);
  const [open, setOpen] = useState(0);
  const [added, setAdded] = useState(false);
  const imgA = useRef<HTMLImageElement>(null);
  const imgB = useRef<HTMLImageElement>(null);
  const front = useRef<"a" | "b">("a");
  const cur = useRef(0);
  const mesh = useRef<HTMLDivElement>(null);
  const chipHl = useRef<HTMLSpanElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const heart = useRef<HTMLButtonElement>(null);

  const { add: addToCart } = useCart();

  useEffect(() => {
    if (isStatic() || !root.current) return;
    const groups = root.current.querySelectorAll<HTMLElement>("[data-grp]");
    gsap.set(groups, { y: 50, opacity: 0, filter: "blur(10px)" });

    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 62%",
      end: "bottom top",
      onToggle: (s) => {
        gsap.to(groups, s.isActive
          ? { y: 0, opacity: 1, filter: "blur(0px)", duration: 1, ease: "power3.out", stagger: 0.12, overwrite: true }
          : { y: 50, opacity: 0, filter: "blur(10px)", duration: 0.5, overwrite: true, stagger: 0.03 }
        );
      },
    });

    return () => st.kill();
  }, []);

  useEffect(() => {
    if (imgB.current) gsap.set(imgB.current, { xPercent: 100 });
  }, []);

  useEffect(() => {
    if (isStatic() || !mesh.current) return;
    const el = mesh.current;
    return tick((_, t) => {
      el.style.backgroundPosition = `${t * 6}px ${t * 4}px, ${t * 6}px ${t * 4}px`;
    });
  }, []);

  const swap = (i: number) => {
    if (i === cur.current) return;
    const from = front.current === "a" ? imgA.current : imgB.current;
    const to = front.current === "a" ? imgB.current : imgA.current;
    if (!from || !to) return;

    front.current = front.current === "a" ? "b" : "a";
    const dir = i > cur.current ? 1 : -1;
    cur.current = i;
    setCi(i);
    to.src = IMG(COLOURWAYS[i].img);

    if (isStatic()) {
      gsap.set(to, { xPercent: 0, opacity: 1 });
      gsap.set(from, { xPercent: 100, opacity: 0 });
      return;
    }

    gsap.killTweensOf([from, to]);
    gsap.fromTo(to, { xPercent: 100 * dir, opacity: 1 }, { xPercent: 0, duration: 0.7, ease: "power4.inOut" });
    gsap.fromTo(from, { xPercent: 0 }, { xPercent: -100 * dir, duration: 0.7, ease: "power4.inOut" });
  };

  const placeHl = (i: number) => {
    if (!chips.current || !chipHl.current) return;
    const c = chips.current.children[i + 1] as HTMLElement;
    if (c) {
      gsap.to(chipHl.current, {
        x: c.offsetLeft,
        width: c.offsetWidth,
        duration: isStatic() ? 0 : 0.45,
        ease: "power3.out",
      });
    }
  };

  useEffect(() => {
    placeHl(size);
  }, [size]);

  const pop = () => {
    setFav((v) => !v);
    if (!isStatic() && heart.current) {
      gsap.fromTo(heart.current, { scale: 0.5 }, { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.4)" });
    }
  };

  const handleAdd = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);

    // Add to actual store cart
    const prodId = mainProduct?._id || mainProduct?.id || "hoodie-07";
    const prodName = mainProduct?.name || `Drop 07 Hoodie (${COLOURWAYS[ci].name}, ${SIZES[size]})`;
    const prodPrice = Number(mainProduct?.price) || 4990;
    const prodImg = IMG(COLOURWAYS[ci].img);

    addToCart(
      {
        productId: prodId,
        name: prodName,
        price: prodPrice,
        image: prodImg,
      },
      1
    );

    // Animate token to bag if available
    const bag = document.querySelector<HTMLElement>("[data-bag]");
    if (isStatic() || !bag || !btn.current) return;

    const a = btn.current.getBoundingClientRect();
    const b = bag.getBoundingClientRect();
    const tok = document.createElement("div");
    tok.className = "k-token";
    Object.assign(tok.style, {
      left: `${a.left + a.width / 2 - 14}px`,
      top: `${a.top + a.height / 2 - 14}px`,
    });
    document.body.appendChild(tok);

    gsap.timeline({
      onComplete: () => {
        tok.remove();
      },
    })
      .to(tok, { y: -60, scale: 1.25, duration: 0.3, ease: "power2.out" })
      .to(tok, {
        x: b.left + b.width / 2 - 14 - (a.left + a.width / 2 - 14),
        y: b.top + b.height / 2 - 14 - (a.top + a.height / 2 - 14),
        scale: 0.5,
        duration: 0.8,
        ease: "power3.in",
      });
  };

  const price = Number(mainProduct?.price) || 4990;
  const title = mainProduct?.name || "Drop 07\nHoodie";

  return (
    <section ref={root} id="product" data-nav="light" className="product">
      <div ref={mesh} className="pd-mesh" aria-hidden />
      <div className="container-x pd-in">
        <div className="pd-cols">
          <div className="pd-left">
            <p className="k-eyebrow" data-grp>
              Drop 07 · Hoodie
            </p>
            <h2 className="k-h2" data-grp style={{ whiteSpace: "pre-line" }}>
              {title}
            </h2>
            <div className="pd-price" data-grp>
              <b>{inrS(price)}</b>
              <em>MRP</em>
            </div>
            <div className="pd-acc" data-grp>
              {ACC.map(([t, b], i) => (
                <div key={t} className={`pd-acc-i ${open === i ? "on" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setOpen(open === i ? -1 : i)}
                    aria-expanded={open === i}
                  >
                    {t}
                    <i />
                  </button>
                  <div className="pd-acc-b">
                    <p>{b}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pd-mid" data-grp>
            <div className="pd-stage">
              <img
                ref={imgA}
                src={IMG(COLOURWAYS[0].img)}
                alt={`Drop 07 hoodie in ${COLOURWAYS[ci].name}`}
              />
              <img ref={imgB} src={IMG(COLOURWAYS[0].img)} alt="" aria-hidden />
              <span className="pd-stage-tag">{COLOURWAYS[ci].name}</span>
            </div>
          </div>

          <div className="pd-right">
            <p className="k-eyebrow" data-grp>
              Colour — {COLOURWAYS[ci].name}
            </p>
            <div className="pd-dots" data-grp>
              {COLOURWAYS.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className={i === ci ? "on" : ""}
                  style={{ ["--c" as string]: c.hex }}
                  aria-label={c.name}
                  onClick={() => swap(i)}
                />
              ))}
            </div>

            <p className="k-eyebrow" data-grp>
              Size — {SIZES[size]}
            </p>
            <div ref={chips} className="pd-chips" data-grp>
              <span ref={chipHl} className="pd-chip-hl" />
              {SIZES.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  className={i === size ? "on" : ""}
                  onClick={() => setSize(i)}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="pd-buy" data-grp>
              <button
                ref={btn}
                type="button"
                className={`pd-add ${added ? "done" : ""}`}
                onClick={handleAdd}
              >
                <span>{added ? "Added to bag ✓" : "Add to cart"}</span>
              </button>
              <button
                ref={heart}
                type="button"
                className={`pd-fav ${fav ? "on" : ""}`}
                onClick={pop}
                aria-pressed={fav}
                aria-label="Favourite"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="pd-also">
          <h3 className="k-h3" data-grp>
            You might also like
          </h3>
          <div className="pd-also-row" data-grp>
            {alsoItems.map((a) => (
              <article key={a.id || a.name} className="pd-card">
                <div className="pd-card-img">
                  <img src={IMG(a.img)} alt={a.name} />
                  {a.back && <img className="b" src={IMG(a.back)} alt="" aria-hidden />}
                </div>
                <h4>{a.name}</h4>
                <p>
                  <span className="stars" aria-label={`${a.stars} of 5`}>
                    {"★".repeat(a.stars)}
                    {"☆".repeat(5 - a.stars)}
                  </span>
                  <b>{inrS(a.price)}</b>
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
