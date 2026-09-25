"use client";

import * as React from "react";
import { PlusIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkEnrollDialog, SingleEnrollDialog } from "@/components/enrollments/enroll-dialog";

export function EnrollmentActions({ openBulk }: { openBulk: boolean }) {
  const [single, setSingle] = React.useState(false);
  const [bulk, setBulk] = React.useState(openBulk);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setBulk(true)}>
        <UsersIcon /> Bulk enroll
      </Button>
      <Button size="sm" onClick={() => setSingle(true)}>
        <PlusIcon /> New enrollment
      </Button>
      <SingleEnrollDialog open={single} onOpenChange={setSingle} />
      <BulkEnrollDialog open={bulk} onOpenChange={setBulk} />
    </>
  );
}
