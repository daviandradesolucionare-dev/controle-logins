import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  Search,
  X,
  Loader2,
  Pencil,
  Check,
  CheckCircle2,
  Clock3,
  ArrowUpAZ,
  ArrowDownAZ,
} from "lucide-react";
import { toast } from "sonner";
import {
  supabase,
  STATUS_OPTIONS,
  type Advogado,
  type StatusAdvogado,
  type Tribunal,
} from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tribunais")({
  ssr: false,
  component: TribunaisPage,
});

type TribunalStatus = "Concluído" | "Pendente" | "Vazio";

function computeTribunalStatus(advs: Advogado[]): TribunalStatus {
  if (advs.length === 0) return "Vazio";
  return advs.every((a) => a.status === "Ok") ? "Concluído" : "Pendente";
}

function StatusBadge({ status }: { status: StatusAdvogado }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const styles: Record<Exclude<StatusAdvogado, "">, string> = {
    Ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    "Não enviado": "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    "Enviado - Aguardando Retorno":
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {status}
    </Badge>
  );
}

function TribunalCard({
  tribunal,
  advogados,
  filtroAdvogado,
  onChangeStatus,
  onDeleteAdvogado,
  onDeleteTribunal,
  onAddAdvogado,
  onEditTribunal,
  expanded,
  onToggle,
}: {
  tribunal: Tribunal;
  advogados: Advogado[];
  filtroAdvogado: string;
  onChangeStatus: (adv: Advogado, next: StatusAdvogado) => void;
  onDeleteAdvogado: (adv: Advogado) => void;
  onDeleteTribunal: (t: Tribunal) => void;
  onAddAdvogado: (t: Tribunal) => void;
  onEditTribunal: (t: Tribunal) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const filtered = filtroAdvogado
    ? advogados.filter((a) => a.nome.toLowerCase().includes(filtroAdvogado.toLowerCase()))
    : advogados;
  const okCount = advogados.filter((a) => a.status === "Ok").length;
  const total = advogados.length;
  const status = computeTribunalStatus(advogados);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <span className="font-semibold">{tribunal.nome}</span>
            {tribunal.sigla && (
              <Badge variant="secondary" className="text-xs">
                {tribunal.sigla}
              </Badge>
            )}
            {status === "Concluído" && (
              <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" variant="outline">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Concluído
              </Badge>
            )}
            {status === "Pendente" && (
              <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400" variant="outline">
                <Clock3 className="mr-1 h-3 w-3" /> Pendente
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {total} advogado{total !== 1 ? "s" : ""} · {okCount}/{total} OK
            </span>
          </div>
        </button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEditTribunal(tribunal)}
          aria-label="Editar tribunal"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAddAdvogado(tribunal)}
          className="hidden sm:inline-flex"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Advogado
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDeleteTribunal(tribunal)}
          aria-label="Excluir tribunal"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Advogado</TableHead>
                <TableHead className="w-[280px]">Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    Nenhum advogado{filtroAdvogado ? " corresponde ao filtro" : ""}.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={a.status || "__vazio__"}
                        onValueChange={(v) =>
                          onChangeStatus(a, (v === "__vazio__" ? "" : v) as StatusAdvogado)
                        }
                      >
                        <SelectTrigger className="h-8 w-[220px]">
                          <SelectValue placeholder="Selecionar status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s || "vazio"} value={s || "__vazio__"}>
                              {s || "— vazio —"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <StatusBadge status={a.status} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteAdvogado(a)}
                      aria-label="Excluir advogado"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

function TribunaisPage() {
  const [tribunais, setTribunais] = useState<Tribunal[]>([]);
  const [advogados, setAdvogados] = useState<Advogado[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [filtroTribunalInput, setFiltroTribunalInput] = useState("");
  const [filtroAdvogadoInput, setFiltroAdvogadoInput] = useState("");
  const [filtroTribunal, setFiltroTribunal] = useState("");
  const [filtroAdvogado, setFiltroAdvogado] = useState("");

  const [deleteTribunal, setDeleteTribunal] = useState<Tribunal | null>(null);
  const [deleteAdvogado, setDeleteAdvogado] = useState<Advogado | null>(null);

  const [addAdvOpen, setAddAdvOpen] = useState(false);
  const [addAdvTribunal, setAddAdvTribunal] = useState<Tribunal | null>(null);
  const [addAdvNome, setAddAdvNome] = useState("");
  const [addAdvStatus, setAddAdvStatus] = useState<StatusAdvogado>("");
  const [addAdvSaving, setAddAdvSaving] = useState(false);

  const [filtroStatus, setFiltroStatus] = useState<"todos" | "Concluído" | "Pendente">("todos");
  const [ordem, setOrdem] = useState<"az" | "za">("az");

  const [editOpen, setEditOpen] = useState(false);
  const [editTribunal, setEditTribunal] = useState<Tribunal | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editSigla, setEditSigla] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [tRes, aRes] = await Promise.all([
      supabase.from("tabelas_tribunais").select("*").order("nome"),
      supabase.from("tabelas_advogados").select("*").order("nome"),
    ]);
    if (tRes.error) toast.error("Erro ao carregar tribunais: " + tRes.error.message);
    if (aRes.error) toast.error("Erro ao carregar advogados: " + aRes.error.message);
    setTribunais((tRes.data ?? []) as Tribunal[]);
    setAdvogados((aRes.data ?? []) as Advogado[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const advByTribunal = useMemo(() => {
    const map = new Map<string, Advogado[]>();
    for (const a of advogados) {
      const arr = map.get(a.tribunal_id) ?? [];
      arr.push(a);
      map.set(a.tribunal_id, arr);
    }
    return map;
  }, [advogados]);

  const tribunaisFiltrados = useMemo(() => {
    let list = tribunais;
    if (filtroTribunal) {
      const q = filtroTribunal.toLowerCase();
      list = list.filter(
        (t) => t.nome.toLowerCase().includes(q) || (t.sigla ?? "").toLowerCase().includes(q),
      );
    }
    if (filtroAdvogado) {
      const q = filtroAdvogado.toLowerCase();
      list = list.filter((t) =>
        (advByTribunal.get(t.id) ?? []).some((a) => a.nome.toLowerCase().includes(q)),
      );
    }
    if (filtroStatus !== "todos") {
      list = list.filter(
        (t) => computeTribunalStatus(advByTribunal.get(t.id) ?? []) === filtroStatus,
      );
    }
    const sorted = [...list].sort((a, b) =>
      ordem === "az" ? a.nome.localeCompare(b.nome, "pt-BR") : b.nome.localeCompare(a.nome, "pt-BR"),
    );
    return sorted;
  }, [tribunais, filtroTribunal, filtroAdvogado, filtroStatus, ordem, advByTribunal]);

  const aplicarFiltros = () => {
    setFiltroTribunal(filtroTribunalInput.trim());
    setFiltroAdvogado(filtroAdvogadoInput.trim());
    if (filtroAdvogadoInput.trim()) {
      // expandir automaticamente tribunais com match
      const q = filtroAdvogadoInput.trim().toLowerCase();
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

  const handleChangeStatus = async (adv: Advogado, next: StatusAdvogado) => {
    setAdvogados((prev) => prev.map((a) => (a.id === adv.id ? { ...a, status: next } : a)));
    const { error } = await supabase
      .from("tabelas_advogados")
      .update({ status: next })
      .eq("id", adv.id);
    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
      setAdvogados((prev) => prev.map((a) => (a.id === adv.id ? { ...a, status: adv.status } : a)));
    } else {
      toast.success("Status atualizado.");
    }
  };

  const confirmDeleteTribunal = async () => {
    if (!deleteTribunal) return;
    const { error } = await supabase
      .from("tabelas_tribunais")
      .delete()
      .eq("id", deleteTribunal.id);
    if (error) toast.error("Erro ao excluir tribunal: " + error.message);
    else {
      toast.success("Tribunal excluído.");
      setTribunais((prev) => prev.filter((t) => t.id !== deleteTribunal.id));
      setAdvogados((prev) => prev.filter((a) => a.tribunal_id !== deleteTribunal.id));
    }
    setDeleteTribunal(null);
  };

  const confirmDeleteAdvogado = async () => {
    if (!deleteAdvogado) return;
    const { error } = await supabase
      .from("tabelas_advogados")
      .delete()
      .eq("id", deleteAdvogado.id);
    if (error) toast.error("Erro ao excluir advogado: " + error.message);
    else {
      toast.success("Advogado excluído.");
      setAdvogados((prev) => prev.filter((a) => a.id !== deleteAdvogado.id));
    }
    setDeleteAdvogado(null);
  };

  const openAddAdvogado = (t: Tribunal) => {
    setAddAdvTribunal(t);
    setAddAdvNome("");
    setAddAdvStatus("");
    setAddAdvOpen(true);
  };

  const openEditTribunal = (t: Tribunal) => {
    setEditTribunal(t);
    setEditNome(t.nome);
    setEditSigla(t.sigla ?? "");
    setEditOpen(true);
  };

  const submitEditTribunal = async () => {
    if (!editTribunal || !editNome.trim()) {
      toast.error("Informe o nome do tribunal.");
      return;
    }
    setEditSaving(true);
    const nome = editNome.trim();
    const sigla = editSigla.trim() || null;
    const { data, error } = await supabase
      .from("tabelas_tribunais")
      .update({ nome, sigla })
      .eq("id", editTribunal.id)
      .select()
      .single();
    setEditSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    setTribunais((prev) => prev.map((t) => (t.id === editTribunal.id ? (data as Tribunal) : t)));
    setEditOpen(false);
    toast.success("Tribunal atualizado.");
  };

  const submitAddAdvogado = async () => {
    if (!addAdvTribunal || !addAdvNome.trim()) {
      toast.error("Informe o nome do advogado.");
      return;
    }
    setAddAdvSaving(true);
    const { data, error } = await supabase
      .from("tabelas_advogados")
      .insert({
        tribunal_id: addAdvTribunal.id,
        nome: addAdvNome.trim(),
        status: addAdvStatus,
      })
      .select()
      .single();
    setAddAdvSaving(false);
    if (error) {
      toast.error("Erro ao adicionar: " + error.message);
      return;
    }
    setAdvogados((prev) => [...prev, data as Advogado]);
    setExpanded((prev) => new Set(prev).add(addAdvTribunal.id));
    setAddAdvOpen(false);
    toast.success("Advogado adicionado.");
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
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}>
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Ordenar
            </label>
            <Select value={ordem} onValueChange={(v) => setOrdem(v as "az" | "za")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="az">A → Z</SelectItem>
                <SelectItem value="za">Z → A</SelectItem>
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
        <div className="space-y-3">
          {tribunaisFiltrados.map((t) => (
            <TribunalCard
              key={t.id}
              tribunal={t}
              advogados={advByTribunal.get(t.id) ?? []}
              filtroAdvogado={filtroAdvogado}
              expanded={expanded.has(t.id)}
              onToggle={() => toggleExpand(t.id)}
              onChangeStatus={handleChangeStatus}
              onDeleteAdvogado={(a) => setDeleteAdvogado(a)}
              onDeleteTribunal={(x) => setDeleteTribunal(x)}
              onAddAdvogado={openAddAdvogado}
              onEditTribunal={openEditTribunal}
            />
          ))}
        </div>
      )}

      {/* Modal excluir tribunal */}
      <AlertDialog open={!!deleteTribunal} onOpenChange={(o) => !o && setDeleteTribunal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tribunal?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTribunal?.nome}</strong>? Todos os
              advogados associados serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTribunal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal excluir advogado */}
      <AlertDialog open={!!deleteAdvogado} onOpenChange={(o) => !o && setDeleteAdvogado(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir advogado?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteAdvogado?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAdvogado}
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
            <Button onClick={submitAddAdvogado} disabled={addAdvSaving}>
              {addAdvSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome</label>
              <Input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sigla</label>
              <Input
                value={editSigla}
                onChange={(e) => setEditSigla(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitEditTribunal} disabled={editSaving}>
              {editSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}