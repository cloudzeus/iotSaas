import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["el", "en"],
  defaultLocale: "el",
  localePrefix: "never", // locale stored in user profile, not URL
});
