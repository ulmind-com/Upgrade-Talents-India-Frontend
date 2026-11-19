"use client";

import React, { useState, useMemo } from "react";
import { Sparkles, ExternalLink, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FormattedDescriptionProps {
  content?: string | null;
  className?: string;
  cardStyle?: boolean;
  collapsible?: boolean;
}

/**
 * Checks if a line represents the high-impact Prize Pool callout banner.
 */
function isPrizePoolLine(text: string): boolean {
  const upper = text.toUpperCase();
  return (
    (upper.includes("TOTAL CASH PRIZE") ||
      upper.includes("CASH PRIZE") ||
      upper.includes("PRIZE POOL")) &&
    (upper.includes("₹") || upper.includes("INR") || upper.includes("LAKH") || upper.includes("RS"))
  );
}

/**
 * Parses inline WhatsApp / Markdown formatting:
 * *bold* -> <strong>
 * _italic_ -> <em>
 * ~strike~ -> <del>
 * Phone/WhatsApp numbers -> click-to-chat links
 */
function parseInline(text: string): React.ReactNode[] {
  // Tokenize bold, italic, phone numbers, and URLs
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  // Regex to match *bold*, _italic_, ~strike~, URLs, and 10-digit/WA phone numbers
  const inlineRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|_(.*?)_|~([^~]+)~|https?:\/\/[^\s]+|(?:\+?91[\s-]?)?[6-9]\d{9})/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(remaining)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      tokens.push(remaining.substring(lastIndex, match.index));
    }

    const matchedStr = match[0];

    // Bold: **text** or *text*
    if (match[1] && (match[2] || match[3])) {
      const boldContent = match[2] || match[3];
      tokens.push(
        <strong key={`b-${keyIdx++}`} className="font-bold text-white tracking-wide">
          {boldContent}
        </strong>
      );
    }
    // Italic: __text__ or _text_
    else if (match[4] || match[5]) {
      const italicContent = match[4] || match[5];
      tokens.push(
        <em key={`i-${keyIdx++}`} className="italic text-neutral-300">
          {italicContent}
        </em>
      );
    }
    // Strike: ~text~
    else if (match[6]) {
      tokens.push(
        <del key={`d-${keyIdx++}`} className="line-through text-neutral-500">
          {match[6]}
        </del>
      );
    }
    // URLs
    else if (matchedStr.startsWith("http://") || matchedStr.startsWith("https://")) {
      tokens.push(
        <a
          key={`u-${keyIdx++}`}
          href={matchedStr}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline underline-offset-2 break-all"
        >
          {matchedStr}
          <ExternalLink className="size-3 inline-block" />
        </a>
      );
    }
    // Phone / WhatsApp number: 10 digits
    else if (/^\+?[0-9\s-]{10,14}$/.test(matchedStr.trim())) {
      const cleanPhone = matchedStr.replace(/\D/g, "");
      const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      tokens.push(
        <a
          key={`p-${keyIdx++}`}
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
          title="Chat on WhatsApp"
        >
          <MessageCircle className="size-3.5 inline-block text-emerald-400" />
          {matchedStr}
        </a>
      );
    } else {
      tokens.push(matchedStr);
    }

    lastIndex = match.index + matchedStr.length;
  }

  if (lastIndex < remaining.length) {
    tokens.push(remaining.substring(lastIndex));
  }

  return tokens.length > 0 ? tokens : [text];
}

export default function FormattedDescription({
  content,
  className = "",
  cardStyle = true,
  collapsible = false,
}: FormattedDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const blocks = useMemo(() => {
    if (!content || typeof content !== "string") return [];

    // Normalize newlines
    const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    if (!normalized) return [];

    // Split into paragraphs by 2 or more newlines
    const rawParagraphs = normalized.split(/\n{2,}/);

    return rawParagraphs
      .map((para) => {
        const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
        return lines;
      })
      .filter((lines) => lines.length > 0);
  }, [content]);

  // Partition blocks into preview (up to and including Prize Pool) and extended (remaining)
  const { previewBlocks, extendedBlocks, hasMore } = useMemo(() => {
    if (!collapsible || blocks.length === 0) {
      return { previewBlocks: blocks, extendedBlocks: [], hasMore: false };
    }

    let foundPrize = false;
    const prev: string[][] = [];
    const ext: string[][] = [];

    for (let b = 0; b < blocks.length; b++) {
      const lines = blocks[b];
      if (!foundPrize) {
        const prizeLineIdx = lines.findIndex((l) => isPrizePoolLine(l));
        if (prizeLineIdx !== -1) {
          foundPrize = true;
          const headLines = lines.slice(0, prizeLineIdx + 1);
          const tailLines = lines.slice(prizeLineIdx + 1);
          if (headLines.length > 0) prev.push(headLines);
          if (tailLines.length > 0) ext.push(tailLines);
        } else {
          prev.push(lines);
        }
      } else {
        ext.push(lines);
      }
    }

    if (foundPrize) {
      return {
        previewBlocks: prev,
        extendedBlocks: ext,
        hasMore: ext.length > 0,
      };
    }

    // Fallback if no explicit prize pool line:
    // If multiple blocks or long content, collapse after first 2 blocks
    const totalLines = blocks.reduce((acc, b) => acc + b.length, 0);
    const totalChars = blocks.reduce((acc, b) => acc + b.join(" ").length, 0);

    if (blocks.length > 2 || (totalLines > 4 && totalChars > 250)) {
      const splitIdx = Math.min(2, Math.max(1, Math.floor(blocks.length / 2)));
      return {
        previewBlocks: blocks.slice(0, splitIdx),
        extendedBlocks: blocks.slice(splitIdx),
        hasMore: true,
      };
    }

    return { previewBlocks: blocks, extendedBlocks: [], hasMore: false };
  }, [blocks, collapsible]);

  const renderLine = (line: string, lineIdx: number, blockIdx: number) => {
    const trimmed = line.trim();

    // 1. Decorative Divider line
    if (/^[━─—_\-=]{3,}$/.test(trimmed)) {
      return (
        <div
          key={`l-${blockIdx}-${lineIdx}`}
          className="my-4 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />
      );
    }

    // 2. High-Impact Callout: Cash Prize / Total Prize Box
    if (isPrizePoolLine(trimmed)) {
      return (
        <div
          key={`l-${blockIdx}-${lineIdx}`}
          className="my-4 overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent p-4 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg shadow-amber-500/5"
        >
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-lg">
              🏆
            </span>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300/80 block">
                Prize Pool
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-300 tracking-tight">
                {parseInline(trimmed.replace(/[━─—_\-=]/g, "").trim())}
              </span>
            </div>
          </div>
          <span className="inline-flex self-center sm:self-auto items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-200">
            <Sparkles className="size-3 text-amber-300 animate-pulse" /> Guaranteed
          </span>
        </div>
      );
    }

    // 3. Section Subheader: e.g. *COMPETITION CATEGORIES*, *CASH PRIZES*, *MARK YOUR CALENDAR*
    const isHeaderCandidate =
      (trimmed.startsWith("*") && trimmed.endsWith("*") && trimmed.length < 70) ||
      (trimmed.toUpperCase() === trimmed && trimmed.length > 4 && trimmed.length < 60) ||
      /^(?:🏆|🏅|📅|🗓️|📍|🔥|🚨|✨|👑)\s*\*[^*]+\*/.test(trimmed);

    if (isHeaderCandidate) {
      return (
        <div key={`l-${blockIdx}-${lineIdx}`} className="pt-3 pb-1">
          <h4 className="inline-flex items-center gap-2 text-base sm:text-lg font-bold text-white uppercase tracking-wide">
            <span className="size-2 rounded-full bg-amber-400 shrink-0" />
            <span>{parseInline(trimmed)}</span>
          </h4>
        </div>
      );
    }

    // 4. Bullet Points / List Items: e.g. 🔹, •, -, *, 🥇, 🥈, 🥉
    const isListItem =
      /^(?:[•\-*]|\d+\.|\(?[a-zA-Z]\)|[🔹👉✅🏆🥇🥈🥉👑🌟🎭😍🩰💥🎖️🎓🗓️📍📌💳🚨📲📞📱📩📢💃🕺])\s+/.test(
        trimmed
      );

    if (isListItem) {
      // Separate the leading icon/bullet from content
      const bulletMatch = trimmed.match(
        /^([•\-*]|\d+\.|\(?[a-zA-Z]\)|[🔹👉✅🏆🥇🥈🥉👑🌟🎭😍🩰💥🎖️🎓🗓️📍📌💳🚨📲📞📱📩📢💃🕺])\s+(.*)$/
      );

      if (bulletMatch) {
        const bullet = bulletMatch[1];
        const rest = bulletMatch[2];
        return (
          <div
            key={`l-${blockIdx}-${lineIdx}`}
            className="flex items-start gap-3 py-1 text-neutral-200 transition-colors hover:text-white"
          >
            <span className="shrink-0 text-amber-400 font-bold select-none text-base">
              {bullet}
            </span>
            <div className="flex-1 leading-relaxed">
              {parseInline(rest)}
            </div>
          </div>
        );
      }
    }

    // 5. Key-Value Event Meta Line: e.g. *EVENT DATES:* ..., *VENUE:* ...
    const isMetaLine =
      /^\*[A-Z\s&]+:\*\s+/.test(trimmed) ||
      /^[A-Z\s&]{3,25}:\s+/.test(trimmed);

    if (isMetaLine) {
      return (
        <div
          key={`l-${blockIdx}-${lineIdx}`}
          className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 my-1.5 flex flex-wrap items-baseline gap-2"
        >
          {parseInline(trimmed)}
        </div>
      );
    }

    // 6. Regular Text Line / Paragraph
    return (
      <p
        key={`l-${blockIdx}-${lineIdx}`}
        className="leading-relaxed text-neutral-300/95"
      >
        {parseInline(trimmed)}
      </p>
    );
  };

  const renderBlockList = (blockList: string[][], baseIdx = 0) => {
    return blockList.map((lines, relIdx) => {
      const blockIdx = baseIdx + relIdx;
      // Check if this whole block is a divider
      const isFullDivider = lines.every((l) =>
        /^[━─—_\-=*#✨🏆💎💰🔥\s]{4,}$/.test(l)
      );

      if (isFullDivider) {
        return (
          <div
            key={`div-${blockIdx}`}
            className="my-6 flex items-center justify-center gap-3"
          >
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
            <span className="text-amber-400/80 text-xs tracking-widest">✦ ✦ ✦</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          </div>
        );
      }

      return (
        <div key={`b-${blockIdx}`} className="space-y-2">
          {lines.map((line, lineIdx) => renderLine(line, lineIdx, blockIdx))}
        </div>
      );
    });
  };

  if (!blocks.length) return null;

  return (
    <div
      className={`w-full max-w-4xl text-[15px] sm:text-[16px] leading-[1.8] text-neutral-200 font-sans ${
        cardStyle
          ? "rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-8 backdrop-blur-sm shadow-xl"
          : ""
      } ${className}`}
    >
      <div className="space-y-5">
        {renderBlockList(previewBlocks, 0)}

        {hasMore && !isExpanded && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 px-6 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300 shadow-lg shadow-amber-500/10 backdrop-blur-sm transition-all duration-300 hover:border-amber-400 hover:bg-amber-500/30 hover:text-amber-100 hover:scale-[1.02] active:scale-95 group cursor-pointer"
            >
              <span>See More</span>
              <ChevronDown className="size-4 text-amber-400 transition-transform duration-300 group-hover:translate-y-0.5" />
            </button>
          </div>
        )}

        {hasMore && (
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="extended-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden space-y-5 pt-1"
              >
                {renderBlockList(extendedBlocks, previewBlocks.length)}

                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-300 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-amber-400/50 hover:bg-white/10 hover:text-white active:scale-95 group cursor-pointer"
                  >
                    <span>See Less</span>
                    <ChevronUp className="size-4 text-amber-400 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
