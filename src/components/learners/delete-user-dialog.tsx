"use client";

import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

/** Shared delete confirm — owns the DELETE mutation + toast. */
export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onDeleted,
}: {
  user: { id: number; name: string; status?: string } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Extra work after success — e.g. navigate off the detail page. */
  onDeleted?: () => void;
}) {
  // Unclaimed + tombstone rows hard-delete (email freed). Claimed rows
  // soft-delete for audit/enrollment attribution.
  const permanent = ["requested", "rejected", "invited", "deleted"].includes(user?.status ?? "");
  const del = useApiMutation({
    mutationFn: () => api(`/api/admin/users/${user?.id}`, { method: "DELETE" }),
    invalidate: "all",
    successToast: permanent ? "User removed" : "User deleted",
    onSuccess: () => {
      onOpenChange(false);
      onDeleted?.();
    },
  });
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={permanent ? `Remove ${user?.name}?` : `Delete ${user?.name}?`}
      description={
        permanent
          ? "This permanently removes the account row — the email becomes free to request or be invited again. Audit history is kept."
          : "Their sign-in stops immediately and active enrollments are suspended. The account stays for audit history — this cannot be undone from the UI."
      }
      confirmLabel={permanent ? "Remove permanently" : "Delete user"}
      destructive
      loading={del.isPending}
      onConfirm={() => del.mutate()}
    />
  );
}
