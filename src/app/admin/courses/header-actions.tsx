"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseFormDialog } from "@/components/courses/course-form-dialog";

export function CoursesHeaderActions() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon /> New course
      </Button>
      <CourseFormDialog open={open} onOpenChange={setOpen} onCreated={(id) => router.push(`/admin/courses/${id}` as never)} />
    </>
  );
}
