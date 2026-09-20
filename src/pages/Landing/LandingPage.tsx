import { ArrowLeft, Check, Mail, Phone, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Footer } from "../../components/layout/Footer";
import { Header } from "../../components/layout/Header";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { useLanguage } from "../../i18n/LanguageContext";
import styles from "./LandingPage.module.css";

const LANDING_IMAGES = {
  hero: "https://images.unsplash.com/photo-1587355760421-b9de3226a046?auto=format&fit=crop&w=1600&q=85",
};

type ProductKey =
  | "onlineCourse"
  | "inPersonCourse"
  | "hybridCourse"
  | "games"
  | "trainingVideos"
  | "simulations"
  | "presentations"
  | "eLearning";

const PRODUCT_IMAGES: { key: ProductKey; image: string }[] = [
  {
    key: "onlineCourse",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=80",
  },
  {
    key: "inPersonCourse",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=700&q=80",
  },
  {
    key: "hybridCourse",
    image:
      "https://images.unsplash.com/photo-1573497161249-42447f9f6706?auto=format&fit=crop&w=700&q=80",
  },
  {
    key: "games",
    image:
      "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=700&q=80",
  },
  {
    key: "trainingVideos",
    image:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=700&q=80",
  },
  {
    key: "simulations",
    image:
      "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=700&q=80",
  },
  {
    key: "presentations",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=700&q=80",
  },
  {
    key: "eLearning",
    image:
      "https://images.unsplash.com/photo-1765894359240-49b82f93b91a?auto=format&fit=crop&w=700&q=80",
  },
];

const WORKFLOW_NUMBERS = ["01", "02", "03", "04", "05"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LandingPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState({
    name: false,
    organization: false,
    email: false,
  });
  const { t } = useLanguage();

  const nameError =
    touched.name && name.trim().length === 0
      ? t.contact.nameRequired
      : undefined;
  const organizationError =
    touched.organization && organization.trim().length === 0
      ? t.contact.orgRequired
      : undefined;
  const emailError =
    touched.email && email.length === 0
      ? t.contact.emailRequired
      : touched.email && !EMAIL_PATTERN.test(email)
        ? t.contact.emailInvalid
        : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, organization: true, email: true });

    if (
      name.trim().length === 0 ||
      organization.trim().length === 0 ||
      !EMAIL_PATTERN.test(email)
    ) {
      return;
    }

    setIsSubmitted(true);
  }

  return (
    <>
      <Header />
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={`container ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>
                <Sparkles size={16} aria-hidden="true" /> {t.hero.kicker}
              </span>
              <h1 id="hero-title">
                {t.hero.titleLine1}
                <br />
                <em>{t.hero.titleEm}</em>
              </h1>
              <p>{t.hero.paragraph}</p>
              <div className={styles.heroActions}>
                <Button
                  href="#contact"
                  variant="primary"
                  icon={<ArrowLeft size={18} aria-hidden="true" />}
                >
                  {t.hero.cta}
                </Button>
              </div>
              <ul className={styles.heroHighlights}>
                {t.hero.highlights.map((highlight) => (
                  <li key={highlight}>
                    <Check size={16} aria-hidden="true" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.heroVisual}>
              <img src={LANDING_IMAGES.hero} alt={t.hero.imageAlt} />
              <div className={styles.heroCaption}>
                <span>{t.hero.captionLabel}</span>
                <strong>{t.hero.captionStrong}</strong>
              </div>
              <span className={styles.heroStamp}>01 / 05</span>
            </div>
          </div>
        </section>

        <section
          className={`container ${styles.productsSection}`}
          id="services"
          aria-labelledby="products-title"
        >
          <div className={styles.sectionIntro}>
            <span className={styles.sectionNumber}>01</span>
            <p className={styles.kicker}>{t.products.kicker}</p>
            <h2 id="products-title">
              {t.products.titleLine1}
              <br />
              <em>{t.products.titleEm}</em>
            </h2>
            <p>{t.products.paragraph}</p>
          </div>
          <div className={styles.productsMosaic}>
            {PRODUCT_IMAGES.map((product) => (
              <div
                className={styles.productTile}
                key={product.key}
                style={{ backgroundImage: `url(${product.image})` }}
              >
                <span className={styles.productTileOverlay} aria-hidden="true" />
                <span className={styles.productTileBadge}>
                  <Sparkles size={12} aria-hidden="true" /> {t.products.badge}
                </span>
                <h3>{t.products.items[product.key]}</h3>
              </div>
            ))}
          </div>
        </section>

        <section
          className={styles.workflowSection}
          id="process"
          aria-labelledby="workflow-title"
        >
          <div className={`container ${styles.workflowLayout}`}>
            <div className={styles.workflowIntro}>
              <span className={styles.sectionNumber}>02</span>
              <p className={styles.kicker}>{t.workflow.kicker}</p>
              <h2 id="workflow-title">
                {t.workflow.titleLine1}
                <br />
                <em>{t.workflow.titleEm}</em>
              </h2>
              <p>{t.workflow.paragraph}</p>
            </div>
            <ol className={styles.timeline}>
              {t.workflow.steps.map((step, index) => (
                <li key={step.title}>
                  <span className={styles.timelineNumber}>
                    {WORKFLOW_NUMBERS[index]}
                  </span>
                  <div className={styles.timelineLine}>
                    {index < t.workflow.steps.length - 1 && <span />}
                  </div>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.erpSection} aria-labelledby="erp-title">
          <div className={`container ${styles.erpGrid}`}>
            <div>
              <span className={styles.sectionNumber}>03</span>
              <p className={styles.kicker}>{t.erp.kicker}</p>
              <h2 id="erp-title">
                {t.erp.titleLine1}
                <br />
                <em>{t.erp.titleEm}</em>
              </h2>
              <p>{t.erp.paragraph}</p>
              <Button to="/login" variant="primary">
                {t.erp.cta}
              </Button>
            </div>
            <div
              className={styles.erpMockup}
              aria-label={t.erp.mockupAriaLabel}
            >
              <div className={styles.mockupTop}>
                <span>{t.erp.projectsBoard}</span>
                <span className={styles.mockupDot} />
              </div>
              <div className={styles.mockupBody}>
                <div className={styles.mockupSidebar}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles.mockupContent}>
                  <div className={styles.mockupHeading}>
                    <b>{t.erp.activeProjects}</b>
                    <i />
                  </div>
                  <div className={styles.mockupColumns}>
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className={styles.mockupRows}>
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className={`container ${styles.contactSection}`}
          id="contact"
          aria-labelledby="contact-title"
        >
          <div className={styles.contactCopy}>
            <span className={styles.sectionNumber}>04</span>
            <p className={styles.kicker}>{t.contact.kicker}</p>
            <h2 id="contact-title">
              {t.contact.titleLine1}
              <br />
              <em>{t.contact.titleEm}</em>
            </h2>
            <p>{t.contact.paragraph}</p>
            <div className={styles.contactDetails}>
              <a href="mailto:hello@example.com">
                <Mail size={18} aria-hidden="true" /> hello@example.com
              </a>
              <a href="tel:+972000000000">
                <Phone size={18} aria-hidden="true" /> 03־0000000
              </a>
            </div>
          </div>
          <form className={styles.contactForm} onSubmit={handleSubmit}>
            {isSubmitted ? (
              <div className={styles.successMessage} role="status">
                <Check size={28} aria-hidden="true" />
                <h3>{t.contact.successTitle}</h3>
                <p>{t.contact.successText}</p>
              </div>
            ) : (
              <>
                <div className={styles.formRow}>
                  <TextField
                    label={t.contact.nameLabel}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, name: true }))
                    }
                    error={nameError}
                    required
                  />
                  <TextField
                    label={t.contact.orgLabel}
                    value={organization}
                    onChange={(event) => setOrganization(event.target.value)}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, organization: true }))
                    }
                    error={organizationError}
                    required
                  />
                </div>
                <div className={styles.formRow}>
                  <TextField
                    label={t.contact.emailLabel}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, email: true }))
                    }
                    error={emailError}
                    required
                  />
                  <TextField label={t.contact.phoneLabel} type="tel" />
                </div>
                <label className={styles.textareaLabel}>
                  {t.contact.messageLabel}
                  <textarea name="message" rows={4} />
                </label>
                <button className={styles.submitButton} type="submit">
                  {t.contact.submit} <ArrowLeft size={18} aria-hidden="true" />
                </button>
              </>
            )}
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}
