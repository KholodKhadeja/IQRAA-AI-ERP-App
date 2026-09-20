import { Route, Routes } from "react-router-dom";
import { AccessibilityPage } from "../pages/Accessibility/AccessibilityPage";
import { LandingPage } from "../pages/Landing/LandingPage";
import { LoginPage } from "../pages/Login/LoginPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accessibility" element={<AccessibilityPage />} />
    </Routes>
  );
}
