"use client";

// PROTOTYPE — three structurally different public-cert-page takes (#102).
// Question: what does the shareable/printable/verifiable cert surface look like?

import { useState } from "react";
import {
  AwardIcon, BadgeCheckIcon, CopyIcon, CheckIcon, PrinterIcon,
  Share2Icon, AtSignIcon, ShieldCheckIcon, QrCodeIcon,
  ExternalLinkIcon, GraduationCapIcon, ClockIcon, CalendarIcon,
} from "lucide-react";
import { MOCK_CERT, LINKEDIN_SHARE, LINKEDIN_ADD_TO_PROFILE, X_SHARE } from "./mock";

const c = MOCK_CERT;

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(c.verifyUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 h-8 text-xs font-medium hover:bg-accent"
    >
      {copied ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

function ShareRow() {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <a href={LINKEDIN_SHARE} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-[#0A66C2] px-3 h-8 text-xs font-medium text-white hover:opacity-90">
        <Share2Icon className="size-3.5" /> Share on LinkedIn
      </a>
      <a href={LINKEDIN_ADD_TO_PROFILE} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-[#0A66C2] px-3 h-8 text-xs font-medium text-[#0A66C2] hover:bg-[#0A66C2]/10">
        <ExternalLinkIcon className="size-3.5" /> Add to LinkedIn profile
      </a>
      <a href={X_SHARE} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border px-3 h-8 text-xs font-medium hover:bg-accent">
        <AtSignIcon className="size-3.5" /> Post on X
      </a>
      <CopyLinkButton />
      <button onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 rounded-md border px-3 h-8 text-xs font-medium hover:bg-accent">
        <PrinterIcon className="size-3.5" /> Print / Save PDF
      </button>
    </div>
  );
}

function SerialBlock({ muted = false }: { muted?: boolean }) {
  return (
    <div className={muted ? "text-muted-foreground" : ""}>
      <p className="font-mono text-xs break-all">{c.serial}</p>
      <p className="text-xs break-all">{c.verifyUrl.replace("https://", "")}</p>
    </div>
  );
}

/* ---------- Variant A — "Diploma": page IS the certificate ---------- */

export function VariantA() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheckIcon className="size-4 text-emerald-600" />
          Verified credential — issued by Microshala
        </div>
        <ShareRow />
      </div>

      {/* The certificate — ornamental, centered, print-first */}
      <div className="rounded-sm border-[6px] border-double border-primary/60 bg-card p-2 shadow-lg print:border-4 print:shadow-none">
        <div className="flex flex-col items-center gap-6 border border-primary/40 px-8 py-14 text-center">
          <AwardIcon className="size-12 text-primary" />
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Microshala · Certificate of Completion
          </p>
          <p className="font-serif text-4xl font-semibold sm:text-5xl">{c.learnerName}</p>
          <p className="text-sm text-muted-foreground">has successfully completed</p>
          <p className="text-2xl font-medium">{c.courseTitle}</p>
          <div className="mt-2 flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><ClockIcon className="size-3.5" />{c.durationHours} hours</span>
            <span className="flex items-center gap-1"><CalendarIcon className="size-3.5" />{c.issuedAt}</span>
          </div>
          <div className="mt-6 flex w-full items-end justify-between text-left">
            <div>
              <p className="w-40 border-t pt-1 text-xs">{c.instructorName}</p>
              <p className="text-xs text-muted-foreground">Instructor</p>
            </div>
            <div className="text-center">
              <QrCodeIcon className="mx-auto size-14" />
              <p className="mt-1 text-[10px] text-muted-foreground">Scan to verify</p>
            </div>
            <div className="text-right">
              <p className="w-40 border-t pt-1 text-xs">Microshala</p>
              <p className="text-xs text-muted-foreground">Issuer</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <SerialBlock muted />
        <BadgeCheckIcon className="size-5 text-emerald-600 print:hidden" />
      </div>
    </div>
  );
}

/* ---------- Variant B — "Credential panel": Credly-style split ---------- */

export function VariantB() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[380px_1fr]">
      {/* Left rail — everything actionable lives here */}
      <aside className="flex flex-col gap-6 print:hidden">
        <div className="flex items-center gap-2 rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <BadgeCheckIcon className="size-4" /> Verified credential
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-snug">{c.courseTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Awarded to {c.learnerName}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Issued</dt><dd>{c.issuedAt}</dd>
          <dt className="text-muted-foreground">Duration</dt><dd>{c.durationHours} hours</dd>
          <dt className="text-muted-foreground">Instructor</dt><dd>{c.instructorName}</dd>
          <dt className="text-muted-foreground">Issuer</dt><dd>Microshala</dd>
        </dl>
        <div className="flex items-center gap-3 rounded-md border p-3">
          <QrCodeIcon className="size-16 shrink-0" />
          <SerialBlock muted />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Share this credential</p>
          <ShareRow />
        </div>
      </aside>

      {/* Right — the cert artwork as a document preview */}
      <div className="flex items-start justify-center">
        <div className="w-full max-w-3xl rounded-lg border bg-card p-10 shadow-md print:border-0 print:shadow-none">
          <div className="flex flex-col items-center gap-4 text-center">
            <GraduationCapIcon className="size-10 text-primary" />
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Certificate of Completion</p>
            <p className="font-serif text-3xl font-semibold">{c.learnerName}</p>
            <p className="text-lg font-medium">{c.courseTitle}</p>
            <p className="text-sm text-muted-foreground">Microshala · {c.issuedAt}</p>
            <p className="mt-6 font-mono text-[10px] text-muted-foreground">{c.serial}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Variant C — "Verify-first": the page is proof, not art ---------- */

export function VariantC() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Verification banner leads — this is what a recruiter sees first */}
      <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-6 py-8 text-center">
        <BadgeCheckIcon className="size-10 text-emerald-600" />
        <h1 className="text-2xl font-semibold">This credential is verified</h1>
        <p className="text-sm text-muted-foreground">
          Issued by <span className="font-medium text-foreground">Microshala</span> — serial signature checked against the issuer registry.
        </p>
      </div>

      {/* Compact cert preview — click to expand/print */}
      <div className="mt-6 rounded-lg border bg-card p-8 print:border-0">
        <div className="flex flex-col items-center gap-3 text-center">
          <AwardIcon className="size-8 text-primary" />
          <p className="font-serif text-2xl font-semibold">{c.learnerName}</p>
          <p className="font-medium">{c.courseTitle}</p>
          <p className="text-xs text-muted-foreground">{c.issuedAt} · {c.durationHours}h · {c.instructorName}</p>
        </div>
      </div>

      {/* Facts table — serial + verify URL prominent */}
      <dl className="mt-6 divide-y rounded-lg border text-sm">
        {[
          ["Credential ID", <span key="s" className="font-mono text-xs break-all">{c.serial}</span>],
          ["Verify at", <a key="v" href={c.verifyUrl} className="text-xs text-primary underline break-all">{c.verifyUrl}</a>],
          ["Issued to", c.learnerName],
          ["Course", c.courseTitle],
          ["Issued on", c.issuedAt],
          ["Status", <span key="ok" className="text-emerald-600 font-medium">Valid</span>],
        ].map(([k, v]) => (
          <div key={k as string} className="grid grid-cols-[140px_1fr] gap-2 px-4 py-2.5">
            <dt className="text-muted-foreground">{k}</dt><dd>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6"><ShareRow /></div>

      {/* OG-unfurl mock — what LinkedIn renders when this URL is pasted */}
      <div className="mt-10 print:hidden">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Link preview (what LinkedIn shows when you paste the URL)
        </p>
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="flex h-40 items-center justify-center bg-primary/15">
            <div className="flex flex-col items-center gap-2">
              <AwardIcon className="size-10 text-primary" />
              <p className="text-sm font-semibold">{c.learnerName} — {c.courseTitle}</p>
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="text-sm font-medium">Certificate · {c.courseTitle}</p>
            <p className="truncate text-xs text-muted-foreground">microshala.dev</p>
          </div>
        </div>
      </div>
    </div>
  );
}
