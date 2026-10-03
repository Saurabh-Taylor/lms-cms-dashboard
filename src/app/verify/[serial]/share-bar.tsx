"use client";

import { useState } from "react";
import {
  AtSignIcon, CheckIcon, CopyIcon, ExternalLinkIcon, PrinterIcon, Share2Icon,
} from "lucide-react";

/** Interactive share chrome — everything here is print:hidden. */
export function ShareBar({
  cert,
  verifyUrl,
}: {
  cert: { learnerName: string; courseTitle: string; serial: string; issuedAt: string };
  verifyUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const d = new Date(cert.issuedAt);
  const linkedInShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
  const linkedInAdd =
    `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME` +
    `&name=${encodeURIComponent(cert.courseTitle)}` +
    `&organizationName=Microshala` +
    `&issueYear=${d.getFullYear()}&issueMonth=${d.getMonth() + 1}` +
    `&certUrl=${encodeURIComponent(verifyUrl)}` +
    `&certId=${encodeURIComponent(cert.serial)}`;
  const xShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just completed "${cert.courseTitle}" on Microshala`)}&url=${encodeURIComponent(verifyUrl)}`;

  const btn = "inline-flex items-center gap-1.5 rounded-md border px-3 h-8 text-xs font-medium hover:bg-accent";
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <a href={linkedInShare} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-[#0A66C2] px-3 h-8 text-xs font-medium text-white hover:opacity-90">
        <Share2Icon className="size-3.5" /> Share on LinkedIn
      </a>
      <a href={linkedInAdd} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-[#0A66C2] px-3 h-8 text-xs font-medium text-[#0A66C2] hover:bg-[#0A66C2]/10">
        <ExternalLinkIcon className="size-3.5" /> Add to LinkedIn profile
      </a>
      <a href={xShare} target="_blank" rel="noreferrer" className={btn}>
        <AtSignIcon className="size-3.5" /> Post on X
      </a>
      <button
        onClick={() => { navigator.clipboard.writeText(verifyUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className={btn}
      >
        {copied ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <button onClick={() => window.print()} className={btn}>
        <PrinterIcon className="size-3.5" /> Print / Save PDF
      </button>
    </div>
  );
}
