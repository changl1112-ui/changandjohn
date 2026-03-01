// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  i18n: {
    locales: ['en', 'es', 'zh-cn'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false
    }
  }
});
