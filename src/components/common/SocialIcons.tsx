import React from "react";
import {
  SiFacebook,
  SiInstagram,
  SiX,
  SiWhatsapp,
  SiTelegram,
  SiThreads,
  SiGithub,
  SiLeetcode,
  SiYoutube,
} from "react-icons/si";
import { FaLinkedinIn, FaLinkedin } from "react-icons/fa6";

// Alias official LinkedIn glyph as SiLinkedin for strict compatibility with prompt requirement
export const SiLinkedin: React.ComponentType<{ className?: string; size?: number | string; style?: React.CSSProperties }> = FaLinkedinIn;

export {
  SiFacebook,
  SiInstagram,
  SiX,
  SiWhatsapp,
  SiTelegram,
  SiThreads,
  SiGithub,
  SiLeetcode,
  SiYoutube,
  FaLinkedin,
  FaLinkedinIn,
};

export const OFFICIAL_BRAND_ICONS: Record<string, React.ComponentType<any>> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  x: SiX,
  twitter: SiX,
  whatsapp: SiWhatsapp,
  telegram: SiTelegram,
  threads: SiThreads,
  github: SiGithub,
  leetcode: SiLeetcode,
  youtube: SiYoutube,
  linkedin: SiLinkedin,
};

