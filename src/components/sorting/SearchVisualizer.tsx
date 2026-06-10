import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pseudocode } from "./Pseudocode";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import {
  binarySearch,
  linearSearch,
  measureComparisons,
  SEARCH_INFO,
  type SearchStep,
} from "@/lib/search/algorithms";
import type { BookItem } from "@/lib/api/books";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

type SearchField = "title" | "authors" | "year" | "pages" | "rating";
type Mode = "exact" | "substring";
type AlgoKey = "linear" | "binary";

const FIELD_LABELS: Record<SearchField, string> = {
  title: "Título",
  authors: "Autor(es)",
  year: "Ano",
  pages: "Páginas",
  rating: "Avaliação",
};

interface Props {
  books: BookItem[];
}

function toStr(b: BookItem, field: SearchField): string {
  const v = b[field];
  return typeof v === "number" ? String(v) : v;
}

export function SearchVisualizer({ books }: Props) {
  const [field, setField] = useState<SearchField>("title");
  const [mode, setMode] = useState<Mode>("substring");
  const [sortByKey, setSortByKey] = useState(true);
  const [target, setTarget] = useState("");
  const [algo, setAlgo] = useState<AlgoKey>("linear");
  const [speed, setSpeed] = useState(350);
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);

  // dataset prepared for search
  const dataset = useMemo(() => {
    const arr = books.map((b) => toStr(b, field));
    if (sortByKey) {
      const cmp = (a: string, b: string) => {
        if (field === "year" || field === "pages" || field === "rating") {
          return Number(a) - Number(b);
        }
        return a.toLowerCase().localeCompare(b.toLowerCase());
      };
      return [...arr].sort(cmp);
    }
    return arr;
  }, [books, field, sortByKey]);

  // Binary requires: sorted dataset + exact mode + non-empty target
  const binaryDisabled = !sortByKey || mode === "substring";
  const binaryDisabledReason = !sortByKey
    ? "Ative “Usar dataset ordenado pela chave” — busca binária exige vetor ordenado."
    : mode === "substring"
      ? "Busca binária não suporta correspondência parcial (substring). Use modo “exato”."
      : "";

  // If binary becomes disabled, fall back to linear automatically
  useEffect(() => {
    if (binaryDisabled && algo === "binary") setAlgo("linear");
  }, [binaryDisabled, algo]);

  // Precompute steps when inputs change
  const steps = useMemo<SearchStep[]>(() => {
    if (!target.trim() || dataset.length === 0) return [];
    const gen =
      algo === "linear"
        ? linearSearch(dataset, target.trim(), mode)
        : binarySearch(dataset, target.trim());
    const out: SearchStep[] = [];
    let cur = gen.next();
    while (!cur.done) {
      out.push(cur.value);
      cur = gen.next();
    }
    if (cur.value) out.push(cur.value);
    return out;
  }, [dataset, target, algo, mode]);

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!playing) return;
    if (idx >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, steps.length - 1)), speed);
    return () => clearTimeout(t);
  }, [playing, idx, steps.length, speed]);

  const current: SearchStep | null = steps[idx] ?? null;
  const info = SEARCH_INFO[algo];

  // Head-to-head comparison counts (final values for same search inputs).
  const headToHead = useMemo(() => {
    if (!target.trim() || dataset.length === 0) return null;
    const linGen = linearSearch(dataset, target.trim(), mode);
    let lin = linGen.next();
    let linFinal: SearchStep | null = null;
    while (!lin.done) {
      linFinal = lin.value;
      lin = linGen.next();
    }
    if (lin.value) linFinal = lin.value;

    let binFinal: SearchStep | null = null;
    if (!binaryDisabled) {
      const binGen = binarySearch(dataset, target.trim());
      let bin = binGen.next();
      while (!bin.done) {
        binFinal = bin.value;
        bin = binGen.next();
      }
      if (bin.value) binFinal = bin.value;
    }
    return { linear: linFinal, binary: binFinal };
  }, [dataset, target, mode, binaryDisabled]);

  // Growth chart: average comparisons vs size, on synthetic sorted arrays
  const growthData = useMemo(() => {
    const sizes = [10, 50, 100, 500, 1000, 5000];
    return sizes.map((n) => {
      const arr = Array.from({ length: n }, (_, i) => String(i).padStart(6, "0"));
      const { linear, binary } = measureComparisons(arr, 50);
      return { size: n, Linear: Number(linear.toFixed(1)), Binária: Number(binary.toFixed(2)) };
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Controles de busca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <Label>Campo de busca</Label>
              <Select value={field} onValueChange={(v) => setField(v as SearchField)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(FIELD_LABELS) as SearchField[]).map((k) => (
                    <SelectItem key={k} value={k}>{FIELD_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5">
              <Label htmlFor="t">Alvo da busca</Label>
              <Input
                id="t"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={mode === "substring" ? "ex: char, harry, java..." : "valor exato"}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Modo</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="substring">Substring (parcial)</SelectItem>
                  <SelectItem value="exact">Exato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2 pb-2">
              <Switch id="sk" checked={sortByKey} onCheckedChange={setSortByKey} />
              <Label htmlFor="sk" className="cursor-pointer text-xs leading-tight">
                Usar dataset<br />ordenado pela chave
              </Label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <Button
                variant={algo === "linear" ? "default" : "outline"}
                onClick={() => setAlgo("linear")}
              >
                Linear
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant={algo === "binary" ? "default" : "outline"}
                        onClick={() => setAlgo("binary")}
                        disabled={binaryDisabled}
                      >
                        Binária
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {binaryDisabled && (
                    <TooltipContent className="max-w-xs">
                      {binaryDisabledReason}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex-1 min-w-48">
              <Label className="text-xs">Velocidade: {speed} ms/passo</Label>
              <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={50} max={2000} step={50} />
            </div>

            <div className="flex gap-2">
              <Button
                variant={playing ? "secondary" : "default"}
                onClick={() => setPlaying((p) => !p)}
                disabled={steps.length === 0 || idx >= steps.length - 1}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIdx((i) => Math.min(i + 1, steps.length - 1))}
                disabled={playing || idx >= steps.length - 1}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => { setIdx(0); setPlaying(false); }}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Metric label="Algoritmo" value={info.name} />
            <Metric label="Passo" value={`${steps.length ? idx + 1 : 0} / ${steps.length}`} />
            <Metric label="Comparações" value={String(current?.comparisons ?? 0)} />
            <Metric label="Matches" value={String(current?.found.length ?? 0)} highlight={(current?.found.length ?? 0) > 0} />
            <Metric
              label="Status"
              value={current?.done ? "Concluído ✓" : playing ? "Executando" : steps.length ? "Pausado" : "Aguardando alvo"}
              highlight={current?.done}
            />
          </div>
        </CardContent>
      </Card>

      {/* Animation + Pseudocode */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Animação — {info.name} {sortByKey && <span className="text-xs text-muted-foreground">(dataset ordenado)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {current ? (
              <CellGrid step={current} algo={algo} />
            ) : (
              <div className="text-sm text-muted-foreground py-12 text-center">
                Digite um alvo para iniciar a busca.
              </div>
            )}
            {current && (
              <div className="mt-3 text-sm font-medium border-t pt-3">{current.message}</div>
            )}
            <SearchLegend algo={algo} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{info.name} — Pseudocódigo</CardTitle>
            </CardHeader>
            <CardContent>
              <Pseudocode lines={info.pseudocode} active={current?.line ?? -1} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Como funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground leading-relaxed">{info.description}</p>
              <ul className="space-y-0.5 font-mono text-xs">
                <li>Melhor: <span className="text-emerald-600 dark:text-emerald-400">{info.complexity.best}</span></li>
                <li>Médio: <span className="text-amber-600 dark:text-amber-400">{info.complexity.average}</span></li>
                <li>Pior: <span className="text-rose-600 dark:text-rose-400">{info.complexity.worst}</span></li>
                <li>Espaço: {info.complexity.space}</li>
              </ul>
              <p className="text-xs text-muted-foreground leading-relaxed">{info.complexity.reason}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Head-to-head on the same search */}
      {headToHead && headToHead.linear && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Linear vs Binária — mesma busca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              <VersusBox
                label="Busca Linear"
                comparisons={headToHead.linear.comparisons}
                found={headToHead.linear.found.length}
                disabled={false}
              />
              <VersusBox
                label="Busca Binária"
                comparisons={headToHead.binary?.comparisons ?? null}
                found={headToHead.binary?.found.length ?? null}
                disabled={binaryDisabled}
                disabledReason={binaryDisabledReason}
              />
            </div>
            {headToHead.binary && headToHead.linear.comparisons > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                A binária fez{" "}
                <span className="font-medium text-foreground">
                  {(headToHead.linear.comparisons / Math.max(headToHead.binary.comparisons, 1)).toFixed(1)}×
                </span>{" "}
                menos comparações que a linear sobre os mesmos {dataset.length} elementos.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Growth chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Crescimento do nº de comparações vs tamanho da amostra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Média de 50 buscas aleatórias em vetores sintéticos ordenados (70% presentes, 30% ausentes).
            Observe a diferença entre o crescimento <span className="text-rose-500">linear (O(n))</span>{" "}
            e o crescimento <span className="text-emerald-500">logarítmico (O(log n))</span>.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="size" tick={{ fontSize: 12 }} label={{ value: "n elementos", position: "insideBottom", offset: -2, style: { fontSize: 11 } }} />
                <YAxis tick={{ fontSize: 12 }} label={{ value: "comparações", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="Linear" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Binária" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs font-mono">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">n</th>
                  {growthData.map((d) => <th key={d.size} className="px-2 py-1 text-right">{d.size}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr><td className="px-2 py-1 text-rose-500">Linear</td>{growthData.map((d) => <td key={d.size} className="px-2 py-1 text-right">{d.Linear}</td>)}</tr>
                <tr><td className="px-2 py-1 text-emerald-500">Binária</td>{growthData.map((d) => <td key={d.size} className="px-2 py-1 text-right">{d.Binária}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CellGrid({ step, algo }: { step: SearchStep; algo: AlgoKey }) {
  const n = step.values.length;
  const isDiscarded = (i: number) => step.discarded.includes(i);
  const isFound = (i: number) => step.found.includes(i);
  const isMid = (i: number) => step.mid === i;
  const isLow = (i: number) => step.low === i;
  const isHigh = (i: number) => step.high === i;
  const isCurrent = (i: number) => step.current === i;

  return (
    <div className="flex flex-wrap gap-1 max-h-[420px] overflow-auto p-1">
      {step.values.map((v, i) => {
        let cls = "bg-muted/40 text-muted-foreground border-border";
        if (isDiscarded(i)) cls = "bg-muted/20 text-muted-foreground/40 border-transparent line-through";
        if (algo === "binary") {
          if (isLow(i)) cls = "bg-sky-500/20 border-sky-500 text-foreground";
          if (isHigh(i)) cls = "bg-sky-500/20 border-sky-500 text-foreground";
          if (isMid(i)) cls = "bg-amber-400/30 border-amber-500 text-foreground font-medium";
        } else if (isCurrent(i)) {
          cls = "bg-sky-500/30 border-sky-500 text-foreground font-medium";
        }
        if (isFound(i)) cls = "bg-emerald-500/30 border-emerald-500 text-foreground font-semibold";

        return (
          <div
            key={i}
            className={`relative rounded border px-2 py-1 text-xs font-mono max-w-[180px] truncate transition-colors ${cls}`}
            title={`[${i}] ${v}`}
          >
            <span className="opacity-50 mr-1">{i}</span>
            {v.length > 18 ? v.slice(0, 17) + "…" : v}
            {algo === "binary" && (isLow(i) || isHigh(i) || isMid(i)) && (
              <span className="absolute -top-2 left-1 text-[9px] font-bold tracking-wide bg-background px-1 rounded">
                {isMid(i) ? "mid" : isLow(i) ? "low" : "high"}
              </span>
            )}
          </div>
        );
      })}
      {n === 0 && <div className="text-sm text-muted-foreground">Sem dados.</div>}
    </div>
  );
}

function SearchLegend({ algo }: { algo: AlgoKey }) {
  const items = algo === "binary"
    ? [
        { c: "bg-sky-500/30 border-sky-500", l: "low / high" },
        { c: "bg-amber-400/30 border-amber-500", l: "mid (comparando)" },
        { c: "bg-muted/20 border-transparent", l: "intervalo descartado" },
        { c: "bg-emerald-500/30 border-emerald-500", l: "encontrado" },
      ]
    : [
        { c: "bg-sky-500/30 border-sky-500", l: "comparando" },
        { c: "bg-emerald-500/30 border-emerald-500", l: "encontrado" },
      ];
  return (
    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
      {items.map((it) => (
        <div key={it.l} className="flex items-center gap-1.5">
          <span className={`inline-block w-3 h-3 rounded border ${it.c}`} />
          {it.l}
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-3 ${highlight ? "border-emerald-500" : ""}`}>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold font-mono mt-0.5 truncate ${highlight ? "text-emerald-500" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function VersusBox({
  label, comparisons, found, disabled, disabledReason,
}: {
  label: string;
  comparisons: number | null;
  found: number | null;
  disabled: boolean;
  disabledReason?: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${disabled ? "opacity-50" : "bg-card"}`}>
      <div className="text-sm font-medium">{label}</div>
      {disabled ? (
        <div className="text-xs text-muted-foreground mt-2">{disabledReason}</div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Comparações</div>
            <div className="text-2xl font-bold font-mono">{comparisons}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Matches</div>
            <div className="text-2xl font-bold font-mono">{found}</div>
          </div>
        </div>
      )}
    </div>
  );
}
