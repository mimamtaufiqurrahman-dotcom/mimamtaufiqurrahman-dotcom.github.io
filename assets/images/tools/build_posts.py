#!/usr/bin/env python3
"""
build_posts.py — generator untuk assets/posts.json dan (opsional) assets/search-index.json

Cara pakai (di folder root website):
  python tools/build_posts.py

Opsional:
  python tools/build_posts.py --also-search-index

Konsep:
- Semua artikel disimpan di folder: artikel/*.html
- Label/kategori ditentukan dari meta tag:
    <meta name="labels" content="harian,pemikiran">
  (boleh 1 atau lebih, dipisah koma)

- Script ini akan:
  1) membaca semua artikel
  2) mengekstrak: title, tanggal, excerpt, labels, url
  3) membuat ulang assets/posts.json (satu sumber data arsip)
  4) (opsional) membuat ulang assets/search-index.json dari konten artikel

Catatan:
- Ini static site, jadi "auto sync" dilakukan saat Anda menjalankan script ini sebelum upload.
"""

from __future__ import annotations
import argparse
import json
import os
import re
from datetime import datetime
from pathlib import Path

from bs4 import BeautifulSoup

BULAN = {
  "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,
  "juli": 7, "agustus": 8, "september": 9, "oktober": 10, "november": 11, "desember": 12
}

def norm_space(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()

def parse_ind_date(text: str) -> str | None:
    if not text:
        return None
    m = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", text)
    if not m:
        return None
    day = int(m.group(1))
    mon = BULAN.get(m.group(2).lower())
    year = int(m.group(3))
    if not mon:
        return None
    return f"{year:04d}-{mon:02d}-{day:02d}"

def extract_title(soup: BeautifulSoup, fallback_name: str) -> str:
    h1 = soup.find("h1")
    if h1 and norm_space(h1.get_text()):
        return norm_space(h1.get_text())
    if soup.title and norm_space(soup.title.get_text()):
        return norm_space(soup.title.get_text())
    return fallback_name

def extract_date_text(soup: BeautifulSoup) -> str | None:
    # cari elemen yang sering dipakai untuk meta tanggal
    candidates = []
    for sel in ["time", ".post-date", ".meta", ".article-meta", ".date"]:
        el = soup.select_one(sel)
        if el:
            candidates.append(norm_space(el.get_text(" ", strip=True)))
    # fallback: cari string tanggal Indonesia di body
    text = norm_space(soup.get_text(" ", strip=True))
    candidates.append(text)
    for c in candidates:
        if parse_ind_date(c):
            return c
    return None

def extract_excerpt(soup: BeautifulSoup, max_len: int = 180) -> str:
    main = soup.find("main") or soup.find("article") or soup.body
    paras = (main.find_all("p") if main else soup.find_all("p"))
    for p in paras:
        txt = norm_space(p.get_text(" ", strip=True))
        if not txt:
            continue
        # skip paragraf label / tanggal yang pendek
        if len(txt) < 30:
            continue
        return (txt[: max_len - 1] + "…") if len(txt) > max_len else txt
    return ""

def extract_labels(soup: BeautifulSoup) -> list[str]:
    meta = soup.find("meta", attrs={"name": "labels"})
    if meta and meta.get("content"):
        raw = meta["content"]
        labels = [norm_space(x).lower() for x in raw.split(",") if norm_space(x)]
        # normalisasi: spasi -> dash
        labels = [re.sub(r"\s+", "-", x) for x in labels]
        return sorted(set(labels))

    # fallback (lama): coba baca teks kategori di paragraf pertama, misal "Catatan Harian"
    first_p = soup.find("p")
    if first_p:
        t = norm_space(first_p.get_text(" ", strip=True)).lower()
        if "catatan" in t:
            # ambil kata terakhir
            parts = t.replace("catatan", "").strip().split()
            if parts:
                return [re.sub(r"\s+", "-", parts[-1])]
    return []

def article_to_search_item(url: str, title: str, snippet: str, soup: BeautifulSoup) -> dict:
    # text full untuk search (dibatasi)
    text = norm_space(soup.get_text(" ", strip=True))
    if len(text) > 8000:
        text = text[:8000] + "…"
    return {"url": url, "title": title, "snippet": snippet, "text": text}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--also-search-index", action="store_true", help="buat ulang assets/search-index.json")
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[1]
    artikel_dir = root / "artikel"
    assets_dir = root / "assets"
    assets_dir.mkdir(exist_ok=True)

    posts = []
    labels_set = set()

    for fp in sorted(artikel_dir.glob("*.html")):
        html = fp.read_text(encoding="utf-8")
        soup = BeautifulSoup(html, "html.parser")

        title = extract_title(soup, fp.name)
        date_text = extract_date_text(soup)
        date_iso = parse_ind_date(date_text or "")
        excerpt = extract_excerpt(soup)
        labels = extract_labels(soup)

        for l in labels:
            labels_set.add(l)

        posts.append({
            "title": title,
            "url": f"../artikel/{fp.name}",  # dipakai dari catatan/index.html
            "date": date_iso,
            "labels": labels,
            "excerpt": excerpt
        })

    # sort: tanggal desc lalu title
    def sort_key(p):
        return (p.get("date") or "", p.get("title") or "")
    posts = sorted(posts, key=sort_key, reverse=True)

    out_posts = {
        "generated": datetime.now().strftime("%Y-%m-%d"),
        "labels": sorted(labels_set),
        "posts": posts
    }

    (assets_dir / "posts.json").write_text(json.dumps(out_posts, ensure_ascii=False, indent=2), encoding="utf-8")
    print("OK: assets/posts.json dibuat ulang, jumlah post =", len(posts))

    if args.also_search_index:
        items = []
        for fp in sorted(artikel_dir.glob("*.html")):
            html = fp.read_text(encoding="utf-8")
            soup = BeautifulSoup(html, "html.parser")
            title = extract_title(soup, fp.name)
            snippet = extract_excerpt(soup, 220)
            items.append(article_to_search_item(f"artikel/{fp.name}", title, snippet, soup))

        out_search = {
            "generatedFrom": "tools/build_posts.py",
            "items": items
        }
        (assets_dir / "search-index.json").write_text(json.dumps(out_search, ensure_ascii=False, indent=2), encoding="utf-8")
        print("OK: assets/search-index.json dibuat ulang, jumlah item =", len(items))

if __name__ == "__main__":
    main()
