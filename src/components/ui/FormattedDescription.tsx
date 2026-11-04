"use client";

import React, { useMemo } from "react";
import { Sparkles, ExternalLink, MessageCircle } from "lucide-react";

interface FormattedDescriptionProps {
  content?: string | null;
  className?: string;
  cardStyle?: boolean;
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
}: FormattedDescriptionProps) {
  const blocks = useMemo(() => {
    if (!content || typeof content !== "string") return [];

    // Normalize newlines
    const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    if (!normalized) return [];

    // Split into paragraphs by 2 or more newlines
    const rawParagraphs = normalized.split(/\n{2,}/);

    return rawParagraphs.map((para) => {
      const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
      return lines;
    });
  }, [content]);

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
        {blocks.map((lines, blockIdx) => {
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
              {lines.map((line, lineIdx) => {
                const trimmed = line.trim();

                // 1. Decorative Divider line
                if (/^[━─—_\-=]{3,}$/.test(trimmed)) {
                  return (
                    <div
                      key={`l-${lineIdx}`}
                      className="my-4 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent"
                    />
                  );
                }

                // 2. High-Impact Callout: Cash Prize / Total Prize Box
                if (
                  (trimmed.includes("TOTAL CASH PRIZE") ||
                    trimmed.includes("CASH PRIZE") ||
                    trimmed.includes("PRIZE POOL")) &&
                  (trimmed.includes("₹") || trimmed.includes("INR") || trimmed.includes("Lakh"))
                ) {
                  return (
                    <div
                      key={`l-${lineIdx}`}
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
                    <div key={`l-${lineIdx}`} className="pt-3 pb-1">
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
                        key={`l-${lineIdx}`}
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
                      key={`l-${lineIdx}`}
                      className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 my-1.5 flex flex-wrap items-baseline gap-2"
                    >
                      {parseInline(trimmed)}
                    </div>
                  );
                }

                // 6. Regular Text Line / Paragraph
                return (
                  <p
                    key={`l-${lineIdx}`}
                    className="leading-relaxed text-neutral-300/95"
                  >
                    {parseInline(trimmed)}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
