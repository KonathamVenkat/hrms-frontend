/**
 * Locale used to format dates for each UI language. English keeps day-month-year order and Arabic
 * uses Western digits, as elsewhere in the app.
 */
const DATE_LOCALES: Record<string, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
  ar: 'ar-u-nu-latn',
};

/** Formats an ISO date (yyyy-MM-dd or a full timestamp) as "05 Jan 2026" in the given UI language. */
export function formatDisplayDate(value: string | null | undefined, lang: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(DATE_LOCALES[lang] ?? DATE_LOCALES['en'], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
