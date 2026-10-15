import type { Metadata } from "next";
import CertificateVerify from "@/components/events/CertificateVerify";

export const metadata: Metadata = {
  title: "Verify Certificate",
  description: "Confirm the authenticity of an Upgrade Talents certificate.",
};

export default async function VerifyTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CertificateVerify initialToken={decodeURIComponent(token)} />;
}
