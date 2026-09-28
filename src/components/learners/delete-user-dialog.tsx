"use client";

import { api } from "@/lib/api-client";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

/** Shared soft-delete confirm — owns the DELETE mutation + toast. */
export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onDeleted,
}: {
  user: { id: number; name: string } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Extra work after success — e.g. navigate off the detail page. */
  onDeleted?: () => void;
}) {
  const del = useApiMutation({
    mutationFn: () => api(`/api/admin/users/${user?.id}`, { method: "DELETE" }),
    invalidate: "all",
    successToast: "User deleted",
    onSuccess: () => {
      onOpenChange(false);
      onDeleted?.();
    },
  });
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${user?.name}?`}
      description="Their sign-in stops immediately and active enrollments are suspended. The account stays for audit history — this cannot be undone from the UI."
      confirmLabel="Delete user"
      destructive
      loading={del.isPending}
      onConfirm={() => del.mutate()}
    />
  );
}
