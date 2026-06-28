import { useState } from "react";
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
import { Loader2, Database, HardDrive, FileText, Binary, RefreshCw } from "lucide-react";
import type { BookItem } from "@/lib/api/books";

type Formato = "json" | "csv" | "pickle" | "struct";

interface FormatoResultado {
  formato: Formato;
  tipo: "texto" | "binário";
  tamanho_kb: number;
  tempo_salvar_ms: number;
  tempo_carregar_ms: number;
}

interface ComparacaoResp {
  ok: boolean;
  registros?: number;
  resultados?: FormatoResultado[];
  error?: string;
}

interface InspecaoResp {
  ok: boolean;
  texto?: {
    json: { trecho: string; tamanho_kb: number };
    csv: { trecho: string; tamanho_kb: number };
  };
  binario?: {
    pickle: { hexdump: string; tamanho_kb: number };
    struct: { hexdump: string; tamanho_kb: number };
  };
  error?: string;
}

interface Props {
  books: BookItem[];
  onLoadOffline: (books: BookItem[]) => void;
}

const DEFAULT_BACKEND = "http://localhost:5000";

export function PersistencePanel({ books, onLoadOffline }: Props) {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err" | "info"; msg: string } | null>(null);
  const [comparacao, setComparacao] = useState<ComparacaoResp | null>(null);
  const [inspecao, setInspecao] = useState<InspecaoResp | null>(null);
  const [formato, setFormato] = useState<Formato>("json");
  const [salvarInfo, setSalvarInfo] = useState<Record<string, { tempo_salvar_ms: number; tamanho_kb: number }> | null>(null);

  function abortGuard(): AbortController {
    return new AbortController();
  }

  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const ctrl = abortGuard();
    const to = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(`${backendUrl}${path}`, { ...init, signal: ctrl.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} — ${body.slice(0, 200) || res.statusText}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(to);
    }
  }

  async function salvarAtual() {
    if (books.length === 0) {
      setStatus({ kind: "err", msg: "Nenhum livro carregado para salvar. Use a busca acima primeiro." });
      return;
    }
    setBusy("salvar");
    setStatus(null);
    try {
      const r = await call<{ ok: boolean; registros: number; formatos: Record<string, { tempo_salvar_ms: number; tamanho_kb: number; ok: boolean; error?: string }> }>(
        "/salvar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: books }),
        },
      );
      setSalvarInfo(r.formatos);
      setStatus({ kind: "ok", msg: `${r.registros} registros gravados nos 4 formatos.` });
    } catch (e) {
      setStatus({ kind: "err", msg: errMsg(e) });
    } finally {
      setBusy(null);
    }
  }

  async function carregarOffline() {
    setBusy("offline");
    setStatus(null);
    try {
      const r = await call<{ ok: boolean; count: number; data: BookItem[]; tempo_carregar_ms: number; tamanho_kb: number; error?: string }>(
        `/offline?formato=${formato}`,
      );
      if (!r.ok) throw new Error(r.error ?? "Falha ao ler arquivo.");
      onLoadOffline(r.data);
      setStatus({
        kind: "ok",
        msg: `Modo offline: ${r.count} registros lidos de ${formato.toUpperCase()} (${r.tamanho_kb} KB) em ${r.tempo_carregar_ms} ms — sem chamar a API.`,
      });
    } catch (e) {
      setStatus({ kind: "err", msg: errMsg(e) });
    } finally {
      setBusy(null);
    }
  }

  async function baixarESalvar() {
    setBusy("baixar");
    setStatus(null);
    try {
      const r = await call<{ ok: boolean; data: BookItem[]; count: number }>(`/carregar?q=${encodeURIComponent("javascript")}&limit=100`);
      if (!r.ok || !r.data?.length) throw new Error("Backend não retornou dados.");
      onLoadOffline(r.data);
      // depois salva
      const s = await call<{ ok: boolean; registros: number; formatos: Record<string, { tempo_salvar_ms: number; tamanho_kb: number; ok: boolean }> }>(
        "/salvar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: r.data }),
        },
      );
      setSalvarInfo(s.formatos);
      setStatus({ kind: "ok", msg: `Baixados ${r.count} livros via backend e salvos nos 4 formatos.` });
    } catch (e) {
      setStatus({ kind: "err", msg: errMsg(e) });
    } finally {
      setBusy(null);
    }
  }

  async function comparar() {
    setBusy("comparar");
    setStatus(null);
    try {
      const r = await call<ComparacaoResp>("/comparar");
      if (!r.ok) throw new Error(r.error ?? "Falha em /comparar");
      setComparacao(r);
    } catch (e) {
      setStatus({ kind: "err", msg: errMsg(e) });
    } finally {
      setBusy(null);
    }
  }

  async function inspecionar() {
    setBusy("inspecionar");
    setStatus(null);
    try {
      const r = await call<InspecaoResp>("/inspecionar");
      if (!r.ok) throw new Error(r.error ?? "Falha em /inspecionar");
      setInspecao(r);
    } catch (e) {
      setStatus({ kind: "err", msg: errMsg(e) });
    } finally {
      setBusy(null);
    }
  }

  const winnerSize = comparacao?.resultados
    ? [...comparacao.resultados].sort((a, b) => a.tamanho_kb - b.tamanho_kb)[0]
    : null;
  const winnerLoad = comparacao?.resultados
    ? [...comparacao.resultados].sort((a, b) => a.tempo_carregar_ms - b.tempo_carregar_ms)[0]
    : null;

  return (
    <div className="space-y-4">
      {/* Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Persistência de Dados — Backend Python (Texto vs Binário)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/40 border p-3 text-xs space-y-1.5 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Como rodar:</span>{" "}
              <code className="bg-background px-1.5 py-0.5 rounded border">cd backend &amp;&amp; pip install -r requirements.txt &amp;&amp; python app.py</code>
            </p>
            <p>
              O backend Flask grava o dataset em <strong>JSON</strong>, <strong>CSV</strong>,{" "}
              <strong>pickle</strong> e <strong>struct</strong>, e expõe endpoints para salvar, ler
              offline, comparar e inspecionar. Veja <code>backend/README.md</code>.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <Label htmlFor="backend">URL do backend</Label>
              <Input
                id="backend"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:5000"
              />
            </div>
            <div className="md:col-span-3">
              <Label>Formato p/ leitura offline</Label>
              <Select value={formato} onValueChange={(v) => setFormato(v as Formato)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON (texto)</SelectItem>
                  <SelectItem value="csv">CSV (texto)</SelectItem>
                  <SelectItem value="pickle">Pickle (binário)</SelectItem>
                  <SelectItem value="struct">Struct (binário)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 text-xs text-muted-foreground">
              Dataset atual:{" "}
              <span className="font-medium text-foreground">{books.length} livros</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={salvarAtual} disabled={busy !== null || books.length === 0}>
              {busy === "salvar" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HardDrive className="w-4 h-4 mr-2" />}
              Salvar dataset atual nos 4 formatos
            </Button>
            <Button variant="secondary" onClick={baixarESalvar} disabled={busy !== null}>
              {busy === "baixar" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Baixar via backend + salvar
            </Button>
            <Button variant="outline" onClick={carregarOffline} disabled={busy !== null}>
              {busy === "offline" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
              Carregar do arquivo ({formato.toUpperCase()})
            </Button>
            <Button variant="outline" onClick={comparar} disabled={busy !== null}>
              {busy === "comparar" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Comparar formatos
            </Button>
            <Button variant="outline" onClick={inspecionar} disabled={busy !== null}>
              {busy === "inspecionar" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Inspecionar arquivos
            </Button>
          </div>

          {status && (
            <div
              className={`text-sm rounded-md border px-3 py-2 ${
                status.kind === "ok"
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  : status.kind === "err"
                  ? "bg-destructive/10 border-destructive/40 text-destructive"
                  : "bg-muted border-border"
              }`}
            >
              {status.msg}
            </div>
          )}

          {salvarInfo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(Object.entries(salvarInfo) as [string, { tempo_salvar_ms: number; tamanho_kb: number }][]).map(([k, v]) => (
                <div key={k} className="rounded-md border bg-card p-2.5">
                  <div className="text-xs uppercase text-muted-foreground">{k}</div>
                  <div className="text-sm font-mono">{v.tamanho_kb} KB</div>
                  <div className="text-xs text-muted-foreground font-mono">{v.tempo_salvar_ms} ms</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparação */}
      {comparacao?.resultados && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Comparação ({comparacao.registros} registros)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Formato</th>
                    <th className="px-3 py-2 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2 text-right font-medium">Tamanho (KB)</th>
                    <th className="px-3 py-2 text-right font-medium">Salvar (ms)</th>
                    <th className="px-3 py-2 text-right font-medium">Carregar (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparacao.resultados.map((r, i) => {
                    const isSmall = winnerSize?.formato === r.formato;
                    const isFast = winnerLoad?.formato === r.formato;
                    return (
                      <tr key={r.formato} className={i % 2 ? "bg-muted/20" : ""}>
                        <td className="px-3 py-2 font-medium uppercase">{r.formato}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              r.tipo === "texto"
                                ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {r.tipo}
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-right font-mono ${isSmall ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}`}>
                          {r.tamanho_kb} {isSmall && "← menor"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{r.tempo_salvar_ms}</td>
                        <td className={`px-3 py-2 text-right font-mono ${isFast ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}`}>
                          {r.tempo_carregar_ms} {isFast && "← mais rápido"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Em geral: <strong>struct</strong> vence em tamanho (sem rótulos, ints fixos);{" "}
              <strong>pickle</strong> costuma vencer em tempo (serialização nativa); <strong>JSON</strong>{" "}
              é o mais legível mas o mais verboso; <strong>CSV</strong> é o intermediário entre os de texto.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Inspeção */}
      {inspecao?.texto && inspecao.binario && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-500" />
                Texto — JSON ({inspecao.texto.json.tamanho_kb} KB)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono bg-muted/40 p-3 rounded border max-h-72 overflow-auto whitespace-pre-wrap">
{inspecao.texto.json.trecho || "(vazio)"}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Binary className="w-4 h-4 text-amber-500" />
                Binário — Struct ({inspecao.binario.struct.tamanho_kb} KB)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono bg-muted/40 p-3 rounded border max-h-72 overflow-auto">
{inspecao.binario.struct.hexdump || "(vazio)"}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-500" />
                Texto — CSV ({inspecao.texto.csv.tamanho_kb} KB)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono bg-muted/40 p-3 rounded border max-h-72 overflow-auto whitespace-pre-wrap">
{inspecao.texto.csv.trecho || "(vazio)"}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Binary className="w-4 h-4 text-amber-500" />
                Binário — Pickle ({inspecao.binario.pickle.tamanho_kb} KB)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono bg-muted/40 p-3 rounded border max-h-72 overflow-auto">
{inspecao.binario.pickle.hexdump || "(vazio)"}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "AbortError") return "Tempo esgotado. Verifique se o backend está rodando.";
    if (e.message.startsWith("Failed to fetch") || e.message.includes("NetworkError")) {
      return "Não foi possível conectar ao backend. Confirme se está rodando em http://localhost:5000 (cd backend && python app.py).";
    }
    return e.message;
  }
  return String(e);
}
