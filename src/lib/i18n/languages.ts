export type UiLanguage = "en" | "ar" | "pt";

export type LanguageOption = {
  code: UiLanguage;
  label: string;
  nativeLabel: string;
  rtl: boolean;
};

export const DEFAULT_LANGUAGE: UiLanguage = "en";

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", rtl: false },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", rtl: true },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", rtl: false },
];

const BY_CODE = new Map<string, LanguageOption>(LANGUAGES.map((l) => [l.code, l]));

/** Coerce an arbitrary value to a supported language, falling back to the default. */
export function normalizeLanguage(lang: unknown): UiLanguage {
  return typeof lang === "string" && BY_CODE.has(lang) ? (lang as UiLanguage) : DEFAULT_LANGUAGE;
}

export function isRtl(lang: UiLanguage): boolean {
  return BY_CODE.get(lang)?.rtl ?? false;
}
