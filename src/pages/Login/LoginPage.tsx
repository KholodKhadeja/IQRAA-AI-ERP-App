import { AlertCircle, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../i18n/LanguageContext";
import styles from "./LoginPage.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { login, isLoading, error: authError } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const emailError =
    emailTouched && email.length > 0 && !EMAIL_PATTERN.test(email)
      ? t.login.emailInvalid
      : emailTouched && email.length === 0
        ? t.login.emailRequired
        : undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailTouched(true);

    if (!EMAIL_PATTERN.test(email) || password.length === 0) {
      return;
    }

    const user = await login({ email, password });
    if (user) {
      setIsSignedIn(true);
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.brandPane}>
        <Link to="/" className={styles.brandLink}>
          <Sparkles size={20} aria-hidden="true" />
          <span className={styles.brandLinkNames}>
            <span className={styles.brandLinkCompany}>IQRAA Digital Learning</span>
            <span className={styles.brandLinkProduct}>
              AI Learning Operations ERP
            </span>
          </span>
        </Link>

        <div className={styles.brandContent}>
          <h2 className={styles.brandHeading}>
            {t.login.brandHeadingLine1}
            <br />
            {t.login.brandHeadingLine2}
          </h2>
          <p className={styles.brandText}>{t.login.brandParagraph}</p>
          <div className={styles.flow}>
            {t.login.flowSteps.map((step) => (
              <span key={step} className={styles.flowStep}>
                {step}
              </span>
            ))}
          </div>
        </div>

        <span className={styles.brandFooter}>
          © {new Date().getFullYear()} IQRAA Digital Learning LTD
        </span>
      </aside>

      <main id="main-content" className={styles.formPane}>
        <div className={styles.formCard}>
          <Link to="/" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            {t.login.backLink}
          </Link>

          <div>
            <h1 className={styles.heading}>{t.login.heading}</h1>
            <p className={styles.subheading}>{t.login.subheading}</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {authError && (
              <div className={styles.formError} role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                {t.login.authError}
              </div>
            )}

            {isSignedIn && (
              <div className={styles.formSuccess} role="status">
                {t.login.successMessage}
              </div>
            )}

            <TextField
              label={t.login.emailLabel}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
              error={emailError}
              required
            />

            <TextField
              label={t.login.passwordLabel}
              isPassword
              showPasswordLabel={t.login.showPassword}
              hidePasswordLabel={t.login.hidePassword}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <div className={styles.formFooter}>
              <button type="button" className={styles.forgotLink}>
                {t.login.forgotPassword}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isLoading}
              icon={
                isLoading ? (
                  <Loader2
                    size={18}
                    className={styles.spinner}
                    aria-hidden="true"
                  />
                ) : undefined
              }
            >
              {isLoading ? t.login.submitting : t.login.submit}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
