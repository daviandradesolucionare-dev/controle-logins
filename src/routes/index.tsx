import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Clock, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { supabase, type Advogado, type Tribunal } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardSearchInput } from "@/features/dashboard/components/CardSearchInput";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Dashboard,
});

const EMPTY_TRIBUNAIS: Tribunal[] = [];
const EMPTY_ADVOGADOS: Advogado[] = [];

function Dashboard() {
  const [busca, setBusca] = useState("");
  const [statusEmFoco, setStatusEmFoco] = useState("Todos");
  const [buscaPanorama, setBuscaPanorama] = useState("");

  const dashboardQuery = useQuery<{ tribunais: Tribunal[]; advogados: Advogado[] }>({
    queryKey: ["dashboard", "data"],
    queryFn: async () => {
      const [t, a] = await Promise.all([
        supabase.from("tabelas_tribunais").select("*").order("nome"),
        supabase.from("tabelas_advogados").select("*").order("nome"),
      ]);
      if (t.error) throw t.error;
      if (a.error) throw a.error;
      return { tribunais: (t.data ?? []) as Tribunal[], advogados: (a.data ?? []) as Advogado[] };
    },
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
  const tribunais = dashboardQuery.data?.tribunais ?? EMPTY_TRIBUNAIS;
  const advogados = dashboardQuery.data?.advogados ?? EMPTY_ADVOGADOS;
  const loading = dashboardQuery.isLoading;

  const tribunalById = useMemo(() => {
    const m = new Map<string, Tribunal>();
    tribunais.forEach((t) => m.set(t.id, t));
    return m;
  }, [tribunais]);

  const stats = useMemo(() => {
    const ok = advogados.filter((a) => a.status === "Ok").length;
    const aguardando = advogados.filter((a) => a.status === "Enviado - Aguardando Retorno").length;
    const naoEnviado = advogados.filter((a) => a.status === "Não enviado" || !a.status).length;
    return { tribunais: tribunais.length, ok, aguardando, naoEnviado };
  }, [tribunais, advogados]);

  const porTribunal = useMemo(() => {
    const map = new Map<string, Advogado[]>();
    for (const a of advogados) {
      const arr = map.get(a.tribunal_id) ?? [];
      arr.push(a);
      map.set(a.tribunal_id, arr);
    }
    return map;
  }, [advogados]);

  const statusTribunais = useMemo(() => {
    return tribunais.map((t) => {
      const advs = porTribunal.get(t.id) ?? [];
      const okCount = advs.filter((a) => a.status === "Ok").length;
      const total = advs.length;
      const status: "Concluído" | "Pendente" | "Vazio" =
        total === 0 ? "Vazio" : okCount === total ? "Concluído" : "Pendente";
      return { tribunal: t, okCount, total, status };
    });
  }, [tribunais, porTribunal]);

  const concluidos = statusTribunais.filter((s) => s.status === "Concluído").length;
  const pendentes = statusTribunais.filter((s) => s.status === "Pendente").length;

  const statusTribunaisFiltrados = useMemo(() => {
    const termo = buscaPanorama.trim().toLowerCase();
    if (!termo) return statusTribunais;
    return statusTribunais.filter(
      ({ tribunal }) =>
        tribunal.nome.toLowerCase().includes(termo) ||
        tribunal.sigla?.toLowerCase().includes(termo),
    );
  }, [statusTribunais, buscaPanorama]);

  const statusChartData = useMemo(
    () => [
      { status: "Ok", total: stats.ok, color: "bg-emerald-500" },
      { status: "Aguardando", total: stats.aguardando, color: "bg-amber-500" },
      { status: "Não enviados", total: stats.naoEnviado, color: "bg-red-500" },
    ],
    [stats],
  );

  const progressoPorTribunal = useMemo(
    () =>
      statusTribunais
        .filter(({ total }) => total > 0)
        .sort(
          (a, b) => b.total - a.total || a.tribunal.nome.localeCompare(b.tribunal.nome, "pt-BR"),
        )
        .slice(0, 8)
        .map(({ tribunal, okCount, total }) => ({
          tribunal: tribunal.nome,
          nomeCurto: tribunal.sigla || tribunal.nome,
          ok: okCount,
          pendente: total - okCount,
        })),
    [statusTribunais],
  );

  const cards = [
    {
      label: "Tribunais",
      value: stats.tribunais,
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Advogados Ok",
      value: stats.ok,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Aguardando Retorno",
      value: stats.aguardando,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Não Enviados",
      value: stats.naoEnviado,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10",
    },
  ];

  const q = busca.trim().toLowerCase();
  const filtroAdv = (list: Advogado[]) =>
    !q
      ? list
      : list.filter(
          (a) =>
            a.nome.toLowerCase().includes(q) ||
            (tribunalById.get(a.tribunal_id)?.nome ?? "").toLowerCase().includes(q),
        );

  const advOk = filtroAdv(advogados.filter((a) => a.status === "Ok"));
  const advAguard = filtroAdv(advogados.filter((a) => a.status === "Enviado - Aguardando Retorno"));
  const advNao = filtroAdv(advogados.filter((a) => a.status === "Não enviado" || !a.status));

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

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/tribunais">
            Ver Tribunais <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/novo-cadastro">Novo Tribunal</Link>
        </Button>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : dashboardQuery.isError ? (
        <Card className="mt-8 border-destructive/30">
          <CardContent className="py-8 text-center text-sm text-destructive">
            Não foi possível carregar o dashboard. Atualize a página para tentar novamente.
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="mt-8 grid gap-6 lg:grid-cols-5" aria-label="Gráficos do dashboard">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Distribuição dos status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clique em um status para destacá-lo.
                </p>
              </CardHeader>
              <CardContent>
                {advogados.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    Cadastre advogados para visualizar a distribuição.
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 py-4">
                      {statusChartData.map((item) => {
                        const percent = advogados.length
                          ? Math.round((item.total / advogados.length) * 100)
                          : 0;
                        const active = statusEmFoco === "Todos" || statusEmFoco === item.status;
                        return (
                          <button
                            key={item.status}
                            type="button"
                            onClick={() => setStatusEmFoco(item.status)}
                            className="w-full text-left"
                            aria-pressed={statusEmFoco === item.status}
                          >
                            <div className="mb-1 flex justify-between text-sm">
                              <span>{item.status}</span>
                              <span className="font-semibold">
                                {item.total} · {percent}%
                              </span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`${item.color} h-full rounded-full transition-all ${active ? "opacity-100" : "opacity-30"}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        size="sm"
                        variant={statusEmFoco === "Todos" ? "secondary" : "ghost"}
                        onClick={() => setStatusEmFoco("Todos")}
                      >
                        Todos ({advogados.length})
                      </Button>
                      {statusChartData.map((item) => (
                        <Button
                          key={item.status}
                          size="sm"
                          variant={statusEmFoco === item.status ? "secondary" : "ghost"}
                          onClick={() => setStatusEmFoco(item.status)}
                        >
                          {item.status} ({item.total})
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Progresso por tribunal</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Os oito tribunais com mais advogados, separados entre concluídos e pendentes.
                </p>
              </CardHeader>
              <CardContent>
                {progressoPorTribunal.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    Ainda não há advogados vinculados a tribunais.
                  </p>
                ) : (
                  <div className="space-y-4 py-2">
                    {progressoPorTribunal.map((item) => {
                      const okPercent = Math.round((item.ok / (item.ok + item.pendente)) * 100);
                      return (
                        <div
                          key={item.tribunal}
                          title={`${item.tribunal}: ${item.ok} OK e ${item.pendente} pendente(s)`}
                        >
                          <div className="mb-1 flex justify-between gap-3 text-sm">
                            <span className="truncate font-medium">{item.nomeCurto}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {item.ok}/{item.ok + item.pendente} OK
                            </span>
                          </div>
                          <div className="flex h-3 overflow-hidden rounded-full bg-amber-500/80">
                            <div
                              className="bg-emerald-500 transition-all"
                              style={{ width: `${okPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        <i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                        OK
                      </span>
                      <span>
                        <i className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-500" />
                        Pendente
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Panorama de tribunais */}
          <Card className="mt-8">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Panorama dos Tribunais</CardTitle>
                <div className="flex gap-2 text-xs">
                  <Badge
                    className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    variant="outline"
                  >
                    {concluidos} Concluído{concluidos !== 1 ? "s" : ""}
                  </Badge>
                  <Badge
                    className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    variant="outline"
                  >
                    {pendentes} Pendente{pendentes !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>
              <div className="mt-3">
                <CardSearchInput
                  value={buscaPanorama}
                  onChange={setBuscaPanorama}
                  placeholder="Buscar tribunal por nome ou sigla..."
                />
              </div>
            </CardHeader>
            <CardContent>
              {statusTribunaisFiltrados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {statusTribunais.length === 0
                    ? "Nenhum tribunal cadastrado."
                    : "Nenhum tribunal encontrado para essa busca."}
                </p>
              ) : (
                <ul
                  className="max-h-[480px] divide-y overflow-y-auto"
                  role="region"
                  aria-label="Lista de tribunais"
                  tabIndex={0}
                >
                  {statusTribunaisFiltrados.map(({ tribunal, okCount, total, status }) => (
                    <li
                      key={tribunal.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{tribunal.nome}</span>
                        {tribunal.sigla && (
                          <Badge variant="secondary" className="text-xs">
                            {tribunal.sigla}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {okCount}/{total} OK
                        </span>
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
                            <Clock className="mr-1 h-3 w-3" /> Pendente
                          </Badge>
                        )}
                        {status === "Vazio" && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Sem advogados
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Relatório consolidado de advogados */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Advogados por Status</CardTitle>
                <Input
                  placeholder="Buscar por advogado ou tribunal..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="ok">
                <TabsList>
                  <TabsTrigger value="ok">
                    <CheckCircle2 className="mr-1 h-4 w-4 text-emerald-600" />
                    OK ({advOk.length})
                  </TabsTrigger>
                  <TabsTrigger value="aguardando">
                    <Clock className="mr-1 h-4 w-4 text-amber-600" />
                    Aguardando Retorno ({advAguard.length})
                  </TabsTrigger>
                  <TabsTrigger value="nao">
                    <XCircle className="mr-1 h-4 w-4 text-red-600" />
                    Não Enviados ({advNao.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="ok">
                  <AdvList advogados={advOk} tribunalById={tribunalById} />
                </TabsContent>
                <TabsContent value="aguardando">
                  <AdvList advogados={advAguard} tribunalById={tribunalById} />
                </TabsContent>
                <TabsContent value="nao">
                  <AdvList advogados={advNao} tribunalById={tribunalById} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function AdvList({
  advogados,
  tribunalById,
}: {
  advogados: Advogado[];
  tribunalById: Map<string, Tribunal>;
}) {
  if (advogados.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum advogado nesta categoria.
      </p>
    );
  }
  // Agrupa por tribunal
  const groups = new Map<string, Advogado[]>();
  for (const a of advogados) {
    const arr = groups.get(a.tribunal_id) ?? [];
    arr.push(a);
    groups.set(a.tribunal_id, arr);
  }
  const entries = Array.from(groups.entries()).sort((a, b) => {
    const na = tribunalById.get(a[0])?.nome ?? "";
    const nb = tribunalById.get(b[0])?.nome ?? "";
    return na.localeCompare(nb, "pt-BR");
  });
  return (
    <div className="mt-3 space-y-4">
      {entries.map(([tid, advs]) => {
        const t = tribunalById.get(tid);
        return (
          <div key={tid}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-semibold">{t?.nome ?? "—"}</span>
              {t?.sigla && (
                <Badge variant="secondary" className="text-xs">
                  {t.sigla}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {advs.length} advogado{advs.length !== 1 ? "s" : ""}
              </span>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {advs.map((a) => (
                <li key={a.id} className="rounded-md border bg-muted/40 px-2 py-1 text-xs">
                  {a.nome}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
