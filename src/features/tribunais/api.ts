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
  const { data, error } = await supabase
    .from("tabelas_advogados")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Advogado;
}

export async function updateAdvogado(
  id: string,
  input: { nome: string },
): Promise<Advogado> {
  const { data, error } = await supabase
    .from("tabelas_advogados")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Advogado;
}