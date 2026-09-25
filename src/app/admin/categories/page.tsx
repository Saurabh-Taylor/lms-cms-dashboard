import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CategoriesTable, CategoryActions } from "./categories-table";

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Categories" description="Organize courses into categories" actions={<CategoryActions />} />
      <Suspense><CategoriesTable /></Suspense>
    </div>
  );
}
