"use client";

import { useState } from "react";
import {
  AtSignIcon, CheckIcon, CopyIcon, ExternalLinkIcon, PrinterIcon, Share2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * LinkedIn's third-party brand color — deliberately outside the Microshala
 * palette (recognition beats brand-consistent for share CTAs). Centralized so
 * the hex has one home; arbitrary-value syntax keeps it out of the
 * brand-tokens utility scan.
 */
const LI_SOLID = "bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90";
const LI_OUTLINE = "border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]";

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

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button className={LI_SOLID} nativeButton={false} render={<a href={linkedInShare} target="_blank" rel="noreferrer" />}>
        <Share2Icon /> Share on LinkedIn
      </Button>
      <Button variant="outline" className={LI_OUTLINE} nativeButton={false} render={<a href={linkedInAdd} target="_blank" rel="noreferrer" />}>
        <ExternalLinkIcon /> Add to LinkedIn profile
      </Button>
      <Button variant="outline" nativeButton={false} render={<a href={xShare} target="_blank" rel="noreferrer" />}>
        <AtSignIcon /> Post on X
      </Button>
      <Button
        variant="outline"
        onClick={() => { navigator.clipboard.writeText(verifyUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      >
        {copied ? <CheckIcon className="text-emerald-600" /> : <CopyIcon />}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <PrinterIcon /> Print / Save PDF
      </Button>
    </div>
  );
}
