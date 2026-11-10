import { useEffect, useState } from "react";
import { isReadingShortcut } from "./articleHelpers";

const FOCUS_KEY = "writing-focus";

export function useReadingFocus() {
  const [focused, setFocused] = useState(() => {
    try {
      return localStorage.getItem(FOCUS_KEY) === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.body.dataset.articleFocus = String(focused);
    try {
      localStorage.setItem(FOCUS_KEY, String(focused));
    } catch {
      // Reading remains available when browser storage is disabled.
    }
    return () => {
      delete document.body.dataset.articleFocus;
    };
  }, [focused]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocused(false);
      else if (event.key.toLowerCase() === "f" && isReadingShortcut(event)) {
        event.preventDefault();
        setFocused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return [focused, () => setFocused((value) => !value)] as const;
}
