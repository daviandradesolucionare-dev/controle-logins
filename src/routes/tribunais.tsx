import { createFileRoute } from "@tanstack/react-router";
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
import {
  STATUS_OPTIONS,
  type Advogado,
  type StatusAdvogado,
  type Tribunal,
} from "@/lib/supabase";
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
  useTribunaisData,
  useTribunalMutations,
} from "@/features/tribunais/hooks";
import {
  filtrarTribunais,
  groupAdvogadosPorTribunal,
  ordenarTribunais,
  type FiltroStatus,
  type Ordem,
} from "@/features/tribunais/utils";

export const Route = createFileRoute("/tribunais")({
  ssr: false,
  component: TribunaisPage,
});

const PAGE_SIZE = 12;

const tribunalSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(120, "Máx. 120 caracteres"),
  sigla: z.string().trim().max(20, "Máx. 20 caracteres").optional(),
});
type TribunalForm = z.infer<typeof tribunalSchema>;

function TribunaisPage() {
  const { tribunais, advogados, loading } = useTribunaisData();
  const { setStatus, removeTribunal, removeAdvogado, saveTribunal, addAdvogado } =
    useTribunalMutations();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [filtroTribunalInput, setFiltroTribunalInput] = useState("");
  const [filtroAdvogadoInput, setFiltroAdvogadoInput] = useState("");
  const [filtroTribunal, setFiltroTribunal] = useState("");
  const [filtroAdvogado, setFiltroAdvogado] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [ordem, setOrdem] = useState<Ordem>("az");
  const [page, setPage] = useState(1);

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

  const advByTribunal = useMemo(() => groupAdvogadosPorTribunal(advogados), [advogados]);

  const tribunaisFiltrados = useMemo(() => {
    const filtrados = filtrarTribunais(tribunais, advByTribunal, {
      texto: filtroTribunal,
      advogado: filtroAdvogado,
      status: filtroStatus,
    });
    return ordenarTribunais(filtrados, ordem);
  }, [tribunais, advByTribunal, filtroTribunal, filtroAdvogado, filtroStatus, ordem]);

  useEffect(() => {
    setPage(1);
  }, [filtroTribunal, filtroAdvogado, filtroStatus, ordem]);

  const totalPages = Math.max(1, Math.ceil(tribunaisFiltrados.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginados = useMemo(
    () => tribunaisFiltrados.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [tribunaisFiltrados, currentPage],
  );

  const aplicarFiltros = () => {
    setFiltroTribunal(filtroTribunalInput.trim());
    const advQ = filtroAdvogadoInput.trim();
    setFiltroAdvogado(advQ);
    if (advQ) {
      const q = advQ.toLowerCase();
      const next = new Set(expanded);
      for (const t of tribunais) {
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
    setFiltroTribunal("");
    setFiltroAdvogado("");
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
            {tribunais.length} tribunal{tribunais.length !== 1 ? "is" : ""} · {advogados.length}{" "}
            advogado{advogados.length !== 1 ? "s" : ""}
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
            <Select
              value={filtroStatus}
              onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Ordenar</label>
            <Select value={ordem} onValueChange={(v) => setOrdem(v as Ordem)}>
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
            onClick={() => setOrdem((o) => (o === "az" ? "za" : "az"))}
            title="Alternar ordenação"
          >
            {ordem === "az" ? (
              <ArrowUpAZ className="mr-2 h-4 w-4" />
            ) : (
              <ArrowDownAZ className="mr-2 h-4 w-4" />
            )}
            {ordem === "az" ? "A-Z" : "Z-A"}
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : tribunaisFiltrados.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          {tribunais.length === 0
            ? "Nenhum tribunal cadastrado ainda."
            : "Nenhum tribunal corresponde aos filtros."}
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {paginados.map((t) => (
              <TribunalCard
                key={t.id}
                tribunal={t}
                advogados={advByTribunal.get(t.id) ?? []}
                filtroAdvogado={filtroAdvogado}
                expanded={expanded.has(t.id)}
                onToggle={() => toggleExpand(t.id)}
                onChangeStatus={(adv, status) => setStatus.mutate({ adv, status })}
                onDeleteAdvogado={(a) => setAdvogadoParaExcluir(a)}
                onDeleteTribunal={(x) => setTribunalParaExcluir(x)}
                onAddAdvogado={openAddAdvogado}
                onEditTribunal={openEditTribunal}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, tribunaisFiltrados.length)} de{" "}
                {tribunaisFiltrados.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  );
}