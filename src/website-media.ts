export type WebsiteMediaAssets = {
  hero: string;
  portrait: string;
  detail: string;
};

export const RAUM_FUER_KLANG_URL = "https://xn--raum-fr-klang-1ob.ch/";

export const RAUM_FUER_KLANG_MEDIA: Readonly<WebsiteMediaAssets> = {
  hero: placeholderSvg({
    width: 960,
    height: 1120,
    title: "Foto folgt",
    subtitle: "Franz’ grosses Sandpendel im Raum",
    note: "Hochformat mit ruhiger Umgebung und sichtbarer Pendelspur",
    variant: "hero",
  }),
  portrait: placeholderSvg({
    width: 800,
    height: 1000,
    title: "Foto folgt",
    subtitle: "Franz mit ausgewählten Instrumenten",
    note: "Natürliches Hochformat, offen und ungestellt",
    variant: "portrait",
  }),
  detail: placeholderSvg({
    width: 1000,
    height: 760,
    title: "Foto folgt",
    subtitle: "Hände, Sand oder ein Instrument im Detail",
    note: "Ruhiges Querformat mit Material und Bewegung",
    variant: "detail",
  }),
};

/** Backwards-compatible export name used by tests and export code. */
export const MUSICRAUM_HERO_URL = RAUM_FUER_KLANG_MEDIA.hero;

export const HARFE_FAVICON = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="#214f68"/>
  <path d="M17 50.5h33" fill="none" stroke="#f5e8cc" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M19.5 49.5c7-8.5 10-21.5 8.8-36 8.7 2.8 15.8 7.7 21.2 14.2" fill="none" stroke="#d99a62" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M49.5 27.7c-1.2 7.8-.9 15.3.5 22.8" fill="none" stroke="#f5e8cc" stroke-width="5" stroke-linecap="round"/>
  <g fill="none" stroke="#b9d2d7" stroke-width="1.35" stroke-linecap="round"><path d="M30 18.5v26"/><path d="M34 20.2v24.3"/><path d="M38 22.2v22.3"/><path d="M42 24.5v20"/><path d="M46 27v17.5"/></g>
</svg>`);


export function pendulumTraceMarkup(): string {
  return `<svg viewBox="0 0 560 420" role="presentation">
    <defs><linearGradient id="trace" x1="0" y1="0" x2="1" y2="1"><stop stop-color="currentColor" stop-opacity=".18"/><stop offset="1" stop-color="currentColor" stop-opacity=".62"/></linearGradient></defs>
    <g fill="none" stroke="url(#trace)" stroke-width="2" stroke-linecap="round">
      <path d="M36 344C112 90 220 68 286 344S440 594 524 116"/>
      <path d="M44 348C126 120 222 94 286 348S430 560 516 142"/>
      <path d="M54 352C140 150 226 120 286 352S420 526 506 170"/>
      <path d="M68 356C156 184 230 148 286 356S408 492 492 202"/>
      <path d="M86 360C174 222 238 180 286 360S392 456 474 238"/>
      <path d="M110 364C196 262 246 218 286 364S374 424 450 278"/>
      <path d="M144 368C220 306 258 262 286 368S352 398 418 322"/>
    </g>
    <circle cx="286" cy="52" r="9" fill="currentColor" opacity=".72"/>
    <path d="M286 61v46" stroke="currentColor" stroke-width="2" opacity=".5"/>
  </svg>`;
}

function placeholderSvg(options: { width: number; height: number; title: string; subtitle: string; note: string; variant: "hero" | "portrait" | "detail" }): string {
  const { width, height, title, subtitle, note, variant } = options;
  const heroTrace = `<path d="M80 ${height * .76}C${width * .2} ${height * .12} ${width * .46} ${height * .2} ${width * .53} ${height * .76}S${width * .78} ${height * 1.03} ${width * .92} ${height * .3}"/><path d="M100 ${height * .79}C${width * .25} ${height * .22} ${width * .47} ${height * .28} ${width * .53} ${height * .79}S${width * .76} ${height * .95} ${width * .88} ${height * .38}"/>`;
  const portraitTrace = `<ellipse cx="${width * .5}" cy="${height * .38}" rx="${width * .17}" ry="${height * .18}"/><path d="M${width * .22} ${height * .82}c${width * .08}-${height * .24} ${width * .48}-${height * .24} ${width * .56} 0"/><path d="M${width * .23} ${height * .7}Q${width * .5} ${height * .48} ${width * .77} ${height * .7}"/>`;
  const detailTrace = `<path d="M70 ${height * .66}Q${width * .25} ${height * .18} ${width * .46} ${height * .65}T${width * .9} ${height * .34}"/><path d="M90 ${height * .72}Q${width * .28} ${height * .3} ${width * .47} ${height * .7}T${width * .86} ${height * .44}"/><circle cx="${width * .72}" cy="${height * .3}" r="${Math.min(width, height) * .08}"/>`;
  const trace = variant === "hero" ? heroTrace : variant === "portrait" ? portraitTrace : detailTrace;
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dbe9ed"/><stop offset=".52" stop-color="#f5f0e6"/><stop offset="1" stop-color="#d9e4df"/></linearGradient>
      <pattern id="grain" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" fill="#214f68" opacity=".035"/><circle cx="15" cy="13" r="1" fill="#a45b2a" opacity=".04"/></pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <rect width="${width}" height="${height}" fill="url(#grain)"/>
    <g fill="none" stroke="#214f68" stroke-width="${Math.max(2, width / 300)}" stroke-linecap="round" opacity=".25">${trace}</g>
    <circle cx="${width * .5}" cy="${height * .09}" r="${Math.min(width, height) * .016}" fill="#a45b2a" opacity=".9"/>
    <g font-family="system-ui,Segoe UI,sans-serif" text-anchor="middle" fill="#214f68">
      <text x="${width / 2}" y="${height * .45}" font-size="${Math.max(26, width * .048)}" font-weight="750" letter-spacing="2">${escapeSvgText(title.toUpperCase())}</text>
      <text x="${width / 2}" y="${height * .51}" font-size="${Math.max(20, width * .032)}" font-weight="650">${escapeSvgText(subtitle)}</text>
      <text x="${width / 2}" y="${height * .56}" font-size="${Math.max(15, width * .022)}" fill="#4e626b">${escapeSvgText(note)}</text>
    </g>
    <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="24" fill="none" stroke="#214f68" stroke-opacity=".14" stroke-dasharray="10 12"/>
  </svg>`);
}

function svgDataUrl(svg: string): string { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }
function escapeSvgText(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
