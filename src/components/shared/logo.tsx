import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Central brand wordmark — theme-matched pair from /public/logos.
 * The PNGs ship solid backgrounds: `mix-blend-multiply` drops white on
 * light surfaces, `mix-blend-lighten` drops black on dark ones. If
 * transparent assets arrive later, just remove the blend classes.
 * Caller sizes via `h-N w-auto` in className.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <>
      <Image
        src="/logos/logo-light.png"
        alt="Microshala"
        width={1774}
        height={887}
        priority
        className={cn("w-auto mix-blend-multiply dark:hidden", className)}
      />
      <Image
        src="/logos/logo-dark.png"
        alt="Microshala"
        width={1774}
        height={887}
        priority
        className={cn("hidden w-auto mix-blend-lighten dark:block", className)}
      />
    </>
  );
}
