import 'i18next'
import type en from './locales/en.json'

// Type-safe `t()` keys, sourced from the English catalog.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: typeof en
    }
  }
}
