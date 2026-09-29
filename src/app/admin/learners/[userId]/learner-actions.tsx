"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
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
import { DeleteUserDialog } from "@/components/learners/delete-user-dialog";
import type { EnrollResult } from "@/components/enrollments/enroll-dialog";
import { EllipsisIcon } from "lucide-react";

import { USER_PERMANENT_DELETE_STATUSES, type UserStatus } from "@learnhub/contracts";

interface EnrollResultResponse { succeeded: number; results: EnrollResult[] }

export function LearnerActions({ user }: { user: { id: number; name: string; email: string; status: UserStatus } }) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const deleted = user.status === "deleted";
  const permanent = USER_PERMANENT_DELETE_STATUSES.includes(user.status);

  const patch = useApiMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify(body) }),
    invalidate: "all",
    successToast: "User updated",
  });

  const sendReset = useApiMutation({
    mutationFn: () => api(`/api/admin/users/${user.id}/send-password-reset`, { method: "POST" }),
    successToast: `Password reset sent to ${user.email}`,
  });

  const resendInvite = useApiMutation({
    mutationFn: () => api(`/api/admin/users/${user.id}/resend-invite`, { method: "POST" }),
    successToast: `Invite resent to ${user.email}`,
  });

  const approveRequest = useApiMutation({
    mutationFn: () => api<{ sent: boolean }>(`/api/admin/users/${user.id}/approve-request`, { method: "POST" }),
    invalidate: "all",
    successToast: (d) =>
      d.sent ? `${user.name} approved — invite sent` : `${user.name} approved — mail not configured, invite not sent`,
  });

  const rejectRequest = useApiMutation({
    mutationFn: () => api(`/api/admin/users/${user.id}/reject-request`, { method: "POST" }),
    invalidate: "all",
    successToast: `${user.name} rejected`,
  });

  return (
    <div className="flex items-center gap-2">
      {!deleted && (
        <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>Assign course</Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user.status === "requested" ? (
            <>
              <DropdownMenuItem onClick={() => approveRequest.mutate()}>Approve request</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => rejectRequest.mutate()}>
                Reject request
              </DropdownMenuItem>
            </>
          ) : user.status === "rejected" ? (
            <DropdownMenuItem onClick={() => approveRequest.mutate()}>Approve request</DropdownMenuItem>
          ) : user.status === "invited" ? (
            <DropdownMenuItem onClick={() => resendInvite.mutate()}>Resend invite</DropdownMenuItem>
          ) : !deleted ? (
            <DropdownMenuItem onClick={() => sendReset.mutate()}>Send password reset</DropdownMenuItem>
          ) : null}
          {!deleted && (
            <>
              <DropdownMenuSeparator />
              {user.status === "suspended" ? (
                <DropdownMenuItem onClick={() => patch.mutate({ status: "active" })}>Reactivate account</DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onClick={() => patch.mutate({ status: "suspended" })}>
                  Suspend account
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            {permanent ? "Remove permanently…" : "Delete user…"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AssignDialog user={user} open={assignOpen} onOpenChange={setAssignOpen} />
      <DeleteUserDialog
        user={user}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/admin/learners")}
      />
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
  const [item, setItem] = React.useState<OptionItem | null>(null);
  const assign = useApiMutation({
    mutationFn: () =>
      api<EnrollResultResponse>("/api/admin/enrollments", { method: "POST", body: JSON.stringify({ userId: user.id, courseId: item!.id }) }),
    invalidate: "all",
    onSuccess: (r) => {
      if (r.succeeded) toast.success(`Assigned to ${user.name}`);
      else toast.warning(r.results?.[0]?.reason ?? "Not assigned");
      onOpenChange(false); setItem(null);
    },
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
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={() => assign.mutate()} disabled={!item || assign.isPending}>
              {assign.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
