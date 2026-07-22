import { FONT_PRESETS, FONT_SIZES, PRESETS, escapeAttr, escapeHtml, normalizeEmail, normalizeInstagramUrl, normalizePhone, safeJson, } from "./domain.js";
import { EDITOR_FIELD_REGISTRY, PREVIEW_CHANNEL, PREVIEW_PROTOCOL_VERSION } from "./preview-contract.js";
import { buildPreviewBridgeScript } from "./preview-bridge.js";
export const MUSICRAUM_HERO_URL = "https://raw.githubusercontent.com/GasserwerkSolutions/musikraum/89f128d86fd2da8f6c827efd654de5b24e5c94f4/assets/photos/hero-klangraum-wood-1200w.webp";
const HARFE_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='15' fill='%23343b39'/%3E%3Cpath d='M17 50.5h33' fill='none' stroke='%23f3dfae' stroke-width='4.5' stroke-linecap='round'/%3E%3Cpath d='M19.5 49.5c7-8.5 10-21.5 8.8-36 8.7 2.8 15.8 7.7 21.2 14.2' fill='none' stroke='%23d9ba70' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M49.5 27.7c-1.2 7.8-.9 15.3.5 22.8' fill='none' stroke='%23f3dfae' stroke-width='5' stroke-linecap='round'/%3E%3Cg fill='none' stroke='%239fb9b3' stroke-width='1.35' stroke-linecap='round'%3E%3Cpath d='M30 18.5v26'/%3E%3Cpath d='M34 20.2v24.3'/%3E%3Cpath d='M38 22.2v22.3'/%3E%3Cpath d='M42 24.5v20'/%3E%3Cpath d='M46 27v17.5'/%3E%3C/g%3E%3C/svg%3E";
const SECTION_META = {
    intro: { id: "franz", panel: "content" },
    why: { id: "frei-spielen", panel: "content" },
    offers: { id: "angebote", panel: "services" },
    story: { id: "geschichte", panel: "content" },
    contact: { id: "kontakt", panel: "contact" },
};
const NAV_COPY_KEYS = { intro: "navIntro", why: "navWhy", offers: "navOffers", story: "navStory", contact: "navContact" };
export function buildWebsiteHtml(draft, options = {}) {
    const preset = PRESETS[draft.theme.preset] ?? PRESETS.musikraum;
    const font = FONT_PRESETS[draft.theme.font] ?? FONT_PRESETS.klassisch;
    const fontSize = FONT_SIZES[draft.theme.fontSize] ?? FONT_SIZES.normal;
    const theme = { ...preset, primary: draft.theme.primary, accent: draft.theme.accent, display: font.display, body: font.body, fontScale: fontSize.scale };
    const heroImageUrl = options.heroImageUrl || MUSICRAUM_HERO_URL;
    const email = normalizeEmail(draft.site.email);
    const phone = normalizePhone(draft.site.phone);
    const instagram = normalizeInstagramUrl(draft.site.instagram);
    const mailtoHref = email ? buildMailtoHref(email, draft.site.name) : "";
    const address = [draft.site.address, [draft.site.postalCode, draft.site.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const visibleOrder = draft.layout.order.filter((key) => draft.layout.visibility[key]);
    const firstActionKey = visibleOrder.find((key) => key !== "contact") ?? visibleOrder[0];
    const primaryAction = firstActionKey ? previewAction(draft.copy.heroPrimaryAction, "copy.heroPrimaryAction", `#${SECTION_META[firstActionKey].id}`, "button button-light", "hero-primary-action", options) : "";
    const secondaryAction = draft.layout.visibility.contact && firstActionKey !== "contact" ? previewAction(draft.copy.heroSecondaryAction, "copy.heroSecondaryAction", "#kontakt", "button button-ghost", "hero-secondary-action", options) : "";
    const heroActions = primaryAction || secondaryAction ? `<div class="actions">${primaryAction}${secondaryAction}</div>` : "";
    const heroNotes = renderTextList(draft.heroPoints, "heroPoints", "span", options);
    const nav = visibleOrder.map((key) => { const field = `copy.${NAV_COPY_KEYS[key]}`; const label = draft.copy[NAV_COPY_KEYS[key]].trim(); return label ? previewNavigationLink(label, field, `#${SECTION_META[key].id}`, `header-nav-${key}`, options) : ""; }).join("");
    const sections = visibleOrder.map((key) => renderSection(key, draft, address, options)).join("");
    const brand = `<span class="brand-mark" aria-hidden="true"><img src="${HARFE_FAVICON}" alt="" style="display:block;width:100%;height:100%;object-fit:contain;border-radius:inherit"></span><span><strong>${editable(draft.site.name, "site.name", "header-brand-name", options)}</strong><small>${editable(draft.site.tagline, "site.tagline", "header-brand-tagline", options)}</small></span>`;
    const schema = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        name: draft.site.name,
        description: draft.copy.heroSubtitle,
        telephone: phone || undefined,
        email: email || undefined,
        address: address ? { "@type": "PostalAddress", streetAddress: draft.site.address || undefined, postalCode: draft.site.postalCode || undefined, addressLocality: draft.site.city || undefined, addressCountry: "CH" } : undefined,
        makesOffer: draft.offers.filter((offer) => offer.title.trim()).map((offer) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: offer.title, description: offer.text || undefined } })),
    };
    const title = `${draft.site.name}${draft.site.tagline ? ` – ${draft.site.tagline}` : ""}`;
    return `<!doctype html>
<html lang="de-CH">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeAttr(draft.copy.heroSubtitle)}">
  <meta name="theme-color" content="${escapeAttr(theme.primary)}">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/svg+xml" href="${HARFE_FAVICON}">
  <script type="application/ld+json">${safeJson(schema)}</script>
  <style>${websiteCss(theme, heroImageUrl)}${options.preview ? PREVIEW_CSS : ""}</style>
</head>
<body>
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <header class="site-header"${previewRegionAttr(options, "header")}>
    <div class="container header-inner">
      ${options.preview ? `<div class="brand">${brand}</div>` : `<a class="brand" href="#top">${brand}</a>`}
      <button class="menu-button" type="button" aria-label="Navigation anzeigen" aria-expanded="false"><span></span><span></span><span></span></button>
      <nav class="main-nav" aria-label="Hauptnavigation">${nav}</nav>
    </div>
  </header>
  <main id="main">
    <section class="hero" id="top"${previewSectionAttr(options, "top", "hero")}${previewRegionAttr(options, "hero")}>
      <div class="container hero-inner">
        <p class="eyebrow">${editable(draft.copy.heroLabel, "copy.heroLabel", "hero-label", options)}</p>
        <h1>${editable(draft.copy.heroTitle, "copy.heroTitle", "hero-title", options)}</h1>
        <p class="hero-lead">${editable(draft.copy.heroSubtitle, "copy.heroSubtitle", "hero-subtitle", options)}</p>
        ${heroActions}
        ${heroNotes ? `<div class="hero-notes" aria-label="Auf einen Blick">${heroNotes}</div>` : ""}
      </div>
    </section>
    ${sections}
  </main>
  <footer class="site-footer"${previewSectionAttr(options, "footer", "site")}${previewRegionAttr(options, "footer")}><div class="container footer-grid"><div><strong>${editable(draft.site.name, "site.name", "footer-brand-name", options)}</strong><p>${editable(draft.site.tagline, "site.tagline", "footer-brand-tagline", options)}</p></div><div class="footer-contact">${address ? `<span class="footer-address">${addressParts(draft, "footer-address", options)}</span>` : ""}${email ? `<span class="footer-email">${previewLink(draft.site.email, "site.email", mailtoHref, "preview-inline-link", "footer-email", options)}</span>` : ""}</div><p data-preview-no-action>© ${new Date().getFullYear()} ${options.preview ? editable(draft.site.name, "site.name", "footer-copyright-name", options) : escapeHtml(draft.site.name)}</p></div></footer>
  <script>(()=>{document.addEventListener('click',e=>{const t=e.target instanceof Element?e.target:null,n=document.querySelector('.main-nav');if(!t||!n)return;const b=t.closest('.menu-button');if(b){const o=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!o));n.classList.toggle('is-open',!o);return}if(t.closest('.main-nav a')){const m=document.querySelector('.menu-button');if(m){m.setAttribute('aria-expanded','false');n.classList.remove('is-open')}}})})();</script>
  ${options.preview ? previewBridge(options) : ""}
</body>
</html>`;
}
function renderSection(key, draft, address, options) {
    const copy = draft.copy;
    if (key === "intro") {
        const points = renderTextList(draft.introPoints, "introPoints", "li", options);
        return `<section class="section intro" id="franz"${previewSectionAttr(options, "franz", "content")}${previewRegionAttr(options, "intro")}><div class="container split"><div><p class="eyebrow">${editable(copy.introLabel, "copy.introLabel", "intro-label", options)}</p><h2>${editable(copy.introTitle, "copy.introTitle", "intro-title", options)}</h2><blockquote>„${editable(copy.introQuote, "copy.introQuote", "intro-quote", options)}“</blockquote></div><div><p class="lead">${editable(copy.introText, "copy.introText", "intro-text", options)}</p>${points ? `<ul class="plain-list">${points}</ul>` : ""}</div></div></section>`;
    }
    if (key === "why")
        return `<section class="section dark-band" id="frei-spielen"${previewSectionAttr(options, "frei-spielen", "content")}${previewRegionAttr(options, "why")}><div class="container narrow"><p class="eyebrow">${editable(copy.whyLabel, "copy.whyLabel", "why-label", options)}</p><h2>${editable(copy.whyTitle, "copy.whyTitle", "why-title", options)}</h2><p class="lead">${editable(copy.whyText, "copy.whyText", "why-text", options)}</p><div class="resonance" aria-hidden="true" data-preview-no-action><span></span><span></span><span></span></div></div></section>`;
    if (key === "offers") {
        const cards = draft.offers.filter((offer) => offer.title.trim()).map((offer, index) => `<article class="card"><span class="card-number" data-preview-no-action>0${index + 1}</span><h3>${editableOffer(offer.title, offer.id, "title", `offer-${offer.id}-title`, options)}</h3>${offer.text ? `<p>${editableOffer(offer.text, offer.id, "text", `offer-${offer.id}-text`, options)}</p>` : ""}</article>`).join("");
        return `<section class="section offers" id="angebote"${previewSectionAttr(options, "angebote", "services")}${previewRegionAttr(options, "offers")}><div class="container"><div class="section-head"><p class="eyebrow">${editable(copy.offersLabel, "copy.offersLabel", "offers-label", options)}</p><h2>${editable(copy.offersTitle, "copy.offersTitle", "offers-title", options)}</h2><p class="lead">${editable(copy.offersIntro, "copy.offersIntro", "offers-intro", options)}</p></div>${cards ? `<div class="card-grid">${cards}</div>` : ""}</div></section>`;
    }
    if (key === "story")
        return `<section class="section story" id="geschichte"${previewSectionAttr(options, "geschichte", "content")}${previewRegionAttr(options, "story")}><div class="container split"><div><p class="eyebrow">${editable(copy.storyLabel, "copy.storyLabel", "story-label", options)}</p><h2>${editable(copy.storyTitle, "copy.storyTitle", "story-title", options)}</h2></div><p class="lead">${editable(copy.storyText, "copy.storyText", "story-text", options)}</p></div></section>`;
    const email = normalizeEmail(draft.site.email);
    const phone = normalizePhone(draft.site.phone);
    const instagram = normalizeInstagramUrl(draft.site.instagram);
    const emailLabel = copy.contactEmailAction.trim();
    const phoneAction = copy.contactPhoneAction.trim();
    const instagramLabel = copy.contactInstagramAction.trim();
    const phoneLabel = [draft.site.phone.trim(), phoneAction].filter(Boolean).join(" ");
    const contactLinks = [
        email && emailLabel ? `<a class="button button-light" href="${escapeAttr(buildMailtoHref(email, draft.site.name))}">${escapeHtml(emailLabel)}</a>` : "",
        phone && phoneLabel ? `<a class="button button-ghost" href="tel:${escapeAttr(phone)}">${escapeHtml(phoneLabel)}</a>` : "",
        instagram && instagramLabel ? `<a class="button button-ghost" href="${escapeAttr(instagram)}" target="_blank" rel="noopener noreferrer">${escapeHtml(instagramLabel)}</a>` : "",
    ].filter(Boolean).join("");
    const previewLinks = options.preview ? `${email && emailLabel ? previewLink(emailLabel, "copy.contactEmailAction", buildMailtoHref(email, draft.site.name), "button button-light", "contact-email-action", options) : ""}${phone && phoneLabel ? `<span class="button button-ghost preview-composite-action">${editable(draft.site.phone, "site.phone", "contact-phone-number", options)}${phoneAction ? ` ${editable(phoneAction, "copy.contactPhoneAction", "contact-phone-action", options)}` : ""}</span>` : ""}${instagram && instagramLabel ? previewLink(instagramLabel, "copy.contactInstagramAction", instagram, "button button-ghost", "contact-instagram-action", options) : ""}` : contactLinks;
    return `<section class="section contact" id="kontakt"${previewSectionAttr(options, "kontakt", "contact")}${previewRegionAttr(options, "contact")}><div class="container narrow"><p class="eyebrow">${editable(copy.contactLabel, "copy.contactLabel", "contact-label", options)}</p><h2>${editable(copy.contactTitle, "copy.contactTitle", "contact-title", options)}</h2><p class="lead">${editable(copy.contactText, "copy.contactText", "contact-text", options)}</p>${address ? `<p class="address">${addressParts(draft, "contact-address", options)}</p>` : ""}${previewLinks ? `<div class="actions centered">${previewLinks}</div>` : ""}</div></section>`;
}
function renderTextList(items, list, tag, options) {
    return items.filter((item) => item.text.trim()).map((item) => {
        const value = escapeHtml(item.text);
        return options.preview
            ? `<${tag} class="preview-edit-trigger"${previewTargetAttr(options, { kind: "text-item", list, itemId: item.id }, `${list}-${item.id}`)}>${value}</${tag}>`
            : `<${tag}>${value}</${tag}>`;
    }).join("");
}
function buildMailtoHref(email, siteName) { return `mailto:${encodeURIComponent(email)}?${new URLSearchParams({ subject: `Anfrage ${siteName}` }).toString()}`; }
function previewTargetAttr(options, target, occurrence, interactive = false) {
    if (!options.preview)
        return "";
    const accessibleName = `${previewTargetLabel(target)} bearbeiten`;
    return ` data-preview-target="${escapeAttr(JSON.stringify(target))}" data-preview-occurrence="${escapeAttr(occurrence)}" aria-label="${escapeAttr(accessibleName)}"${interactive ? "" : ' tabindex="0" role="button"'}`;
}
function previewTargetLabel(target) {
    if (target.kind === "field")
        return EDITOR_FIELD_REGISTRY[target.field].label;
    if (target.kind === "offer")
        return target.field === "title" ? "Klangmoment-Titel" : "Klangmoment-Beschreibung";
    if (target.kind === "text-item")
        return target.list === "heroPoints" ? "Punkt im Titelbild" : "Punkt über Franz";
    return "Bearbeitungsbereich";
}
function previewSectionAttr(options, section, panel) { return options.preview ? ` data-preview-section="${escapeAttr(section)}" data-preview-panel="${panel}"` : ""; }
function previewRegionAttr(options, region) { return options.preview ? ` data-preview-region="${escapeAttr(region)}"` : ""; }
function editable(value, field, occurrence, options) { return options.preview ? `<span class="preview-edit-trigger"${previewTargetAttr(options, { kind: "field", field }, occurrence)}>${escapeHtml(value)}</span>` : escapeHtml(value); }
function editableOffer(value, offerId, field, occurrence, options) { return options.preview ? `<span class="preview-edit-trigger"${previewTargetAttr(options, { kind: "offer", offerId, field }, occurrence)}>${escapeHtml(value)}</span>` : escapeHtml(value); }
function previewAction(value, field, href, classes, occurrence, options) { return options.preview ? `<button class="${classes} preview-action" type="button"${previewTargetAttr(options, { kind: "field", field }, occurrence, true)}>${escapeHtml(value)}</button>` : `<a class="${classes}" href="${href}">${escapeHtml(value)}</a>`; }
function previewLink(value, field, href, classes, occurrence, options) { return options.preview ? `<a class="${classes}" href="${escapeAttr(href)}"${previewTargetAttr(options, { kind: "field", field }, occurrence, true)}>${escapeHtml(value)}</a>` : `<a class="${classes}" href="${escapeAttr(href)}">${escapeHtml(value)}</a>`; }
function previewNavigationLink(value, field, href, occurrence, options) { return options.preview ? `<a href="${href}"${previewTargetAttr(options, { kind: "field", field }, occurrence, true)}>${escapeHtml(value)}</a>` : `<a href="${href}">${escapeHtml(value)}</a>`; }
function addressParts(draft, prefix, options) { const street = draft.site.address ? editable(draft.site.address, "site.address", `${prefix}-street`, options) : ""; const postal = draft.site.postalCode ? editable(draft.site.postalCode, "site.postalCode", `${prefix}-postal-code`, options) : ""; const city = draft.site.city ? editable(draft.site.city, "site.city", `${prefix}-city`, options) : ""; return [street, [postal, city].filter(Boolean).join(" ")].filter(Boolean).join(", "); }
const PREVIEW_CSS = `html{scrollbar-width:thin;scrollbar-color:rgba(64,59,52,.32) transparent}html::-webkit-scrollbar{width:8px}html::-webkit-scrollbar-track{background:transparent}html::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:999px;background:rgba(64,59,52,.32);background-clip:padding-box}html::-webkit-scrollbar-thumb:hover{background-color:rgba(64,59,52,.52)}.preview-edit-trigger{display:inline;box-decoration-break:clone;-webkit-box-decoration-break:clone;border-radius:.18em;cursor:pointer;color:inherit;font:inherit;letter-spacing:inherit;line-height:inherit;text-align:inherit}.preview-edit-trigger:hover,.preview-edit-trigger:focus-visible{outline:2px solid #d6b96f;outline-offset:4px;background:rgba(214,185,111,.14)}.preview-inline-link{text-decoration:underline}.preview-action{cursor:pointer}.preview-composite-action{gap:.35em}[data-preview-target]:focus-visible,[data-preview-target]:hover{outline:2px solid #d6b96f;outline-offset:4px;background:rgba(214,185,111,.14)}[data-preview-panel]{cursor:default}`;
function previewBridge(options) {
    return buildPreviewBridgeScript({
        channel: PREVIEW_CHANNEL,
        version: PREVIEW_PROTOCOL_VERSION,
        instanceId: options.previewInstanceId ?? "",
        renderGeneration: options.renderGeneration ?? 0,
        revision: options.previewRevision ?? 0,
        parentOrigin: options.parentOrigin ?? "*",
        restore: options.previewScroll ?? null,
    });
}
function websiteCss(theme, heroImageUrl) {
    return `:root{color-scheme:light;--primary:${theme.primary};--accent:${theme.accent};--bg:${theme.bg};--surface:${theme.surface};--text:${theme.text};--display:${theme.display};--body:${theme.body};--radius:${theme.radius};--max:1120px;--shadow:0 18px 48px rgba(37,31,24,.14)}*{box-sizing:border-box}html{font-size:${theme.fontScale}%;scroll-behavior:smooth;scroll-padding-top:76px}body{margin:0;min-width:320px;background:${theme.bg};background:var(--bg);color:${theme.text};color:var(--text);font-family:${theme.body};font-family:var(--body);font-size:1.04rem;line-height:1.65}a{color:inherit}.container{width:calc(100% - 40px);max-width:1120px;margin:0 auto;width:min(1120px,calc(100% - 40px));margin-inline:auto}.skip-link{position:fixed;left:12px;top:-80px;z-index:100;padding:10px 14px;background:#fff;color:#111;border-radius:8px}.skip-link:focus{top:12px}.site-header{position:sticky;top:0;z-index:20;background:rgba(255,249,239,.94);border-bottom:1px solid rgba(64,59,52,.12);backdrop-filter:blur(15px)}.header-inner{min-height:76px;display:flex;align-items:center;gap:24px}.brand{display:flex;align-items:center;gap:10px;text-decoration:none;line-height:1}.brand>span:last-child{display:grid}.brand strong{font-family:${theme.display};font-family:var(--display);font-size:1.42rem}.brand small{margin-top:5px;font-size:.61rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#756c62}.brand-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,var(--primary),#202725);box-shadow:inset 0 0 0 2px rgba(255,255,255,.25)}.brand-mark i{width:22px;height:22px;border:1px solid #d8c17c;border-radius:50%;position:relative}.brand-mark i:after{content:"";position:absolute;left:4px;right:4px;top:10px;height:1px;background:#d8c17c;box-shadow:0 -4px 0 rgba(216,193,124,.5),0 4px 0 rgba(216,193,124,.5)}.main-nav{margin-left:auto;display:flex;align-items:center;gap:2px}.main-nav a{padding:10px 9px;border-radius:8px;text-decoration:none;font-size:.88rem;font-weight:750}.main-nav a:hover{background:rgba(88,114,113,.1)}.menu-button{display:none;margin-left:auto;width:44px;height:44px;border:0;border-radius:10px;background:rgba(64,59,52,.08)}.menu-button span{display:block;width:21px;height:2px;margin:4px auto;background:currentColor}.hero{min-height:calc(100vh - 76px);min-height:calc(100svh - 76px);display:flex;align-items:center;position:relative;z-index:0;isolation:isolate;color:#fff;background-color:#494840;background-image:url("${escapeCssUrl(heroImageUrl)}");background-position:center;background-repeat:no-repeat;background-size:cover}.hero:after{content:"";position:absolute;top:0;right:0;bottom:0;left:0;z-index:-1;background:linear-gradient(90deg,rgba(24,23,20,.78),rgba(35,30,25,.52) 55%,rgba(20,19,17,.3)),linear-gradient(180deg,rgba(20,19,17,.24),rgba(20,19,17,.44))}.hero-inner{padding:96px 0 110px}.eyebrow{display:flex;align-items:center;gap:12px;margin:0 0 17px;color:${theme.accent};color:var(--accent);font-size:.76rem;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.eyebrow:before{content:"";width:32px;height:1px;background:currentColor}.hero .eyebrow,.dark-band .eyebrow{color:#d6b96f}.hero h1{max-width:780px;margin:0 0 20px;font-family:${theme.display};font-weight:700;font-size:3.4rem;line-height:.98;font:700 clamp(3rem,8vw,6.5rem)/.98 var(--display);letter-spacing:-.035em;text-wrap:balance}.hero-lead{max-width:700px;margin:0;font-size:1.15rem;font-size:clamp(1.05rem,1.6vw,1.28rem);color:rgba(255,255,255,.94)}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:11px 19px;border:1px solid transparent;border-radius:${theme.radius};border-radius:var(--radius);text-decoration:none;font-weight:800}.button-light{background:#fff;color:${theme.primary};color:var(--primary);box-shadow:0 10px 24px rgba(0,0,0,.13)}.button-ghost{border-color:rgba(255,255,255,.48);background:rgba(255,255,255,.08);color:#fff}.hero-notes{display:flex;flex-wrap:wrap;gap:9px;margin-top:23px}.hero-notes span{padding:6px 10px;border:1px solid rgba(255,255,255,.32);border-radius:8px;background:rgba(255,255,255,.11);font-size:.84rem}.hero-notes span:before{content:"";display:inline-block;width:7px;height:7px;margin-right:8px;border-radius:50%;background:#d6b96f}.section{padding:5.5rem 0;padding:clamp(4.5rem,9vw,7.5rem) 0;background:${theme.bg};background:linear-gradient(135deg,var(--bg),color-mix(in srgb,var(--surface) 75%,var(--bg)))}h2,h3,blockquote{font-family:${theme.display};font-family:var(--display)}h2{max-width:780px;margin:0 0 24px;font-size:2.8rem;font-size:clamp(2.15rem,5vw,4rem);line-height:1.06;letter-spacing:-.025em;text-wrap:balance}.lead{margin:0;color:${theme.text};color:color-mix(in srgb,var(--text) 72%,transparent);font-size:1.1rem;font-size:clamp(1.05rem,1vw + .8rem,1.22rem)}.split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(2.5rem,7vw,6.5rem);align-items:center}.intro blockquote{margin:18px 0 0;font-size:1.9rem;font-size:clamp(1.5rem,3vw,2.45rem);line-height:1.22}.plain-list{display:grid;gap:11px;margin:28px 0 0;padding:0;list-style:none}.plain-list li{display:flex;gap:12px}.plain-list li:before{content:"";width:8px;height:8px;margin-top:.58em;border-radius:50%;background:${theme.accent};background:var(--accent);flex:0 0 auto}.dark-band,.contact{color:#fff;background:${theme.primary};background:linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--primary) 72%,#161817))}.narrow{max-width:840px;text-align:center}.narrow .eyebrow{justify-content:center}.narrow .lead{color:rgba(255,255,255,.84)}.resonance{display:flex;justify-content:center;gap:13px;margin-top:38px}.resonance span{width:18px;height:18px;border:1px solid #d6b96f;border-radius:50%}.resonance span:nth-child(2){width:34px;height:34px;margin-top:-8px}.resonance span:nth-child(3){width:50px;height:50px;margin-top:-16px}.offers{background:${theme.surface};background:color-mix(in srgb,var(--surface) 78%,white)}.section-head{max-width:780px;margin-bottom:34px}.card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.card{position:relative;padding:28px;border:1px solid ${theme.accent};border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);border-radius:${theme.radius};border-radius:var(--radius);background:rgba(255,255,255,.5);overflow:hidden}.card-number{position:absolute;right:20px;top:12px;color:${theme.accent};color:color-mix(in srgb,var(--accent) 28%,transparent);font-family:${theme.display};font-weight:700;font-size:3.4rem;line-height:1;font:700 3.4rem/1 var(--display)}.card h3{position:relative;margin:26px 0 12px;font-size:1.55rem}.card p{position:relative;margin:0;color:${theme.text};color:color-mix(in srgb,var(--text) 72%,transparent)}.story{background:${theme.bg};background:linear-gradient(135deg,color-mix(in srgb,var(--bg) 85%,white),var(--bg))}.contact .address{margin:22px 0 0;color:rgba(255,255,255,.72)}.centered{justify-content:center}.site-footer{padding:45px 0;background:#202725;color:rgba(255,255,255,.76);font-size:.9rem}.footer-grid{display:grid;grid-template-columns:1.4fr 1fr auto;gap:30px;align-items:start}.footer-grid strong{font-family:${theme.display};font-weight:700;font-size:1.45rem;font:700 1.45rem var(--display);color:#fff}.footer-grid p{margin:4px 0}.footer-grid a{display:block;color:#fff}.footer-contact{display:grid;gap:4px}.footer-address,.footer-email{display:block}.footer-contact{display:grid;gap:4px}.footer-address,.footer-email{display:block}.footer-contact{display:grid;gap:4px}.footer-address,.footer-email{display:block}.footer-contact{display:grid;gap:4px}.footer-address,.footer-email{display:block}.footer-contact{display:grid;gap:4px}.footer-address,.footer-email{display:block}.footer-contact{display:grid;gap:4px}.footer-address,.footer-email{display:block}.footer-contact{display:grid;gap:4px}.footer-address,.footer-email{display:block}@media(max-width:860px){.main-nav{display:none;position:absolute;left:14px;right:14px;top:68px;padding:10px;border:1px solid rgba(64,59,52,.14);border-radius:14px;background:#fff9ef;box-shadow:var(--shadow)}.main-nav.is-open{display:grid}.menu-button{display:block}.split{grid-template-columns:1fr}.card-grid{grid-template-columns:1fr}.footer-grid{grid-template-columns:1fr 1fr}.footer-grid>p{grid-column:1/-1}.hero-inner{padding:80px 0 86px}}@media(max-width:560px){.container{width:calc(100% - 26px);width:min(100% - 26px,1120px)}.brand small{display:none}.hero{min-height:calc(100vh - 76px);min-height:calc(100svh - 76px);background-position:58% center}.hero h1{font-size:3.2rem;font-size:clamp(2.85rem,15vw,4.4rem)}.actions .button{width:100%}.hero-notes{align-items:flex-start;flex-direction:column}.section{padding:4.2rem 0}.footer-grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}`;
}
function escapeCssUrl(value) { return value.replace(/[<>"'()\\\n\r]/g, (character) => character === "<" ? "\\3c " : character === ">" ? "\\3e " : `\\${character}`); }
