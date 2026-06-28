# Backend Python — Persistência de Dados (Texto vs Binário)

Trabalho final: dá "memória" ao app de ordenação/busca. O backend recebe o dataset baixado da Open Library e o grava em disco nos 4 formatos pedidos, permitindo modo offline e comparação empírica.

## Stack

- **Python 3.10+**
- **Flask** + **flask-cors** (servidor HTTP)
- **requests** (proxy para a Open Library)
- Stdlib: `json`, `csv`, `pickle`, `struct`

## Como rodar

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

O servidor sobe em **http://localhost:5000**. Os arquivos são salvos em `backend/dados/`.

No frontend (Lovable / TanStack Start rodando em http://localhost:8080), abra a aba **"Persistência (Python)"** e use os botões. CORS já está liberado.

## Endpoints

| Método | Rota             | Descrição                                                            |
|--------|------------------|----------------------------------------------------------------------|
| GET    | `/carregar`      | Proxy para a Open Library. Query: `q`, `limit`.                      |
| POST   | `/salvar`        | Grava os dados recebidos nos 4 formatos. Body: `{ "data": [...] }`.  |
| GET    | `/offline`       | Lê de um formato salvo. Query: `formato=json\|csv\|pickle\|struct`.  |
| GET    | `/comparar`      | Mede tempo de salvar + carregar de cada formato.                     |
| GET    | `/inspecionar`   | Trecho legível dos arquivos de texto + hexdump dos binários.         |

## Formatos implementados

| Formato  | Tipo     | Biblioteca  | Característica                                |
|----------|----------|-------------|-----------------------------------------------|
| JSON     | texto    | `json`      | Legível, portável, mais verboso               |
| CSV      | texto    | `csv`       | Tabular, compacto entre os texto              |
| Pickle   | binário  | `pickle`    | Nativo Python, rápido, não portável p/ JS     |
| Struct   | binário  | `struct`    | Registro fixo `>120s120siif` (252 bytes/reg.) |

## Discussão (esperada no relatório)

Em datasets típicos (50–500 livros):

- **Tamanho:** `struct` < `pickle` < `csv` < `json`. Struct ganha por não armazenar nomes de campos e usar inteiros de 4 bytes em vez de strings ASCII. JSON paga aspas, vírgulas, indentação e chaves repetidas em cada objeto.
- **Tempo de salvar:** `pickle` costuma ser o mais rápido (serialização nativa em C). JSON com `indent=2` é o mais lento porque formata.
- **Tempo de carregar:** `pickle` lidera, seguido por `struct`. CSV é lento porque faz parsing string→int/float linha a linha.
- **Trade-off:** texto vence em legibilidade, depuração e interoperabilidade entre linguagens. Binário vence em espaço e tempo, mas precisa do mesmo código (ou esquema) para ser lido.

## Layout do `struct`

```
título    : 120 bytes (utf-8, padded com \x00)
autores   : 120 bytes
ano       : int32   (4 bytes, big-endian)
páginas   : int32
avaliação : float32
---------------------------------------------
total     : 252 bytes por registro
```

Strings maiores que 120 bytes são truncadas — é o preço do tamanho fixo.

## Testando offline

1. Rode o backend e clique em **"Baixar da API + salvar"** no frontend.
2. Desligue o Wi-Fi.
3. Clique em **"Carregar do arquivo"** — a tela monta normalmente, sem chamar a Open Library.
