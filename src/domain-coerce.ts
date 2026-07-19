export function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
export function asString(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
export function asBoolean(value: unknown, fallback = false): boolean { return typeof value === "boolean" ? value : fallback; }
export function safeIso(value: unknown, fallback: string): string { const date = new Date(asString(value)); return Number.isNaN(date.valueOf()) ? fallback : date.toISOString(); }
export function safeColor(value: unknown, fallback: string): string { const text = asString(value); return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback; }
