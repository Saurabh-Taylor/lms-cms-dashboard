/**
 * Query-key convention (wayfinder 14): an "/api/…" endpoint literal belongs
 * once in src/lib/query-keys.ts (qk.*) — never inside queryKey:/invalidate:/
 * setQueryData positions, and never bound to a name that lands there.
 *
 * AST-level, so every laundering shape is covered: const KEY = "…",
 * () => ["…"], {key: "…"}, cond ? "…" : "…" — not just single-line bindings.
 *
 * A literal is legal only inside a carrier that forwards it to the wire:
 * a call like api("…")/useServerTable("…"), or a named prop
 * (endpoint/href/matcher) the callee resolves itself. Route handlers
 * (src/app/api/**) and the qk registry file are exempt.
 */

const ENDPOINT = /^\/api\//;
// Route matchers ("/api/:path*") carry a param placeholder — not a key.
const PLACEHOLDER = /[:{]/;

const CARRIERS = new Set([
  "api",
  "apiServer",
  "apiServerRaw",
  "fetch",
  "qs",
  "proxy",
  "fetchServerSentEvents",
  "useList",
  "useServerTable",
  "useDetail",
]);

const CARRIER_PROPS = new Set(["endpoint", "href", "matcher", "target", "url"]);

const EXCLUDED = /src[/\\]lib[/\\]query-keys\.ts$|src[/\\]app[/\\]api[/\\]|scripts[/\\]/;

function calleeName(node) {
  const c = node.callee;
  if (c.type === "Identifier") return c.name;
  if (c.type === "MemberExpression" && c.property.type === "Identifier")
    return c.property.name;
  return null;
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "endpoint literals belong in src/lib/query-keys.ts (qk.*), not in query keys or bound constants",
    },
    messages: {
      literal:
        "'/api/…' literal outside a wire call — endpoint query keys live once in qk.* (src/lib/query-keys.ts)",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (EXCLUDED.test(filename)) return {};
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    function inCarrier(node) {
      for (const anc of sourceCode.getAncestors(node)) {
        if (anc.type === "CallExpression" && CARRIERS.has(calleeName(anc)))
          return true;
        if (
          anc.type === "TaggedTemplateExpression" &&
          anc.tag.type === "Identifier" &&
          CARRIERS.has(anc.tag.name)
        )
          return true;
        if (
          anc.type === "Property" &&
          anc.key.type === "Identifier" &&
          CARRIER_PROPS.has(anc.key.name)
        )
          return true;
        if (
          anc.type === "JSXAttribute" &&
          anc.name.type === "JSXIdentifier" &&
          CARRIER_PROPS.has(anc.name.name)
        )
          return true;
      }
      return false;
    }

    function check(node, values) {
      for (const value of values) {
        if (typeof value !== "string") continue;
        if (!ENDPOINT.test(value) || PLACEHOLDER.test(value)) continue;
        if (!inCarrier(node)) {
          context.report({ node, messageId: "literal" });
          return;
        }
      }
    }

    return {
      Literal(node) {
        check(node, [node.value]);
      },
      // Every quasi, not just the first — `${x}/api/y` smuggles the
      // endpoint into a mid-template literal just as surely.
      TemplateLiteral(node) {
        check(
          node,
          node.quasis.map((q) => q.value.cooked),
        );
      },
    };
  },
};

export default rule;
