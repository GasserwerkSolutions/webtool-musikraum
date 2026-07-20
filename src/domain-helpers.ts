export function slugify(value: unknown): string {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "musikraum";
}

export function normalizeHttpUrl(value: unknown): string | null {
  try {
    const url = new URL(typeof value === "string" ? value.trim() : "");
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}

export function normalizeEmail(value: unknown): string | null {
  const email = typeof value === "string" ? value.trim() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function normalizePhone(value: unknown): string | null {
  const phone = typeof value === "string" ? value.trim() : "";
  if (!phone) return null;
  const normalized = phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return /^\+?\d{6,15}$/.test(normalized) ? normalized : null;
}

export function normalizeInstagramUrl(value: unknown): string | null {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  const host = url.hostname.toLowerCase();
  return host === "instagram.com" || host.endsWith(".instagram.com") ? url.toString() : null;
}

export function escapeHtml(value: unknown): string { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
export function escapeAttr(value: unknown): string { return escapeHtml(value).replace(/`/g, "&#096;"); }
export function safeJson(value: unknown): string { return JSON.stringify(value, (_key, item) => item === undefined ? undefined : item).replace(/</g, "\\u003c"); }
export function isSafeHttpUrl(value: unknown): boolean { return normalizeHttpUrl(value) !== null; }
