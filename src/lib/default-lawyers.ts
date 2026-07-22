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

/**
 * A lista de advogados padrão é persistida exclusivamente no banco
 * (tabela public.default_lawyers via RPC replace_default_lawyers).
 * Propositalmente NÃO há fallback para localStorage/sessionStorage aqui:
 * um fallback local mascarava silenciosamente problemas de schema/migration
 * não aplicada, dando a falsa impressão de que o advogado foi salvo quando
 * na verdade sumia ao atualizar a página. Se a tabela/RPC não existir no
 * banco, o erro deve aparecer para o usuário para ser corrigido de fato.
 */
export async function getDefaultLawyers(): Promise<string[]> {
  const { data, error } = await supabase
    .from("default_lawyers")
    .select("name,position")
    .order("position");
  if (error) throw error;
  const names = (data as DefaultLawyerRow[]).map((item) => item.name);
  return names;
}

export async function saveDefaultLawyers(list: string[]) {
  const { error } = await supabase.rpc("replace_default_lawyers", { p_names: list });
  if (error) throw error;
}

export async function resetDefaultLawyers() {
  await saveDefaultLawyers(INITIAL_DEFAULT_LAWYERS);
  return INITIAL_DEFAULT_LAWYERS;
}
