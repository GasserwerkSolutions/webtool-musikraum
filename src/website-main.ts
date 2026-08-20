import { escapeAttr, escapeHtml, normalizeEmail, normalizePhone, safeJson, type MusicraumDraft, type SectionKey } from "./domain.js";
import type { EditorPanel, StaticEditableField } from "./preview-contract.js";
import type { BuildOptions } from "./website-contract.js";
import { HARFE_FAVICON, RAUM_FUER_KLANG_MEDIA, RAUM_FUER_KLANG_URL, type WebsiteMediaAssets } from "./website-media.js";
import { PREVIEW_CSS, websiteCss } from "./website-styles.js";
import { addressParts, buildMailtoHref, editable, previewAction, previewBridge, previewLink, previewNavigationLink, previewRegionAttr, previewSectionAttr, renderTextList } from "./website-preview.js";
import { photoSlot, renderSection } from "./website-sections.js";
import { websiteModelFromDraft, type MusicraumWebsiteModel } from "./website-model.js";

const SECTION_META: Record<SectionKey, { id: string; panel: EditorPanel }> = {
  intro: { id: "franz", panel: "content" },
  why: { id: "frei-spielen", panel: "content" },
  offers: { id: "angebote", panel: "services" },
  story: { id: "geschichte", panel: "content" },
  contact: { id: "kontakt", panel: "contact" },
};
const NAV_COPY_KEYS: Record<SectionKey, keyof MusicraumWebsiteModel["copy"]> = {
  intro: "navIntro",
  why: "navWhy",
  offers: "navOffers",
  story: "navStory",
  contact: "navContact",
};

export function buildWebsiteHtml(draft: MusicraumDraft, options: BuildOptions = {}): string {
  return renderMusicraumWebsiteHtml(websiteModelFromDraft(draft), options);
}

export function renderMusicraumWebsiteHtml(draft: MusicraumWebsiteModel, options: BuildOptions = {}): string {
  const theme = draft.theme;
  const media: WebsiteMediaAssets = {
    hero: options.heroImageUrl || RAUM_FUER_KLANG_MEDIA.hero,
    portrait: options.portraitImageUrl || RAUM_FUER_KLANG_MEDIA.portrait,
    detail: options.detailImageUrl || RAUM_FUER_KLANG_MEDIA.detail,
  };
  const email = normalizeEmail(draft.site.email);
  const phone = normalizePhone(draft.site.phone);
  const mailtoHref = email ? buildMailtoHref(email, draft.site.name) : "";
  const address = [draft.site.address, [draft.site.postalCode, draft.site.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const visibleOrder = draft.layout.order.filter((key) => draft.layout.visibility[key]);
  const firstActionKey = visibleOrder.find((key) => key !== "contact") ?? visibleOrder[0];
  const primaryAction = firstActionKey
    ? previewAction(draft.copy.heroPrimaryAction, "copy.heroPrimaryAction", `#${SECTION_META[firstActionKey].id}`, "button button-light", "hero-primary-action", options)
    : "";
  const secondaryAction = draft.layout.visibility.contact && firstActionKey !== "contact"
    ? previewAction(draft.copy.heroSecondaryAction, "copy.heroSecondaryAction", "#kontakt", "button button-ghost", "hero-secondary-action", options)
    : "";
  const heroActions = primaryAction || secondaryAction ? `<div class="actions">${primaryAction}${secondaryAction}</div>` : "";
  const heroNotes = renderTextList(draft.heroPoints, "heroPoints", "span", options);
  const nav = visibleOrder.map((key) => {
    const copyKey = NAV_COPY_KEYS[key] as string;
    const field = `copy.${copyKey}` as StaticEditableField;
    const label = String((draft.copy as unknown as Record<string, string>)[copyKey] ?? "").trim();
    return label ? previewNavigationLink(label, field, `#${SECTION_META[key].id}`, `header-nav-${key}`, options) : "";
  }).join("");
  const sections = visibleOrder.map((key) => renderSection(key, draft, address, media, options)).join("");
  const brand = `<span class="brand-mark" aria-hidden="true"><img src="${escapeAttr(HARFE_FAVICON)}" alt=""></span><span><strong>${editable(draft.site.name, "site.name", "header-brand-name", options)}</strong><small>${editable(draft.site.tagline, "site.tagline", "header-brand-tagline", options)}</small></span>`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${RAUM_FUER_KLANG_URL}#business`,
    name: draft.site.name,
    url: RAUM_FUER_KLANG_URL,
    description: draft.copy.heroSubtitle,
    telephone: phone || undefined,
    email: email || undefined,
    address: address ? {
      "@type": "PostalAddress",
      streetAddress: draft.site.address || undefined,
      postalCode: draft.site.postalCode || undefined,
      addressLocality: draft.site.city || undefined,
      addressCountry: "CH",
    } : undefined,
    makesOffer: draft.offers.filter((offer) => offer.title.trim()).map((offer) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: offer.title, description: offer.text || undefined },
    })),
  };
  const title = `${draft.site.name}${draft.site.tagline ? ` – ${draft.site.tagline}` : ""}`;

  return `<!doctype html>
<html lang="de-CH">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeAttr(draft.copy.heroSubtitle)}">
  <meta name="theme-color" content="${escapeAttr(theme.bg)}">
  <link rel="canonical" href="${RAUM_FUER_KLANG_URL}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="de_CH">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(draft.copy.heroSubtitle)}">
  <meta property="og:url" content="${RAUM_FUER_KLANG_URL}">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/svg+xml" href="${escapeAttr(HARFE_FAVICON)}">
  <script type="application/ld+json">${safeJson(schema)}</script>
  <style>${websiteCss(theme)}${options.preview ? PREVIEW_CSS : ""}</style>
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
      <div class="container hero-layout">
        <div class="hero-copy">
          <p class="eyebrow">${editable(draft.copy.heroLabel, "copy.heroLabel", "hero-label", options)}</p>
          <h1>${editable(draft.copy.heroTitle, "copy.heroTitle", "hero-title", options)}</h1>
          <p class="hero-lead">${editable(draft.copy.heroSubtitle, "copy.heroSubtitle", "hero-subtitle", options)}</p>
          ${heroActions}
          ${heroNotes ? `<div class="hero-notes" aria-label="Auf einen Blick">${heroNotes}</div>` : ""}
        </div>
        ${photoSlot(media.hero, "sandpendel", "Franz’ grosses Sandpendel im Raum.", "Franz’ grosses Sandpendel im Raum · Hochformat mit ruhiger Umgebung", "media-frame media-frame--hero", true)}
      </div>
    </section>
    ${sections}
  </main>
  <footer class="site-footer"${previewSectionAttr(options, "footer", "site")}${previewRegionAttr(options, "footer")}>
    <div class="container footer-grid">
      <div><strong>${editable(draft.site.name, "site.name", "footer-brand-name", options)}</strong><p>${editable(draft.site.tagline, "site.tagline", "footer-brand-tagline", options)}</p></div>
      <div class="footer-contact">${address ? `<span class="footer-address">${addressParts(draft, "footer-address", options)}</span>` : ""}${email ? `<span class="footer-email">${previewLink(draft.site.email, "site.email", mailtoHref, "preview-inline-link", "footer-email", options)}</span>` : ""}</div>
      <p data-preview-no-action>© ${draft.copyrightYear} ${options.preview ? editable(draft.site.name, "site.name", "footer-copyright-name", options) : escapeHtml(draft.site.name)}</p>
    </div>
  </footer>
  <script>(()=>{document.addEventListener('click',e=>{const t=e.target instanceof Element?e.target:null,n=document.querySelector('.main-nav');if(!t||!n)return;const b=t.closest('.menu-button');if(b){const o=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!o));n.classList.toggle('is-open',!o);return}if(t.closest('.main-nav a')){const m=document.querySelector('.menu-button');if(m){m.setAttribute('aria-expanded','false');n.classList.remove('is-open')}}})})();</script>
  ${options.preview ? previewBridge(options) : ""}
</body>
</html>`;
}

