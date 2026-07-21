import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

// A transição de cores só fica ativa durante a troca de tema (classe
// temporária), para não sobrescrever permanentemente as transições
// normais de hover/focus de outros elementos da interface.
function withThemeTransition(applyChange: () => void) {
  if (typeof document === "undefined") {
    applyChange();
    return;
  }
  const root = document.documentElement;
  root.classList.add("theme-transitioning");
  applyChange();
  window.setTimeout(() => root.classList.remove("theme-transitioning"), 300);
}

// Tema não é persistido em localStorage — segue preferência do sistema ao carregar.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initial = getSystemTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      withThemeTransition(() => applyTheme(next));
      return next;
    });
  };

  return { theme, toggle };
}
