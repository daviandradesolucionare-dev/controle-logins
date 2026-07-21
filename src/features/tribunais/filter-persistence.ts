const STORAGE_KEY = "cd-tribunais-filtros-v1";

export interface TribunaisFiltrosPersistidos {
  q: string;
  adv: string;
  status: string;
  ordem: string;
  de: string;
  ate: string;
}

/**
 * Guarda os filtros da aba Tribunais em sessionStorage (dura enquanto a
 * aba do navegador estiver aberta). Isso evita que o usuário precise
 * refazer a busca toda vez que sai para outra aba do app e volta -- o
 * link de navegação do menu aponta para "/tribunais" sem parâmetros, o
 * que faz o TanStack Router aplicar os valores padrão (filtro vazio).
 */
export function salvarFiltrosTribunais(filtros: TribunaisFiltrosPersistidos) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filtros));
  } catch {
    // sessionStorage pode estar indisponível (modo privado, etc.); ignora.
  }
}

export function lerFiltrosTribunais(): TribunaisFiltrosPersistidos | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.q === "string" &&
      typeof parsed?.adv === "string" &&
      typeof parsed?.status === "string" &&
      typeof parsed?.ordem === "string" &&
      typeof parsed?.de === "string" &&
      typeof parsed?.ate === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
