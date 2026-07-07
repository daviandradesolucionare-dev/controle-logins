// Lista padrão (inicial) de advogados carregada ao criar um novo tribunal.
// Pode ser editada em tempo real na tela "Advogados Padrão" (persistência em localStorage).
export const DEFAULT_LAWYERS: string[] = [
  "Ana Beatriz Almeida",
  "Bruno Carvalho Ribeiro",
  "Camila Duarte Fernandes",
  "Daniel Esteves Machado",
  "Eduarda Freitas Gonçalves",
  "Fábio Gomes Henriques",
  "Gabriela Horta Ibrahim",
  "Henrique Iglesias Junqueira",
  "Isabela Junqueira Klein",
  "João Kalil Lopes",
  "Karla Lisboa Moreira",
  "Leandro Martins Nogueira",
  "Mariana Nunes Oliveira",
  "Nathan Oliveira Pacheco",
  "Otávio Pacheco Queiroz",
  "Patrícia Queiroz Ramos",
  "Quintino Ramos Silva",
  "Rafael Silva Teixeira",
  "Sabrina Teixeira Uchoa",
  "Thiago Uchoa Vasques",
  "Ursula Vasques Werneck",
  "Vinícius Werneck Xavier",
  "Wesley Xavier Yamada",
  "Xênia Yamada Zampieri",
  "Yasmin Zampieri Alves",
  "Zeca Alves Barbosa",
  "Amanda Barbosa Coelho",
  "Bernardo Coelho Dias",
  "Cecília Dias Espíndola",
];

const STORAGE_KEY = "default-lawyers-v1";

export function getDefaultLawyers(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_LAWYERS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_LAWYERS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return parsed;
    }
    return [...DEFAULT_LAWYERS];
  } catch {
    return [...DEFAULT_LAWYERS];
  }
}

export function saveDefaultLawyers(list: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function resetDefaultLawyers(): string[] {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return [...DEFAULT_LAWYERS];
}