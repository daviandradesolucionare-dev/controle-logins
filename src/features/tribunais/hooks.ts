import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Advogado, StatusAdvogado, Tribunal } from "@/lib/supabase";
import {
  createAdvogado,
  deleteAdvogado,
  deleteTribunal,
  fetchAdvogadosByTribunais,
  fetchTribunaisPage,
  updateAdvogadoStatus,
  updateAdvogado,
  updateTribunal,
  type TribunaisPageParams,
} from "./api";

export const tribunaisKey = ["tribunais"] as const;
export const advogadosKey = ["advogados"] as const;

export function useTribunaisPage(params: TribunaisPageParams) {
  return useQuery({
    queryKey: [...tribunaisKey, "page", params],
    queryFn: () => fetchTribunaisPage(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdvogadosDaPagina(ids: string[]) {
  return useQuery({
    queryKey: [...advogadosKey, "byTribunais", ids.slice().sort()],
    queryFn: () => fetchAdvogadosByTribunais(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useTribunalMutations() {
  const qc = useQueryClient();

  const setStatus = useMutation({
    mutationFn: ({ adv, status }: { adv: Advogado; status: StatusAdvogado }) =>
      updateAdvogadoStatus(adv.id, status),
    onMutate: async ({ adv, status }) => {
      await qc.cancelQueries({ queryKey: advogadosKey });
      // Atualiza todas as queries de advogados em cache (por página de tribunais)
      const snapshots: Array<[readonly unknown[], Advogado[] | undefined]> = [];
      const queries = qc.getQueriesData<Advogado[]>({ queryKey: advogadosKey });
      for (const [key, data] of queries) {
        snapshots.push([key, data]);
        qc.setQueryData<Advogado[]>(key, (list) =>
          (list ?? []).map((a) => (a.id === adv.id ? { ...a, status } : a)),
        );
      }
      return { snapshots };
    },
    onError: (err, _v, ctx) => {
      for (const [key, data] of ctx?.snapshots ?? []) qc.setQueryData(key, data);
      toast.error("Erro ao atualizar status: " + (err as Error).message);
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      // Status do tribunal pode ter mudado no server → revalida a listagem
      qc.invalidateQueries({ queryKey: tribunaisKey });
    },
  });

  const removeTribunal = useMutation({
    mutationFn: (t: Tribunal) => deleteTribunal(t.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tribunaisKey });
      qc.invalidateQueries({ queryKey: advogadosKey });
      toast.success("Tribunal excluído.");
    },
    onError: (err) => toast.error("Erro ao excluir tribunal: " + (err as Error).message),
  });

  const removeAdvogado = useMutation({
    mutationFn: (a: Advogado) => deleteAdvogado(a.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advogadosKey });
      qc.invalidateQueries({ queryKey: tribunaisKey });
      toast.success("Advogado excluído.");
    },
    onError: (err) => toast.error("Erro ao excluir advogado: " + (err as Error).message),
  });

  const saveTribunal = useMutation({
    mutationFn: ({ id, nome, sigla }: { id: string; nome: string; sigla: string | null }) =>
      updateTribunal(id, { nome, sigla }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tribunaisKey });
      toast.success("Tribunal atualizado.");
    },
    onError: (err) => toast.error("Erro ao salvar: " + (err as Error).message),
  });

  const addAdvogado = useMutation({
    mutationFn: createAdvogado,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advogadosKey });
      qc.invalidateQueries({ queryKey: tribunaisKey });
      toast.success("Advogado adicionado.");
    },
    onError: (err) => toast.error("Erro ao adicionar: " + (err as Error).message),
  });

  const saveAdvogado = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => updateAdvogado(id, { nome }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advogadosKey });
      toast.success("Advogado atualizado.");
    },
    onError: (err) => toast.error("Erro ao salvar: " + (err as Error).message),
  });

  return { setStatus, removeTribunal, removeAdvogado, saveTribunal, addAdvogado, saveAdvogado };
}