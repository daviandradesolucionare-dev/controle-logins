import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Building2, Users, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getDefaultLawyers } from "@/lib/default-lawyers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/novo-cadastro")({
  ssr: false,
  component: NovoCadastro,
});

function NovoCadastro() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [carregarPadrao, setCarregarPadrao] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults] = useState<string[]>(() => getDefaultLawyers());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do tribunal.");
      return;
    }
    setSaving(true);
    const { data: tribunal, error: tErr } = await supabase
      .from("tabelas_tribunais")
      .insert({ nome: nome.trim(), sigla: sigla.trim() || null })
      .select()
      .single();

    if (tErr || !tribunal) {
      setSaving(false);
      toast.error("Erro ao criar tribunal: " + (tErr?.message ?? "desconhecido"));
      return;
    }

    if (carregarPadrao) {
      const rows = defaults.map((n) => ({
        tribunal_id: tribunal.id,
        nome: n,
        status: "Não enviado",
      }));
      const { error: aErr } = await supabase.from("tabelas_advogados").insert(rows);
      if (aErr) {
        setSaving(false);
        toast.error("Tribunal criado, mas falhou ao carregar advogados: " + aErr.message);
        navigate({ to: "/tribunais" });
        return;
      }
    }

    setSaving(false);
    toast.success(
      carregarPadrao
        ? `Tribunal criado com ${defaults.length} advogados padrão.`
        : "Tribunal criado.",
    );
    navigate({ to: "/tribunais" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Novo Cadastro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre um novo tribunal e, opcionalmente, carregue a lista padrão de{" "}
          {defaults.length} advogados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Novo Tribunal
          </CardTitle>
          <CardDescription>Os campos marcados são obrigatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome *</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Tribunal de Justiça de São Paulo"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sigla</label>
              <Input
                value={sigla}
                onChange={(e) => setSigla(e.target.value)}
                placeholder="Ex.: TJSP"
              />
            </div>

            <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-3">
              <Checkbox
                id="carregar-padrao"
                checked={carregarPadrao}
                onCheckedChange={(c) => setCarregarPadrao(c === true)}
              />
              <label htmlFor="carregar-padrao" className="text-sm">
                <span className="font-medium">
                  Carregar lista padrão de {defaults.length} advogados
                </span>
                <p className="text-xs text-muted-foreground">
                  Os advogados são inseridos com status "Não enviado" e podem ser editados depois.
                </p>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/tribunais" })}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Tribunal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {carregarPadrao && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Prévia da lista padrão
                </CardTitle>
                <CardDescription className="mt-1">
                  Estes advogados serão inseridos automaticamente. Edite em{" "}
                  <span className="font-medium text-foreground">Advogados Padrão</span>.
                </CardDescription>
              </div>
              <span className="shrink-0 rounded-full border bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {defaults.length} advogados
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {defaults.map((n, i) => (
                <li
                  key={n}
                  className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-accent/50"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                    {i + 1}
                  </span>
                  <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{n}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}