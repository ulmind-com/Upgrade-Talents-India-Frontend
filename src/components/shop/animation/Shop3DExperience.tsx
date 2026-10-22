"use client";

import { useMemo } from "react";
import "./animation.css";
import Hero3D from "./Hero3D";
import Lineup from "./Lineup";
import Clock from "./Clock";
import Product from "./Product";
import Print from "./Print";
import Fabric from "./Fabric";
import Night from "./Night";
import ShopGrid from "./ShopGrid";
import Looks from "./Looks";
import Fit from "./Fit";
import Featured from "./Featured";
import Join from "./Join";
import Seam from "./Seam";
import {
  getDynamicPieces,
  getDynamicShop,
  getDynamicAlso,
} from "./content";
import { useTheme } from "@/components/motion/Providers";

export default function Shop3DExperience({
  products = [],
}: {
  products?: any[];
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const pieces = useMemo(() => getDynamicPieces(products), [products]);
  const shopTiles = useMemo(() => getDynamicShop(products), [products]);
  const alsoItems = useMemo(() => getDynamicAlso(products), [products]);
  const mainProduct = products[0] || null;

  // Colors adapted for seamless seam transitions
  const C = useMemo(
    () => ({
      khaki: isDark ? "#222938" : "#A49A74",
      studio: isDark ? "#091124" : "#E1E5EA",
      clock: isDark ? "#0f1d35" : "#D3D9E1",
      sky: isDark ? "#0c1a30" : "#E3EDF9",
      tile: isDark ? "#0f1d38" : "#E8DFD0",
      fabric: isDark ? "#141b27" : "#DDD2BE",
      teal: "#0E3A4C",
      nightEnd: "#07161D",
      snow: isDark ? "#091124" : "#F7F8FA",
      looks: "#0B2530",
      ink: isDark ? "#050a14" : "#0E0F11",
      orange: isDark ? "#ff6a2b" : "#EC6A2C",
    }),
    [isDark]
  );

  return (
    <div className="uti-3d-root">
      <Hero3D />
      <Seam kind="diag" from={C.khaki} />

      <Lineup pieces={pieces} />
      <Seam kind="curve" from={C.studio} />

      <Clock />
      <Seam kind="stairs" from={C.clock} />

      <Product alsoItems={alsoItems} mainProduct={mainProduct} />
      <Seam kind="panel" from={C.sky} />

      <Print />
      <Seam kind="notch" from={C.tile} />

      <Fabric />
      <Seam kind="wash" from={C.fabric} to={C.teal} h={40} />

      <Night />
      <Seam kind="diagR" from={C.nightEnd} />

      <ShopGrid items={shopTiles} />
      <Seam kind="curve" from={C.snow} />

      <Looks />
      <Seam kind="diag" from={C.looks} />

      <Fit />
      <Seam kind="stairs" from={C.studio} />

      <Featured />
      <Seam kind="notch" from={C.ink} />

      <Join />
      <Seam kind="diagR" from={C.orange} />
    </div>
  );
}
