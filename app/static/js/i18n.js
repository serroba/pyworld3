const STORAGE_KEY = "world3.locale";
const AUTO_LOCALE = "auto";
const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = [
    { code: "en", nativeLabel: "English", direction: "ltr" },
    { code: "es", nativeLabel: "Español", direction: "ltr" },
    { code: "pt-BR", nativeLabel: "Português (Brasil)", direction: "ltr", fallback: "pt-PT" },
    { code: "pt-PT", nativeLabel: "Português (Portugal)", direction: "ltr" },
    { code: "fr", nativeLabel: "Français", direction: "ltr" },
    { code: "de", nativeLabel: "Deutsch", direction: "ltr" },
    { code: "it", nativeLabel: "Italiano", direction: "ltr" },
    { code: "nl", nativeLabel: "Nederlands", direction: "ltr" },
    { code: "pl", nativeLabel: "Polski", direction: "ltr" },
    { code: "tr", nativeLabel: "Türkçe", direction: "ltr" },
    { code: "ru", nativeLabel: "Русский", direction: "ltr" },
    { code: "uk", nativeLabel: "Українська", direction: "ltr" },
    { code: "ar", nativeLabel: "العربية", direction: "rtl" },
    { code: "hi", nativeLabel: "हिन्दी", direction: "ltr" },
    { code: "bn", nativeLabel: "বাংলা", direction: "ltr" },
    { code: "id", nativeLabel: "Bahasa Indonesia", direction: "ltr" },
    { code: "vi", nativeLabel: "Tiếng Việt", direction: "ltr" },
    { code: "th", nativeLabel: "ไทย", direction: "ltr" },
    { code: "ja", nativeLabel: "日本語", direction: "ltr" },
    { code: "zh-CN", nativeLabel: "简体中文", direction: "ltr" },
];
const SUPPORTED_LOCALE_MAP = new Map(SUPPORTED_LOCALES.map((locale) => [locale.code, locale]));
const LOCALE_ALIASES = {
    pt: "pt-PT",
    zh: "zh-CN",
    "zh-TW": "zh-CN",
    "zh-HK": "zh-CN",
    "zh-SG": "zh-CN",
};
function normalizeLocalePart(value, index) {
    if (!value) {
        return value;
    }
    if (index === 0) {
        return value.toLowerCase();
    }
    if (value.length === 2) {
        return value.toUpperCase();
    }
    return value;
}
export function normalizeLocale(locale) {
    const cleaned = locale.trim().replace(/_/g, "-");
    if (!cleaned) {
        return DEFAULT_LOCALE;
    }
    return cleaned
        .split("-")
        .map((part, index) => normalizeLocalePart(part, index))
        .join("-");
}
export function buildLocaleFallbackChain(locale) {
    const normalized = normalizeLocale(locale);
    const pieces = normalized.split("-");
    const chain = [];
    for (let index = pieces.length; index > 0; index -= 1) {
        chain.push(pieces.slice(0, index).join("-"));
    }
    chain.push(DEFAULT_LOCALE);
    return [...new Set(chain)];
}
export function resolveSupportedLocale(locale) {
    for (const candidate of buildLocaleFallbackChain(locale).filter((value) => value !== DEFAULT_LOCALE)) {
        const direct = SUPPORTED_LOCALE_MAP.get(candidate);
        if (direct) {
            return direct;
        }
        const aliased = LOCALE_ALIASES[candidate];
        if (aliased) {
            const supported = SUPPORTED_LOCALE_MAP.get(aliased);
            if (supported) {
                return supported;
            }
        }
    }
    return SUPPORTED_LOCALE_MAP.get(DEFAULT_LOCALE);
}
function interpolate(message, params) {
    if (!params) {
        return message;
    }
    return message.replace(/\{(\w+)\}/g, (_match, name) => {
        const value = params[name];
        return value === undefined ? `{${name}}` : String(value);
    });
}
function defaultNavigatorLanguages() {
    if (typeof navigator === "undefined") {
        return [DEFAULT_LOCALE];
    }
    const languages = navigator.languages?.filter(Boolean);
    if (languages && languages.length > 0) {
        return languages;
    }
    return [navigator.language || DEFAULT_LOCALE];
}
function defaultCatalogLoader(baseUrl) {
    return async (locale) => {
        const url = new URL(`../data/locales/${locale}.json`, baseUrl).toString();
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load locale catalog (${locale})`);
        }
        return response.json();
    };
}
function getStoredLocale(storage) {
    try {
        return storage?.getItem(STORAGE_KEY) || AUTO_LOCALE;
    }
    catch {
        return AUTO_LOCALE;
    }
}
const ALLOWED_TRANSLATION_TAGS = new Set(["A", "EM", "STRONG", "CODE", "BR"]);
const ALLOWED_TRANSLATION_ATTRS = new Map([
    ["A", new Set(["href", "target", "rel"])],
]);
const LOCALIZED_TAG_PATTERN = /<(\/?)(a|em|strong|code|br)([^>]*)>/gi;
const LOCALIZED_ATTR_PATTERN = /(\w+)="([^"]*)"/g;
function appendLocalizedHtml(doc, node, translated) {
    node.replaceChildren();
    const stack = [];
    let currentParent = node;
    let cursor = 0;
    const appendText = (value) => {
        if (!value) {
            return;
        }
        currentParent.appendChild(doc.createTextNode(value));
    };
    for (const match of translated.matchAll(LOCALIZED_TAG_PATTERN)) {
        const rawTag = match[0] ?? "";
        const slash = match[1] ?? "";
        const rawTagName = match[2] ?? "";
        const rawAttrs = match[3] ?? "";
        const matchIndex = match.index ?? 0;
        appendText(translated.slice(cursor, matchIndex));
        cursor = matchIndex + rawTag.length;
        const tagName = rawTagName.toUpperCase();
        if (!ALLOWED_TRANSLATION_TAGS.has(tagName)) {
            appendText(rawTag);
            continue;
        }
        if (tagName === "BR" && !slash) {
            currentParent.appendChild(doc.createElement("br"));
            continue;
        }
        if (slash) {
            while (stack.length > 0) {
                const last = stack.pop();
                currentParent = stack.at(-1) ?? node;
                if (last.tagName.toUpperCase() === tagName) {
                    break;
                }
            }
            continue;
        }
        const safeElement = doc.createElement(tagName.toLowerCase());
        const allowedAttrs = ALLOWED_TRANSLATION_ATTRS.get(tagName) ?? new Set();
        let attrMatch;
        LOCALIZED_ATTR_PATTERN.lastIndex = 0;
        while ((attrMatch = LOCALIZED_ATTR_PATTERN.exec(rawAttrs)) !== null) {
            const rawAttrName = attrMatch[1] ?? "";
            const rawAttrValue = attrMatch[2] ?? "";
            const attrName = rawAttrName.toLowerCase();
            if (!allowedAttrs.has(attrName)) {
                continue;
            }
            const attrValue = rawAttrValue.trim();
            if (tagName === "A" && attrName === "href") {
                if (!/^https?:\/\//i.test(attrValue)) {
                    continue;
                }
                safeElement.setAttribute(attrName, attrValue);
                continue;
            }
            safeElement.setAttribute(attrName, attrValue);
        }
        currentParent.appendChild(safeElement);
        stack.push(safeElement);
        currentParent = safeElement;
    }
    appendText(translated.slice(cursor));
}
export function createI18n(options = {}) {
    const doc = options.document ?? document;
    const storage = options.storage ?? localStorage;
    const getNavigatorLanguages = options.getNavigatorLanguages ?? defaultNavigatorLanguages;
    const catalogLoader = options.catalogLoader ?? defaultCatalogLoader(import.meta.url);
    let requestedLocale = AUTO_LOCALE;
    let resolvedLocale = DEFAULT_LOCALE;
    let direction = "ltr";
    let baseCatalog = {};
    let catalog = {};
    async function loadCatalogs(nextResolvedLocale) {
        if (nextResolvedLocale === DEFAULT_LOCALE) {
            baseCatalog = await catalogLoader(DEFAULT_LOCALE);
            catalog = { ...baseCatalog };
            return;
        }
        const [englishCatalog, localizedCatalog] = await Promise.all([
            catalogLoader(DEFAULT_LOCALE),
            catalogLoader(nextResolvedLocale).catch(() => ({})),
        ]);
        baseCatalog = englishCatalog;
        catalog = {
            ...englishCatalog,
            ...localizedCatalog,
        };
    }
    function applyDocument(root = doc) {
        if (doc?.documentElement) {
            doc.documentElement.lang = resolvedLocale;
            doc.documentElement.dir = direction;
        }
        if (doc) {
            doc.title = t("meta.title", undefined, doc.title);
        }
        const nodes = root.querySelectorAll("[data-i18n]");
        nodes.forEach((node) => {
            const key = node.dataset.i18n;
            const attr = node.dataset.i18nAttr;
            const translated = t(key, undefined, node.textContent ?? "");
            if (attr) {
                node.setAttribute(attr, translated);
            }
            else if (node.dataset.i18nHtml === "true") {
                appendLocalizedHtml(doc, node, translated);
            }
            else {
                node.textContent = translated;
            }
        });
    }
    function t(key, params, fallback) {
        const message = catalog[key] ?? baseCatalog[key] ?? fallback ?? key;
        return interpolate(message, params);
    }
    async function setLocale(locale) {
        requestedLocale = locale || AUTO_LOCALE;
        const browserLocale = getNavigatorLanguages()[0] ?? DEFAULT_LOCALE;
        const requested = requestedLocale === AUTO_LOCALE ? browserLocale : requestedLocale;
        const supported = resolveSupportedLocale(requested);
        resolvedLocale = supported.code;
        direction = supported.direction;
        if (requestedLocale === AUTO_LOCALE) {
            try {
                storage?.removeItem(STORAGE_KEY);
            }
            catch {
                // Ignore storage failures and continue with in-memory locale state.
            }
        }
        else {
            try {
                storage?.setItem(STORAGE_KEY, requestedLocale);
            }
            catch {
                // Ignore storage failures and continue with in-memory locale state.
            }
        }
        await loadCatalogs(resolvedLocale);
        applyDocument();
        window.dispatchEvent(new CustomEvent("world3:localechange", {
            detail: {
                locale: requestedLocale,
                resolvedLocale,
                direction,
            },
        }));
    }
    return {
        async init() {
            await setLocale(getStoredLocale(storage));
        },
        t,
        setLocale,
        getLocale() {
            return requestedLocale;
        },
        getResolvedLocale() {
            return resolvedLocale;
        },
        getDirection() {
            return direction;
        },
        formatNumber(value, options = {}) {
            return new Intl.NumberFormat(resolvedLocale, options).format(value);
        },
        formatPercent(value, options = {}) {
            return new Intl.NumberFormat(resolvedLocale, {
                style: "percent",
                maximumFractionDigits: 1,
                ...options,
            }).format(value);
        },
        applyDocument,
        getSupportedLocales() {
            return SUPPORTED_LOCALES;
        },
        labelForPreset(key, fallback) {
            return t(`preset.${key}.name`, undefined, fallback ?? key);
        },
        descriptionForPreset(key, fallback) {
            return t(`preset.${key}.description`, undefined, fallback ?? "");
        },
        labelForVariable(key, fallback) {
            return t(`variable.${key}`, undefined, fallback ?? key);
        },
        labelForConstant(key, fallback) {
            return t(`constant.${key}`, undefined, fallback ?? key);
        },
        labelForSector(key, fallback) {
            return t(`sector.${key.toLowerCase()}`, undefined, fallback ?? key);
        },
        labelForConfidence(key, fallback) {
            return t(`confidence.${key.toLowerCase()}`, undefined, fallback ?? key);
        },
    };
}
