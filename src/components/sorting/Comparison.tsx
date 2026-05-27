import { useMemo } from "react";
import { ALGORITHMS } from "@/lib/sorting/algorithms";
import type { AlgorithmKey } from "@/lib/sorting/types";

export interface BenchmarkResult {
  key: AlgorithmKey;
  name: string;
  comparisons: number;
  swaps: number;
  timeMs: number;
  complexity: { best: string; average: string; worst: string };
}

export function runBenchmark(values: number[]): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  for (const key of Object.keys(ALGORITHMS) as AlgorithmKey[]) {
    const alg = ALGORITHMS[key];
    const t0 = performance.now();
    const gen = alg.run(values);
    let last = gen.next();
    while (!last.done) last = gen.next();
    const t1 = performance.now();
    const final = last.value;
    results.push({
      key,
      name: alg.name,
      comparisons: final.comparisons,
      swaps: final.swapsCount,
      timeMs: t1 - t0,
      complexity: alg.complexity,
    });
  }
  return results;
}

export function ComparisonTable({ results }: { results: BenchmarkResult[] }) {
  const maxTime = Math.max(...results.map((r) => r.timeMs), 1);
  const maxComp = Math.max(...results.map((r) => r.comparisons), 1);
  const maxSwap = Math.max(...results.map((r) => r.swaps), 1);

  const sortedByTime = useMemo(() => [...results].sort((a, b) => a.timeMs - b.timeMs), [results]);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Algoritmo</th>
              <th className="px-3 py-2 text-right font-medium">Comparações</th>
              <th className="px-3 py-2 text-right font-medium">Trocas/Movs</th>
              <th className="px-3 py-2 text-right font-medium">Tempo (ms)</th>
              <th className="px-3 py-2 text-left font-medium">Melhor</th>
              <th className="px-3 py-2 text-left font-medium">Médio</th>
              <th className="px-3 py-2 text-left font-medium">Pior</th>
            </tr>
          </thead>
          <tbody>
            {sortedByTime.map((r, i) => (
              <tr key={r.key} className={i % 2 ? "bg-muted/20" : ""}>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-right font-mono">{r.comparisons.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2 text-right font-mono">{r.swaps.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-2 text-right font-mono">{r.timeMs.toFixed(2)}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.complexity.best}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.complexity.average}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.complexity.worst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <MetricBars title="Tempo (ms)" results={results} value={(r) => r.timeMs} max={maxTime} color="bg-sky-500" />
        <MetricBars title="Comparações" results={results} value={(r) => r.comparisons} max={maxComp} color="bg-amber-500" />
        <MetricBars title="Trocas/Movs" results={results} value={(r) => r.swaps} max={maxSwap} color="bg-rose-500" />
      </div>
    </div>
  );
}

function MetricBars({
  title,
  results,
  value,
  max,
  color,
}: {
  title: string;
  results: BenchmarkResult[];
  value: (r: BenchmarkResult) => number;
  max: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm font-medium mb-3">{title}</div>
      <div className="space-y-2">
        {results.map((r) => {
          const v = value(r);
          const pct = (v / max) * 100;
          return (
            <div key={r.key}>
              <div className="flex justify-between text-xs mb-1">
                <span>{r.name}</span>
                <span className="font-mono">{v < 10 ? v.toFixed(2) : v.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
