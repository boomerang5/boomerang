// app/i18n/request.ts
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => {
  // Aseguramos un string siempre
  const incoming = (locale ?? "es") as string;

  // Validamos contra los locales soportados, con tipado literal
  const supported = ["en", "es"] as const;
  const isSupported = (l: string): l is (typeof supported)[number] =>
    (supported as readonly string[]).includes(l);

  const currentLocale = isSupported(incoming) ? incoming : "es";

  const messages = (await import(`../../messages/${currentLocale}.json`))
    .default;

  return {
    locale: currentLocale,
    messages,
  };
});
