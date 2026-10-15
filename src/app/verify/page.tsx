import type { Metadata } from "next";
import CertificateVerify from "@/components/events/CertificateVerify";

export const metadata: Metadata = {
  title: "Verify Certificate",
  description: "Confirm the authenticity of an Upgrade Talents certificate by its ID or QR code.",
};

export default function VerifyPage() {
  return <CertificateVerify />;
}
