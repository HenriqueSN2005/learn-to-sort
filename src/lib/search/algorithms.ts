export type SearchMode = "exact" | "substring";

export interface SearchStep {
  values: string[];
  low?: number;
  high?: number;
  mid?: number;
  current?: number;
  discarded: number[];
  found: number[];
  message: string;
  line: number;
  comparisons: number;
  done: boolean;
}

export interface SearchAlgorithmInfo {
  key: "linear" | "binary";
  name: string;
  description: string;
  complexity: { best: string; average: string; worst: string; space: string; reason: string };
  pseudocode: string[];
}

export const SEARCH_INFO: Record<"linear" | "binary", SearchAlgorithmInfo> = {
  linear: {
    key: "linear",
    name: "Busca Linear",
    description:
      "Percorre o vetor do início ao fim comparando cada elemento com o alvo. Funciona em qualquer vetor (ordenado ou não) e suporta busca por correspondência parcial.",
    complexity: {
      best: "O(1)",
      average: "O(n)",
      worst: "O(n)",
      space: "O(1)",
      reason:
        "No melhor caso o alvo está no primeiro índice (uma comparação). No pior, precisa percorrer todos os n elementos.",
    },
    pseudocode: [
      "para i de 0 até n-1:",
      "  se a[i] corresponde ao alvo:",
      "    retornar i",
      "retornar -1 (não encontrado)",
    ],
  },
  binary: {
    key: "binary",
    name: "Busca Binária",
    description:
      "Requer vetor ORDENADO. A cada passo compara o alvo com o elemento do meio e descarta metade do espaço de busca. Não funciona com correspondência parcial (substring).",
    complexity: {
      best: "O(1)",
      average: "O(log n)",
      worst: "O(log n)",
      space: "O(1)",
      reason:
        "A cada iteração o intervalo cai pela metade, então no máximo ⌈log₂(n+1)⌉ comparações são feitas.",
    },
    pseudocode: [
      "low ← 0, high ← n-1",
      "enquanto low ≤ high:",
      "  mid ← (low + high) / 2",
      "  se a[mid] == alvo: retornar mid",
      "  se a[mid] < alvo: low ← mid + 1",
      "  senão: high ← mid - 1",
      "retornar -1 (não encontrado)",
    ],
  },
};

function matches(value: string, target: string, mode: SearchMode): boolean {
  if (mode === "substring") return value.toLowerCase().includes(target.toLowerCase());
  return value.toLowerCase() === target.toLowerCase();
}

/** Linear search — works for both exact and substring. Collects ALL matches in substring mode. */
export function* linearSearch(
  values: string[],
  target: string,
  mode: SearchMode,
): Generator<SearchStep, SearchStep, void> {
  const n = values.length;
  const found: number[] = [];
  let comparisons = 0;
  const base: SearchStep = {
    values, discarded: [], found: [], message: "", line: 0, comparisons: 0, done: false,
  };
  yield { ...base, message: `Iniciando busca linear por "${target}" (${mode === "substring" ? "substring" : "exato"})` };

  for (let i = 0; i < n; i++) {
    comparisons++;
    const ok = matches(values[i], target, mode);
    yield {
      ...base,
      current: i,
      line: 1,
      comparisons,
      found: [...found],
      message: `Comparando a[${i}] = "${truncate(values[i])}" com "${target}" → ${ok ? "MATCH" : "não"}`,
    };
    if (ok) {
      found.push(i);
      yield {
        ...base,
        current: i,
        line: 2,
        comparisons,
        found: [...found],
        message: `Match em a[${i}]${mode === "substring" ? " — continuando para achar todos" : ""}`,
      };
      if (mode === "exact") {
        return { ...base, line: 2, comparisons, found: [...found], done: true, message: `Encontrado no índice ${i} após ${comparisons} comparações` };
      }
    }
  }
  return {
    ...base,
    line: 3,
    comparisons,
    found: [...found],
    done: true,
    message:
      found.length > 0
        ? `Busca concluída — ${found.length} ocorrência(s) encontradas em ${comparisons} comparações`
        : `Alvo não encontrado após ${comparisons} comparações`,
  };
}

/** Binary search — requires sorted values. Only exact mode is meaningful. */
export function* binarySearch(
  values: string[],
  target: string,
): Generator<SearchStep, SearchStep, void> {
  const n = values.length;
  let low = 0;
  let high = n - 1;
  let comparisons = 0;
  const base: SearchStep = {
    values, discarded: [], found: [], message: "", line: 0, comparisons: 0, done: false,
  };
  const t = target.toLowerCase();
  yield { ...base, low, high, line: 0, message: `Iniciando busca binária por "${target}" — low=0, high=${n - 1}` };

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const discarded = collectDiscarded(n, low, high);
    yield {
      ...base,
      low, high, mid, line: 2, comparisons,
      discarded,
      message: `mid = ⌊(${low} + ${high}) / 2⌋ = ${mid}; a[${mid}] = "${truncate(values[mid])}"`,
    };
    comparisons++;
    const v = values[mid].toLowerCase();
    if (v === t) {
      yield {
        ...base,
        low, high, mid, line: 3, comparisons,
        discarded,
        found: [mid],
        done: true,
        message: `Encontrado em índice ${mid} após ${comparisons} comparações`,
      };
      return {
        ...base,
        low, high, mid, line: 3, comparisons,
        discarded,
        found: [mid],
        done: true,
        message: `Encontrado em índice ${mid} após ${comparisons} comparações`,
      };
    }
    if (v < t) {
      yield {
        ...base,
        low, high, mid, line: 4, comparisons,
        discarded,
        message: `a[${mid}] < alvo → descarta metade esquerda [${low}..${mid}]`,
      };
      low = mid + 1;
    } else {
      yield {
        ...base,
        low, high, mid, line: 5, comparisons,
        discarded,
        message: `a[${mid}] > alvo → descarta metade direita [${mid}..${high}]`,
      };
      high = mid - 1;
    }
  }
  return {
    ...base,
    line: 6, comparisons,
    discarded: Array.from({ length: n }, (_, i) => i),
    done: true,
    message: `Alvo não encontrado após ${comparisons} comparações`,
  };
}

function collectDiscarded(n: number, low: number, high: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < low; i++) out.push(i);
  for (let i = high + 1; i < n; i++) out.push(i);
  return out;
}

function truncate(s: string, max = 24): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Run a batch of trials to measure average comparison count. */
export function measureComparisons(
  sortedValues: string[],
  trials = 30,
): { linear: number; binary: number } {
  const n = sortedValues.length;
  if (n === 0) return { linear: 0, binary: 0 };
  let linTotal = 0;
  let binTotal = 0;
  for (let t = 0; t < trials; t++) {
    // mix: 70% present, 30% absent
    const present = Math.random() < 0.7;
    const target = present
      ? sortedValues[Math.floor(Math.random() * n)]
      : `__missing_${Math.random().toString(36).slice(2)}`;
    linTotal += runLinearCount(sortedValues, target);
    binTotal += runBinaryCount(sortedValues, target);
  }
  return { linear: linTotal / trials, binary: binTotal / trials };
}

function runLinearCount(arr: string[], target: string): number {
  const t = target.toLowerCase();
  let c = 0;
  for (let i = 0; i < arr.length; i++) {
    c++;
    if (arr[i].toLowerCase() === t) return c;
  }
  return c;
}

function runBinaryCount(arr: string[], target: string): number {
  const t = target.toLowerCase();
  let low = 0, high = arr.length - 1, c = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    c++;
    const v = arr[mid].toLowerCase();
    if (v === t) return c;
    if (v < t) low = mid + 1;
    else high = mid - 1;
  }
  return c;
}
