import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Save, RotateCcw, Pencil, Check, X, Users } from "lucide-react";
import { toast } from "sonner";
import { getDefaultLawyers, saveDefaultLawyers, resetDefaultLawyers } from "@/lib/default-lawyers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/advogados-padrao")({
  ssr: false,
  component: AdvogadosPadrao,
});

function AdvogadosPadrao() {
  const [list, setList] = useState<string[]>([]);
  const [novo, setNovo] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    getDefaultLawyers()
      .then(setList)
      .catch((error: Error) => toast.error("Não foi possível carregar a lista: " + error.message));
  }, []);

  const persist = async (next: string[]) => {
    setList(next);
    try {
      await saveDefaultLawyers(next);
    } catch (error) {
      toast.error("Não foi possível salvar a lista: " + (error as Error).message);
      getDefaultLawyers()
        .then(setList)
        .catch(() => undefined);
      throw error;
    }
  };

  const adicionar = () => {
    const n = novo.trim();
    if (!n) {
      toast.error("Informe um nome.");
      return;
    }
    if (list.some((x) => x.toLowerCase() === n.toLowerCase())) {
      toast.error("Este advogado já existe na lista.");
      return;
    }
    void persist([...list, n]);
    setNovo("");
    toast.success("Advogado adicionado à lista padrão.");
  };

  const excluir = (idx: number) => {
    const nome = list[idx];
    void persist(list.filter((_, i) => i !== idx));
    toast.success(`"${nome}" removido da lista padrão.`);
  };

  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setEditValue(list[idx]);
  };

  const saveEdit = () => {
    if (editIdx === null) return;
    const v = editValue.trim();
    if (!v) {
      toast.error("O nome não pode ficar em branco.");
      return;
    }
    const next = [...list];
    next[editIdx] = v;
    void persist(next);
    setEditIdx(null);
    setEditValue("");
    toast.success("Nome atualizado.");
  };

  const resetar = async () => {
    try {
      const base = await resetDefaultLawyers();
      setList(base);
      toast.success("Lista padrão restaurada.");
    } catch (error) {
      toast.error("Não foi possível restaurar a lista: " + (error as Error).message);
    } finally {
      setConfirmReset(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advogados Padrão</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie a lista carregada automaticamente ao criar um novo tribunal. As Alterações são
            compartilhadas com todos os usuários autorizados.
          </p>
        </div>
        <Button variant="outline" onClick={() => setConfirmReset(true)}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Restaurar padrão
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" /> Adicionar advogado
          </CardTitle>
          <CardDescription>O novo nome será incluído no fim da lista padrão.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adicionar();
            }}
            className="flex gap-2"
          >
            <Input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              placeholder="Nome completo do advogado"
            />
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Lista atual ({list.length})
          </CardTitle>
          <CardDescription>
            Edite ou exclua qualquer advogado. Não afeta tribunais já criados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum advogado na lista.</p>
          ) : (
            <ol className="divide-y">
              {list.map((nome, idx) => (
                <li key={`${nome}-${idx}`} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-8 shrink-0 text-right text-muted-foreground">{idx + 1}.</span>
                  {editIdx === idx ? (
                    <>
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") setEditIdx(null);
                        }}
                        autoFocus
                        className="flex-1"
                      />
                      <Button size="icon" variant="ghost" onClick={saveEdit} aria-label="Salvar">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditIdx(null)}
                        aria-label="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{nome}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(idx)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => excluir(idx)}
                        aria-label="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar lista padrão?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto descarta suas alterações locais e volta à lista original de advogados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={resetar}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
