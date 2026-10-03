import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { AwardIcon, BadgeCheckIcon, ShieldAlertIcon } from "lucide-react";
import { fetchVerification, verifyUrlFor } from "./cert-data";
import { ShareBar } from "./share-bar";

type Props = { params: Promise<{ serial: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serial } = await params;
  const cert = await fetchVerification(serial);
  if (!cert) return { title: "Certificate not found" };
  const title = `${cert.learnerName} — ${cert.courseTitle}`;
  const description =
    cert.status === "revoked"
      ? `This certificate for ${cert.courseTitle} was revoked by Microshala.`
      : `${cert.learnerName} completed ${cert.courseTitle} on Microshala — verify this credential at ${verifyUrlFor(cert.serial)}`;
  return {
    title: `${title} | Microshala Certificate`,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: verifyUrlFor(cert.serial),
    },
  };
}

export default async function VerifyCertificatePage({ params }: Props) {
  const { serial } = await params;
  const cert = await fetchVerification(serial);
  if (!cert) return notFound();

  const verifyUrl = verifyUrlFor(cert.serial);
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 160 });
  const revoked = cert.status === "revoked";
  const issued = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* page chrome — never prints */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {revoked ? (
            <>
              <ShieldAlertIcon className="size-4 text-destructive" />
              This certificate was revoked by the issuer
            </>
          ) : (
            <>
              <BadgeCheckIcon className="size-4 text-emerald-600" />
              Verified credential — issued by Microshala
            </>
          )}
        </div>
        <ShareBar cert={cert} verifyUrl={verifyUrl} />
      </div>

      {revoked && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-center text-sm font-semibold uppercase tracking-widest text-destructive print:border-destructive">
          Revoked — no longer valid
        </div>
      )}

      {/* The certificate — ornamental document; the printed page IS the artifact */}
      <div
        className={`rounded-sm border-[6px] border-double bg-card p-2 shadow-lg print:border-4 print:shadow-none ${
          revoked ? "border-muted-foreground/40 print:opacity-90" : "border-primary/60"
        }`}
      >
        <div
          className={`flex flex-col items-center gap-6 border px-8 py-14 text-center ${
            revoked ? "border-muted-foreground/30" : "border-primary/40"
          }`}
        >
          <AwardIcon className={`size-12 ${revoked ? "text-muted-foreground" : "text-primary"}`} />
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Microshala · Certificate of Completion
          </p>
          <p className="font-serif text-4xl font-semibold sm:text-5xl">{cert.learnerName}</p>
          <p className="text-sm text-muted-foreground">has successfully completed</p>
          <p className="text-2xl font-medium">{cert.courseTitle}</p>
          <p className="text-xs text-muted-foreground">{issued}</p>
          <div className="mt-6 flex w-full items-end justify-between text-left">
            <div>
              <p className="w-40 border-t pt-1 text-xs">Microshala</p>
              <p className="text-xs text-muted-foreground">Issuer</p>
            </div>
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code linking to certificate verification" className="mx-auto size-14" />
              <p className="mt-1 text-[10px] text-muted-foreground">Scan to verify</p>
            </div>
            <div className="text-right">
              <p className="w-40 border-t pt-1 font-mono text-[10px]">{cert.serial.split(".")[0]}</p>
              <p className="text-xs text-muted-foreground">Credential ID</p>
            </div>
          </div>
        </div>
      </div>

      {/* serial + verify URL — muted footer strip */}
      <div className="mt-4 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="min-w-0">
          <p className="font-mono break-all">{cert.serial}</p>
          <p className="break-all">{verifyUrl.replace(/^https?:\/\//, "")}</p>
        </div>
        {!revoked && <BadgeCheckIcon className="size-5 shrink-0 text-emerald-600 print:hidden" />}
      </div>
    </div>
  );
}
