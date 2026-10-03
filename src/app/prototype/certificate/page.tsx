// PROTOTYPE route — throwaway cert-page variants for #102.
// Three takes on the public/printable/shareable certificate surface,
// switchable via ?variant=A|B|C. Mock data only; no API calls.

import { Suspense } from "react";
import { VariantA, VariantB, VariantC } from "./variants";
import { PrototypeSwitcher } from "./switcher";

const VARIANTS = [
  { key: "A", name: "Diploma — page is the cert" },
  { key: "B", name: "Credential panel — Credly-style" },
  { key: "C", name: "Verify-first — proof, not art" },
];

export default async function PrototypeCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant = "A" } = await searchParams;

  return (
    <div className="min-h-screen bg-background">
      {variant === "B" ? <VariantB /> : variant === "C" ? <VariantC /> : <VariantA />}
      <Suspense>
        <PrototypeSwitcher variants={VARIANTS} current={variant} />
      </Suspense>
    </div>
  );
}
