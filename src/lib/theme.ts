export type Theme = "dark" | "light" | "system";

export const THEME_COOKIE = "movistan-theme";
export const THEME_VALUES: readonly Theme[] = ["dark", "light", "system"] as const;

export function isTheme(value: string | undefined | null): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

/** Resolve `system` to the concrete value used for the data-theme attribute on the server. */
export function resolveServerTheme(value: string | undefined | null): "dark" | "light" {
  if (value === "light") return "light";
  // `system` and unknown both fall back to dark — there's no UA hint server-side
  // and the existing app has always been dark.
  return "dark";
}
