import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface StatusDonutDatum {
  status: string;
  total: number;
}

interface StatusDonutChartProps {
  data: StatusDonutDatum[];
  activeStatus: string;
  onSliceClick: (status: string) => void;
}

// Cores fixas em hex (var(--tailwind-color) não funciona de forma confiável
// dentro do SVG do recharts entre navegadores), escolhidas para bater com
// as mesmas cores (emerald/amber/red) usadas no resto do dashboard.
const STATUS_HEX: Record<string, string> = {
  Ok: "#10b981",
  Aguardando: "#f59e0b",
  "Não enviados": "#ef4444",
};

export function StatusDonutChart({ data, activeStatus, onSliceClick }: StatusDonutChartProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.total, 0), [data]);

  if (total === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Cadastre advogados para visualizar a distribuição.
      </p>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="status"
            innerRadius={62}
            outerRadius={90}
            paddingAngle={2}
            cornerRadius={4}
            stroke="none"
            onClick={(entry) => onSliceClick((entry as unknown as StatusDonutDatum).status)}
            isAnimationActive
            animationDuration={400}
          >
            {data.map((entry) => {
              const active = activeStatus === "Todos" || activeStatus === entry.status;
              return (
                <Cell
                  key={entry.status}
                  fill={STATUS_HEX[entry.status] ?? "#94a3b8"}
                  opacity={active ? 1 : 0.3}
                  className="cursor-pointer transition-opacity duration-200"
                />
              );
            })}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${value} (${total ? Math.round((Number(value) / total) * 100) : 0}%)`,
              name,
            ]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Total no centro do donut */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-xs text-muted-foreground">
          {activeStatus === "Todos" ? "advogados" : activeStatus}
        </span>
      </div>
    </div>
  );
}
