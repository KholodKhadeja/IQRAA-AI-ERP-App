import { ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Language } from "../../i18n/translations";
import { useLanguage } from "../../i18n/LanguageContext";
import styles from "./LanguageToggle.module.css";

const LANGUAGE_LABELS: Record<Language, string> = {
  he: "עברית",
  ar: "العربية",
};

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setIsOpen(false);
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe size={16} aria-hidden="true" />
        {LANGUAGE_LABELS[language]}
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {isOpen && (
        <ul className={styles.menu} role="listbox">
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
            <li key={lang}>
              <button
                type="button"
                role="option"
                aria-selected={lang === language}
                className={`${styles.option} ${
                  lang === language ? styles.active : ""
                }`}
                onClick={() => handleSelect(lang)}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
