import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { flushSync } from "react-dom";
import {
  applySiteTheme,
  cardColorScheme,
  resolveInitialTheme,
  type SiteTheme,
  THEME_STORAGE_KEY,
} from "./theme";
import { revealTheme } from "./themeReveal";

type ThemeContextValue = {
  theme: SiteTheme;
  cardScheme: "light" | "dark";
  setTheme: (theme: SiteTheme) => void;
  /** Switches theme with a circular reveal grown from `origin` (the button or its click event). */
  toggleTheme: (origin?: Element | SyntheticEvent | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>(() => resolveInitialTheme());

  const setTheme = useCallback((next: SiteTheme) => {
    setThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applySiteTheme(next);
  }, []);

  const toggleTheme = useCallback(
    (origin?: Element | SyntheticEvent | null) => {
      const next = theme === "dark" ? "light" : "dark";
      const from =
        origin instanceof Element
          ? origin
          : origin?.currentTarget instanceof Element
            ? origin.currentTarget
            : null;
      // The view transition snapshots the new theme as soon as this callback returns, so React
      // must commit synchronously inside it.
      revealTheme(from, () => flushSync(() => setTheme(next)));
    },
    [setTheme, theme]
  );

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
