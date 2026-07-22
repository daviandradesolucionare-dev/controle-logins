import { supabase, type Advogado, type StatusAdvogado, type Tribunal } from "@/lib/supabase";

export type OrdemServer = "az" | "za" | "recent" | "old";
export type StatusFiltro = "todos" | "Concluído" | "Pendente" | "Vazio";

export interface TribunalComStatus extends Tribunal {
  total_advogados: number;
  ok_count: number;
  status: "Concluído" | "Pendente" | "Vazio";
}

export interface TribunaisPageParams {
  q: string;
  adv: string;
  status: StatusFiltro;
  ordem: OrdemServer;
  offset: number;
  limit: number;
  /** Data de cadastro do tribunal (created_at), formato YYYY-MM-DD, inclusive. */
  dataInicio?: string;
  dataFim?: string;
}

export interface TribunaisPageResult {
  rows: TribunalComStatus[];
  total: number;
}

export async function fetchTribunaisPage(p: TribunaisPageParams): Promise<TribunaisPageResult> {
  // Filtro por nome de advogado: primeiro descobre tribunal_ids matching
  let advTribunalIds: string[] | null = null;
  if (p.adv.trim()) {
    const { data, error } = await supabase
      .from("tabelas_advogados")
      .select("tribunal_id")
      .ilike("nome", `%${p.adv.trim()}%`);
    if (error) throw error;
    advTribunalIds = Array.from(new Set((data ?? []).map((r) => r.tribunal_id as string)));
    if (advTribunalIds.length === 0) return { rows: [], total: 0 };
  }

  let query = supabase
    .from("tribunais_com_status")
    .select("id,nome,sigla,created_at,total_advogados,ok_count,status", { count: "exact" });

  const q = p.q.trim();
  if (q) {
    const like = `%${q}%`;
    query = query.or(`nome.ilike.${like},sigla.ilike.${like}`);
  }
  if (p.status !== "todos") query = query.eq("status", p.status);
  if (advTribunalIds) query = query.in("id", advTribunalIds);
  if (p.dataInicio) query = query.gte("created_at", `${p.dataInicio}T00:00:00`);
  if (p.dataFim) query = query.lte("created_at", `${p.dataFim}T23:59:59.999`);

  if (p.ordem === "az") query = query.order("nome", { ascending: true });
  else if (p.ordem === "za") query = query.order("nome", { ascending: false });
  else if (p.ordem === "recent") query = query.order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: true });

  query = query.range(p.offset, p.offset + p.limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as TribunalComStatus[], total: count ?? 0 };
}

export async function fetchAdvogadosByTribunais(ids: string[]): Promise<Advogado[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("tabelas_advogados")
    .select("id,tribunal_id,nome,status,created_at")
    .in("tribunal_id", ids)
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Advogado[];
}

export async function updateAdvogadoStatus(id: string, status: StatusAdvogado) {
  const { error } = await supabase.from("tabelas_advogados").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteTribunal(id: string) {
  const { error } = await supabase.from("tabelas_tribunais").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAdvogado(id: string) {
  const { error } = await supabase.from("tabelas_advogados").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTribunal(
  id: string,
  input: { nome: string; sigla: string | null },
): Promise<Tribunal> {
  const { data, error } = await supabase
    .from("tabelas_tribunais")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Tribunal;
}

export async function createAdvogado(input: {
  tribunal_id: string;
  nome: string;
  status: StatusAdvogado;
}): Promise<Advogado> {
  const { data, error } = await supabase.from("tabelas_advogados").insert(input).select().single();
  if (error) throw error;
  return data as Advogado;
}

function isMissingRpcFunction(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.message?.toLowerCase().includes("could not find the function") === true
  );
}

function friendlyTribunalError(error: { code?: string; message?: string }): Error {
  if (error.code === "23505") {
    return new Error("Já existe um tribunal cadastrado com esse nome.");
  }
  return error instanceof Error ? error : new Error(error.message || "Erro desconhecido");
}

export async function createTribunalWithLawyers(input: {
  nome: string;
  sigla: string;
  lawyerNames: string[];
}): Promise<Tribunal> {
  const parsedName = input.nome.trim();
  const parsedSigla = input.sigla?.trim() ? input.sigla.trim() : null;

  const { data, error } = await supabase.rpc("create_tribunal_with_lawyers", {
    p_nome: parsedName,
    p_sigla: parsedSigla,
    p_lawyer_names: input.lawyerNames,
  });

  if (!error) return data as Tribunal;

  // Só caímos para a criação manual quando o problema é a função RPC não
  // existir no banco (ex: migration ainda não aplicada). Qualquer outro
  // erro (nome duplicado, validação, etc.) é um erro de negócio real e
  // deve ser mostrado como tal, sem mascarar com uma segunda tentativa.
  if (!isMissingRpcFunction(error)) {
    throw friendlyTribunalError(error);
  }

  console.warn("RPC create_tribunal_with_lawyers indisponível, usando criação manual", error);

  const { data: tribunal, error: tribunalError } = await supabase
    .from("tabelas_tribunais")
    .insert({ nome: parsedName, sigla: parsedSigla })
    .select()
    .single();
  if (tribunalError) throw friendlyTribunalError(tribunalError);

  const lawyerNames = input.lawyerNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  if (lawyerNames.length > 0) {
    const { error: lawyerError } = await supabase.from("tabelas_advogados").insert(
      lawyerNames.map((name) => ({
        tribunal_id: tribunal.id,
        nome: name,
        status: "Não enviado" as StatusAdvogado,
      })),
    );
    if (lawyerError) throw lawyerError;
  }
  return tribunal as Tribunal;
}

export interface AddLawyerToAllResult {
  affected: number;
  alreadyHad: number;
}

export async function addLawyerToAllTribunais(nome: string): Promise<AddLawyerToAllResult> {
  const { data, error } = await supabase.rpc("add_lawyer_to_all_tribunais", { p_nome: nome });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    affected: row?.tribunais_afetados ?? 0,
    alreadyHad: row?.tribunais_ja_tinha ?? 0,
  };
}

export async function updateAdvogado(id: string, input: { nome: string }): Promise<Advogado> {
  const { data, error } = await supabase
    .from("tabelas_advogados")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Advogado;
}
