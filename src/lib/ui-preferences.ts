// Per-admin typography personalization — single source of truth.
// Stored value = semantic preset name (never px); only non-"default" overrides persist,
// so future product-default changes flow to admins who never customized.

export type TypeSize = "compact" | "default" | "comfortable" | "large";

export const SIZE_LABELS: Record<TypeSize, string> = {
  compact: "Compact",
  default: "Default",
  comfortable: "Comfortable",
  large: "Large",
};

export const SIZE_ORDER: TypeSize[] = ["compact", "default", "comfortable", "large"];

export interface TypeGroup {
  key: string;
  label: string;
  hint: string;
  cssVar: string;
  section: string;
  px: Record<TypeSize, string>;
}

export const TYPE_GROUPS: TypeGroup[] = [
  { key: "sidebarNav", label: "Sidebar navigation", hint: "Menu items in the left sidebar", cssVar: "--fs-sidebar-nav", section: "Navigation",
    px: { compact: "12px", default: "13px", comfortable: "14px", large: "15px" } },
  { key: "sidebarLabel", label: "Sidebar section labels", hint: "Group labels like Content, Users, Insights", cssVar: "--fs-sidebar-label", section: "Navigation",
    px: { compact: "10px", default: "10.5px", comfortable: "11.5px", large: "12.5px" } },
  { key: "headerText", label: "Header & breadcrumbs", hint: "Top bar text and breadcrumb trail", cssVar: "--fs-header", section: "Navigation",
    px: { compact: "13px", default: "14px", comfortable: "15px", large: "16px" } },
  { key: "pageTitle", label: "Page titles", hint: "Top-level page headings", cssVar: "--fs-page-title", section: "Content",
    px: { compact: "16px", default: "18px", comfortable: "20px", large: "22px" } },
  { key: "pageDesc", label: "Page descriptions", hint: "Supporting text beneath page titles", cssVar: "--fs-page-desc", section: "Content",
    px: { compact: "12px", default: "13px", comfortable: "14px", large: "15px" } },
  { key: "meta", label: "Metadata & helper text", hint: "Timestamps, captions, secondary copy", cssVar: "--fs-meta", section: "Content",
    px: { compact: "11px", default: "12px", comfortable: "13px", large: "14px" } },
  { key: "tableHeader", label: "Table headers", hint: "Column headings in data tables", cssVar: "--fs-table-header", section: "Data & forms",
    px: { compact: "10px", default: "11px", comfortable: "12px", large: "13px" } },
  { key: "tableBody", label: "Table rows", hint: "Primary and secondary cell text", cssVar: "--fs-table-body", section: "Data & forms",
    px: { compact: "12px", default: "13px", comfortable: "14px", large: "15px" } },
  { key: "formLabel", label: "Form labels", hint: "Field labels across forms", cssVar: "--fs-label", section: "Data & forms",
    px: { compact: "13px", default: "14px", comfortable: "15px", large: "16px" } },
  { key: "control", label: "Inputs & selects", hint: "Text inside inputs, selects, search fields", cssVar: "--fs-control", section: "Data & forms",
    px: { compact: "13px", default: "14px", comfortable: "15px", large: "16px" } },
  { key: "button", label: "Buttons", hint: "Button labels and text actions", cssVar: "--fs-button", section: "Data & forms",
    px: { compact: "13px", default: "14px", comfortable: "15px", large: "16px" } },
  { key: "badge", label: "Badges", hint: "Status pills like Published, Draft, Archived", cssVar: "--fs-badge", section: "Data & forms",
    px: { compact: "11px", default: "12px", comfortable: "13px", large: "14px" } },
];

export const GROUP_KEYS = new Set(TYPE_GROUPS.map((g) => g.key));
const GROUP_MAP = new Map(TYPE_GROUPS.map((g) => [g.key, g]));

/** Sparse overrides — only non-default values are stored. */
export type UiPreferences = { typography?: Record<string, Exclude<TypeSize, "default">> };

export function isValidSize(v: unknown): v is TypeSize {
  return typeof v === "string" && (SIZE_ORDER as string[]).includes(v);
}

/** Resolve sparse overrides → full var map for the admin shell root. */
export function adminShellVars(
  prefs: UiPreferences | null | undefined
): Record<string, string> {
  const ov = prefs?.typography ?? {};
  const style: Record<string, string> = {};
  for (const g of TYPE_GROUPS) {
    const size = ov[g.key];
    style[g.cssVar] = g.px[size && isValidSize(size) ? size : "default"];
  }
  return style;
}

export function effectiveSize(key: string, prefs: UiPreferences | null | undefined): TypeSize {
  const v = prefs?.typography?.[key];
  return v && isValidSize(v) ? v : "default";
}

export function groupConfig(key: string): TypeGroup | undefined {
  return GROUP_MAP.get(key);
}

/** Keep only known groups + valid presets; "default" is stored as absence. */
export function sanitizeTypography(input: Record<string, string>): Record<string, string> {
  const overrides: Record<string, string> = {};
  for (const [key, size] of Object.entries(input)) {
    if (!GROUP_KEYS.has(key) || !isValidSize(size)) continue;
    if (size !== "default") overrides[key] = size;
  }
  return overrides;
}
