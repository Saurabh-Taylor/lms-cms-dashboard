import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emailTemplates } from "@/lib/db/schema";
import { ok } from "@/lib/api/helpers";

export async function GET() {
  const rows = await db.select().from(emailTemplates).orderBy(asc(emailTemplates.name));
  return ok({ data: rows });
}
