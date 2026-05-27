import { useMemo } from "react";
import type { SortStep } from "@/lib/sorting/types";

interface Props {
  step: SortStep;
  maxValue: number;
  showHeap?: boolean;
}

export function Visualizer({ step, maxValue, showHeap }: Props) {
  const n = step.array.length;
  const barWidth = Math.max(4, Math.floor(900 / Math.max(n, 1)));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-end justify-center gap-[2px] h-64 overflow-hidden">
          {step.array.map((v, i) => {
            const h = (v / Math.max(maxValue, 1)) * 100;
            const isCompare = step.compares.includes(i);
            const isSwap = step.swaps.includes(i);
            const isSorted = step.sorted.includes(i);
            const isHighlight = step.highlights.includes(i);
            let bg = "bg-primary/70";
            if (isSorted) bg = "bg-emerald-500";
            if (isHighlight) bg = "bg-amber-400";
            if (isCompare) bg = "bg-sky-500";
            if (isSwap) bg = "bg-rose-500";
            return (
              <div
                key={i}
                className={`${bg} transition-all duration-150 rounded-t-sm`}
                style={{ height: `${h}%`, width: `${barWidth}px` }}
                title={`[${i}] = ${v}`}
              />
            );
          })}
        </div>
        <Legend />
      </div>
      {showHeap && step.heap && step.heap.length > 0 && <HeapTree heap={step.heap} highlights={step.highlights} swaps={step.swaps} />}
      {step.aux && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="text-xs text-muted-foreground mb-1">Array auxiliar (merge)</div>
          <div className="flex flex-wrap gap-1">
            {step.aux.array.map((v, i) => (
              <span key={i} className="px-2 py-1 rounded bg-background border text-xs font-mono">{v}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  const items = [
    { c: "bg-primary/70", l: "Não ordenado" },
    { c: "bg-sky-500", l: "Comparando" },
    { c: "bg-rose-500", l: "Trocando" },
    { c: "bg-amber-400", l: "Pivô / destaque" },
    { c: "bg-emerald-500", l: "Ordenado" },
  ];
  return (
    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
      {items.map((it) => (
        <div key={it.l} className="flex items-center gap-1.5">
          <span className={`inline-block w-3 h-3 rounded ${it.c}`} />
          {it.l}
        </div>
      ))}
    </div>
  );
}

function HeapTree({ heap, highlights, swaps }: { heap: number[]; highlights: number[]; swaps: number[] }) {
  const levels = useMemo(() => {
    const out: { value: number; index: number }[][] = [];
    let i = 0;
    let levelSize = 1;
    while (i < heap.length) {
      const lvl: { value: number; index: number }[] = [];
      for (let k = 0; k < levelSize && i < heap.length; k++, i++) {
        lvl.push({ value: heap[i], index: i });
      }
      out.push(lvl);
      levelSize *= 2;
    }
    return out;
  }, [heap]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground mb-2">Heap binário (estrutura)</div>
      <div className="space-y-2">
        {levels.map((lvl, li) => (
          <div key={li} className="flex justify-center gap-2">
            {lvl.map((node) => {
              const isHi = highlights.includes(node.index);
              const isSw = swaps.includes(node.index);
              let bg = "bg-primary/20 border-primary/40";
              if (isHi) bg = "bg-amber-400/30 border-amber-500";
              if (isSw) bg = "bg-rose-500/30 border-rose-500";
              return (
                <div
                  key={node.index}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-mono ${bg}`}
                >
                  {node.value}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
