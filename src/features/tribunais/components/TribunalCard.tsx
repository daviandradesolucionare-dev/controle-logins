import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  Pencil,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { STATUS_OPTIONS, type Advogado, type StatusAdvogado, type Tribunal } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { computeTribunalStatus } from "../utils";
import { useAuth } from "@/lib/auth";

function StatusBadge({ status }: { status: StatusAdvogado }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const styles: Record<Exclude<StatusAdvogado, "">, string> = {
    Ok: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    "Não enviado": "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400",
    "Enviado - Aguardando Retorno":
      "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex min-w-fit items-center whitespace-nowrap px-3 py-1.5 text-[12px] font-semibold",
        styles[status],
      )}
    >
      {status}
    </Badge>
  );
}

export interface TribunalCardProps {
  tribunal: Tribunal;
  advogados: Advogado[];
  filtroAdvogado: string;
  expanded: boolean;
  onToggle: () => void;
  onChangeStatus: (adv: Advogado, next: StatusAdvogado) => void;
  onDeleteAdvogado: (adv: Advogado) => void;
  onDeleteTribunal: (t: Tribunal) => void;
  onAddAdvogado: (t: Tribunal) => void;
  onEditTribunal: (t: Tribunal) => void;
  onEditAdvogado: (a: Advogado) => void;
}

export function TribunalCard({
  tribunal,
  advogados,
  filtroAdvogado,
  expanded,
  onToggle,
  onChangeStatus,
  onDeleteAdvogado,
  onDeleteTribunal,
  onAddAdvogado,
  onEditTribunal,
  onEditAdvogado,
}: TribunalCardProps) {
  const { isAdmin } = useAuth();
  const filtered = filtroAdvogado
    ? advogados.filter((a) => a.nome.toLowerCase().includes(filtroAdvogado.toLowerCase()))
    : advogados;
  const okCount = advogados.filter((a) => a.status === "Ok").length;
  const total = advogados.length;
  const status = computeTribunalStatus(advogados);
  const dataCadastro = tribunal.created_at
    ? new Date(tribunal.created_at).toLocaleDateString("pt-BR")
    : "—";

  return (
    <Card className="overflow-hidden">
      <div className="border-b px-4 py-3">
        <div className="grid grid-cols-1 items-center gap-x-4 gap-y-2 md:grid-cols-[minmax(0,240px)_minmax(88px,auto)_minmax(124px,auto)_minmax(0,1fr)_auto] md:gap-3">
          <button
            onClick={onToggle}
            className="flex min-w-0 items-center gap-2 text-left pl-3"
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate font-semibold">{tribunal.nome}</span>
          </button>

          <div className="flex justify-start gap-2 md:min-w-[80px]">
            {tribunal.sigla ? (
              <Badge variant="secondary" className="whitespace-nowrap px-2.5 py-1 text-xs">
                {tribunal.sigla}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground md:hidden">Sem sigla</span>
            )}
          </div>

          <div className="flex justify-start ml-0 md:ml-2 md:min-w-[120px]">
            {status === "Concluído" && (
              <Badge
                className="whitespace-nowrap border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                variant="outline"
              >
                <CheckCircle2 className="mr-1 h-3 w-3" /> Concluído
              </Badge>
            )}
            {status === "Pendente" && (
              <Badge
                className="whitespace-nowrap border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
                variant="outline"
              >
                <Clock3 className="mr-1 h-3 w-3" /> Pendente
              </Badge>
            )}
            {status === "Vazio" && (
              <Badge variant="outline" className="whitespace-nowrap text-muted-foreground">
                Vazio
              </Badge>
            )}
          </div>

          <div className="flex flex-col text-xs text-muted-foreground md:items-end">
            <span className="whitespace-nowrap">
              {okCount}/{total} OK · {total} advogado{total !== 1 ? "s" : ""}
            </span>
            <span className="whitespace-nowrap text-[11px] opacity-75">
              Cadastrado em {dataCadastro}
            </span>
          </div>

          <div className="flex items-center justify-end gap-1">
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
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDeleteTribunal(tribunal)}
                aria-label="Excluir tribunal"
                className="text-destructive hover:text-destructive"
                title="Excluir tribunal"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-3">Advogado</TableHead>
                <TableHead className="w-[440px]">Status</TableHead>
                <TableHead className="w-[180px] text-right pr-3">Ações</TableHead>
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
                  <TableCell className="font-medium pl-4">{a.nome}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Select
                        value={a.status || "__vazio__"}
                        onValueChange={(v) =>
                          onChangeStatus(a, (v === "__vazio__" ? "" : v) as StatusAdvogado)
                        }
                      >
                        <SelectTrigger className="h-8 w-[200px] max-w-[200px] sm:w-[240px] sm:max-w-[240px]">
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
                  <TableCell className="pr-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEditAdvogado(a)}
                        aria-label="Editar advogado"
                        title="Editar advogado"
                        className="pr-1"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDeleteAdvogado(a)}
                        aria-label="Excluir advogado"
                        title="Excluir advogado"
                        className="pr-1 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
