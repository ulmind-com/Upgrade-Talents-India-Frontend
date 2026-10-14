"use client";

/** Flowing ribbon lines that sweep across the stage backdrop. */
export default function StageRibbons({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="var(--stage-ribbon)" strokeWidth="1.6" fill="none" opacity="1">
        {/* top-left sweeping bundle */}
        <path d="M-80 70C180 -10 430 40 560 150 690 260 640 350 470 372 300 394 150 330 60 250" />
        <path d="M-80 108C190 24 450 72 584 186 718 300 660 392 474 414 288 436 136 368 44 282" />
        <path d="M-80 146C200 58 470 104 608 222 746 340 680 434 478 456 276 478 122 406 28 314" />
        <path d="M-90 190C210 96 492 140 634 262 776 384 702 480 484 500 266 520 108 442 12 348" />

        {/* left vertical drape */}
        <path d="M120 900C70 740 92 560 180 420 268 280 300 150 250 20" />
        <path d="M172 900C116 742 140 556 232 414 324 272 356 140 300 8" />
        <path d="M228 900C168 744 192 552 288 408 384 264 414 130 354 -4" />
        <path d="M292 900C228 746 250 548 350 402 450 256 478 120 414 -16" />

        {/* bottom-left swirl */}
        <path d="M-80 720C120 640 300 660 392 760 484 860 420 930 280 934" />
        <path d="M-80 764C132 678 322 700 420 806 518 912 448 984 296 988" />
        <path d="M-80 808C146 716 346 740 450 852 554 964 478 1040 314 1044" />

        {/* right-side arcs */}
        <path d="M1520 30C1300 90 1180 220 1206 360 1232 500 1380 560 1520 540" />
        <path d="M1520 76C1282 140 1152 280 1180 428 1208 576 1368 638 1520 616" />
        <path d="M1520 660C1370 700 1268 790 1288 880 1300 936 1380 966 1460 960" />

        {/* long centre threads */}
        <path d="M-60 420C260 330 620 356 880 470 1140 584 1320 640 1520 606" opacity="0.55" />
        <path d="M-60 470C280 376 650 404 912 522 1174 640 1340 694 1520 658" opacity="0.45" />
      </g>
    </svg>
  );
}
