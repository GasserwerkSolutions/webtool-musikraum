import { PRESETS, escapeAttr, escapeHtml, isSafeHttpUrl, safeJson, } from "./domain.js";
export const MUSICRAUM_HERO_URL = "https://raw.githubusercontent.com/GasserwerkSolutions/musikraum/main/assets/photos/hero-klangraum-wood-1200w.webp";
const HARFE_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='15' fill='%23343b39'/%3E%3Cpath d='M17 50.5h33' fill='none' stroke='%23f3dfae' stroke-width='4.5' stroke-linecap='round'/%3E%3Cpath d='M19.5 49.5c7-8.5 10-21.5 8.8-36 8.7 2.8 15.8 7.7 21.2 14.2' fill='none' stroke='%23d9ba70' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M49.5 27.7c-1.2 7.8-.9 15.3.5 22.8' fill='none' stroke='%23f3dfae' stroke-width='5' stroke-linecap='round'/%3E%3Cg fill='none' stroke='%239fb9b3' stroke-width='1.35' stroke-linecap='round'%3E%3Cpath d='M29 19.5 47.7 29'/%3E%3Cpath d='M28.7 25.7 48 32.5'/%3E%3Cpath d='M27.8 32 48.1 36'/%3E%3Cpath d='M26 38.5 48.6 40'/%3E%3Cpath d='M23.4 44.6h26'/%3E%3C/g%3E%3C/svg%3E";
const SECTION_META = {
    intro: { id: "franz", nav: "Über Franz" },
    why: { id: "frei-spielen", nav: "Frei spielen" },
    offers: { id: "angebote", nav: "Klangabende" },
    story: { id: "geschichte", nav: "Geschichte" },
    contact: { id: "kontakt", nav: "Kontakt" },
};
export function buildWebsiteHtml(draft, options = {}) {
    const preset = PRESETS[draft.theme.preset] ?? PRESETS.musikraum;
    const theme = { ...preset, primary: draft.theme.primary, accent: draft.theme.accent };
    const heroImageUrl = options.heroImageUrl || MUSICRAUM_HERO_URL;
    const address = [draft.site.address, [draft.site.postalCode, draft.site.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const visibleOrder = draft.layout.order.filter((key) => draft.layout.visibility[key]);
    const firstContentId = SECTION_META[visibleOrder.find((key) => key !== "contact") ?? "contact"].id;
    const nav = visibleOrder.map((key) => `<a href="#${SECTION_META[key].id}">${escapeHtml(SECTION_META[key].nav)}</a>`).join("");
    const sections = visibleOrder.map((key) => renderSection(key, draft, address)).join("");
    const schema = {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        name: draft.site.name,
        description: draft.copy.heroSubtitle,
        telephone: draft.site.phone || undefined,
        email: draft.site.email || undefined,
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
  <style>${websiteCss(theme, heroImageUrl)}</style>
</head>
<body>
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="#top"><span class="brand-mark" aria-hidden="true"><img src="${HARFE_FAVICON}" alt="" style="display:block;width:100%;height:100%;object-fit:contain;border-radius:inherit"></span><span><strong>${escapeHtml(draft.site.name)}</strong><small>${escapeHtml(draft.site.tagline)}</small></span></a>
      <button class="menu-button" type="button" aria-label="Navigation anzeigen" aria-expanded="false"><span></span><span></span><span></span></button>
      <nav class="main-nav" aria-label="Hauptnavigation">${nav}</nav>
    </div>
  </header>
  <main id="main">
    <section class="hero" id="top">
      <div class="container hero-inner">
        <p class="eyebrow">${escapeHtml(draft.copy.heroLabel)}</p>
        <h1>${escapeHtml(draft.copy.heroTitle)}</h1>
        <p class="hero-lead">${escapeHtml(draft.copy.heroSubtitle)}</p>
        <div class="actions"><a class="button button-light" href="#${firstContentId}">${escapeHtml(draft.copy.heroPrimaryAction)}</a>${draft.layout.visibility.contact ? `<a class="button button-ghost" href="#kontakt">${escapeHtml(draft.copy.heroSecondaryAction)}</a>` : ""}</div>
        <div class="hero-notes" aria-label="Auf einen Blick"><span>In der Gruppe</span><span>Viele Instrumente</span><span>Frei statt vorgegeben</span></div>
      </div>
    </section>
    ${sections}
  </main>
  <footer class="site-footer"><div class="container footer-grid"><div><strong>${escapeHtml(draft.site.name)}</strong><p>${escapeHtml(draft.site.tagline)}</p></div><div>${address ? `<p>${escapeHtml(address)}</p>` : ""}${draft.site.email ? `<a href="mailto:${escapeAttr(draft.site.email)}">${escapeHtml(draft.site.email)}</a>` : ""}</div><p>© ${new Date().getFullYear()} ${escapeHtml(draft.site.name)}</p></div></footer>
  <script>(()=>{const b=document.querySelector('.menu-button'),n=document.querySelector('.main-nav');if(!b||!n)return;b.addEventListener('click',()=>{const o=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!o));n.classList.toggle('is-open',!o)});n.addEventListener('click',()=>{b.setAttribute('aria-expanded','false');n.classList.remove('is-open')})})();</script>
</body>
</html>`;
}
function renderSection(key, draft, address) {
    const copy = draft.copy;
    if (key === "intro")
        return `<section class="section intro" id="franz"><div class="container split"><div><p class="eyebrow">${escapeHtml(copy.introLabel)}</p><h2>${escapeHtml(copy.introTitle)}</h2><blockquote>„${escapeHtml(copy.introQuote)}“</blockquote></div><div><p class="lead">${escapeHtml(copy.introText)}</p><ul class="plain-list"><li>gemeinsam spielen und aufeinander hören</li><li>Instrumente aus aller Welt ausprobieren</li><li>ohne Noten und ohne Leistungsdruck</li></ul></div></div></section>`;
    if (key === "why")
        return `<section class="section dark-band" id="frei-spielen"><div class="container narrow"><p class="eyebrow">${escapeHtml(copy.whyLabel)}</p><h2>${escapeHtml(copy.whyTitle)}</h2><p class="lead">${escapeHtml(copy.whyText)}</p><div class="resonance" aria-hidden="true"><span></span><span></span><span></span></div></div></section>`;
    if (key === "offers") {
        const cards = draft.offers.filter((offer) => offer.title.trim()).map((offer, index) => `<article class="card"><span class="card-number">0${index + 1}</span><h3>${escapeHtml(offer.title)}</h3>${offer.text ? `<p>${escapeHtml(offer.text)}</p>` : ""}</article>`).join("");
        return `<section class="section offers" id="angebote"><div class="container"><div class="section-head"><p class="eyebrow">Die Klangabende</p><h2>${escapeHtml(copy.offersTitle)}</h2><p class="lead">${escapeHtml(copy.offersIntro)}</p></div><div class="card-grid">${cards || '<p class="empty">Weitere Angaben folgen.</p>'}</div></div></section>`;
    }
    if (key === "story")
        return `<section class="section story" id="geschichte"><div class="container split"><div><p class="eyebrow">${escapeHtml(copy.storyLabel)}</p><h2>${escapeHtml(copy.storyTitle)}</h2></div><p class="lead">${escapeHtml(copy.storyText)}</p></div></section>`;
    const contactLinks = [
        draft.site.email ? `<a class="button button-light" href="mailto:${escapeAttr(draft.site.email)}?subject=Anfrage%20${escapeAttr(draft.site.name)}">Jetzt unverbindlich anfragen</a>` : "",
        draft.site.phone ? `<a class="button button-ghost" href="tel:${escapeAttr(draft.site.phone.replace(/\s+/g, ""))}">${escapeHtml(draft.site.phone)} anrufen</a>` : "",
        isSafeHttpUrl(draft.site.instagram) ? `<a class="button button-ghost" href="${escapeAttr(draft.site.instagram)}" target="_blank" rel="noopener">Instagram</a>` : "",
    ].filter(Boolean).join("");
    return `<section class="section contact" id="kontakt"><div class="container narrow"><p class="eyebrow">Kontakt</p><h2>${escapeHtml(copy.contactTitle)}</h2><p class="lead">${escapeHtml(copy.contactText)}</p>${address ? `<p class="address">${escapeHtml(address)}</p>` : ""}<div class="actions centered">${contactLinks}</div></div></section>`;
}
function websiteCss(theme, heroImageUrl) {
    return `:root{color-scheme:light;--primary:${theme.primary};--accent:${theme.accent};--bg:${theme.bg};--surface:${theme.surface};--text:${theme.text};--display:${theme.display};--body:${theme.body};--radius:${theme.radius};--max:1120px;--shadow:0 18px 48px rgba(37,31,24,.14)}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:76px}body{margin:0;min-width:320px;background:var(--bg);color:var(--text);font-family:var(--body);font-size:1.04rem;line-height:1.65}a{color:inherit}.container{width:min(var(--max),calc(100% - 40px));margin-inline:auto}.skip-link{position:fixed;left:12px;top:-80px;z-index:100;padding:10px 14px;background:#fff;color:#111;border-radius:8px}.skip-link:focus{top:12px}.site-header{position:sticky;top:0;z-index:20;background:rgba(255,249,239,.94);border-bottom:1px solid rgba(64,59,52,.12);backdrop-filter:blur(15px)}.header-inner{min-height:76px;display:flex;align-items:center;gap:24px}.brand{display:flex;align-items:center;gap:10px;text-decoration:none;line-height:1}.brand>span:last-child{display:grid}.brand strong{font-family:var(--display);font-size:1.42rem}.brand small{margin-top:5px;font-size:.61rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#756c62}.brand-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,var(--primary),#202725);box-shadow:inset 0 0 0 2px rgba(255,255,255,.25)}.brand-mark i{width:22px;height:22px;border:1px solid #d8c17c;border-radius:50%;position:relative}.brand-mark i:after{content:"";position:absolute;left:4px;right:4px;top:10px;height:1px;background:#d8c17c;box-shadow:0 -4px 0 rgba(216,193,124,.5),0 4px 0 rgba(216,193,124,.5)}.main-nav{margin-left:auto;display:flex;align-items:center;gap:2px}.main-nav a{padding:10px 9px;border-radius:8px;text-decoration:none;font-size:.88rem;font-weight:750}.main-nav a:hover{background:rgba(88,114,113,.1)}.menu-button{display:none;margin-left:auto;width:44px;height:44px;border:0;border-radius:10px;background:rgba(64,59,52,.08)}.menu-button span{display:block;width:21px;height:2px;margin:4px auto;background:currentColor}.hero{min-height:calc(100svh - 76px);display:flex;align-items:center;position:relative;isolation:isolate;color:#fff;background:#494840 url("${escapeCssUrl(heroImageUrl)}") center/cover no-repeat}.hero:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(24,23,20,.78),rgba(35,30,25,.52) 55%,rgba(20,19,17,.3)),linear-gradient(180deg,rgba(20,19,17,.24),rgba(20,19,17,.44))}.hero-inner{padding:96px 0 110px}.eyebrow{display:flex;align-items:center;gap:12px;margin:0 0 17px;color:var(--accent);font-size:.76rem;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.eyebrow:before{content:"";width:32px;height:1px;background:currentColor}.hero .eyebrow,.dark-band .eyebrow{color:#d6b96f}.hero h1{max-width:780px;margin:0 0 20px;font:700 clamp(3rem,8vw,6.5rem)/.98 var(--display);letter-spacing:-.035em;text-wrap:balance}.hero-lead{max-width:700px;margin:0;font-size:clamp(1.05rem,1.6vw,1.28rem);color:rgba(255,255,255,.94)}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:11px 19px;border:1px solid transparent;border-radius:var(--radius);text-decoration:none;font-weight:800}.button-light{background:#fff;color:var(--primary);box-shadow:0 10px 24px rgba(0,0,0,.13)}.button-ghost{border-color:rgba(255,255,255,.48);background:rgba(255,255,255,.08);color:#fff}.hero-notes{display:flex;flex-wrap:wrap;gap:9px;margin-top:23px}.hero-notes span{padding:6px 10px;border:1px solid rgba(255,255,255,.32);border-radius:8px;background:rgba(255,255,255,.11);font-size:.84rem}.hero-notes span:before{content:"";display:inline-block;width:7px;height:7px;margin-right:8px;border-radius:50%;background:#d6b96f}.section{padding:clamp(4.5rem,9vw,7.5rem) 0;background:linear-gradient(135deg,var(--bg),color-mix(in srgb,var(--surface) 75%,var(--bg)))}h2,h3,blockquote{font-family:var(--display)}h2{max-width:780px;margin:0 0 24px;font-size:clamp(2.15rem,5vw,4rem);line-height:1.06;letter-spacing:-.025em;text-wrap:balance}.lead{margin:0;color:color-mix(in srgb,var(--text) 72%,transparent);font-size:clamp(1.05rem,1vw + .8rem,1.22rem)}.split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(2.5rem,7vw,6.5rem);align-items:center}.intro blockquote{margin:18px 0 0;font-size:clamp(1.5rem,3vw,2.45rem);line-height:1.22}.plain-list{display:grid;gap:11px;margin:28px 0 0;padding:0;list-style:none}.plain-list li{display:flex;gap:12px}.plain-list li:before{content:"";width:8px;height:8px;margin-top:.58em;border-radius:50%;background:var(--accent);flex:0 0 auto}.dark-band,.contact{color:#fff;background:linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--primary) 72%,#161817))}.narrow{max-width:840px;text-align:center}.narrow .eyebrow{justify-content:center}.narrow .lead{color:rgba(255,255,255,.84)}.resonance{display:flex;justify-content:center;gap:13px;margin-top:38px}.resonance span{width:18px;height:18px;border:1px solid #d6b96f;border-radius:50%}.resonance span:nth-child(2){width:34px;height:34px;margin-top:-8px}.resonance span:nth-child(3){width:50px;height:50px;margin-top:-16px}.offers{background:color-mix(in srgb,var(--surface) 78%,white)}.section-head{max-width:780px;margin-bottom:34px}.card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.card{position:relative;padding:28px;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);border-radius:var(--radius);background:rgba(255,255,255,.5);overflow:hidden}.card-number{position:absolute;right:20px;top:12px;color:color-mix(in srgb,var(--accent) 28%,transparent);font:700 3.4rem/1 var(--display)}.card h3{position:relative;margin:26px 0 12px;font-size:1.55rem}.card p{position:relative;margin:0;color:color-mix(in srgb,var(--text) 72%,transparent)}.story{background:linear-gradient(135deg,color-mix(in srgb,var(--bg) 85%,white),var(--bg))}.contact .address{margin:22px 0 0;color:rgba(255,255,255,.72)}.centered{justify-content:center}.site-footer{padding:45px 0;background:#202725;color:rgba(255,255,255,.76);font-size:.9rem}.footer-grid{display:grid;grid-template-columns:1.4fr 1fr auto;gap:30px;align-items:start}.footer-grid strong{font:700 1.45rem var(--display);color:#fff}.footer-grid p{margin:4px 0}.footer-grid a{display:block;color:#fff}@media(max-width:860px){.main-nav{display:none;position:absolute;left:14px;right:14px;top:68px;padding:10px;border:1px solid rgba(64,59,52,.14);border-radius:14px;background:#fff9ef;box-shadow:var(--shadow)}.main-nav.is-open{display:grid}.menu-button{display:block}.split{grid-template-columns:1fr}.card-grid{grid-template-columns:1fr}.footer-grid{grid-template-columns:1fr 1fr}.footer-grid>p{grid-column:1/-1}.hero-inner{padding:80px 0 86px}}@media(max-width:560px){.container{width:min(100% - 26px,var(--max))}.brand small{display:none}.hero{min-height:calc(100svh - 76px);background-position:58% center}.hero h1{font-size:clamp(2.85rem,15vw,4.4rem)}.actions .button{width:100%}.hero-notes{align-items:flex-start;flex-direction:column}.section{padding:4.2rem 0}.footer-grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}`;
}
function escapeCssUrl(value) {
    return value.replace(/["'()\\\n\r]/g, (character) => `\\${character}`);
}
