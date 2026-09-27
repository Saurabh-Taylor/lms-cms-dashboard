import { PageHeader } from "@/components/shared/page-header";
import { CatalogBrowser } from "./catalog-browser";

export const metadata = { title: "Catalog · LearnHub" };

export default function CatalogPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Catalog"
        description="Browse published courses and enroll yourself"
      />
      <CatalogBrowser />
    </div>
  );
}
