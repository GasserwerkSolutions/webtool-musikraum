export function asRecord(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
export function asString(value, fallback = "") { return typeof value === "string" ? value : fallback; }
export function asBoolean(value, fallback = false) { return typeof value === "boolean" ? value : fallback; }
export function safeIso(value, fallback) { const date = new Date(asString(value)); return Number.isNaN(date.valueOf()) ? fallback : date.toISOString(); }
export function safeColor(value, fallback) { const text = asString(value); return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback; }
