import type { Advogado, Tribunal } from "@/lib/supabase";

export type TribunalStatus = "Concluído" | "Pendente" | "Vazio";
export type Ordem = "az" | "za" | "recent" | "old";
export type FiltroStatus = "todos" | "Concluído" | "Pendente";

export function computeTribunalStatus(advs: Advogado[]): TribunalStatus {
  if (advs.length === 0) return "Vazio";
  return advs.every((a) => a.status === "Ok") ? "Concluído" : "Pendente";
}

export function groupAdvogadosPorTribunal(advs: Advogado[]): Map<string, Advogado[]> {
  const map = new Map<string, Advogado[]>();
  for (const a of advs) {
    const arr = map.get(a.tribunal_id) ?? [];
    arr.push(a);
    map.set(a.tribunal_id, arr);
  }
  return map;
}

export function ordenarTribunais(list: Tribunal[], ordem: Ordem): Tribunal[] {
  return [...list].sort((a, b) => {
    if (ordem === "az") return a.nome.localeCompare(b.nome, "pt-BR");
    if (ordem === "za") return b.nome.localeCompare(a.nome, "pt-BR");
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ordem === "recent" ? db - da : da - db;
  });
}

export function filtrarTribunais(
  tribunais: Tribunal[],
  advByTribunal: Map<string, Advogado[]>,
  { texto, advogado, status }: { texto: string; advogado: string; status: FiltroStatus },
): Tribunal[] {
  let list = tribunais;
  if (texto) {
    const q = texto.toLowerCase();
    list = list.filter(
      (t) => t.nome.toLowerCase().includes(q) || (t.sigla ?? "").toLowerCase().includes(q),
    );
  }
  if (advogado) {
    const q = advogado.toLowerCase();
    list = list.filter((t) =>
      (advByTribunal.get(t.id) ?? []).some((a) => a.nome.toLowerCase().includes(q)),
    );
  }
  if (status !== "todos") {
    list = list.filter((t) => computeTribunalStatus(advByTribunal.get(t.id) ?? []) === status);
  }
  return list;
}
