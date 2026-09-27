// Shared domain vocabulary — runtime-leaf module (type-only imports) so
// helpers, domain modules, and routes can all reference it without cycles.
import type { Perm } from "./permissions";

/** Expected domain failure — thrown inside domain ops, mapped by domainFail(). */
export class DomainError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/** Narrow actor contract — SessionUser satisfies it; domain code never imports lib/me. */
export interface Actor {
  id: number;
  name: string;
  email: string;
  permissions: string[];
}

/** Payload-conditional permission check — the 403 that lives inside domain ops. */
export function requireCap(actor: Actor, perm: Perm) {
  if (!actor.permissions.includes(perm)) throw new DomainError(403, "Forbidden");
}
