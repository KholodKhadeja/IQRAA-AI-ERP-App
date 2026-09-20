import { useLanguage } from "../../i18n/LanguageContext";

export function SkipLink() {
  const { t } = useLanguage();
  return (
    <a href="#main-content" className="skip-link">
      {t.meta.skipLink}
    </a>
  );
}
