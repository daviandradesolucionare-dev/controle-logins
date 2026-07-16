import { supabase } from "@/lib/supabase";

type DefaultLawyerRow = { name: string; position: number };

export const INITIAL_DEFAULT_LAWYERS = [
  "ADRIANA LOPES RIBEIRO",
  "ANA PAULA DE SOUZA SILVA",
  "ANECHELE DE MENEZES ALCANTARA",
  "CAMILA MORAIS MAURICIO",
  "CAROLINE H. MIRANDA S. FORTUNATO",
  "CAROLINE XAVIER SANGIORGI RICARDO",
  "DENISE FERREIRA SANTOS",
  "DIEGO ALLAN FERRAZ MERGULHÃO",
  "FERNANDO HENRIQUE PAIVA BERBEL",
  "GABRIELA CRISTINA DOS REIS",
  "GABRIELA FERNANDA GOMES DA SILVA",
  "GABRIELA GARCIAS LOPES",
  "HOUSTON MARCOS BARROS ALVES",
  "JACKSON CARDOSO ALVES SANTOS",
  "MARCOS HENRIQUE BARBOSA SILVA",
  "MARIA PAULA FERNANDES CASTILHO",
  "MARIANA ALVES PINTO",
  "MARIANA FERREIRA MARTINS DA SILVA",
  "MARINA DE SOUZA DA ROCHA E SILVA",
  "MEIRIELE PARECIDA MELO",
  "MONIK EVELLYN LINS",
  "PAULA CAMILA CORDEIRO SOARES",
  "PEDRO HENRIQUE RODRIGUES ALVES",
  "STEFANIE DA SILVA CARDOSO",
  "THAIS ALMEIDA BRAGA",
  "THAIS CRISTINA SANTOS CARDOSO",
  "VALMA MARIA VARSINHO",
  "JULIA SILVA DO CARMO",
];

export async function getDefaultLawyers(): Promise<string[]> {
  const { data, error } = await supabase
    .from("default_lawyers")
    .select("name,position")
    .order("position");
  if (error) {
    if (isMissingRemoteTable(error)) {
      const fallback = getFallbackLawyers();
      if (fallback.length === 0) {
        saveFallbackLawyers(INITIAL_DEFAULT_LAWYERS);
        return [...INITIAL_DEFAULT_LAWYERS];
      }
      return fallback;
    }
    throw error;
  }
  const names = (data as DefaultLawyerRow[]).map((item) => item.name);
  if (names.length === 0) {
    saveFallbackLawyers(INITIAL_DEFAULT_LAWYERS);
    return [...INITIAL_DEFAULT_LAWYERS];
  }
  return names;
}

export async function saveDefaultLawyers(list: string[]) {
  const { error } = await supabase.rpc("replace_default_lawyers", { p_names: list });
  if (error) {
    if (isMissingRemoteTable(error)) {
      saveFallbackLawyers(list);
      return;
    }
    throw error;
  }
}

export async function resetDefaultLawyers() {
  await saveDefaultLawyers(INITIAL_DEFAULT_LAWYERS);
  return INITIAL_DEFAULT_LAWYERS;
}

const FALLBACK_STORAGE_KEY = "default-lawyers-fallback-v2";

function isMissingRemoteTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST202" ||
    error.message?.includes("default_lawyers") === true ||
    error.message?.includes("replace_default_lawyers") === true
  );
}

function getFallbackLawyers() {
  if (typeof window === "undefined") return [...INITIAL_DEFAULT_LAWYERS];
  try {
    const saved = JSON.parse(window.localStorage.getItem(FALLBACK_STORAGE_KEY) ?? "null");
    return Array.isArray(saved) && saved.every((name) => typeof name === "string")
      ? saved
      : [...INITIAL_DEFAULT_LAWYERS];
  } catch {
    return [...INITIAL_DEFAULT_LAWYERS];
  }
}

function saveFallbackLawyers(list: string[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(list));
  }
}
