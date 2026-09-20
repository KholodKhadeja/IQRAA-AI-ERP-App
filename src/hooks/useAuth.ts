import { useCallback, useState } from "react";
import { authService } from "../services/auth/authService";
import type { AuthUser, Credentials } from "../types/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(
    () => authService.getSession()?.user ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (credentials: Credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.login(credentials);
      setUser(result.user);
      return result.user;
    } catch {
      setError("לא ניתן להתחבר כרגע. בדקו את הפרטים ונסו שוב.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return { user, isLoading, error, login, logout };
}
