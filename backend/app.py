"""
Backend Python — Persistência de Dados (Texto vs Binário)
=========================================================

Trabalho final: dá "memória" ao app de ordenação/busca.
Recebe o dataset do frontend e grava em 4 formatos diferentes:

  - JSON     (texto, legível)
  - CSV      (texto, tabular)
  - Pickle   (binário, nativo do Python)
  - Struct   (binário, registro de tamanho fixo)

Endpoints:
  GET  /carregar       -> baixa da Open Library e devolve os dados (proxy)
  POST /salvar         -> grava o dataset recebido em TODOS os formatos
  GET  /offline        -> lê do arquivo salvo (sem internet) — ?formato=json|csv|pickle|struct
  GET  /comparar       -> tamanho (KB) + tempo de salvar/carregar de cada formato
  GET  /inspecionar    -> trecho do arquivo de texto + hexdump do binário

Como rodar:
  cd backend
  pip install -r requirements.txt
  python app.py
  # Servidor em http://localhost:5000

CORS liberado para o frontend (TanStack Start em http://localhost:8080,
preview Lovable e qualquer origem em desenvolvimento).
"""

from __future__ import annotations

import csv
import io
import json
import os
import pickle
import struct
import time
from pathlib import Path
from typing import Any

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

# --------------------------------------------------------------------------- #
# Configuração
# --------------------------------------------------------------------------- #
APP_DIR = Path(__file__).parent.resolve()
DATA_DIR = APP_DIR / "dados"
DATA_DIR.mkdir(exist_ok=True)

FILES = {
    "json":   DATA_DIR / "dados.json",
    "csv":    DATA_DIR / "dados.csv",
    "pickle": DATA_DIR / "dados.pkl",
    "struct": DATA_DIR / "dados.bin",
}

# Layout do registro de tamanho fixo (struct):
#   título    : 120 bytes (utf-8, padded com \x00)
#   autores   : 120 bytes
#   ano       : int32   (4 bytes)
#   páginas   : int32   (4 bytes)
#   avaliação : float32 (4 bytes)
# Total: 252 bytes/registro. Big-endian para portabilidade.
STRUCT_FMT = ">120s120siif"
STRUCT_SIZE = struct.calcsize(STRUCT_FMT)

app = Flask(__name__)
CORS(app)  # libera para qualquer origem (didático)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _pad(text: str, n: int) -> bytes:
    """Trunca/pad em UTF-8 para caber em N bytes (registro fixo)."""
    raw = (text or "").encode("utf-8", errors="ignore")[:n]
    return raw + b"\x00" * (n - len(raw))


def _unpad(raw: bytes) -> str:
    return raw.rstrip(b"\x00").decode("utf-8", errors="ignore")


def _file_size_kb(path: Path) -> float:
    return round(path.stat().st_size / 1024, 3) if path.exists() else 0.0


# --------------------------------------------------------------------------- #
# Salvar (cada formato isolado, medindo tempo)
# --------------------------------------------------------------------------- #
def salvar_json(data: list[dict]) -> float:
    t0 = time.perf_counter()
    with open(FILES["json"], "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return (time.perf_counter() - t0) * 1000


def salvar_csv(data: list[dict]) -> float:
    t0 = time.perf_counter()
    fieldnames = ["title", "authors", "year", "pages", "rating"]
    with open(FILES["csv"], "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in data:
            w.writerow({k: row.get(k, "") for k in fieldnames})
    return (time.perf_counter() - t0) * 1000


def salvar_pickle(data: list[dict]) -> float:
    t0 = time.perf_counter()
    with open(FILES["pickle"], "wb") as f:
        pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
    return (time.perf_counter() - t0) * 1000


def salvar_struct(data: list[dict]) -> float:
    t0 = time.perf_counter()
    with open(FILES["struct"], "wb") as f:
        for row in data:
            packed = struct.pack(
                STRUCT_FMT,
                _pad(str(row.get("title", "")), 120),
                _pad(str(row.get("authors", "")), 120),
                int(row.get("year", 0) or 0),
                int(row.get("pages", 0) or 0),
                float(row.get("rating", 0) or 0),
            )
            f.write(packed)
    return (time.perf_counter() - t0) * 1000


# --------------------------------------------------------------------------- #
# Carregar
# --------------------------------------------------------------------------- #
def carregar_json() -> tuple[list[dict], float]:
    t0 = time.perf_counter()
    with open(FILES["json"], "r", encoding="utf-8") as f:
        data = json.load(f)
    return data, (time.perf_counter() - t0) * 1000


def carregar_csv() -> tuple[list[dict], float]:
    t0 = time.perf_counter()
    with open(FILES["csv"], "r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
        for r in rows:
            r["year"] = int(r["year"]) if r.get("year") else 0
            r["pages"] = int(r["pages"]) if r.get("pages") else 0
            r["rating"] = float(r["rating"]) if r.get("rating") else 0.0
    return rows, (time.perf_counter() - t0) * 1000


def carregar_pickle() -> tuple[list[dict], float]:
    t0 = time.perf_counter()
    with open(FILES["pickle"], "rb") as f:
        data = pickle.load(f)
    return data, (time.perf_counter() - t0) * 1000


def carregar_struct() -> tuple[list[dict], float]:
    t0 = time.perf_counter()
    rows: list[dict] = []
    with open(FILES["struct"], "rb") as f:
        while chunk := f.read(STRUCT_SIZE):
            if len(chunk) < STRUCT_SIZE:
                break
            title, authors, year, pages, rating = struct.unpack(STRUCT_FMT, chunk)
            rows.append({
                "title":   _unpad(title),
                "authors": _unpad(authors),
                "year":    year,
                "pages":   pages,
                "rating":  round(rating, 2),
            })
    return rows, (time.perf_counter() - t0) * 1000


CARREGADORES = {
    "json":   carregar_json,
    "csv":    carregar_csv,
    "pickle": carregar_pickle,
    "struct": carregar_struct,
}

SALVADORES = {
    "json":   salvar_json,
    "csv":    salvar_csv,
    "pickle": salvar_pickle,
    "struct": salvar_struct,
}


# --------------------------------------------------------------------------- #
# Rotas
# --------------------------------------------------------------------------- #
@app.get("/")
def root():
    return jsonify({
        "service": "Backend Persistência (Texto vs Binário)",
        "endpoints": ["/carregar", "/salvar", "/offline", "/comparar", "/inspecionar"],
        "formatos": list(FILES.keys()),
    })


@app.get("/carregar")
def carregar_api():
    """Proxy para a Open Library — devolve dados normalizados."""
    q = request.args.get("q", "javascript")
    limit = int(request.args.get("limit", 50))
    try:
        url = "https://openlibrary.org/search.json"
        params = {
            "q": q,
            "limit": min(max(limit * 3, 30), 300),
            "fields": "title,author_name,first_publish_year,number_of_pages_median,ratings_average",
        }
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        docs = r.json().get("docs", [])
        out: list[dict] = []
        for d in docs:
            year = d.get("first_publish_year") or 0
            pages = d.get("number_of_pages_median") or 0
            if not d.get("title") or not year or pages <= 0:
                continue
            out.append({
                "title":   d["title"],
                "authors": ", ".join(d.get("author_name") or ["Desconhecido"]),
                "year":    int(year),
                "pages":   int(pages),
                "rating":  round(float(d.get("ratings_average") or 0), 2),
            })
            if len(out) >= limit:
                break
        return jsonify({"ok": True, "data": out, "count": len(out)})
    except requests.RequestException as e:
        return jsonify({"ok": False, "error": str(e)}), 502


@app.post("/salvar")
def salvar():
    """Grava os dados recebidos nos 4 formatos. Body: {data: [...]}"""
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    if not isinstance(data, list):
        return jsonify({"ok": False, "error": "Esperado JSON {data: [...]}"}), 400

    resultados: dict[str, dict[str, Any]] = {}
    for fmt, fn in SALVADORES.items():
        try:
            ms = fn(data)
            resultados[fmt] = {
                "ok": True,
                "tempo_salvar_ms": round(ms, 3),
                "tamanho_kb": _file_size_kb(FILES[fmt]),
                "caminho": str(FILES[fmt].relative_to(APP_DIR)),
            }
        except Exception as e:  # noqa: BLE001
            resultados[fmt] = {"ok": False, "error": str(e)}

    return jsonify({"ok": True, "registros": len(data), "formatos": resultados})


@app.get("/offline")
def offline():
    """Lê os dados de um dos formatos salvos, sem acessar a API."""
    fmt = request.args.get("formato", "json").lower()
    if fmt not in CARREGADORES:
        return jsonify({"ok": False, "error": f"Formato inválido: {fmt}"}), 400
    if not FILES[fmt].exists():
        return jsonify({
            "ok": False,
            "error": f"Arquivo {FILES[fmt].name} ainda não existe. Salve primeiro via /salvar.",
        }), 404
    try:
        data, ms = CARREGADORES[fmt]()
        return jsonify({
            "ok": True,
            "formato": fmt,
            "tempo_carregar_ms": round(ms, 3),
            "tamanho_kb": _file_size_kb(FILES[fmt]),
            "count": len(data),
            "data": data,
        })
    except Exception as e:  # noqa: BLE001
        return jsonify({"ok": False, "error": str(e)}), 500


@app.get("/comparar")
def comparar():
    """Mede tempo de salvar+carregar e devolve tamanho dos 4 formatos."""
    # Usa os dados já presentes no disco (lendo do JSON como fonte)
    if not FILES["json"].exists():
        return jsonify({
            "ok": False,
            "error": "Salve um dataset antes (POST /salvar).",
        }), 404
    try:
        base, _ = carregar_json()
    except Exception as e:  # noqa: BLE001
        return jsonify({"ok": False, "error": f"Falha lendo JSON base: {e}"}), 500

    resultados = []
    for fmt in FILES:
        ts = SALVADORES[fmt](base)
        _, tc = CARREGADORES[fmt]()
        resultados.append({
            "formato": fmt,
            "tipo": "texto" if fmt in ("json", "csv") else "binário",
            "tamanho_kb": _file_size_kb(FILES[fmt]),
            "tempo_salvar_ms": round(ts, 3),
            "tempo_carregar_ms": round(tc, 3),
        })

    return jsonify({"ok": True, "registros": len(base), "resultados": resultados})


@app.get("/inspecionar")
def inspecionar():
    """Trecho legível (texto) + hexdump (binário) para comparação visual."""
    def hexdump(path: Path, n_bytes: int = 256) -> str:
        if not path.exists():
            return "(arquivo não existe)"
        with open(path, "rb") as f:
            raw = f.read(n_bytes)
        linhas = []
        for off in range(0, len(raw), 16):
            chunk = raw[off:off + 16]
            hexp = " ".join(f"{b:02x}" for b in chunk).ljust(48)
            ascii_repr = "".join(chr(b) if 32 <= b < 127 else "." for b in chunk)
            linhas.append(f"{off:08x}  {hexp}  |{ascii_repr}|")
        return "\n".join(linhas) if linhas else "(arquivo vazio)"

    def head_text(path: Path, n_chars: int = 800) -> str:
        if not path.exists():
            return "(arquivo não existe)"
        with open(path, "r", encoding="utf-8") as f:
            return f.read(n_chars)

    return jsonify({
        "ok": True,
        "texto": {
            "json": {"trecho": head_text(FILES["json"]), "tamanho_kb": _file_size_kb(FILES["json"])},
            "csv":  {"trecho": head_text(FILES["csv"]),  "tamanho_kb": _file_size_kb(FILES["csv"])},
        },
        "binario": {
            "pickle": {"hexdump": hexdump(FILES["pickle"]), "tamanho_kb": _file_size_kb(FILES["pickle"])},
            "struct": {"hexdump": hexdump(FILES["struct"]), "tamanho_kb": _file_size_kb(FILES["struct"])},
        },
    })


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n  Backend rodando em http://localhost:{port}")
    print(f"  Diretório de dados: {DATA_DIR}\n")
    app.run(host="0.0.0.0", port=port, debug=True)
