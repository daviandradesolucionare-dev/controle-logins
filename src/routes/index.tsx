import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Dashboard,
});

interface Stats {
  tribunais: number;
  ok: number;
  aguardando: number;
  naoEnviado: number;
}

function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [t, ok, aguard, nao] = await Promise.all([
        supabase.from("tabelas_tribunais").select("id", { count: "exact", head: true }),
        supabase.from("tabelas_advogados").select("id", { count: "exact", head: true }).eq("status", "Ok"),
        supabase
          .from("tabelas_advogados")
          .select("id", { count: "exact", head: true })
          .eq("status", "Enviado - Aguardando Retorno"),
        supabase.from("tabelas_advogados").select("id", { count: "exact", head: true }).eq("status", "Não enviado"),
      ]);
      setStats({
        tribunais: t.count ?? 0,
        ok: ok.count ?? 0,
        aguardando: aguard.count ?? 0,
        naoEnviado: nao.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    {
      label: "Tribunais",
      value: stats?.tribunais ?? 0,
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Advogados Ok",
      value: stats?.ok ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Aguardando Retorno",
      value: stats?.aguardando ?? 0,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Não Enviados",
      value: stats?.naoEnviado ?? 0,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral da distribuição de casos aos advogados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <div className={`rounded-md p-2 ${c.bg}`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "—" : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/tribunais">
            Ver Tribunais <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/novo-cadastro">Novo Tribunal</Link>
        </Button>
      </div>
    </div>
  );
}
