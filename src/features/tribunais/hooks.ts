import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Advogado, StatusAdvogado, Tribunal } from "@/lib/supabase";
import {
  createAdvogado,
  deleteAdvogado,
  deleteTribunal,
  fetchAdvogados,
  fetchTribunais,
  updateAdvogadoStatus,
  updateTribunal,
} from "./api";

export const tribunaisKey = ["tribunais"] as const;
export const advogadosKey = ["advogados"] as const;

export function useTribunaisData() {
  const tribunais = useQuery({
    queryKey: tribunaisKey,
    queryFn: fetchTribunais,
    staleTime: 30_000,
  });
  const advogados = useQuery({
    queryKey: advogadosKey,
    queryFn: fetchAdvogados,
    staleTime: 30_000,
  });
  return {
    tribunais: tribunais.data ?? [],
    advogados: advogados.data ?? [],
    loading: tribunais.isLoading || advogados.isLoading,
    error: tribunais.error || advogados.error,
  };
}

export function useTribunalMutations() {
  const qc = useQueryClient();

  const setStatus = useMutation({
    mutationFn: ({ adv, status }: { adv: Advogado; status: StatusAdvogado }) =>
      updateAdvogadoStatus(adv.id, status),
    onMutate: async ({ adv, status }) => {
      await qc.cancelQueries({ queryKey: advogadosKey });
      const prev = qc.getQueryData<Advogado[]>(advogadosKey);
      qc.setQueryData<Advogado[]>(advogadosKey, (list) =>
        (list ?? []).map((a) => (a.id === adv.id ? { ...a, status } : a)),
      );
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(advogadosKey, ctx.prev);
      toast.error("Erro ao atualizar status: " + (err as Error).message);
    },
    onSuccess: () => toast.success("Status atualizado."),
  });

  const removeTribunal = useMutation({
    mutationFn: (t: Tribunal) => deleteTribunal(t.id),
    onSuccess: (_d, t) => {
      qc.setQueryData<Tribunal[]>(tribunaisKey, (list) =>
        (list ?? []).filter((x) => x.id !== t.id),
      );
      qc.setQueryData<Advogado[]>(advogadosKey, (list) =>
        (list ?? []).filter((a) => a.tribunal_id !== t.id),
      );
      toast.success("Tribunal excluído.");
    },
    onError: (err) => toast.error("Erro ao excluir tribunal: " + (err as Error).message),
  });

  const removeAdvogado = useMutation({
    mutationFn: (a: Advogado) => deleteAdvogado(a.id),
    onSuccess: (_d, a) => {
      qc.setQueryData<Advogado[]>(advogadosKey, (list) =>
        (list ?? []).filter((x) => x.id !== a.id),
      );
      toast.success("Advogado excluído.");
    },
    onError: (err) => toast.error("Erro ao excluir advogado: " + (err as Error).message),
  });

  const saveTribunal = useMutation({
    mutationFn: ({ id, nome, sigla }: { id: string; nome: string; sigla: string | null }) =>
      updateTribunal(id, { nome, sigla }),
    onSuccess: (updated) => {
      qc.setQueryData<Tribunal[]>(tribunaisKey, (list) =>
        (list ?? []).map((t) => (t.id === updated.id ? updated : t)),
      );
      toast.success("Tribunal atualizado.");
    },
    onError: (err) => toast.error("Erro ao salvar: " + (err as Error).message),
  });

  const addAdvogado = useMutation({
    mutationFn: createAdvogado,
    onSuccess: (adv) => {
      qc.setQueryData<Advogado[]>(advogadosKey, (list) => [...(list ?? []), adv]);
      toast.success("Advogado adicionado.");
    },
    onError: (err) => toast.error("Erro ao adicionar: " + (err as Error).message),
  });

  return { setStatus, removeTribunal, removeAdvogado, saveTribunal, addAdvogado };
}