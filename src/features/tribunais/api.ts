import { supabase, type Advogado, type StatusAdvogado, type Tribunal } from "@/lib/supabase";

export async function fetchTribunais(): Promise<Tribunal[]> {
  const { data, error } = await supabase
    .from("tabelas_tribunais")
    .select("id,nome,sigla,created_at")
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Tribunal[];
}

export async function fetchAdvogados(): Promise<Advogado[]> {
  const { data, error } = await supabase
    .from("tabelas_advogados")
    .select("id,tribunal_id,nome,status,created_at")
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