"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { OptionItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AsyncCombobox } from "@/components/async-combobox";
import type { EnrollResult } from "@/components/enrollments/enroll-dialog";
import { EllipsisIcon } from "lucide-react";

interface EnrollResultResponse { succeeded: number; results: EnrollResult[] }

export function LearnerActions({ user }: { user: { id: number; name: string; email: string; status: string } }) {
  const qc = useQueryClient();
  const [assignOpen, setAssignOpen] = React.useState(false);

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>Assign course</Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => toast.success(`Password reset sent to ${user.email}`)}>
            Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.status === "suspended" ? (
            <DropdownMenuItem onClick={() => patch.mutate({ status: "active" })}>Reactivate account</DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onClick={() => patch.mutate({ status: "suspended" })}>
              Suspend account
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AssignDialog user={user} open={assignOpen} onOpenChange={setAssignOpen} />
    </div>
  );
}

function AssignDialog({
  user, open, onOpenChange,
}: {
  user: { id: number; name: string };
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [item, setItem] = React.useState<OptionItem | null>(null);
  const assign = useMutation({
    mutationFn: () =>
      api<EnrollResultResponse>("/api/admin/enrollments", { method: "POST", body: JSON.stringify({ userId: user.id, courseId: item!.id }) }),
    onSuccess: (r) => {
      if (r.succeeded) toast.success(`Assigned to ${user.name}`);
      else toast.warning(r.results?.[0]?.reason ?? "Not assigned");
      qc.invalidateQueries();
      onOpenChange(false); setItem(null);
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign course to {user.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <AsyncCombobox
            resource="courses"
            value={item}
            onChange={(v) => setItem(v as OptionItem | null)}
            placeholder="Search courses…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => assign.mutate()} disabled={!item || assign.isPending}>
              {assign.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
