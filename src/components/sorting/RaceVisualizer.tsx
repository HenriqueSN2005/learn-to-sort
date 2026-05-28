import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import { ALGORITHMS } from "@/lib/sorting/algorithms";
import type { AlgorithmKey, SortStep } from "@/lib/sorting/types";
import { ComparisonTable, runBenchmark, type BenchmarkResult } from "./Comparison";

interface Props {
  values: number[];
  maxValue: number;
}

const KEYS = Object.keys(ALGORITHMS) as AlgorithmKey[];

export function RaceVisualizer({ values, maxValue }: Props) {
  const stepsByAlg = useMemo(() => {
    const map: Record<AlgorithmKey, SortStep[]> = {} as Record<AlgorithmKey, SortStep[]>;
    if (values.length === 0) return map;
    for (const key of KEYS) {
      const collected: SortStep[] = [];
      const gen = ALGORITHMS[key].run(values);
      let cur = gen.next();
      while (!cur.done) {
        collected.push(cur.value);
        cur = gen.next();
      }
      if (cur.value) collected.push(cur.value);
      map[key] = collected;
    }
    return map;
  }, [values]);

  const maxLen = useMemo(
    () => Math.max(0, ...KEYS.map((k) => stepsByAlg[k]?.length ?? 0)),
    [stepsByAlg],
  );

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(120);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  // Reset when data changes
  useEffect(() => {
    setIdx(0);
    setPlaying(false);
    setElapsed(0);
    startRef.current = null;
  }, [stepsByAlg]);

  useEffect(() => {
    if (!playing) {
      startRef.current = null;
      return;
    }
    if (idx >= maxLen - 1) {
      setPlaying(false);
      return;
    }
    if (startRef.current === null) startRef.current = performance.now() - elapsed;
    const t = setTimeout(() => {
      setIdx((i) => Math.min(i + 1, maxLen - 1));
      setElapsed(performance.now() - (startRef.current ?? performance.now()));
    }, speed);
    return () => clearTimeout(t);
  }, [playing, idx, maxLen, speed, elapsed]);

  const [benchmark, setBenchmark] = useState<BenchmarkResult[] | null>(null);
  useEffect(() => {
    if (values.length === 0) setBenchmark(null);
    else setBenchmark(runBenchmark(values));
  }, [values]);

  const allDone = maxLen > 0 && idx >= maxLen - 1;

  if (values.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Carregue dados na seção acima para iniciar a comparação.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls — mirroring "Algoritmo e controles" */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Controles da corrida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-7">
              <label className="text-sm font-medium">
                Velocidade: {speed} ms/passo
              </label>
              <Slider
                value={[speed]}
                onValueChange={([v]) => setSpeed(v)}
                min={10}
                max={2000}
                step={10}
              />
            </div>
            <div className="md:col-span-5 flex gap-2">
              <Button
                variant={playing ? "secondary" : "default"}
                onClick={() => setPlaying((p) => !p)}
                disabled={maxLen === 0 || allDone}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="ml-2">{playing ? "Pausar" : "Executar todos"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIdx((i) => Math.min(i + 1, maxLen - 1))}
                disabled={playing || allDone}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIdx(0);
                  setPlaying(false);
                  setElapsed(0);
                }}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Passo global" value={`${idx + 1} / ${maxLen}`} />
            <Metric label="Tempo decorrido" value={`${(elapsed / 1000).toFixed(2)} s`} />
            <Metric label="Elementos" value={String(values.length)} />
            <Metric
              label="Status"
              value={allDone ? "Concluído ✓" : playing ? "Executando" : "Pausado"}
              highlight={allDone}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid of mini-visualizers */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {KEYS.map((key) => {
          const steps = stepsByAlg[key] ?? [];
          const algInfo = ALGORITHMS[key];
          const localIdx = Math.min(idx, steps.length - 1);
          const cur = steps[localIdx];
          const done = steps.length > 0 && idx >= steps.length - 1;
          return (
            <div
              key={key}
              className={`rounded-lg border bg-card p-3 transition-colors ${
                done ? "border-emerald-500/60" : ""
              }`}
            >
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-sm font-semibold">{algInfo.name}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {done ? "✓ Ordenado" : `${localIdx + 1}/${steps.length}`}
                </div>
              </div>
              <MiniBars step={cur} maxValue={maxValue} />
              <div className="grid grid-cols-3 gap-1 mt-2 text-[11px] font-mono">
                <Stat label="Comp" value={cur?.comparisons ?? 0} />
                <Stat label="Trocas" value={cur?.swapsCount ?? 0} />
                <Stat label="Melhor" value={algInfo.complexity.best} mono />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {[
          { c: "bg-primary/70", l: "Não ordenado" },
          { c: "bg-sky-500", l: "Comparando" },
          { c: "bg-rose-500", l: "Trocando" },
          { c: "bg-amber-400", l: "Pivô / destaque" },
          { c: "bg-emerald-500", l: "Ordenado" },
        ].map((it) => (
          <div key={it.l} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded ${it.c}`} />
            {it.l}
          </div>
        ))}
      </div>

      {/* Final benchmark table */}
      {benchmark && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Tabela comparativa final ({values.length} elementos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ComparisonTable results={benchmark} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniBars({ step, maxValue }: { step: SortStep | undefined; maxValue: number }) {
  if (!step) return <div className="h-32" />;
  const n = step.array.length;
  const barW = Math.max(2, Math.floor(420 / Math.max(n, 1)));
  return (
    <div className="flex items-end justify-center gap-[1px] h-32 overflow-hidden">
      {step.array.map((v, i) => {
        const h = (v / Math.max(maxValue, 1)) * 100;
        const isCompare = step.compares.includes(i);
        const isSwap = step.swaps.includes(i);
        const isSorted = step.sorted.includes(i);
        const isHi = step.highlights.includes(i);
        let bg = "bg-primary/70";
        if (isSorted) bg = "bg-emerald-500";
        if (isHi) bg = "bg-amber-400";
        if (isCompare) bg = "bg-sky-500";
        if (isSwap) bg = "bg-rose-500";
        return (
          <div
            key={i}
            className={`${bg} transition-all duration-150 rounded-t-[1px]`}
            style={{ height: `${h}%`, width: `${barW}px` }}
          />
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-card p-3 ${highlight ? "border-emerald-500" : ""}`}>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div
        className={`text-lg font-semibold font-mono mt-0.5 ${
          highlight ? "text-emerald-500" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: number | string; mono?: boolean }) {
  return (
    <div className="rounded bg-muted/40 px-1.5 py-1">
      <div className="text-[9px] uppercase text-muted-foreground leading-none">{label}</div>
      <div className={`mt-0.5 ${mono ? "text-[10px]" : ""}`}>
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </div>
    </div>
  );
}
