export function slugify(value) {
    return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "musikraum";
}
export function normalizeHttpUrl(value) {
    try {
        const url = new URL(typeof value === "string" ? value.trim() : "");
        return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    }
    catch {
        return null;
    }
}
export function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
export function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#096;"); }
export function safeJson(value) { return JSON.stringify(value, (_key, item) => item === undefined ? undefined : item).replace(/</g, "\\u003c"); }
export function isSafeHttpUrl(value) { return normalizeHttpUrl(value) !== null; }
