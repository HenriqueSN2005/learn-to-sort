export interface SortStep {
  array: number[];
  compares: number[];
  swaps: number[];
  highlights: number[];
  sorted: number[];
  message: string;
  line: number;
  comparisons: number;
  swapsCount: number;
  heap?: number[]; // for heap sort visualization
  aux?: { array: number[]; range: [number, number] } | null; // for merge
}

export interface AlgorithmInfo {
  key: AlgorithmKey;
  name: string;
  description: string;
  structure: string;
  complexity: { best: string; average: string; worst: string; space: string; reason: string };
  pseudocode: string[];
  run: (arr: number[]) => Generator<SortStep, SortStep, void>;
}

export type AlgorithmKey =
  | "bubble"
  | "selection"
  | "insertion"
  | "merge"
  | "quick"
  | "heap";
