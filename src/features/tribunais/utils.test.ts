import { describe, expect, it } from "vitest";
import { computeTribunalStatus, filtrarTribunais, groupAdvogadosPorTribunal } from "./utils";
import type { Advogado, Tribunal } from "@/lib/supabase";

const tribunal: Tribunal = {
  id: "tribunal-1",
  nome: "Tribunal de Justiça",
  sigla: "TJ",
  created_at: "2026-01-01T00:00:00.000Z",
};
const advogado = (status: Advogado["status"]): Advogado => ({
  id: crypto.randomUUID(),
  tribunal_id: tribunal.id,
  nome: "Ana Advogada",
  status,
  created_at: "2026-01-01T00:00:00.000Z",
});

describe("status de tribunal", () => {
  it("considera vazio quando não há advogados", () =>
    expect(computeTribunalStatus([])).toBe("Vazio"));
  it("só conclui quando todos os advogados estão OK", () => {
    expect(computeTribunalStatus([advogado("Ok"), advogado("Ok")])).toBe("Concluído");
    expect(computeTribunalStatus([advogado("Ok"), advogado("Não enviado")])).toBe("Pendente");
  });
});

describe("filtros de tribunais", () => {
  it("filtra por advogado sem perder o tribunal correspondente", () => {
    const result = filtrarTribunais([tribunal], groupAdvogadosPorTribunal([advogado("Ok")]), {
      texto: "",
      advogado: "ana",
      status: "todos",
    });
    expect(result).toEqual([tribunal]);
  });
});
