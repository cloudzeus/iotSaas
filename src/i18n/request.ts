import { getRequestConfig } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth";

export default getRequestConfig(async () => {
  const session = await auth();
  // Prefer user's saved locale, fallback to Greek
  const locale = (session?.user?.locale as string) || routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
