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
}: TribunalCardProps) {
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
        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] md:gap-4">
          <button
            onClick={onToggle}
            className="flex min-w-0 items-center gap-2 text-left"
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate font-semibold">{tribunal.nome}</span>
          </button>

          <div className="md:min-w-[80px]">
            {tribunal.sigla ? (
              <Badge variant="secondary" className="text-xs">
                {tribunal.sigla}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground md:hidden">Sem sigla</span>
            )}
          </div>

          <div className="md:min-w-[130px]">
            {status === "Concluído" && (
              <Badge
                className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                variant="outline"
              >
                <CheckCircle2 className="mr-1 h-3 w-3" /> Concluído
              </Badge>
            )}
            {status === "Pendente" && (
              <Badge
                className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
                variant="outline"
              >
                <Clock3 className="mr-1 h-3 w-3" /> Pendente
              </Badge>
            )}
            {status === "Vazio" && (
              <Badge variant="outline" className="text-muted-foreground">
                Vazio
              </Badge>
            )}
          </div>

          <div className="flex flex-col text-xs text-muted-foreground md:min-w-[140px] md:text-right">
            <span>
              {okCount}/{total} OK · {total} advogado{total !== 1 ? "s" : ""}
            </span>
            <span className="text-[11px] opacity-75">Cadastrado em {dataCadastro}</span>
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
        </div>
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