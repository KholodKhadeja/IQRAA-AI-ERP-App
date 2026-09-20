import { AccessibilityWidget } from "./components/accessibility/AccessibilityWidget";
import { SkipLink } from "./components/accessibility/SkipLink";
import { useScrollToHash } from "./hooks/useScrollToHash";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AppRoutes } from "./routes/AppRoutes";

function App() {
  useScrollToHash();

  return (
    <LanguageProvider>
      <SkipLink />
      <AppRoutes />
      <AccessibilityWidget />
    </LanguageProvider>
  );
}

export default App;
