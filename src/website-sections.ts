import { escapeAttr, escapeHtml, normalizeEmail, normalizeInstagramUrl, normalizePhone, type SectionKey } from "./domain.js";
import type { BuildOptions } from "./website-contract.js";
import { RAUM_FUER_KLANG_MEDIA, pendulumTraceMarkup, type WebsiteMediaAssets } from "./website-media.js";
import type { MusicraumWebsiteModel } from "./website-model.js";
import { addressParts, buildMailtoHref, editable, editableOffer, previewLink, previewRegionAttr, previewSectionAttr, renderTextList } from "./website-preview.js";

export function renderSection(key: SectionKey, draft: MusicraumWebsiteModel, address: string, media: WebsiteMediaAssets, options: BuildOptions): string {
  const copy = draft.copy;
  if (key === "intro") {
    const points = renderTextList(draft.introPoints, "introPoints", "li", options);
    return `<section class="section intro" id="franz"${previewSectionAttr(options, "franz", "content")}${previewRegionAttr(options, "intro")}>
      <div class="container intro-layout">
        ${photoSlot(media.portrait, "franz-portrait", "Franz Gasser mit ausgewählten Instrumenten.", "Franz mit ausgewählten Instrumenten · natürliches Hochformat", "media-frame media-frame--portrait")}
        <div class="intro-copy">
          <p class="eyebrow">${editable(copy.introLabel, "copy.introLabel", "intro-label", options)}</p>
          <h2>${editable(copy.introTitle, "copy.introTitle", "intro-title", options)}</h2>
          <blockquote>„${editable(copy.introQuote, "copy.introQuote", "intro-quote", options)}“</blockquote>
          <p class="lead">${editable(copy.introText, "copy.introText", "intro-text", options)}</p>
          ${points ? `<ul class="plain-list">${points}</ul>` : ""}
        </div>
      </div>
    </section>`;
  }
  if (key === "why") {
    return `<section class="section dark-band" id="frei-spielen"${previewSectionAttr(options, "frei-spielen", "content")}${previewRegionAttr(options, "why")}>
      <div class="container why-layout">
        <div class="why-copy">
          <p class="eyebrow">${editable(copy.whyLabel, "copy.whyLabel", "why-label", options)}</p>
          <h2>${editable(copy.whyTitle, "copy.whyTitle", "why-title", options)}</h2>
          <p class="lead">${editable(copy.whyText, "copy.whyText", "why-text", options)}</p>
        </div>
        <div class="pendulum-trace" aria-hidden="true" data-preview-no-action>${pendulumTraceMarkup()}</div>
      </div>
    </section>`;
  }
  if (key === "offers") {
    const cards = draft.offers.filter((offer) => offer.title.trim()).map((offer, index) => `<article class="card">
      <span class="card-number" data-preview-no-action>${String(index + 1).padStart(2, "0")}</span>
      <h3>${editableOffer(offer.title, offer.id, "title", `offer-${offer.id}-title`, options)}</h3>
      ${offer.text ? `<p>${editableOffer(offer.text, offer.id, "text", `offer-${offer.id}-text`, options)}</p>` : ""}
    </article>`).join("");
    return `<section class="section offers" id="angebote"${previewSectionAttr(options, "angebote", "services")}${previewRegionAttr(options, "offers")}>
      <div class="container">
        <div class="section-head">
          <p class="eyebrow">${editable(copy.offersLabel, "copy.offersLabel", "offers-label", options)}</p>
          <h2>${editable(copy.offersTitle, "copy.offersTitle", "offers-title", options)}</h2>
          <p class="lead">${editable(copy.offersIntro, "copy.offersIntro", "offers-intro", options)}</p>
        </div>
        ${cards ? `<div class="card-grid">${cards}</div>` : ""}
      </div>
    </section>`;
  }
  if (key === "story") {
    return `<section class="section story" id="geschichte"${previewSectionAttr(options, "geschichte", "content")}${previewRegionAttr(options, "story")}>
      <div class="container story-layout">
        <div class="story-copy">
          <p class="eyebrow">${editable(copy.storyLabel, "copy.storyLabel", "story-label", options)}</p>
          <h2>${editable(copy.storyTitle, "copy.storyTitle", "story-title", options)}</h2>
          <p class="lead">${editable(copy.storyText, "copy.storyText", "story-text", options)}</p>
        </div>
        ${photoSlot(media.detail, "instrument-detail", "Hände am Sandpendel oder an einem Instrument.", "Hände, Sand oder Instrument · ruhiges Querformat", "media-frame media-frame--detail")}
      </div>
    </section>`;
  }

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
  const previewLinks = options.preview
    ? `${email && emailLabel ? previewLink(emailLabel, "copy.contactEmailAction", buildMailtoHref(email, draft.site.name), "button button-light", "contact-email-action", options) : ""}${phone && phoneLabel ? `<span class="button button-ghost preview-composite-action">${editable(draft.site.phone, "site.phone", "contact-phone-number", options)}${phoneAction ? ` ${editable(phoneAction, "copy.contactPhoneAction", "contact-phone-action", options)}` : ""}</span>` : ""}${instagram && instagramLabel ? previewLink(instagramLabel, "copy.contactInstagramAction", instagram, "button button-ghost", "contact-instagram-action", options) : ""}`
    : contactLinks;
  return `<section class="section contact" id="kontakt"${previewSectionAttr(options, "kontakt", "contact")}${previewRegionAttr(options, "contact")}>
    <div class="container contact-layout">
      <div>
        <p class="eyebrow">${editable(copy.contactLabel, "copy.contactLabel", "contact-label", options)}</p>
        <h2>${editable(copy.contactTitle, "copy.contactTitle", "contact-title", options)}</h2>
      </div>
      <div>
        <p class="lead">${editable(copy.contactText, "copy.contactText", "contact-text", options)}</p>
        ${address ? `<p class="address">${addressParts(draft, "contact-address", options)}</p>` : ""}
        ${previewLinks ? `<div class="actions">${previewLinks}</div>` : ""}
      </div>
    </div>
  </section>`;
}

export function photoSlot(source: string, slot: string, alt: string, brief: string, classes: string, eager = false): string {
  const placeholder = Object.values(RAUM_FUER_KLANG_MEDIA).includes(source);
  return `<figure class="${classes}" data-photo-slot="${escapeAttr(slot)}" data-preview-no-action>
    <img src="${escapeAttr(source)}" alt="${escapeAttr(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
    ${placeholder ? `<figcaption><span>Bildplatzhalter</span>${escapeHtml(brief)}</figcaption>` : ""}
  </figure>`;
}

