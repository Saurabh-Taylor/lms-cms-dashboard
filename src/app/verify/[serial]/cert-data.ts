import { cache } from "react";
import { apiServer } from "@/lib/api-server";
import type { VerifyCertificateResponse } from "@microshala/contracts";

/** React-cached so page, generateMetadata, and opengraph-image share one call. */
export const fetchVerification = cache(
  async (serial: string): Promise<VerifyCertificateResponse | null> => {
    try {
      return await apiServer<VerifyCertificateResponse>(
        `/api/v1/certificates/verify/${encodeURIComponent(serial)}`,
      );
    } catch {
      return null;
    }
  },
);

export const verifyUrlFor = (serial: string) =>
  `${process.env.APP_ORIGIN ?? "http://localhost:3000"}/verify/${serial}`;
