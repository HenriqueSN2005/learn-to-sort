import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchBooks, FIELD_LABELS, type BookItem } from "@/lib/api/books";
import { ALGORITHMS } from "@/lib/sorting/algorithms";
import type { AlgorithmKey, SortStep } from "@/lib/sorting/types";
import { Visualizer } from "@/components/sorting/Visualizer";
import { Pseudocode } from "@/components/sorting/Pseudocode";
import {
  ComparisonTable,
  runBenchmark,
  type BenchmarkResult,
} from "@/components/sorting/Comparison";
import { RaceVisualizer } from "@/components/sorting/RaceVisualizer";
import { SearchVisualizer } from "@/components/sorting/SearchVisualizer";
import { Play, Pause, SkipForward, RotateCcw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visualizador de Algoritmos de Ordenação" },
      {
        name: "description",
        content:
          "Ferramenta didática para visualizar Bubble, Selection, Insertion, Merge, Quick e Heap Sort sobre dados reais do Google Books, com comparação de desempenho.",
      },
      { property: "og:title", content: "Visualizador de Algoritmos de Ordenação" },
      {
        property: "og:description",
        content:
          "Anime, compare e entenda os principais algoritmos clássicos de ordenação aplicados a dados reais.",
      },
    ],
  }),
  component: Page,
});

type Field = "year" | "pages" | "rating";

function Page() {
  const [query, setQuery] = useState("javascript");
  const [size, setSize] = useState<number>(50);
  const [field, setField] = useState<Field>("pages");
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [algorithm, setAlgorithm] = useState<AlgorithmKey>("bubble");
  const [steps, setSteps] = useState<SortStep[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(200); // ms per step
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  const [benchmark, setBenchmark] = useState<BenchmarkResult[] | null>(null);

  const values = useMemo(() => books.map((b) => b[field] as number), [books, field]);

  // Precompute steps when algorithm or data changes
  useEffect(() => {
    if (values.length === 0) {
      setSteps([]);
      setIdx(0);
      return;
    }
    const alg = ALGORITHMS[algorithm];
    const collected: SortStep[] = [];
    const gen = alg.run(values);
    let cur = gen.next();
    while (!cur.done) {
      collected.push(cur.value);
      cur = gen.next();
    }
    if (cur.value) collected.push(cur.value);
    setSteps(collected);
    setIdx(0);
    setPlaying(false);
    setElapsed(0);
  }, [algorithm, values]);

  // Player loop
  useEffect(() => {
    if (!playing) return;
    if (idx >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    if (startTimeRef.current === null) startTimeRef.current = performance.now() - elapsed;
    const t = setTimeout(() => {
      setIdx((i) => Math.min(i + 1, steps.length - 1));
      setElapsed(performance.now() - (startTimeRef.current ?? performance.now()));
    }, speed);
    return () => clearTimeout(t);
  }, [playing, idx, steps.length, speed, elapsed]);

  useEffect(() => {
    if (!playing) startTimeRef.current = null;
  }, [playing]);

  // Debounced real-time search: refetch whenever query or size changes.
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setBenchmark(null);
      try {
        const data = await fetchBooks(query, size, controller.signal);
        if (data.length === 0) setError("Nenhum livro encontrado com dados válidos.");
        setBooks(data);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Erro ao buscar dados");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, size]);


  const current: SortStep | null = steps[idx] ?? null;
  const maxValue = useMemo(() => Math.max(...values, 1), [values]);
  const alg = ALGORITHMS[algorithm];

  function runComparison() {
    if (values.length === 0) return;
    setBenchmark(runBenchmark(values));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-bold tracking-tight">
            Visualizador de Algoritmos de Ordenação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Anime, compare e entenda Bubble, Selection, Insertion, Merge, Quick e Heap Sort sobre
            dados reais da Open Library.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Data controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Fonte de dados — Open Library</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <Label htmlFor="q">Termo de busca (em tempo real)</Label>
                <div className="relative">
                  <Input
                    id="q"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ex: javascript, harry potter, machine learning..."
                  />
                  {loading && (
                    <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="md:col-span-4">
                <Label>Tamanho da amostra</Label>
                <Select value={String(size)} onValueChange={(v) => setSize(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100, 200].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} elementos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label>Campo de ordenação</Label>
                <Select value={field} onValueChange={(v) => setField(v as Field)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FIELD_LABELS) as Field[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {FIELD_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-sm text-destructive mt-3">{error}</p>}
            {books.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {books.length} livros carregados — ordenando por{" "}
                <span className="font-medium text-foreground">{FIELD_LABELS[field]}</span>.
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="viz" className="space-y-4">
          <TabsList>
            <TabsTrigger value="viz">Visualização passo a passo</TabsTrigger>
            <TabsTrigger value="cmp">Comparação de desempenho</TabsTrigger>
            <TabsTrigger value="data">Dados carregados</TabsTrigger>
          </TabsList>

          {/* VISUALIZATION */}
          <TabsContent value="viz" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Algoritmo e controles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-4">
                    <Label>Algoritmo</Label>
                    <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as AlgorithmKey)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ALGORITHMS).map((a) => (
                          <SelectItem key={a.key} value={a.key}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-5">
                    <Label>
                      Velocidade: {speed} ms/passo
                    </Label>
                    <Slider
                      value={[speed]}
                      onValueChange={([v]) => setSpeed(v)}
                      min={10}
                      max={2000}
                      step={10}
                    />
                  </div>
                  <div className="md:col-span-3 flex gap-2">
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

                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Metric label="Passo" value={`${idx + 1} / ${steps.length || 0}`} />
                  <Metric label="Comparações" value={current?.comparisons.toLocaleString("pt-BR") ?? "0"} />
                  <Metric label="Trocas/Movs" value={current?.swapsCount.toLocaleString("pt-BR") ?? "0"} />
                  <Metric label="Tempo decorrido" value={`${(elapsed / 1000).toFixed(2)} s`} />
                  <Metric
                    label="Status"
                    value={
                      steps.length > 0 && idx >= steps.length - 1 ? "Concluído ✓" : playing ? "Executando" : "Pausado"
                    }
                    highlight={steps.length > 0 && idx >= steps.length - 1}
                  />
                </div>
              </CardContent>
            </Card>

            {current && (
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <Visualizer step={current} maxValue={maxValue} showHeap={algorithm === "heap"} />
                  <Card>
                    <CardContent className="py-3">
                      <div className="text-xs uppercase text-muted-foreground mb-1">Narração do passo</div>
                      <div className="text-sm font-medium">{current.message}</div>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{alg.name} — Pseudocódigo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Pseudocode lines={alg.pseudocode} active={current.line} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Como funciona</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-muted-foreground leading-relaxed">{alg.description}</p>
                      <div>
                        <div className="text-xs uppercase text-muted-foreground mb-1">Estrutura de dados</div>
                        <p>{alg.structure}</p>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-muted-foreground mb-1">Complexidade</div>
                        <ul className="space-y-0.5 font-mono text-xs">
                          <li>Melhor caso: <span className="text-emerald-600 dark:text-emerald-400">{alg.complexity.best}</span></li>
                          <li>Caso médio: <span className="text-amber-600 dark:text-amber-400">{alg.complexity.average}</span></li>
                          <li>Pior caso: <span className="text-rose-600 dark:text-rose-400">{alg.complexity.worst}</span></li>
                          <li>Espaço auxiliar: <span>{alg.complexity.space}</span></li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{alg.complexity.reason}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* COMPARISON */}
          <TabsContent value="cmp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Corrida animada — todos os algoritmos em paralelo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Visualize Bubble, Selection, Insertion, Merge, Quick e Heap Sort sendo
                  executados lado a lado sobre o mesmo conjunto de {values.length} elementos
                  (campo: <span className="font-medium text-foreground">{FIELD_LABELS[field]}</span>).
                  Use os controles abaixo para reproduzir, pausar, avançar passo a passo e
                  ajustar a velocidade.
                </p>
              </CardContent>
            </Card>
            <RaceVisualizer values={values} maxValue={maxValue} />
          </TabsContent>


          {/* DATA */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Livros carregados ({books.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border max-h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">#</th>
                        <th className="px-3 py-2 text-left font-medium">Título</th>
                        <th className="px-3 py-2 text-left font-medium">Autores</th>
                        <th className="px-3 py-2 text-right font-medium">Ano</th>
                        <th className="px-3 py-2 text-right font-medium">Páginas</th>
                        <th className="px-3 py-2 text-right font-medium">Avaliação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {books.map((b, i) => (
                        <tr key={i} className={i % 2 ? "bg-muted/20" : ""}>
                          <td className="px-3 py-1.5 font-mono text-xs">{i + 1}</td>
                          <td className="px-3 py-1.5">{b.title}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{b.authors}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{b.year}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{b.pages}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{b.rating || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <footer className="text-xs text-muted-foreground text-center py-4">
          Algoritmos implementados manualmente — nenhum <code>Array.prototype.sort</code> usado.
        </footer>
      </main>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-3 ${highlight ? "border-emerald-500" : ""}`}>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold font-mono mt-0.5 ${highlight ? "text-emerald-500" : ""}`}>
        {value}
      </div>
    </div>
  );
}
