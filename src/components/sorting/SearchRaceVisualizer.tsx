import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import {
  binarySearch,
  linearSearch,
  measureComparisons,
  SEARCH_INFO,
  type SearchStep,
} from "@/lib/search/algorithms";
import type { BookItem } from "@/lib/api/books";
import { Pseudocode } from "./Pseudocode";
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

function collect(gen: Generator<SearchStep, SearchStep, void>): SearchStep[] {
  const out: SearchStep[] = [];
  let cur = gen.next();
  while (!cur.done) {
    out.push(cur.value);
    cur = gen.next();
  }
  if (cur.value) out.push(cur.value);
  return out;
}

export function SearchRaceVisualizer({ books }: Props) {
  const [field, setField] = useState<SearchField>("title");
  const [target, setTarget] = useState("");
  const [speed, setSpeed] = useState(350);
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);

  // For race, both algorithms operate on the SAME sorted dataset, in exact mode.
  const dataset = useMemo(() => {
    const arr = books.map((b) => toStr(b, field));
    const cmp = (a: string, b: string) => {
      if (field === "year" || field === "pages" || field === "rating") {
        return Number(a) - Number(b);
      }
      return a.toLowerCase().localeCompare(b.toLowerCase());
    };
    return [...arr].sort(cmp);
  }, [books, field]);

  const linearSteps = useMemo<SearchStep[]>(() => {
    if (!target.trim() || dataset.length === 0) return [];
    return collect(linearSearch(dataset, target.trim(), "exact"));
  }, [dataset, target]);

  const binarySteps = useMemo<SearchStep[]>(() => {
    if (!target.trim() || dataset.length === 0) return [];
    return collect(binarySearch(dataset, target.trim()));
  }, [dataset, target]);

  const maxSteps = Math.max(linearSteps.length, binarySteps.length);

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [linearSteps, binarySteps]);

  useEffect(() => {
    if (!playing) return;
    if (idx >= maxSteps - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, maxSteps - 1)), speed);
    return () => clearTimeout(t);
  }, [playing, idx, maxSteps, speed]);

  // Current visible step per algorithm (clamped to last available step)
  const linearStep = linearSteps[Math.min(idx, linearSteps.length - 1)] ?? null;
  const binaryStep = binarySteps[Math.min(idx, binarySteps.length - 1)] ?? null;

  const linearDone = !!linearStep?.done || idx >= linearSteps.length - 1;
  const binaryDone = !!binaryStep?.done || idx >= binarySteps.length - 1;

  const finalLinear = linearSteps[linearSteps.length - 1] ?? null;
  const finalBinary = binarySteps[binarySteps.length - 1] ?? null;

  const ratio =
    finalLinear && finalBinary && finalBinary.comparisons > 0
      ? finalLinear.comparisons / finalBinary.comparisons
      : null;

  // Growth chart — 50 trials per size
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Corrida ao vivo — Busca Linear vs Busca Binária
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ambos os algoritmos buscam o mesmo alvo no mesmo dataset{" "}
            <span className="font-medium text-foreground">já ordenado</span> pela chave selecionada
            (modo exato — único onde a binária funciona). O contador de comparações é atualizado a
            cada passo.
          </p>

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
            <div className="md:col-span-6">
              <Label htmlFor="rt">Alvo exato</Label>
              <Input
                id="rt"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="ex: 2018, 320, harry potter..."
              />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <Button
                variant={playing ? "secondary" : "default"}
                onClick={() => setPlaying((p) => !p)}
                disabled={maxSteps === 0 || idx >= maxSteps - 1}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIdx((i) => Math.min(i + 1, maxSteps - 1))}
                disabled={playing || idx >= maxSteps - 1}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => { setIdx(0); setPlaying(false); }}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Velocidade: {speed} ms/passo</Label>
            <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={50} max={2000} step={50} />
          </div>

          <p className="text-xs text-muted-foreground">
            Dataset com {dataset.length} elementos, ordenado por{" "}
            <span className="font-medium text-foreground">{FIELD_LABELS[field]}</span>.
          </p>
        </CardContent>
      </Card>

      {/* Live counters + animation */}
      <div className="grid lg:grid-cols-2 gap-4">
        <AlgoPanel
          name="Busca Linear"
          algo="linear"
          color="rose"
          step={linearStep}
          totalSteps={linearSteps.length}
          idx={Math.min(idx, Math.max(linearSteps.length - 1, 0))}
          done={linearDone}
          pseudocode={SEARCH_INFO.linear.pseudocode}
        />
        <AlgoPanel
          name="Busca Binária"
          algo="binary"
          color="emerald"
          step={binaryStep}
          totalSteps={binarySteps.length}
          idx={Math.min(idx, Math.max(binarySteps.length - 1, 0))}
          done={binaryDone}
          pseudocode={SEARCH_INFO.binary.pseudocode}
        />
      </div>

      {/* Head-to-head summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resultado head-to-head</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 font-mono text-sm">
            <div className="rounded-lg border p-3 bg-rose-500/5">
              <div className="text-xs uppercase text-muted-foreground">Linear</div>
              <div className="text-2xl font-bold text-rose-500">
                {linearStep?.comparisons.toLocaleString("pt-BR") ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">comparações ({linearDone ? "final" : "em andamento"})</div>
            </div>
            <div className="rounded-lg border p-3 bg-emerald-500/5">
              <div className="text-xs uppercase text-muted-foreground">Binária</div>
              <div className="text-2xl font-bold text-emerald-500">
                {binaryStep?.comparisons.toLocaleString("pt-BR") ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">comparações ({binaryDone ? "final" : "em andamento"})</div>
            </div>
          </div>
          {ratio !== null && linearDone && binaryDone && (
            <p className="text-sm">
              A <span className="text-emerald-500 font-medium">binária</span> fez{" "}
              <span className="font-bold text-foreground">{ratio.toFixed(1)}×</span>{" "}
              menos comparações que a <span className="text-rose-500 font-medium">linear</span>{" "}
              sobre os mesmos {dataset.length} elementos.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Growth chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Crescimento das comparações vs tamanho da amostra (média de 50 trials)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            n = 10, 50, 100, 500, 1000, 5000 — 70% das buscas com alvo presente, 30% ausentes.
            Evidencia empiricamente <span className="text-rose-500">O(n)</span> vs{" "}
            <span className="text-emerald-500">O(log n)</span>.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="size" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
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

function AlgoPanel({
  name, color, step, totalSteps, idx, done, pseudocode,
}: {
  name: string;
  color: "rose" | "emerald";
  step: SearchStep | null;
  totalSteps: number;
  idx: number;
  done: boolean;
  pseudocode: string[];
}) {
  const accent =
    color === "rose"
      ? "border-rose-500/40 bg-rose-500/5"
      : "border-emerald-500/40 bg-emerald-500/5";
  const counter =
    color === "rose" ? "text-rose-500" : "text-emerald-500";

  return (
    <Card className={accent}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            passo {totalSteps ? idx + 1 : 0} / {totalSteps}
            {done && " · ✓"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-3">
          <div className={`text-4xl font-bold font-mono ${counter}`}>
            {step?.comparisons ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">comparações ao vivo</div>
        </div>
        {step && (
          <>
            <div className="text-xs font-medium border-t pt-2">{step.message}</div>
            <div className="flex flex-wrap gap-2 text-xs font-mono text-muted-foreground">
              {step.low !== undefined && <span>low={step.low}</span>}
              {step.mid !== undefined && <span>mid={step.mid}</span>}
              {step.high !== undefined && <span>high={step.high}</span>}
              {step.current !== undefined && <span>i={step.current}</span>}
              {step.found.length > 0 && <span className="text-emerald-500">found@{step.found.join(",")}</span>}
            </div>
            <Pseudocode lines={pseudocode} active={step.line} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
