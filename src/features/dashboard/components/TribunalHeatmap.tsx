export interface TribunalHeatmapDatum {
  tribunal: string;
  nomeCurto: string;
  ok: number;
  pendente: number;
}

interface TribunalHeatmapProps {
  data: TribunalHeatmapDatum[];
  onCellClick: (item: TribunalHeatmapDatum) => void;
}

// Escala de cor por percentual concluído: vermelho (0%) até verde (100%),
// passando por âmbar no meio — a mesma paleta de status usada no resto do
// dashboard, só que em degradê contínuo em vez de 3 cores fixas.
function colorForPercent(percent: number): string {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 75) return "bg-emerald-400";
  if (percent >= 50) return "bg-amber-400";
  if (percent >= 25) return "bg-amber-500";
  if (percent > 0) return "bg-red-400";
  return "bg-red-500";
}

export function TribunalHeatmap({ data, onCellClick }: TribunalHeatmapProps) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Cadastre tribunais e advogados para visualizar o progresso.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
      {data.map((item) => {
        const total = item.ok + item.pendente;
        const percent = total ? Math.round((item.ok / total) * 100) : 0;
        return (
          <button
            key={item.tribunal}
            type="button"
            onClick={() => onCellClick(item)}
            title={`${item.tribunal}: ${item.ok}/${total} concluídos (${percent}%)`}
            className={`group relative aspect-square rounded-md ${colorForPercent(percent)} transition-transform duration-150 hover:z-10 hover:scale-110 hover:shadow-lg focus-visible:z-10 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-0.5 text-center text-[10px] font-semibold leading-tight text-white drop-shadow-sm">
              {item.nomeCurto}
            </span>
          </button>
        );
      })}
    </div>
  );
}
