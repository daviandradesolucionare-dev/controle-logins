import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Fonte única de verdade do tema, compartilhada via Context.
 *
 * Antes desta mudança, cada componente que precisasse saber o tema atual
 * teria que manter seu próprio useState local (como fazia o app-nav.tsx),
 * sem nenhuma forma de saber quando outro componente trocava o tema. Isso é
 * exatamente o que causava componentes "atrasados" na troca de tema: eles só
 * atualizavam quando teoricamente teriam um re-render por outro motivo, às
 * vezes segundos depois, em vez de reagir instantaneamente à troca.
 *
 * Com o Provider único, toda troca de tema propaga para todos os
 * consumidores de useTheme() no mesmo ciclo de render do React — sem
 * polling, sem MutationObserver, sem atraso.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
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

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de <ThemeProvider>");
  return ctx;
}
