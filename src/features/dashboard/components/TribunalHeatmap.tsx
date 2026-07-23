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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {data.map((item) => {
        const total = item.ok + item.pendente;
        const percent = total ? Math.round((item.ok / total) * 100) : 0;
        return (
          <button
            key={item.tribunal}
            type="button"
            onClick={() => onCellClick(item)}
            title={`${item.tribunal}: ${item.ok}/${total} concluídos (${percent}%)`}
            className={`group relative flex h-24 flex-col items-center justify-center gap-1 rounded-lg p-2 text-center ${colorForPercent(percent)} transition-transform duration-150 hover:z-10 hover:scale-[1.04] hover:shadow-lg focus-visible:z-10 focus-visible:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            <span className="line-clamp-2 break-words text-xs font-semibold leading-tight text-white drop-shadow-sm">
              {item.nomeCurto}
            </span>
            <span className="text-lg font-bold text-white drop-shadow-sm">{percent}%</span>
            <span className="text-[10px] text-white/85">
              {item.ok}/{total} OK
            </span>
          </button>
        );
      })}
    </div>
  );
}
