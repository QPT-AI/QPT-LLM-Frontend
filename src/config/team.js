import team from "virtual:team";

// Public team info, parsed from the root CREDITS file at build time
// (see creditsPlugin in vite.config.js).
export const TEAM = team;

export function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function hostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Stable i18n key for a CREDITS role, e.g. "CEO, Original Inventor" -> "ceo_original_inventor".
export function roleKey(role) {
  return role
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
