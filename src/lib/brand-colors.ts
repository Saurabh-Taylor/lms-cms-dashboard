/**
 * Brand palette as hex strings, for contexts that can't read CSS vars
 * (Satori OG images, canvas, email). gold/ink/cream mirror the oklch tokens
 * in globals.css — changing one without the other is drift. warmGray and
 * red are supporting shades for certificate visuals, not token values.
 */
export const BRAND = {
  gold: "#FD9E0F",
  ink: "#2B2B2E",
  cream: "#FBF7F1",
  warmGray: "#8a8378",
  red: "#b91c1c",
} as const;
