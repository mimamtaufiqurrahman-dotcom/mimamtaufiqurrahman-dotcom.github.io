# Tools

## Auto-sync posts.json (Opsi A)

Website ini adalah static HTML, jadi daftar post per label dibangun dari `assets/posts.json`.
Supaya otomatis sinkron setelah Anda menambah artikel baru di `artikel/`, jalankan:

- Generate posts.json:
  `python tools/build_posts.py`

- Generate posts.json + search-index.json:
  `python tools/build_posts.py --also-search-index`

### Cara memberi label ke artikel
Tambahkan meta berikut di <head> setiap artikel:

`<meta name="labels" content="harian">`

Label dipisah koma, huruf kecil disarankan.
