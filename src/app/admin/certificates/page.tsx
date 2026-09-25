import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CertificatesTable, CertificateActions } from "./certificates-table";

export default function CertificatesPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Certificates"
        description="Issued certificates and manual issuance"
        actions={<CertificateActions />}
      />
      <Suspense>
        <CertificatesTable />
      </Suspense>
    </div>
  );
}
