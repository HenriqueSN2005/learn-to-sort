export interface BookItem {
  title: string;
  authors: string;
  year: number;
  pages: number;
  rating: number;
}

interface GoogleVolume {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    averageRating?: number;
  };
}

export async function fetchBooks(query: string, max: number): Promise<BookItem[]> {
  const results: BookItem[] = [];
  let startIndex = 0;
  // Google Books returns max 40 per page
  while (results.length < max && startIndex < 200) {
    const pageSize = Math.min(40, max - results.length);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${pageSize}&startIndex=${startIndex}&printType=books`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Falha ao buscar dados do Google Books");
    const data = (await res.json()) as { items?: GoogleVolume[] };
    const items = data.items ?? [];
    if (items.length === 0) break;
    for (const it of items) {
      const v = it.volumeInfo ?? {};
      const yearStr = (v.publishedDate ?? "").slice(0, 4);
      const year = parseInt(yearStr, 10);
      const pages = v.pageCount ?? 0;
      const rating = v.averageRating ?? 0;
      if (!v.title || isNaN(year) || pages <= 0) continue;
      results.push({
        title: v.title,
        authors: (v.authors ?? ["Desconhecido"]).join(", "),
        year,
        pages,
        rating,
      });
      if (results.length >= max) break;
    }
    startIndex += pageSize;
  }
  return results;
}

export const FIELD_LABELS: Record<keyof Pick<BookItem, "year" | "pages" | "rating">, string> = {
  year: "Ano de publicação",
  pages: "Número de páginas",
  rating: "Avaliação média",
};
