"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type { OptionItem, Role, UserRow } from "@/lib/types";
import { useServerTable } from "@/hooks/use-server-table";
import { DataTable } from "@/components/data-table/data-table";
import { SearchInput, TableToolbar } from "@/components/data-table/table-toolbar";
import { FilterSelect } from "@/components/data-table/filter-select";
import { RowActions } from "@/components/data-table/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { DeleteUserDialog } from "@/components/learners/delete-user-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncCombobox } from "@/components/async-combobox";
import { fmtRelative, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ADMIN_APP_ROLES, APP_ROLES, ROLE_LABELS, USER_PERMANENT_DELETE_STATUSES, type AppRole } from "@microshala/contracts";

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Full platform control — admins, users and settings",
  admin: "Manage users, courses and settings",
  content_manager: "Create and publish catalogue content",
  support: "View-only access to assist learners",
  instructor: "Own and deliver courses",
  learner: "Takes courses and tracks progress",
};

const STATUS_OPTS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "invited", label: "Invited" },
  { value: "requested", label: "Requested" },
  { value: "rejected", label: "Rejected" },
  { value: "deleted", label: "Deleted" },
];
const ACTIVITY_OPTS = [
  { value: "7", label: "Active ≤7d" },
  { value: "30", label: "Active ≤30d" },
  { value: "90", label: "Active ≤90d" },
];

/** Roles the actor may grant — super_admin is a super_admin-only grant (backend-enforced). */
const grantableRoles = (meAppRole?: string): readonly AppRole[] =>
  meAppRole === "super_admin" ? APP_ROLES : APP_ROLES.filter((r) => r !== "super_admin");

export function UsersTable({ role, meId, meAppRole }: { role: Role; meId?: number; meAppRole?: string }) {
  const router = useRouter();
  const st = useServerTable<UserRow>("/api/admin/users", [
    "status", "cohortId", "activeWithinDays", "courseId",
  ], { role });
  const [selection, setSelection] = React.useState<RowSelectionState>({});
  const [createOpen, setCreateOpen] = React.useState(false);
  const [assignTarget, setAssignTarget] = React.useState<UserRow | null>(null);
  const [roleTarget, setRoleTarget] = React.useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null);
  const [prevParams, setPrevParams] = React.useState(st.params);
  if (prevParams !== st.params) {
    setPrevParams(st.params);
    setSelection({});
  }

  const cohorts = useQuery({
    queryKey: ["options", "cohorts"],
    queryFn: () => api<OptionItem[]>("/api/admin/options?resource=cohorts"),
    staleTime: 60_000,
    enabled: role === "learner",
  });

  const patch = useApiMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    invalidate: [qk.users],
    successToast: "User updated",
  });

  const sendReset = useApiMutation({
    mutationFn: (u: UserRow) =>
      api(`/api/admin/users/${u.id}/send-password-reset`, { method: "POST" }),
    invalidate: [qk.users],
    successToast: (d, u) => `Password reset sent to ${u.email}`,
  });

  const resendInvite = useApiMutation({
    mutationFn: (u: UserRow) =>
      api(`/api/admin/users/${u.id}/resend-invite`, { method: "POST" }),
    invalidate: [qk.users],
    successToast: (d, u) => `Invite resent to ${u.email}`,
  });

  const approveRequest = useApiMutation({
    mutationFn: (u: UserRow) =>
      api<{ sent: boolean }>(`/api/admin/users/${u.id}/approve-request`, { method: "POST" }),
    invalidate: [qk.users],
    successToast: (d, u) =>
      d.sent ? `${u.name} approved — invite sent` : `${u.name} approved — mail not configured, invite not sent`,
  });

  const rejectRequest = useApiMutation({
    mutationFn: (u: UserRow) =>
      api(`/api/admin/users/${u.id}/reject-request`, { method: "POST" }),
    invalidate: [qk.users],
    successToast: (d, u) => `${u.name} rejected`,
  });

  // Destructure the stable mutate fns — whole-mutation objects are recreated
  // each render, which would make the columns useMemo useless.
  const { mutate: patchUser } = patch;
  const { mutate: sendResetTo } = sendReset;
  const { mutate: resendInviteTo } = resendInvite;
  const { mutate: approveReq } = approveRequest;
  const { mutate: rejectReq } = rejectRequest;

  // force the role filter into every request
  const tableProps = {
    ...st.tableProps,
    data: st.query.data?.data ?? [],
    total: st.query.data?.total ?? 0,
  };

  const columns = React.useMemo<ColumnDef<UserRow, unknown>[]>(
    () => [
      {
        id: "name", accessorKey: "name", header: "Name",
        meta: { sortKey: "name" },
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback className="text-[10px]">{initials(row.original.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Link href={`/admin/learners/${row.original.id}` as never} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                {row.original.name}
              </Link>
              <span className="block truncate text-(length:--fs-meta) leading-4 text-muted-foreground">{row.original.email}</span>
            </div>
          </div>
        ),
      },
      {
        id: "status", accessorKey: "status", header: "Status",
        meta: { sortKey: "status" },
        cell: ({ getValue }) => <StatusBadge value={getValue() as string} />,
      },
      ...(role === "learner"
        ? ([
            {
              id: "enrolledCount", accessorKey: "enrolledCount", header: "Courses",
              meta: { sortKey: "enrolledCount", className: "text-right", headerClassName: "text-right" },
              cell: ({ getValue }: { getValue: () => unknown }) => <span className="tabular-nums">{getValue() as number}</span>,
            },
            {
              id: "avgProgress", accessorKey: "avgProgress", header: "Avg progress",
              meta: { sortKey: "avgProgress", className: "text-right", headerClassName: "text-right" },
              cell: ({ getValue }: { getValue: () => unknown }) => <span className="tabular-nums">{getValue() as number}%</span>,
            },
          ] satisfies ColumnDef<UserRow, unknown>[])
        : ([
            {
              id: "role", accessorKey: "appRole", header: "Role",
              cell: ({ getValue }: { getValue: () => unknown }) => <span className="text-sm">{ROLE_LABELS[getValue() as AppRole] ?? "—"}</span>,
            },
          ] satisfies ColumnDef<UserRow, unknown>[])),
      {
        id: "lastActiveAt", accessorKey: "lastActiveAt", header: "Last active",
        meta: { sortKey: "lastActiveAt" },
        cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtRelative(getValue() as number | null)}</span>,
      },
      {
        id: "createdAt", accessorKey: "createdAt", header: "Joined",
        meta: { sortKey: "createdAt" },
        cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{fmtRelative(getValue() as number)}</span>,
      },
      {
        id: "_actions", enableHiding: false, meta: { className: "w-8" },
        cell: ({ row }) => {
          const u = row.original;
          return (
            <RowActions
              items={
                u.status === "deleted"
                  ? [
                      { label: "View profile", onClick: () => router.push(`/admin/learners/${u.id}` as never) },
                      { label: "Remove permanently…", destructive: true, onClick: () => setDeleteTarget(u) },
                    ]
                  : [
                      { label: "View profile", onClick: () => router.push(`/admin/learners/${u.id}` as never) },
                      ...(role === "learner" ? [{ label: "Assign course…", onClick: () => setAssignTarget(u) }] : []),
                      ...(u.id !== meId && (meAppRole === "super_admin" || u.appRole !== "super_admin")
                        ? [{ label: "Change role…", onClick: () => setRoleTarget(u) }]
                        : []),
                      ...(u.status === "requested"
                        ? [
                            { label: "Approve request", onClick: () => approveReq(u) },
                            { label: "Reject request", destructive: true, onClick: () => rejectReq(u) },
                          ]
                        : u.status === "rejected"
                          ? [{ label: "Approve request", onClick: () => approveReq(u) }]
                          : u.status === "invited"
                            ? [{ label: "Resend invite", onClick: () => resendInviteTo(u) }]
                            : [{ label: "Send password reset", onClick: () => sendResetTo(u) }]),
                      u.status === "suspended"
                        ? { label: "Reactivate", onClick: () => patchUser({ id: u.id, body: { status: "active" } }), separatorAbove: true }
                        : { label: "Suspend", destructive: true, separatorAbove: true, onClick: () => patchUser({ id: u.id, body: { status: "suspended" } }) },
                      {
                        label: (USER_PERMANENT_DELETE_STATUSES as readonly string[]).includes(u.status)
                          ? "Remove permanently…"
                          : "Delete user…",
                        destructive: true,
                        onClick: () => setDeleteTarget(u),
                      },
                    ]
              }
            />
          );
        },
      },
    ],
    [role, meId, meAppRole, router, patchUser, sendResetTo, resendInviteTo, approveReq, rejectReq]
  );

  const selIds = Object.keys(selection).map(Number);

  return (
    <>
      <DataTable
        columns={columns}
        {...tableProps}
        selectable
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        getRowId={(r) => String(r.id)}
        onRowClick={(r) => router.push(`/admin/learners/${r.id}` as never)}
        emptyTitle={`No ${role}s found`}
        emptyDescription={st.q || Object.keys(st.filters).length ? "Try adjusting search or filters." : undefined}
        toolbar={
          <TableToolbar>
            <SearchInput value={st.q} onChange={(v) => st.setFilter({ q: v })} placeholder={`Search ${role}s…`} />
            <FilterSelect value={st.params.status} onChange={(v) => st.setFilter({ status: v })} options={STATUS_OPTS} placeholder="Status" allLabel="All statuses" className="w-36" />
            {role === "learner" && (
              <>
                <FilterSelect
                  value={st.params.cohortId}
                  onChange={(v) => st.setFilter({ cohortId: v })}
                  options={(cohorts.data ?? []).map((c) => ({ value: String(c.id), label: c.label }))}
                  placeholder="Cohort" allLabel="All cohorts" className="w-44"
                />
                <FilterSelect value={st.params.activeWithinDays} onChange={(v) => st.setFilter({ activeWithinDays: v })} options={ACTIVITY_OPTS} placeholder="Activity" allLabel="Any activity" className="w-36" />
              </>
            )}
          </TableToolbar>
        }
        bulkBar={
          <Button size="sm" variant="destructive" onClick={() => {
            for (const id of selIds) patch.mutate({ id, body: { status: "suspended" } });
            setSelection({});
          }}>
            Suspend {selIds.length}
          </Button>
        }
      />

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} role={role} meAppRole={meAppRole} />
      <AssignCourseDialog user={assignTarget} onClose={() => setAssignTarget(null)} />
      <ChangeRoleDialog user={roleTarget} onClose={() => setRoleTarget(null)} meAppRole={meAppRole} />
      <DeleteUserDialog
        user={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      />
    </>
  );
}

export function UsersTableActions({ role, meAppRole }: { role: Role; meAppRole?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon /> Invite {role}
      </Button>
      <CreateUserDialog open={open} onOpenChange={setOpen} role={role} meAppRole={meAppRole} />
    </>
  );
}

/** Shared radio list — used by the invite picker and the change-role dialog. */
function RoleRadioList({ value, onChange, options }: { value: AppRole | undefined; onChange: (r: AppRole) => void; options: readonly AppRole[] }) {
  return (
    <div className="flex flex-col gap-1" role="radiogroup" aria-label="Role">
      {options.map((r) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === r}
          key={r}
          onClick={() => onChange(r)}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors duration-(--duration-fast)",
            value === r ? "border-primary/60 bg-primary/5" : "border-transparent hover:bg-muted",
          )}
        >
          <span className={cn(
            "grid size-4 shrink-0 place-items-center rounded-full border transition-colors duration-(--duration-fast)",
            value === r ? "border-primary" : "border-input",
          )}>
            {value === r && <span className="size-2 rounded-full bg-primary" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium leading-5">{ROLE_LABELS[r]}</span>
            <span className="truncate text-(length:--fs-meta) leading-4 text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function CreateUserDialog({ open, onOpenChange, role, meAppRole }: { open: boolean; onOpenChange: (v: boolean) => void; role: Role; meAppRole?: string }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<AppRole>("admin");
  const staffRoles = grantableRoles(meAppRole).filter((r) => ADMIN_APP_ROLES.has(r));
  const create = useApiMutation({
    mutationFn: () =>
      api<{ sent: boolean }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name, email, role, ...(role === "admin" ? { appRole: inviteRole } : {}) }),
      }),
    invalidate: [qk.users],
    successToast: (d) =>
      d.sent ? `${name} invited` : `${name} invited — mail not configured, no email sent`,
    onSuccess: () => { onOpenChange(false); setName(""); setEmail(""); setInviteRole("admin"); },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Invite {role}</DialogTitle></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="flex flex-col gap-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></div>
          <div className="flex flex-col gap-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {role === "admin" && (
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <RoleRadioList value={inviteRole} onChange={setInviteRole} options={staffRoles} />
            </div>
          )}
          <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
            They&apos;ll get an email with a link to set their own password.
          </p>
          <DialogFooter>
            <Button size="sm" type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" type="submit" disabled={create.isPending}>{create.isPending ? "Inviting…" : "Send invite"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeRoleDialog({ user, onClose, meAppRole }: { user: UserRow | null; onClose: () => void; meAppRole?: string }) {
  const [appRole, setAppRole] = React.useState<AppRole | null>(null);
  const save = useApiMutation({
    mutationFn: () =>
      api(`/api/admin/users/${user!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ appRole }),
      }),
    invalidate: [qk.users],
    successToast: () => `${user!.name} is now ${ROLE_LABELS[appRole!]}`,
    onSuccess: () => { onClose(); setAppRole(null); },
  });
  const current = appRole ?? user?.appRole;
  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Change role for {user?.name}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <RoleRadioList value={current} onChange={setAppRole} options={grantableRoles(meAppRole)} />
          <p className="text-(length:--fs-meta) leading-4 text-muted-foreground">
            Admin-level roles require the admin capability — the API will reject the change otherwise.
          </p>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={!appRole || appRole === user?.appRole || save.isPending}>
              {save.isPending ? "Saving…" : "Save role"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignCourseDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const [course, setCourse] = React.useState<OptionItem | null>(null);
  const assign = useApiMutation({
    mutationFn: () =>
      api<{ succeeded: number; results: { reason?: string }[] }>("/api/admin/enrollments", {
        method: "POST",
        body: JSON.stringify({ userId: user!.id, courseId: course!.id }),
      }),
    invalidate: [qk.enrollments, qk.users],
    onSuccess: (r) => {
      if (r.succeeded) toast.success(`Enrolled ${user!.name}`);
      else toast.warning(r.results?.[0]?.reason ?? "Not enrolled");
      onClose(); setCourse(null);
    },
  });
  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Assign course to {user?.name}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <AsyncCombobox resource="courses" value={course} onChange={(v) => setCourse(v as OptionItem | null)} placeholder="Search courses…" />
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => assign.mutate()} disabled={!course || assign.isPending}>
              {assign.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
