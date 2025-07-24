import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ar'] as const; // Add your supported locales
export type Locale = (typeof locales)[number];


export default getRequestConfig(async ({ locale }) => {

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en'; // fallback to default locale
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});