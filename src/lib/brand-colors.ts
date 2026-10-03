/**
 * Brand palette as hex strings, for contexts that can't read CSS vars
 * (Satori OG images, canvas, email). Keep in sync with the oklch tokens
 * in globals.css — changing one without the other is drift.
 */
export const BRAND = {
  primary: "#FD9E0F",
  accent: "#F26B32",
  ink: "#2B2B2E",
  cream: "#FBF7F1",
  muted: "#8a8378",
  destructive: "#b91c1c",
} as const;
