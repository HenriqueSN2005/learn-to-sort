export interface BookItem {
  title: string;
  authors: string;
  year: number;
  pages: number;
  rating: number;
}

interface OLDoc {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  ratings_average?: number;
}

interface OLResponse {
  docs?: OLDoc[];
}

/**
 * Busca livros na Open Library (sem necessidade de API key).
 * Retorna apenas livros com ano de publicação e nº de páginas válidos.
 */
export async function fetchBooks(
  query: string,
  max: number,
  signal?: AbortSignal,
): Promise<BookItem[]> {
  const q = query.trim() || "javascript";
  // Pedimos mais que `max` porque vamos filtrar livros sem páginas/ano.
  const limit = Math.min(Math.max(max * 3, 30), 200);
  const fields = [
    "title",
    "author_name",
    "first_publish_year",
    "number_of_pages_median",
    "ratings_average",
  ].join(",");
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=${fields}&limit=${limit}`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Falha ao buscar dados (HTTP ${res.status})`);
  const data = (await res.json()) as OLResponse;
  const docs = data.docs ?? [];

  const results: BookItem[] = [];
  for (const d of docs) {
    const year = d.first_publish_year ?? 0;
    const pages = d.number_of_pages_median ?? 0;
    if (!d.title || !year || pages <= 0) continue;
    results.push({
      title: d.title,
      authors: (d.author_name ?? ["Desconhecido"]).join(", "),
      year,
      pages,
      rating: Number((d.ratings_average ?? 0).toFixed(2)),
    });
    if (results.length >= max) break;
  }
  return results;
}

export const FIELD_LABELS: Record<keyof Pick<BookItem, "year" | "pages" | "rating">, string> = {
  year: "Ano de publicação",
  pages: "Número de páginas",
  rating: "Avaliação média",
};
