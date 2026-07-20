import { renderPreviewRegions } from "./preview-renderer.js";
const REGION_ORDER = ["header", "hero", "intro", "why", "offers", "story", "contact", "footer"];
const TEXT_FIELDS = {
    "copy.heroLabel": "hero",
    "copy.heroTitle": "hero",
    "copy.introLabel": "intro",
    "copy.introTitle": "intro",
    "copy.introQuote": "intro",
    "copy.introText": "intro",
    "copy.whyLabel": "why",
    "copy.whyTitle": "why",
    "copy.whyText": "why",
    "copy.offersLabel": "offers",
    "copy.offersTitle": "offers",
    "copy.offersIntro": "offers",
    "copy.storyLabel": "story",
    "copy.storyTitle": "story",
    "copy.storyText": "story",
    "copy.contactLabel": "contact",
    "copy.contactTitle": "contact",
    "copy.contactText": "contact",
};
const REGION_FIELDS = {
    "copy.heroPrimaryAction": "hero",
    "copy.heroSecondaryAction": "hero",
    "copy.navIntro": "header",
    "copy.navWhy": "header",
    "copy.navOffers": "header",
    "copy.navStory": "header",
    "copy.navContact": "header",
    "copy.contactEmailAction": "contact",
    "copy.contactPhoneAction": "contact",
    "copy.contactInstagramAction": "contact",
};
export function planPreviewUpdate(mutations, draft, renderOptions) {
    const revision = mutations.reduce((latest, mutation) => Math.max(latest, mutation.revision), renderOptions.revision);
    const regions = new Set();
    const texts = new Map();
    let patchTheme = false;
    for (const mutation of mutations) {
        const effect = mutation.effect;
        if (effect.type === "draft-replace")
            return { kind: "full", revision, reason: "draft-replace" };
        if (effect.type === "section-move" || effect.type === "section-visibility")
            return { kind: "full", revision, reason: "layout" };
        if (effect.type === "theme-set") {
            patchTheme = true;
            continue;
        }
        if (effect.type === "field-set") {
            if (effect.field.startsWith("site.") || effect.field === "copy.heroSubtitle")
                return { kind: "full", revision, reason: "metadata" };
            const regional = REGION_FIELDS[effect.field];
            if (regional) {
                regions.add(regional);
                continue;
            }
            const textRegion = TEXT_FIELDS[effect.field];
            if (!textRegion)
                return { kind: "full", revision, reason: "unsupported" };
            addText(texts, { kind: "field", field: effect.field }, fieldValue(draft, effect.field));
            continue;
        }
        if (effect.type === "text-item-set") {
            const region = effect.list === "heroPoints" ? "hero" : "intro";
            if (effect.previousPresence !== "present" || effect.nextPresence !== "present") {
                regions.add(region);
                continue;
            }
            const item = draft[effect.list].find((entry) => entry.id === effect.itemId);
            if (!item)
                return { kind: "full", revision, reason: "unsupported" };
            addText(texts, { kind: "text-item", list: effect.list, itemId: effect.itemId }, item.text);
            continue;
        }
        if (effect.type === "offer-field-set") {
            if (effect.previousPresence !== "present" || effect.nextPresence !== "present") {
                regions.add("offers");
                continue;
            }
            const offer = draft.offers.find((entry) => entry.id === effect.offerId);
            if (!offer)
                return { kind: "full", revision, reason: "unsupported" };
            addText(texts, { kind: "offer", offerId: effect.offerId, field: effect.field }, offer[effect.field]);
            continue;
        }
        if (effect.type === "collection-insert" || effect.type === "collection-remove" || effect.type === "collection-move") {
            regions.add(effect.collection === "heroPoints" ? "hero" : effect.collection === "introPoints" ? "intro" : "offers");
            continue;
        }
        return { kind: "full", revision, reason: "unsupported" };
    }
    for (const [key, operation] of texts) {
        const region = regionForTarget(operation.target);
        if (region && regions.has(region))
            texts.delete(key);
    }
    const operations = [];
    const orderedRegions = REGION_ORDER.filter((region) => regions.has(region));
    if (orderedRegions.length) {
        const rendered = renderPreviewRegions(orderedRegions, draft, { ...renderOptions, revision });
        for (const region of orderedRegions) {
            const html = rendered.get(region);
            if (!html)
                return { kind: "full", revision, reason: "unsupported" };
            operations.push({ type: "replace-region", region, html });
        }
    }
    if (patchTheme)
        operations.push({ type: "patch-theme", primary: draft.theme.primary, accent: draft.theme.accent });
    operations.push(...[...texts.values()].sort((left, right) => targetKey(left.target).localeCompare(targetKey(right.target))));
    return operations.length ? { kind: "patch", revision, operations } : { kind: "full", revision, reason: "unsupported" };
}
function addText(targets, target, value) {
    targets.set(targetKey(target), { type: "patch-text", target, value });
}
function targetKey(target) { return JSON.stringify(target); }
function regionForTarget(target) {
    if (target.kind === "offer")
        return "offers";
    if (target.kind === "text-item")
        return target.list === "heroPoints" ? "hero" : "intro";
    if (target.kind === "field")
        return TEXT_FIELDS[target.field] ?? REGION_FIELDS[target.field] ?? null;
    return null;
}
function fieldValue(draft, field) {
    const [group, key] = field.split(".");
    return String(draft[group][key] ?? "");
}
