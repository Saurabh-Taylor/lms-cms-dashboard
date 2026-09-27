// Users write module — local users mirror auth accounts on the backend.
// ASYNC/SYNC BOUNDARY: provisioning and access-sync calls (apiServer) run
// BEFORE opening the synchronous db transaction — never inside it.
// See lib/admin/lessons.ts for the module contract.
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { auditTx, clientIp } from "@/lib/api/audit";
import { DomainError, requireCap, type Actor } from "@/lib/domain";
import { apiServer } from "@/lib/api-server";
import { ApiError } from "@/lib/api-client";
import { appRoleFor } from "@/lib/session";
import { PERM } from "@/lib/permissions";

const A = {
  invited: (role: string) => `invited ${role}`,
  suspended: "suspended learner",
  reactivated: "reactivated learner",
  updated: "updated user",
} as const;

export const create = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["learner", "instructor", "admin"]).default("learner"),
  title: z.string().max(120).nullish(),
});

export const patch = create
  .omit({ role: true })
  .extend({
    status: z.enum(["active", "suspended", "invited"]),
    role: create.shape.role.optional(),
  })
  .partial();

export type UserCreate = z.infer<typeof create>;
export type UserPatch = z.infer<typeof patch>;

/** External-auth failures surface as domain errors so verb() can map them. */
function asDomain(e: unknown): never {
  if (e instanceof ApiError) throw new DomainError(e.status, e.message);
  throw e;
}

async function createUser(me: Actor, _params: Record<string, never>, input: UserCreate) {
  // Minting an admin is an admin-domain capability — learner:create doesn't grant it.
  if (input.role === "admin") requireCap(me, PERM.adminView);
  const ip = await clientIp();

  const exists = db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).all();
  if (exists.length) throw new DomainError(409, "A user with this email already exists");

  // provision the sign-in-capable account FIRST — a local-only row can never authenticate
  let authUserId: number | null = null;
  let temporaryPassword: string | undefined;
  try {
    const res = await apiServer<{ user: { id: number }; temporaryPassword?: string }>(
      "/api/v1/admin/users",
      {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          name: input.name,
          appRole: appRoleFor(input.role),
          title: input.title,
        }),
      }
    );
    authUserId = res.user.id;
    temporaryPassword = res.temporaryPassword;
  } catch (e) {
    asDomain(e);
  }

  const row = db.transaction((tx) => {
    const [r] = tx
      .insert(users)
      .values({ ...input, authUserId, status: "invited", createdAt: new Date() })
      .returning()
      .all();
    auditTx(tx, me, { action: A.invited(input.role), targetType: "user", targetId: r.id, targetLabel: r.name, module: "users" }, ip);
    return r;
  });
  return { ...row, temporaryPassword };
}

async function updateUser(me: Actor, params: { id: number }, input: UserPatch) {
  // suspending and admin-promotion are separate capabilities, gated next to the op
  if (input.status === "suspended") requireCap(me, PERM.learnerSuspend);
  if (input.role === "admin") requireCap(me, PERM.adminView);
  const ip = await clientIp();

  const [existing] = db.select().from(users).where(eq(users.id, params.id)).all();
  if (!existing) throw new DomainError(404, "User not found");

  // Mirror access changes onto the auth account — async phase, before the tx.
  const access: Record<string, string> = {};
  if (input.status) access.status = input.status;
  if (input.role) access.appRole = appRoleFor(input.role);
  if (Object.keys(access).length) {
    try {
      let authUserId = existing.authUserId;
      if (authUserId == null) {
        // rows that predate the bridge: one email lookup, then self-heal the link
        const dir = await apiServer<{ data: { id: number; email: string }[] }>(
          `/api/v1/admin/users?email=${encodeURIComponent(existing.email)}&pageSize=5`
        );
        const account = dir.data.find((u) => u.email === existing.email);
        if (account) {
          authUserId = account.id;
          db.update(users).set({ authUserId }).where(eq(users.id, existing.id)).run();
        }
      }
      if (authUserId != null)
        await apiServer(`/api/v1/admin/users/${authUserId}`, {
          method: "PATCH",
          body: JSON.stringify(access),
        });
    } catch (e) {
      asDomain(e);
    }
  }

  return db.transaction((tx) => {
    const [row] = tx.update(users).set(input).where(eq(users.id, params.id)).returning().all();
    if (!row) throw new DomainError(404, "User not found");
    const event =
      input.status === "suspended"
        ? { action: A.suspended, targetType: "learner", module: "learners" }
        : input.status === "active"
          ? { action: A.reactivated, targetType: "learner", module: "learners" }
          : { action: A.updated, targetType: "user", module: "learners" };
    auditTx(tx, me, { ...event, targetId: row.id, targetLabel: row.name, details: { changes: input } }, ip);
    return row;
  });
}

export const write = {
  create: { schema: create, run: createUser },
  update: { schema: patch, run: updateUser },
};
