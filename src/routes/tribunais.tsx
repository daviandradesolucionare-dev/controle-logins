import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  X,
  Loader2,
  Check,
  ArrowUpAZ,
  ArrowDownAZ,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { STATUS_OPTIONS, type Advogado, type StatusAdvogado, type Tribunal } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TribunalCard } from "@/features/tribunais/components/TribunalCard";
import {
  useAdvogadosDaPagina,
  useTribunaisPage,
  useTribunalMutations,
} from "@/features/tribunais/hooks";
import { groupAdvogadosPorTribunal } from "@/features/tribunais/utils";
import {
  lerFiltrosTribunais,
  salvarFiltrosTribunais,
} from "@/features/tribunais/filter-persistence";
import type { OrdemServer, StatusFiltro, TribunalComStatus } from "@/features/tribunais/api";

const PAGE_SIZE = 12;
const EMPTY_TRIBUNAIS: TribunalComStatus[] = [];
const EMPTY_ADVOGADOS: Advogado[] = [];

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  adv: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "todos").default("todos"),
  ordem: fallback(z.string(), "az").default("az"),
  offset: fallback(z.number().int(), 0).default(0),
});

export const Route = createFileRoute("/tribunais")({
  ssr: false,
  validateSearch: zodValidator(searchSchema),
  component: TribunaisPage,
});

const tribunalSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(120, "Máx. 120 caracteres"),
  sigla: z.string().trim().max(20, "Máx. 20 caracteres").optional(),
});
type TribunalForm = z.infer<typeof tribunalSchema>;

const advogadoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(160, "Máx. 160 caracteres"),
});
type AdvogadoForm = z.infer<typeof advogadoSchema>;

const STATUSES: StatusFiltro[] = ["todos", "Concluído", "Pendente", "Vazio"];
const ORDENS: OrdemServer[] = ["az", "za", "recent", "old"];
function toStatus(v: string): StatusFiltro {
  return (STATUSES as string[]).includes(v) ? (v as StatusFiltro) : "todos";
}
function toOrdem(v: string): OrdemServer {
  return (ORDENS as string[]).includes(v) ? (v as OrdemServer) : "az";
}

function TribunaisPage() {
  const rawSearch = Route.useSearch();
  const search = {
    q: rawSearch.q ?? "",
    adv: rawSearch.adv ?? "",
    status: toStatus(rawSearch.status ?? "todos"),
    ordem: toOrdem(rawSearch.ordem ?? "az"),
    offset: Math.max(0, rawSearch.offset ?? 0),
  };
  const navigate = useNavigate({ from: "/tribunais" });

  const setSearch = (patch: Partial<typeof search>, resetOffset = true) => {
    navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        ...patch,
        ...(resetOffset ? { offset: 0 } : {}),
      }),
    });
  };

  const pageQuery = useTribunaisPage({
    q: search.q,
    adv: search.adv,
    status: search.status,
    ordem: search.ordem,
    offset: search.offset,
    limit: PAGE_SIZE,
  });
  const rows = pageQuery.data?.rows ?? EMPTY_TRIBUNAIS;
  const total = pageQuery.data?.total ?? 0;
  const loading = pageQuery.isLoading;

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const advogadosQuery = useAdvogadosDaPagina(pageIds);
  const advogados = advogadosQuery.data ?? EMPTY_ADVOGADOS;
  const advByTribunal = useMemo(() => groupAdvogadosPorTribunal(advogados), [advogados]);

  const { setStatus, removeTribunal, removeAdvogado, saveTribunal, addAdvogado, saveAdvogado } =
    useTribunalMutations();

  // Inputs locais com debounce para não requisitar a cada tecla
  const [filtroTribunalInput, setFiltroTribunalInput] = useState(search.q);
  const [filtroAdvogadoInput, setFiltroAdvogadoInput] = useState(search.adv);

  useEffect(() => setFiltroTribunalInput(search.q), [search.q]);
  useEffect(() => setFiltroAdvogadoInput(search.adv), [search.adv]);

  // Restaura o último filtro usado nesta aba quando a página é aberta sem
  // nenhum parâmetro na URL (ex: clicou em "Tribunais" no menu). Só roda
  // uma vez, ao montar -- se a URL já veio com parâmetros (ex: link
  // compartilhado, ou "voltar" do navegador), respeitamos o que está lá.
  useEffect(() => {
    const urlEstaLimpa = !rawSearch.q && !rawSearch.adv && !rawSearch.status && !rawSearch.ordem;
    if (!urlEstaLimpa) return;
    const salvos = lerFiltrosTribunais();
    if (!salvos) return;
    if (!salvos.q && !salvos.adv && salvos.status === "todos" && salvos.ordem === "az") return;
    setFiltroTribunalInput(salvos.q);
    setFiltroAdvogadoInput(salvos.adv);
    setSearch(
      {
        q: salvos.q,
        adv: salvos.adv,
        status: toStatus(salvos.status),
        ordem: toOrdem(salvos.ordem),
      },
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantém o último filtro salvo para a próxima vez que a aba for aberta.
  useEffect(() => {
    salvarFiltrosTribunais({
      q: search.q,
      adv: search.adv,
      status: search.status,
      ordem: search.ordem,
    });
  }, [search.q, search.adv, search.status, search.ordem]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [tribunalParaExcluir, setTribunalParaExcluir] = useState<Tribunal | null>(null);
  const [advogadoParaExcluir, setAdvogadoParaExcluir] = useState<Advogado | null>(null);

  const [addAdvOpen, setAddAdvOpen] = useState(false);
  const [addAdvTribunal, setAddAdvTribunal] = useState<Tribunal | null>(null);
  const [addAdvNome, setAddAdvNome] = useState("");
  const [addAdvStatus, setAddAdvStatus] = useState<StatusAdvogado>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editTribunal, setEditTribunal] = useState<Tribunal | null>(null);

  const editForm = useForm<TribunalForm>({
    resolver: zodResolver(tribunalSchema),
    defaultValues: { nome: "", sigla: "" },
  });

  const [editAdvOpen, setEditAdvOpen] = useState(false);
  const [editAdv, setEditAdv] = useState<Advogado | null>(null);
  const editAdvForm = useForm<AdvogadoForm>({
    resolver: zodResolver(advogadoSchema),
    defaultValues: { nome: "" },
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.floor(search.offset / PAGE_SIZE) + 1);

  const aplicarFiltros = () => {
    const advQ = filtroAdvogadoInput.trim();
    setSearch({ q: filtroTribunalInput.trim(), adv: advQ });
    if (advQ) {
      // Expande automaticamente os cards com match — advogados chegam via query
      const q = advQ.toLowerCase();
      const next = new Set(expanded);
      for (const t of rows) {
        if ((advByTribunal.get(t.id) ?? []).some((a) => a.nome.toLowerCase().includes(q))) {
          next.add(t.id);
        }
      }
      setExpanded(next);
    }
  };

  const limparFiltros = () => {
    setFiltroTribunalInput("");
    setFiltroAdvogadoInput("");
    setSearch({ q: "", adv: "", status: "todos", ordem: "az" });
    salvarFiltrosTribunais({ q: "", adv: "", status: "todos", ordem: "az" });
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const openAddAdvogado = (t: Tribunal) => {
    setAddAdvTribunal(t);
    setAddAdvNome("");
    setAddAdvStatus("");
    setAddAdvOpen(true);
  };

  const openEditTribunal = (t: Tribunal) => {
    setEditTribunal(t);
    editForm.reset({ nome: t.nome, sigla: t.sigla ?? "" });
    setEditOpen(true);
  };

  const openEditAdvogado = (a: Advogado) => {
    setEditAdv(a);
    editAdvForm.reset({ nome: a.nome });
    setEditAdvOpen(true);
  };

  const submitEditAdvogado = editAdvForm.handleSubmit(async (values) => {
    if (!editAdv) return;
    await saveAdvogado.mutateAsync({ id: editAdv.id, nome: values.nome.trim() });
    setEditAdvOpen(false);
  });

  const submitEdit = editForm.handleSubmit(async (values) => {
    if (!editTribunal) return;
    await saveTribunal.mutateAsync({
      id: editTribunal.id,
      nome: values.nome.trim(),
      sigla: values.sigla?.trim() ? values.sigla.trim() : null,
    });
    setEditOpen(false);
  });

  const submitAddAdvogado = async () => {
    if (!addAdvTribunal || !addAdvNome.trim()) return;
    const created = await addAdvogado.mutateAsync({
      tribunal_id: addAdvTribunal.id,
      nome: addAdvNome.trim(),
      status: addAdvStatus,
    });
    setExpanded((prev) => new Set(prev).add(created.tribunal_id));
    setAddAdvOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tribunais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} tribunal{total !== 1 ? "is" : ""} encontrados
          </p>
        </div>
      </div>

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Filtrar por tribunal
            </label>
            <Input
              placeholder="Nome ou sigla..."
              value={filtroTribunalInput}
              onChange={(e) => setFiltroTribunalInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Filtrar por advogado
            </label>
            <Input
              placeholder="Nome do advogado..."
              value={filtroAdvogadoInput}
              onChange={(e) => setFiltroAdvogadoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Status do tribunal
            </label>
            <Select value={search.status} onValueChange={(v) => setSearch({ status: toStatus(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Vazio">Vazio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Ordenar</label>
            <Select value={search.ordem} onValueChange={(v) => setSearch({ ordem: toOrdem(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="az">A → Z</SelectItem>
                <SelectItem value="za">Z → A</SelectItem>
                <SelectItem value="recent">Mais recentes primeiro</SelectItem>
                <SelectItem value="old">Mais antigos primeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={aplicarFiltros}>
            <Search className="mr-2 h-4 w-4" />
            Aplicar Filtros
          </Button>
          <Button variant="outline" onClick={limparFiltros}>
            <X className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
          <Button
            variant="ghost"
            onClick={() => setSearch({ ordem: search.ordem === "az" ? "za" : "az" })}
            title="Alternar ordenação"
          >
            {search.ordem === "az" ? (
              <ArrowUpAZ className="mr-2 h-4 w-4" />
            ) : (
              <ArrowDownAZ className="mr-2 h-4 w-4" />
            )}
            {search.ordem === "az" ? "A-Z" : "Z-A"}
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum tribunal corresponde aos filtros.
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((t) => (
              <TribunalCard
                key={t.id}
                tribunal={t}
                advogados={advByTribunal.get(t.id) ?? []}
                filtroAdvogado={search.adv}
                expanded={expanded.has(t.id)}
                onToggle={() => toggleExpand(t.id)}
                onChangeStatus={(adv, status) => setStatus.mutate({ adv, status })}
                onDeleteAdvogado={(a) => setAdvogadoParaExcluir(a)}
                onDeleteTribunal={(x) => setTribunalParaExcluir(x)}
                onAddAdvogado={openAddAdvogado}
                onEditTribunal={openEditTribunal}
                onEditAdvogado={openEditAdvogado}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Mostrando {search.offset + 1}–{Math.min(search.offset + PAGE_SIZE, total)} de{" "}
                {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setSearch({ offset: Math.max(0, search.offset - PAGE_SIZE) }, false)
                  }
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setSearch({ offset: search.offset + PAGE_SIZE }, false)}
                >
                  Próxima <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal excluir tribunal */}
      <AlertDialog
        open={!!tribunalParaExcluir}
        onOpenChange={(o) => !o && setTribunalParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tribunal?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{tribunalParaExcluir?.nome}</strong>? Todos os
              advogados associados serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (tribunalParaExcluir) removeTribunal.mutate(tribunalParaExcluir);
                setTribunalParaExcluir(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal excluir advogado */}
      <AlertDialog
        open={!!advogadoParaExcluir}
        onOpenChange={(o) => !o && setAdvogadoParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir advogado?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{advogadoParaExcluir?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (advogadoParaExcluir) removeAdvogado.mutate(advogadoParaExcluir);
                setAdvogadoParaExcluir(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal adicionar advogado */}
      <Dialog open={addAdvOpen} onOpenChange={setAddAdvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar advogado — {addAdvTribunal?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome</label>
              <Input
                value={addAdvNome}
                onChange={(e) => setAddAdvNome(e.target.value)}
                placeholder="Nome do advogado"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status inicial</label>
              <Select
                value={addAdvStatus || "__vazio__"}
                onValueChange={(v) =>
                  setAddAdvStatus((v === "__vazio__" ? "" : v) as StatusAdvogado)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s || "vazio"} value={s || "__vazio__"}>
                      {s || "— vazio —"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAdvOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitAddAdvogado} disabled={addAdvogado.isPending}>
              {addAdvogado.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal editar tribunal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tribunal</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome</label>
              <Input autoFocus {...editForm.register("nome")} />
              {editForm.formState.errors.nome && (
                <p className="mt-1 text-xs text-destructive">
                  {editForm.formState.errors.nome.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sigla</label>
              <Input placeholder="Opcional" {...editForm.register("sigla")} />
              {editForm.formState.errors.sigla && (
                <p className="mt-1 text-xs text-destructive">
                  {editForm.formState.errors.sigla.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveTribunal.isPending}>
                {saveTribunal.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal editar advogado */}
      <Dialog open={editAdvOpen} onOpenChange={setEditAdvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar advogado</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEditAdvogado} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome</label>
              <Input autoFocus {...editAdvForm.register("nome")} />
              {editAdvForm.formState.errors.nome && (
                <p className="mt-1 text-xs text-destructive">
                  {editAdvForm.formState.errors.nome.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditAdvOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveAdvogado.isPending}>
                {saveAdvogado.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
