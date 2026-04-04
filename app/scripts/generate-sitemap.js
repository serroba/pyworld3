#!/usr/bin/env node

/**
 * Generate sitemap.xml with locale variants for all routes.
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://limits.world";

const LOCALES = [
  "en", "es", "pt-BR", "pt-PT", "fr", "de", "it", "nl", "hu", "pl", "tr",
  "ru", "uk", "ar", "hi", "bn", "id", "vi", "th", "ja", "zh-CN", "zh-TW",
];

const ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/history", priority: "0.8" },
  { path: "/faq", priority: "0.7" },
  { path: "/model", priority: "0.8" },
  { path: "/explore", priority: "0.9" },
  { path: "/compare", priority: "0.7" },
  { path: "/advanced", priority: "0.7" },
  { path: "/calibrate", priority: "0.6" },
  { path: "/developers", priority: "0.5" },
  { path: "/what-is-world3", priority: "0.8" },
  { path: "/limits-to-growth-model", priority: "0.8" },
  { path: "/world3-scenarios", priority: "0.8" },
];

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

for (const route of ROUTES) {
  const suffix = route.path;

  // Default (English) URL
  xml += "  <url>\n";
  xml += `    <loc>${BASE}${suffix}</loc>\n`;
  xml += "    <changefreq>monthly</changefreq>\n";
  xml += `    <priority>${route.priority}</priority>\n`;
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}${suffix}" />\n`;
  for (const locale of LOCALES) {
    const localeHref = locale === "en" ? `${BASE}${suffix}` : `${BASE}/${locale}${suffix}`;
    xml += `    <xhtml:link rel="alternate" hreflang="${locale}" href="${localeHref}" />\n`;
  }
  xml += "  </url>\n";

  // Locale-prefixed URLs
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    xml += "  <url>\n";
    xml += `    <loc>${BASE}/${locale}${suffix}</loc>\n`;
    xml += "    <changefreq>monthly</changefreq>\n";
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}${suffix}" />\n`;
    for (const loc of LOCALES) {
      const localeHref = loc === "en" ? `${BASE}${suffix}` : `${BASE}/${loc}${suffix}`;
      xml += `    <xhtml:link rel="alternate" hreflang="${loc}" href="${localeHref}" />\n`;
    }
    xml += "  </url>\n";
  }
}

xml += "</urlset>\n";

const outPath = resolve(__dirname, "../sitemap.xml");
writeFileSync(outPath, xml, "utf-8");
const urlCount = ROUTES.length * LOCALES.length;
console.log(`Sitemap generated: ${urlCount} URLs (${ROUTES.length} routes × ${LOCALES.length} locales)`);
