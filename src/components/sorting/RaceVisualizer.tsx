import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipForward, RotateCcw, Trophy } from "lucide-react";
import { ALGORITHMS } from "@/lib/sorting/algorithms";
import type { AlgorithmKey, SortStep } from "@/lib/sorting/types";

interface Props {
  values: number[];
  maxValue: number;
}

const KEYS = Object.keys(ALGORITHMS) as AlgorithmKey[];

interface FinishEntry {
  key: AlgorithmKey;
  name: string;
  timeMs: number;
  steps: number;
  comparisons: number;
  swaps: number;
  complexity: { best: string; average: string; worst: string };
}

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

  const [finishOrder, setFinishOrder] = useState<FinishEntry[]>([]);
  const finishedKeysRef = useRef<Set<AlgorithmKey>>(new Set());

  // Reset when data changes
  useEffect(() => {
    setIdx(0);
    setPlaying(false);
    setElapsed(0);
    startRef.current = null;
    setFinishOrder([]);
    finishedKeysRef.current = new Set();
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

  // Register algorithms as they finish, in race order.
  useEffect(() => {
    if (maxLen === 0) return;
    const newly: FinishEntry[] = [];
    for (const key of KEYS) {
      if (finishedKeysRef.current.has(key)) continue;
      const steps = stepsByAlg[key] ?? [];
      if (steps.length === 0) continue;
      if (idx >= steps.length - 1) {
        finishedKeysRef.current.add(key);
        const last = steps[steps.length - 1];
        const info = ALGORITHMS[key];
        newly.push({
          key,
          name: info.name,
          timeMs: elapsed,
          steps: steps.length,
          comparisons: last.comparisons,
          swaps: last.swapsCount,
          complexity: info.complexity,
        });
      }
    }
    if (newly.length > 0) {
      setFinishOrder((prev) => [...prev, ...newly]);
    }
  }, [idx, elapsed, stepsByAlg, maxLen]);

  const allDone = maxLen > 0 && idx >= maxLen - 1;

  if (values.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Carregue dados na seção acima para iniciar a comparação.
      </p>
    );
  }

  const medal = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;

  return (
    <div className="space-y-4">
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
                  setFinishOrder([]);
                  finishedKeysRef.current = new Set();
                }}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Passo global" value={`${idx + 1} / ${maxLen}`} />
            <Metric label="Tempo decorrido" value={`${(elapsed / 1000).toFixed(2)} s`} />
            <Metric label="Concluídos" value={`${finishOrder.length} / ${KEYS.length}`} />
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
          const rank = finishOrder.findIndex((f) => f.key === key);
          return (
            <div
              key={key}
              className={`rounded-lg border bg-card p-3 transition-colors ${
                done ? "border-emerald-500/60" : ""
              }`}
            >
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  {rank >= 0 && <span aria-hidden>{medal(rank)}</span>}
                  {algInfo.name}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {done
                    ? rank >= 0
                      ? `✓ ${(finishOrder[rank].timeMs / 1000).toFixed(2)}s`
                      : "✓ Ordenado"
                    : `${localIdx + 1}/${steps.length}`}
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

      {/* Live finish ranking — built from the actual race */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Ranking de chegada — {values.length} elementos da busca atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finishOrder.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inicie a corrida para registrar a ordem de chegada de cada algoritmo.
            </p>
          ) : (
            <RankTable entries={finishOrder} pending={KEYS.length - finishOrder.length} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RankTable({ entries, pending }: { entries: FinishEntry[]; pending: number }) {
  const first = entries[0]?.timeMs ?? 0;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Posição</th>
            <th className="px-3 py-2 text-left font-medium">Algoritmo</th>
            <th className="px-3 py-2 text-right font-medium">Tempo na corrida</th>
            <th className="px-3 py-2 text-right font-medium">Δ vs 1º</th>
            <th className="px-3 py-2 text-right font-medium">Passos</th>
            <th className="px-3 py-2 text-right font-medium">Comparações</th>
            <th className="px-3 py-2 text-right font-medium">Trocas/Movs</th>
            <th className="px-3 py-2 text-left font-medium">Complexidade média</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.key} className={i % 2 ? "bg-muted/20" : ""}>
              <td className="px-3 py-2 font-semibold">
                {i === 0 ? "🥇 1º" : i === 1 ? "🥈 2º" : i === 2 ? "🥉 3º" : `${i + 1}º`}
              </td>
              <td className="px-3 py-2 font-medium">{e.name}</td>
              <td className="px-3 py-2 text-right font-mono">
                {(e.timeMs / 1000).toFixed(2)} s
              </td>
              <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                {i === 0 ? "—" : `+${((e.timeMs - first) / 1000).toFixed(2)} s`}
              </td>
              <td className="px-3 py-2 text-right font-mono">{e.steps.toLocaleString("pt-BR")}</td>
              <td className="px-3 py-2 text-right font-mono">
                {e.comparisons.toLocaleString("pt-BR")}
              </td>
              <td className="px-3 py-2 text-right font-mono">{e.swaps.toLocaleString("pt-BR")}</td>
              <td className="px-3 py-2 font-mono text-xs">{e.complexity.average}</td>
            </tr>
          ))}
          {pending > 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-2 text-xs text-muted-foreground italic">
                Aguardando {pending} algoritmo{pending > 1 ? "s" : ""} finalizar
                {pending > 1 ? "em" : ""}…
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
