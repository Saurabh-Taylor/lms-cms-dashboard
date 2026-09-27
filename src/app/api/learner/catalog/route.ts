import { listOk } from "@/lib/api/helpers";
import { requireLearner } from "@/lib/me";
import { listCatalog } from "@/lib/learner/catalog";

/** Published + public course catalog — browse before self-enrolling. */
export async function GET(req: Request) {
  const me = await requireLearner();
  if (me instanceof Response) return me;
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(60, Math.max(1, Number(sp.get("pageSize")) || 12));
  const { data, total } = listCatalog(me.id, {
    q: sp.get("q"),
    categoryId: sp.get("categoryId") ? Number(sp.get("categoryId")) : null,
    page,
    pageSize,
  });
  return listOk(data, total, { page, pageSize });
}
