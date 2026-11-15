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
import { trackDesignSwitch } from "@/experiments/client";
import { applySiteDesign, resolveInitialDesign, saveSiteDesign, type SiteDesign } from "./design";

type ThemeContextValue = {
  theme: SiteTheme;
  cardScheme: "light" | "dark";
  setTheme: (theme: SiteTheme) => void;
  toggleTheme: () => void;
  design: SiteDesign;
  setDesign: (design: SiteDesign) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>(() => resolveInitialTheme());

  const setTheme = useCallback((next: SiteTheme) => {
    setThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applySiteTheme(next);
  }, []);

  const [design, setDesignState] = useState<SiteDesign>(() => resolveInitialDesign());

  const setDesign = useCallback((next: SiteDesign) => {
    setDesignState(next);
    saveSiteDesign(next);
    applySiteDesign(next);
    // A picker choice is a preference: it is saved above and always wins from now on.
    trackDesignSwitch(next);
  }, []);

  useEffect(() => {
    applySiteDesign(design);
  }, [design]);

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
      design,
      setDesign,
    }),
    [design, setDesign, setTheme, theme, toggleTheme]
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
