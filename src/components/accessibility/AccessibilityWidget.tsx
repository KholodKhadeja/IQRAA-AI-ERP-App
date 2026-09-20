import {
  Accessibility,
  Contrast,
  Minus,
  Plus,
  RotateCcw,
  Underline,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import styles from "./AccessibilityWidget.module.css";

const STORAGE_KEY = "iqraa-a11y-settings";
const FONT_SCALES = [1, 2, 3] as const;
type FontScale = (typeof FONT_SCALES)[number];

interface A11ySettings {
  fontScale: FontScale;
  highContrast: boolean;
  underlineLinks: boolean;
}

const DEFAULT_SETTINGS: A11ySettings = {
  fontScale: 1,
  highContrast: false,
  underlineLinks: false,
};

function readStoredSettings(): A11ySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      fontScale: FONT_SCALES.includes(parsed.fontScale)
        ? parsed.fontScale
        : 1,
      highContrast: Boolean(parsed.highContrast),
      underlineLinks: Boolean(parsed.underlineLinks),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applySettings(settings: A11ySettings) {
  const root = document.documentElement;
  root.setAttribute("data-a11y-font-scale", String(settings.fontScale));
  if (settings.highContrast) {
    root.setAttribute("data-a11y-contrast", "high");
  } else {
    root.removeAttribute("data-a11y-contrast");
  }
  if (settings.underlineLinks) {
    root.setAttribute("data-a11y-underline-links", "true");
  } else {
    root.removeAttribute("data-a11y-underline-links");
  }
}

export function AccessibilityWidget() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(readStoredSettings);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applySettings(settings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

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

  function changeFontScale(direction: 1 | -1) {
    setSettings((prev) => {
      const currentIndex = FONT_SCALES.indexOf(prev.fontScale);
      const nextIndex = Math.min(
        Math.max(currentIndex + direction, 0),
        FONT_SCALES.length - 1,
      );
      return { ...prev, fontScale: FONT_SCALES[nextIndex] };
    });
  }

  function toggleHighContrast() {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }

  function toggleUnderlineLinks() {
    setSettings((prev) => ({
      ...prev,
      underlineLinks: !prev.underlineLinks,
    }));
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {isOpen && (
        <div
          className={styles.panel}
          role="dialog"
          aria-modal="false"
          aria-label={t.a11yWidget.title}
        >
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>{t.a11yWidget.title}</span>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label={t.a11yWidget.close}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>{t.a11yWidget.textSize}</span>
            <div className={styles.stepper}>
              <button
                type="button"
                onClick={() => changeFontScale(-1)}
                disabled={settings.fontScale === FONT_SCALES[0]}
                aria-label={t.a11yWidget.decreaseText}
              >
                <Minus size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => changeFontScale(1)}
                disabled={
                  settings.fontScale === FONT_SCALES[FONT_SCALES.length - 1]
                }
                aria-label={t.a11yWidget.increaseText}
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`${styles.toggleRow} ${
              settings.highContrast ? styles.toggleRowActive : ""
            }`}
            onClick={toggleHighContrast}
            aria-pressed={settings.highContrast}
          >
            <Contrast size={16} aria-hidden="true" />
            {t.a11yWidget.highContrast}
          </button>

          <button
            type="button"
            className={`${styles.toggleRow} ${
              settings.underlineLinks ? styles.toggleRowActive : ""
            }`}
            onClick={toggleUnderlineLinks}
            aria-pressed={settings.underlineLinks}
          >
            <Underline size={16} aria-hidden="true" />
            {t.a11yWidget.underlineLinks}
          </button>

          <button
            type="button"
            className={styles.resetRow}
            onClick={resetSettings}
          >
            <RotateCcw size={16} aria-hidden="true" />
            {t.a11yWidget.reset}
          </button>

          <Link
            to="/accessibility"
            className={styles.statementLink}
            onClick={() => setIsOpen(false)}
          >
            {t.a11yWidget.statementLink}
          </Link>
        </div>
      )}

      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={t.a11yWidget.toggleLabel}
      >
        <Accessibility size={24} aria-hidden="true" />
      </button>
    </div>
  );
}
