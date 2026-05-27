import type { AlgorithmInfo, SortStep } from "./types";

// Helper to build a step
function step(partial: Partial<SortStep>, base: SortStep): SortStep {
  return { ...base, ...partial, array: [...(partial.array ?? base.array)] };
}

// ============== BUBBLE SORT ==============
function* bubbleSort(input: number[]): Generator<SortStep, SortStep, void> {
  const a = [...input];
  const n = a.length;
  let comparisons = 0;
  let swapsCount = 0;
  const sorted: number[] = [];
  const base: SortStep = {
    array: a, compares: [], swaps: [], highlights: [], sorted: [...sorted],
    message: "Início", line: 0, comparisons, swapsCount,
  };
  yield step({ message: "Iniciando Bubble Sort" }, base);
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    yield step({ line: 1, message: `Passada externa i=${i}`, sorted: [...sorted] }, { ...base, array: a, comparisons, swapsCount });
    for (let j = 0; j < n - 1 - i; j++) {
      comparisons++;
      yield step({
        line: 3, compares: [j, j + 1], sorted: [...sorted],
        message: `Comparando índices ${j} e ${j + 1} (${a[j]} vs ${a[j + 1]})`,
        comparisons, swapsCount, array: a,
      }, base);
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapsCount++;
        swapped = true;
        yield step({
          line: 4, swaps: [j, j + 1], sorted: [...sorted],
          message: `Trocando ${a[j + 1]} com ${a[j]}`,
          comparisons, swapsCount, array: a,
        }, base);
      }
    }
    sorted.unshift(n - 1 - i);
    if (!swapped) {
      for (let k = 0; k <= n - 1 - i; k++) if (!sorted.includes(k)) sorted.push(k);
      break;
    }
  }
  for (let k = 0; k < n; k++) if (!sorted.includes(k)) sorted.push(k);
  return step({ line: 7, message: "Ordenação concluída", sorted: [...sorted], comparisons, swapsCount, array: a }, base);
}

// ============== SELECTION SORT ==============
function* selectionSort(input: number[]): Generator<SortStep, SortStep, void> {
  const a = [...input];
  const n = a.length;
  let comparisons = 0;
  let swapsCount = 0;
  const sorted: number[] = [];
  const base: SortStep = {
    array: a, compares: [], swaps: [], highlights: [], sorted: [...sorted],
    message: "Início", line: 0, comparisons, swapsCount,
  };
  yield step({ message: "Iniciando Selection Sort" }, base);
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    yield step({ line: 1, highlights: [min], message: `Buscando mínimo a partir do índice ${i}`, sorted: [...sorted], comparisons, swapsCount, array: a }, base);
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      yield step({ line: 3, compares: [min, j], highlights: [min], sorted: [...sorted], message: `Comparando mínimo atual ${a[min]} com ${a[j]}`, comparisons, swapsCount, array: a }, base);
      if (a[j] < a[min]) {
        min = j;
        yield step({ line: 4, highlights: [min], sorted: [...sorted], message: `Novo mínimo: ${a[min]} (índice ${min})`, comparisons, swapsCount, array: a }, base);
      }
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      swapsCount++;
      yield step({ line: 6, swaps: [i, min], sorted: [...sorted], message: `Trocando ${a[min]} com ${a[i]}`, comparisons, swapsCount, array: a }, base);
    }
    sorted.push(i);
  }
  sorted.push(n - 1);
  return step({ line: 8, message: "Ordenação concluída", sorted: [...sorted], comparisons, swapsCount, array: a }, base);
}

// ============== INSERTION SORT ==============
function* insertionSort(input: number[]): Generator<SortStep, SortStep, void> {
  const a = [...input];
  const n = a.length;
  let comparisons = 0;
  let swapsCount = 0;
  const base: SortStep = {
    array: a, compares: [], swaps: [], highlights: [], sorted: [0],
    message: "Início", line: 0, comparisons, swapsCount,
  };
  yield step({ message: "Iniciando Insertion Sort" }, base);
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    yield step({ line: 1, highlights: [i], sorted: Array.from({ length: i }, (_, k) => k), message: `Selecionando chave ${key} (índice ${i})`, comparisons, swapsCount, array: a }, base);
    while (j >= 0) {
      comparisons++;
      yield step({ line: 3, compares: [j, j + 1], sorted: Array.from({ length: i + 1 }, (_, k) => k), message: `Comparando ${a[j]} com chave ${key}`, comparisons, swapsCount, array: a }, base);
      if (a[j] > key) {
        a[j + 1] = a[j];
        swapsCount++;
        yield step({ line: 4, swaps: [j, j + 1], sorted: Array.from({ length: i + 1 }, (_, k) => k), message: `Deslocando ${a[j]} para a direita`, comparisons, swapsCount, array: a }, base);
        j--;
      } else break;
    }
    a[j + 1] = key;
    yield step({ line: 6, highlights: [j + 1], sorted: Array.from({ length: i + 1 }, (_, k) => k), message: `Inserindo chave ${key} no índice ${j + 1}`, comparisons, swapsCount, array: a }, base);
  }
  return step({ line: 8, message: "Ordenação concluída", sorted: Array.from({ length: n }, (_, k) => k), comparisons, swapsCount, array: a }, base);
}

// ============== MERGE SORT ==============
function* mergeSort(input: number[]): Generator<SortStep, SortStep, void> {
  const a = [...input];
  const n = a.length;
  let comparisons = 0;
  let swapsCount = 0;
  const base: SortStep = {
    array: a, compares: [], swaps: [], highlights: [], sorted: [],
    message: "Início", line: 0, comparisons, swapsCount,
  };
  yield step({ message: "Iniciando Merge Sort" }, base);

  function* merge(l: number, m: number, r: number): Generator<SortStep, void, void> {
    const left = a.slice(l, m + 1);
    const right = a.slice(m + 1, r + 1);
    let i = 0, j = 0, k = l;
    yield step({ line: 4, highlights: Array.from({ length: r - l + 1 }, (_, x) => l + x), message: `Mesclando [${l}..${m}] com [${m + 1}..${r}]`, comparisons, swapsCount, array: a, aux: { array: [...left, ...right], range: [l, r] } }, base);
    while (i < left.length && j < right.length) {
      comparisons++;
      yield step({ line: 6, compares: [l + i, m + 1 + j], message: `Comparando ${left[i]} e ${right[j]}`, comparisons, swapsCount, array: a }, base);
      if (left[i] <= right[j]) {
        a[k] = left[i]; i++;
      } else {
        a[k] = right[j]; j++;
      }
      swapsCount++;
      yield step({ line: 7, swaps: [k], message: `Escrevendo ${a[k]} no índice ${k}`, comparisons, swapsCount, array: a }, base);
      k++;
    }
    while (i < left.length) {
      a[k] = left[i]; i++; k++; swapsCount++;
      yield step({ line: 9, swaps: [k - 1], message: `Copiando restante da esquerda: ${a[k - 1]}`, comparisons, swapsCount, array: a }, base);
    }
    while (j < right.length) {
      a[k] = right[j]; j++; k++; swapsCount++;
      yield step({ line: 10, swaps: [k - 1], message: `Copiando restante da direita: ${a[k - 1]}`, comparisons, swapsCount, array: a }, base);
    }
  }

  function* sort(l: number, r: number): Generator<SortStep, void, void> {
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    yield step({ line: 2, highlights: Array.from({ length: r - l + 1 }, (_, x) => l + x), message: `Dividindo [${l}..${r}] em [${l}..${m}] e [${m + 1}..${r}]`, comparisons, swapsCount, array: a }, base);
    yield* sort(l, m);
    yield* sort(m + 1, r);
    yield* merge(l, m, r);
  }

  yield* sort(0, n - 1);
  return step({ line: 12, message: "Ordenação concluída", sorted: Array.from({ length: n }, (_, k) => k), comparisons, swapsCount, array: a }, base);
}

// ============== QUICK SORT ==============
function* quickSort(input: number[]): Generator<SortStep, SortStep, void> {
  const a = [...input];
  const n = a.length;
  let comparisons = 0;
  let swapsCount = 0;
  const sorted = new Set<number>();
  const base: SortStep = {
    array: a, compares: [], swaps: [], highlights: [], sorted: [],
    message: "Início", line: 0, comparisons, swapsCount,
  };
  yield step({ message: "Iniciando Quick Sort" }, base);

  function* partition(lo: number, hi: number): Generator<SortStep, number, void> {
    const pivot = a[hi];
    yield step({ line: 2, highlights: [hi], sorted: [...sorted], message: `Pivô escolhido: ${pivot} (índice ${hi})`, comparisons, swapsCount, array: a }, base);
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      comparisons++;
      yield step({ line: 4, compares: [j, hi], highlights: [hi], sorted: [...sorted], message: `Comparando ${a[j]} com pivô ${pivot}`, comparisons, swapsCount, array: a }, base);
      if (a[j] <= pivot) {
        i++;
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          swapsCount++;
          yield step({ line: 6, swaps: [i, j], highlights: [hi], sorted: [...sorted], message: `Trocando ${a[j]} com ${a[i]}`, comparisons, swapsCount, array: a }, base);
        }
      }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    swapsCount++;
    yield step({ line: 8, swaps: [i + 1, hi], sorted: [...sorted], message: `Posicionando pivô no índice ${i + 1}`, comparisons, swapsCount, array: a }, base);
    sorted.add(i + 1);
    return i + 1;
  }

  function* qs(lo: number, hi: number): Generator<SortStep, void, void> {
    if (lo < hi) {
      const p = yield* partition(lo, hi);
      yield* qs(lo, p - 1);
      yield* qs(p + 1, hi);
    } else if (lo === hi) {
      sorted.add(lo);
    }
  }

  yield* qs(0, n - 1);
  return step({ line: 11, message: "Ordenação concluída", sorted: Array.from({ length: n }, (_, k) => k), comparisons, swapsCount, array: a }, base);
}

// ============== HEAP SORT ==============
function* heapSort(input: number[]): Generator<SortStep, SortStep, void> {
  const a = [...input];
  const n = a.length;
  let comparisons = 0;
  let swapsCount = 0;
  const sorted: number[] = [];
  const base: SortStep = {
    array: a, compares: [], swaps: [], highlights: [], sorted: [],
    message: "Início", line: 0, comparisons, swapsCount, heap: [...a],
  };
  yield step({ message: "Iniciando Heap Sort", heap: a.slice(0, n) }, base);

  function* heapify(size: number, i: number): Generator<SortStep, void, void> {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    yield step({ line: 2, highlights: [i, l, r].filter(x => x < size), sorted: [...sorted], message: `Heapify no índice ${i}`, comparisons, swapsCount, array: a, heap: a.slice(0, size) }, base);
    if (l < size) {
      comparisons++;
      if (a[l] > a[largest]) largest = l;
    }
    if (r < size) {
      comparisons++;
      if (a[r] > a[largest]) largest = r;
    }
    if (largest !== i) {
      [a[i], a[largest]] = [a[largest], a[i]];
      swapsCount++;
      yield step({ line: 5, swaps: [i, largest], sorted: [...sorted], message: `Trocando ${a[largest]} com ${a[i]} para manter heap`, comparisons, swapsCount, array: a, heap: a.slice(0, size) }, base);
      yield* heapify(size, largest);
    }
  }

  yield step({ line: 1, message: "Construindo heap máximo", comparisons, swapsCount, array: a, heap: a.slice(0, n) }, base);
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(n, i);
  }
  for (let i = n - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]];
    swapsCount++;
    sorted.unshift(i);
    yield step({ line: 8, swaps: [0, i], sorted: [...sorted], message: `Movendo raiz ${a[i]} para a posição final ${i}`, comparisons, swapsCount, array: a, heap: a.slice(0, i) }, base);
    yield* heapify(i, 0);
  }
  sorted.unshift(0);
  return step({ line: 10, message: "Ordenação concluída", sorted: [...sorted], comparisons, swapsCount, array: a, heap: [] }, base);
}

export const ALGORITHMS: Record<string, AlgorithmInfo> = {
  bubble: {
    key: "bubble",
    name: "Bubble Sort",
    description:
      "Bubble Sort percorre o vetor repetidamente, comparando pares adjacentes e trocando-os quando estão fora de ordem. A cada passada completa, o maior elemento 'borbulha' até sua posição final no fim do vetor. O processo continua até que nenhuma troca seja necessária — sinal de que tudo já está ordenado.",
    structure: "Array simples (in-place). Não requer memória auxiliar além de variáveis temporárias.",
    complexity: {
      best: "O(n)",
      average: "O(n²)",
      worst: "O(n²)",
      space: "O(1)",
      reason:
        "No melhor caso (já ordenado), uma única passada sem trocas basta — O(n). Nos demais, são feitas n × n/2 comparações, levando a O(n²). Como troca elementos no próprio vetor, o espaço auxiliar é O(1).",
    },
    pseudocode: [
      "para i de 0 até n-1:",
      "  trocou ← falso",
      "  para j de 0 até n-i-2:",
      "    se a[j] > a[j+1]:",
      "      trocar a[j] e a[j+1]",
      "      trocou ← verdadeiro",
      "  se não trocou: parar",
      "fim",
    ],
    run: bubbleSort,
  },
  selection: {
    key: "selection",
    name: "Selection Sort",
    description:
      "Selection Sort divide o vetor em duas regiões: a ordenada (à esquerda) e a não ordenada. A cada iteração, busca o menor elemento da região não ordenada e o coloca ao final da ordenada via uma única troca. Faz poucas trocas, mas muitas comparações.",
    structure: "Array simples (in-place). Mantém apenas um índice do mínimo corrente.",
    complexity: {
      best: "O(n²)",
      average: "O(n²)",
      worst: "O(n²)",
      space: "O(1)",
      reason:
        "Sempre percorre toda a parte não ordenada para encontrar o mínimo, independente do estado inicial: n + (n-1) + ... + 1 = O(n²). O número de trocas é apenas O(n).",
    },
    pseudocode: [
      "para i de 0 até n-2:",
      "  min ← i",
      "  para j de i+1 até n-1:",
      "    se a[j] < a[min]:",
      "      min ← j",
      "  se min ≠ i:",
      "    trocar a[i] e a[min]",
      "fim",
    ],
    run: selectionSort,
  },
  insertion: {
    key: "insertion",
    name: "Insertion Sort",
    description:
      "Insertion Sort constrói o vetor ordenado um elemento por vez. Pega o próximo elemento da parte não ordenada e o insere na posição correta dentro da parte já ordenada, deslocando os maiores para a direita. É eficiente para vetores pequenos ou quase ordenados.",
    structure: "Array simples (in-place), com uma variável 'chave' para o elemento sendo inserido.",
    complexity: {
      best: "O(n)",
      average: "O(n²)",
      worst: "O(n²)",
      space: "O(1)",
      reason:
        "Se o vetor já está ordenado, cada inserção faz uma única comparação — O(n). No pior caso (ordem inversa), cada novo elemento precisa atravessar todos os anteriores — O(n²). Opera in-place: O(1) de espaço.",
    },
    pseudocode: [
      "para i de 1 até n-1:",
      "  chave ← a[i]",
      "  j ← i - 1",
      "  enquanto j ≥ 0 e a[j] > chave:",
      "    a[j+1] ← a[j]",
      "    j ← j - 1",
      "  a[j+1] ← chave",
      "fim",
    ],
    run: insertionSort,
  },
  merge: {
    key: "merge",
    name: "Merge Sort",
    description:
      "Merge Sort segue a estratégia de divisão e conquista: divide o vetor pela metade recursivamente até chegar a sub-vetores de tamanho 1, depois mescla pares ordenados produzindo vetores ordenados cada vez maiores. É estável e tem desempenho previsível.",
    structure: "Array principal + arrays auxiliares temporários para cada operação de mesclagem.",
    complexity: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n log n)",
      space: "O(n)",
      reason:
        "A árvore de recursão tem altura log n, e cada nível faz O(n) trabalho na mesclagem, totalizando O(n log n) em todos os casos. Requer O(n) de memória extra para os vetores auxiliares.",
    },
    pseudocode: [
      "mergeSort(a, l, r):",
      "  se l < r:",
      "    m ← (l + r) / 2",
      "    mergeSort(a, l, m)",
      "    mergeSort(a, m+1, r)",
      "    merge(a, l, m, r)",
      "merge: copiar para aux,",
      "  intercalar de volta em a",
      "  enquanto restar em aux esq.,",
      "  enquanto restar em aux dir.",
      "fim",
    ],
    run: mergeSort,
  },
  quick: {
    key: "quick",
    name: "Quick Sort",
    description:
      "Quick Sort também usa divisão e conquista: escolhe um elemento como pivô e particiona o vetor de modo que tudo menor fique à esquerda e tudo maior à direita. Em seguida aplica o mesmo processo recursivamente às duas partes. Costuma ser o mais rápido na prática.",
    structure: "Array (in-place) + pilha de recursão. Usa o esquema de partição de Lomuto/Hoare.",
    complexity: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n²)",
      space: "O(log n)",
      reason:
        "Quando o pivô divide bem o vetor, a árvore tem altura log n e cada nível faz O(n): O(n log n). Se o pivô for sempre o pior (mín/máx), a árvore vira linha — O(n²). Memória O(log n) pela pilha de recursão.",
    },
    pseudocode: [
      "quickSort(a, lo, hi):",
      "  pivô ← a[hi]",
      "  i ← lo - 1",
      "  para j de lo até hi-1:",
      "    se a[j] ≤ pivô:",
      "      i ← i + 1",
      "      trocar a[i] e a[j]",
      "  trocar a[i+1] e a[hi]",
      "  quickSort(a, lo, i)",
      "  quickSort(a, i+2, hi)",
      "fim",
    ],
    run: quickSort,
  },
  heap: {
    key: "heap",
    name: "Heap Sort",
    description:
      "Heap Sort organiza o vetor como um heap binário máximo (árvore em que cada pai é maior que os filhos). Depois, repetidamente extrai a raiz (o maior elemento) trocando-a com o último item do heap e reduzindo o tamanho do heap, refazendo o heapify a cada passo.",
    structure: "Heap binário máximo representado no próprio array (índice i tem filhos em 2i+1 e 2i+2).",
    complexity: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n log n)",
      space: "O(1)",
      reason:
        "Construir o heap inicial leva O(n). Cada uma das n extrações faz heapify em O(log n), totalizando O(n log n). Opera totalmente in-place no array, então o espaço auxiliar é O(1).",
    },
    pseudocode: [
      "construir heap máximo:",
      "  para i de n/2-1 até 0: heapify(n, i)",
      "heapify(size, i):",
      "  maior ← i; comparar com filhos",
      "  se maior ≠ i:",
      "    trocar a[i] e a[maior]",
      "    heapify(size, maior)",
      "para i de n-1 até 1:",
      "  trocar a[0] e a[i]",
      "  heapify(i, 0)",
      "fim",
    ],
    run: heapSort,
  },
};
