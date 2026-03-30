export type TextDirection = "ltr" | "rtl";

export type MessageCatalog = Record<string, string>;

export type SupportedLocale = {
  code: string;
  nativeLabel: string;
  direction: TextDirection;
  fallback?: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type CatalogLoader = (locale: string) => Promise<MessageCatalog>;

type I18nOptions = {
  document?: Document;
  storage?: StorageLike | null;
  getNavigatorLanguages?: () => readonly string[];
  catalogLoader?: CatalogLoader;
};

export type I18nApi = {
  init: () => Promise<void>;
  t: (
    key: string,
    params?: Record<string, string | number>,
    fallback?: string,
  ) => string;
  setLocale: (locale: string) => Promise<void>;
  getLocale: () => string;
  getResolvedLocale: () => string;
  getDirection: () => TextDirection;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, options?: Intl.NumberFormatOptions) => string;
  applyDocument: (root?: ParentNode) => void;
  getSupportedLocales: () => readonly SupportedLocale[];
  labelForPreset: (key: string, fallback?: string) => string;
  descriptionForPreset: (key: string, fallback?: string) => string;
  labelForVariable: (key: string, fallback?: string) => string;
  labelForConstant: (key: string, fallback?: string) => string;
  labelForSector: (key: string, fallback?: string) => string;
  labelForConfidence: (key: string, fallback?: string) => string;
};

const STORAGE_KEY = "world3.locale";
const AUTO_LOCALE = "auto";
const DEFAULT_LOCALE = "en";

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
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
] as const;

const SUPPORTED_LOCALE_MAP = new Map(
  SUPPORTED_LOCALES.map((locale) => [locale.code, locale]),
);

const LOCALE_ALIASES: Readonly<Record<string, string>> = {
  pt: "pt-PT",
  zh: "zh-CN",
  "zh-TW": "zh-CN",
  "zh-HK": "zh-CN",
  "zh-SG": "zh-CN",
};

function normalizeLocalePart(
  value: string,
  index: number,
): string {
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

export function normalizeLocale(locale: string): string {
  const cleaned = locale.trim().replace(/_/g, "-");
  if (!cleaned) {
    return DEFAULT_LOCALE;
  }
  return cleaned
    .split("-")
    .map((part, index) => normalizeLocalePart(part, index))
    .join("-");
}

export function buildLocaleFallbackChain(locale: string): string[] {
  const normalized = normalizeLocale(locale);
  const pieces = normalized.split("-");
  const chain: string[] = [];
  for (let index = pieces.length; index > 0; index -= 1) {
    chain.push(pieces.slice(0, index).join("-"));
  }
  chain.push(DEFAULT_LOCALE);
  return [...new Set(chain)];
}

export function resolveSupportedLocale(locale: string): SupportedLocale {
  for (const candidate of buildLocaleFallbackChain(locale).filter(
    (value) => value !== DEFAULT_LOCALE,
  )) {
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
  return SUPPORTED_LOCALE_MAP.get(DEFAULT_LOCALE)!;
}

function interpolate(
  message: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return message;
  }
  return message.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

function defaultNavigatorLanguages(): readonly string[] {
  if (typeof navigator === "undefined") {
    return [DEFAULT_LOCALE];
  }
  const languages = navigator.languages?.filter(Boolean);
  if (languages && languages.length > 0) {
    return languages;
  }
  return [navigator.language || DEFAULT_LOCALE];
}

function defaultCatalogLoader(baseUrl: string): CatalogLoader {
  return async (locale) => {
    const url = new URL(`../data/locales/${locale}.json`, baseUrl).toString();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load locale catalog (${locale})`);
    }
    return response.json() as Promise<MessageCatalog>;
  };
}

function getStoredLocale(storage: StorageLike | null): string {
  try {
    return storage?.getItem(STORAGE_KEY) || AUTO_LOCALE;
  } catch {
    return AUTO_LOCALE;
  }
}

const ALLOWED_TRANSLATION_TAGS = new Set(["A", "EM", "STRONG", "CODE", "BR"]);
const ALLOWED_TRANSLATION_ATTRS = new Map<string, ReadonlySet<string>>([
  ["A", new Set(["href", "target", "rel"])],
]);

function appendLocalizedHtml(
  doc: Document,
  node: HTMLElement,
  translated: string,
) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(translated, "text/html");
  node.replaceChildren();

  const appendSafeChildren = (source: ParentNode, target: Node) => {
    source.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        target.appendChild(doc.createTextNode(child.textContent ?? ""));
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = child as HTMLElement;
      const tagName = element.tagName.toUpperCase();
      if (!ALLOWED_TRANSLATION_TAGS.has(tagName)) {
        appendSafeChildren(element, target);
        return;
      }

      const safeElement = doc.createElement(tagName.toLowerCase());
      const allowedAttrs = ALLOWED_TRANSLATION_ATTRS.get(tagName) ?? new Set<string>();
      Array.from(element.attributes).forEach((attribute) => {
        const attrName = attribute.name.toLowerCase();
        if (!allowedAttrs.has(attrName)) {
          return;
        }
        if (tagName === "A" && attrName === "href") {
          const value = attribute.value.trim();
          if (!/^https?:\/\//i.test(value)) {
            return;
          }
          safeElement.setAttribute(attrName, value);
          return;
        }
        safeElement.setAttribute(attrName, attribute.value);
      });
      appendSafeChildren(element, safeElement);
      target.appendChild(safeElement);
    });
  };

  appendSafeChildren(parsed.body, node);
}

export function createI18n(options: I18nOptions = {}): I18nApi {
  const doc = options.document ?? document;
  const storage = options.storage ?? localStorage;
  const getNavigatorLanguages = options.getNavigatorLanguages ?? defaultNavigatorLanguages;
  const catalogLoader = options.catalogLoader ?? defaultCatalogLoader(import.meta.url);

  let requestedLocale = AUTO_LOCALE;
  let resolvedLocale = DEFAULT_LOCALE;
  let direction: TextDirection = "ltr";
  let baseCatalog: MessageCatalog = {};
  let catalog: MessageCatalog = {};

  async function loadCatalogs(nextResolvedLocale: string) {
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

  function applyDocument(root: ParentNode = doc) {
    if (doc?.documentElement) {
      doc.documentElement.lang = resolvedLocale;
      doc.documentElement.dir = direction;
    }
    if (doc) {
      doc.title = t("meta.title", undefined, doc.title);
    }

    const nodes = root.querySelectorAll<HTMLElement>("[data-i18n]");
    nodes.forEach((node) => {
      const key = node.dataset.i18n!;
      const attr = node.dataset.i18nAttr;
      const translated = t(key, undefined, node.textContent ?? "");
      if (attr) {
        node.setAttribute(attr, translated);
      } else if (node.dataset.i18nHtml === "true") {
        appendLocalizedHtml(doc, node, translated);
      } else {
        node.textContent = translated;
      }
    });
  }

  function t(
    key: string,
    params?: Record<string, string | number>,
    fallback?: string,
  ): string {
    const message = catalog[key] ?? baseCatalog[key] ?? fallback ?? key;
    return interpolate(message, params);
  }

  async function setLocale(locale: string) {
    requestedLocale = locale || AUTO_LOCALE;
    const browserLocale = getNavigatorLanguages()[0] ?? DEFAULT_LOCALE;
    const requested = requestedLocale === AUTO_LOCALE ? browserLocale : requestedLocale;
    const supported = resolveSupportedLocale(requested);
    resolvedLocale = supported.code;
    direction = supported.direction;

    if (requestedLocale === AUTO_LOCALE) {
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage failures and continue with in-memory locale state.
      }
    } else {
      try {
        storage?.setItem(STORAGE_KEY, requestedLocale);
      } catch {
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
