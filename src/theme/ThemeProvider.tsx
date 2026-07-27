import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applySiteTheme,
  cardColorScheme,
  resolveInitialTheme,
  type SiteTheme,
  THEME_STORAGE_KEY,
} from "./theme";

type ThemeContextValue = {
  theme: SiteTheme;
  cardScheme: "light" | "dark";
  setTheme: (theme: SiteTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>(() => resolveInitialTheme());

  const setTheme = useCallback((next: SiteTheme) => {
    setThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applySiteTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  useEffect(() => {
    applySiteTheme(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      cardScheme: cardColorScheme(theme),
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
