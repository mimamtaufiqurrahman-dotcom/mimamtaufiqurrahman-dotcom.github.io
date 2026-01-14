document.addEventListener("DOMContentLoaded", () => {
  // ===== ELEMENTS =====
  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const mainNav = document.querySelector(".main-nav");

  const dropdowns = Array.from(document.querySelectorAll(".dropdown"));
  const dropdownBtns = Array.from(document.querySelectorAll(".dropdown .dropdown-toggle"));
  const hero = document.querySelector("#hero") || document.querySelector(".hero");
  const navClose = document.querySelector(".nav-close");

  // ===== MENU HELPERS =====
  function closeMenu() {
    if (!mainNav) return;
    mainNav.classList.remove("active");
    document.body.classList.remove("menu-open");
    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.setAttribute("aria-label", "Buka menu");
  }

  function openMenu() {
    if (!mainNav) return;
    mainNav.classList.add("active");
    document.body.classList.add("menu-open");
    navToggle?.setAttribute("aria-expanded", "true");
    navToggle?.setAttribute("aria-label", "Tutup menu");
  }

  // ===== 1) HEADER: scroll state =====
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  // ===== 2) HEADER: switch navbar text color based on HERO visibility =====
  if (header && hero) {
    const io = new IntersectionObserver(
      (entries) => {
        header.classList.toggle("on-hero", entries[0].isIntersecting);
      },
      { threshold: 0.2 }
    );
    io.observe(hero);
  }

  // ===== 3) MOBILE MENU TOGGLE (SATU SAJA) =====
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", (e) => {
      e.preventDefault();
      const isOpen = mainNav.classList.contains("active");
      if (isOpen) closeMenu();
      else openMenu();
    });
  }

  // tombol close
  navClose?.addEventListener("click", (e) => {
    e.preventDefault();
    closeMenu();
  });

  // klik di luar panel untuk menutup
  document.addEventListener("click", (e) => {
    if (!mainNav || !navToggle) return;
    const isOpen = mainNav.classList.contains("active");
    if (!isOpen) return;

    const clickInsideNav = mainNav.contains(e.target);
    const clickToggle = navToggle.contains(e.target);
    if (!clickInsideNav && !clickToggle) closeMenu();
  });

  // tekan ESC untuk menutup
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // ===== 4) DROPDOWN TOGGLE (klik; friendly untuk mobile) =====
  // Catatan: klik dropdown-toggle TIDAK boleh menutup menu drawer.
  if (dropdownBtns.length) {
    dropdownBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const dd = btn.closest(".dropdown");
        if (!dd) return;

        const isOpen = dd.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(isOpen));
      });
    });
  }

  // ===== 5) ACTIVE LINK HIGHLIGHT =====
  if (mainNav) {
    const links = mainNav.querySelectorAll("a");
    let current = location.pathname.replace(/^\//, "");
    if (!current) current = "index.html";

    links.forEach((a) => {
      const href = (a.getAttribute("href") || "").replace(/^\.\//, "");
      if (!href || href === "#") return;

      if (href === current) {
        a.classList.add("active");
        const dd = a.closest(".dropdown");
        if (dd) dd.classList.add("active");
      }
    });
  }
  // Tutup menu setelah klik link (mobile)
  // Kecuali: dropdown-toggle (href="#") karena itu hanya membuka submenu.
  mainNav?.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    const isDropdownToggle = link.classList.contains("dropdown-toggle") || (link.getAttribute("href") || "") === "#";
    if (isDropdownToggle) return;

    if (mainNav.classList.contains("active")) closeMenu();
  });



// ===== 6) SITE SEARCH (Lintas Kategori / Seluruh Website) =====
// - Search bar di header (desktop & mobile)
// - Submit akan membuka search.html?q=...
// - Di search.html, hasil diambil dari assets/search-index.json
(function initGlobalSearch() {
  const forms = Array.from(document.querySelectorAll("form.site-search"));
  if (forms.length === 0) return;

  // Support: header search (siteSearchInput) + search page input (siteSearchInputPage)
  const headerInput = document.querySelector("#siteSearchInput");
  const pageInput = document.querySelector("#siteSearchInputPage");

  const isSearchPage = /(?:^|\/)(search\.html)$/.test(window.location.pathname);
  const params = new URLSearchParams(window.location.search);
  const qFromUrl = (params.get("q") || "").trim();
  if (qFromUrl) {
    if (headerInput) headerInput.value = qFromUrl;
    if (pageInput) pageInput.value = qFromUrl;
  }

  function getSearchPageUrl(query) {
    const inSubdir = window.location.pathname.includes("/catatan/") || window.location.pathname.includes("/artikel/");
    const base = inSubdir ? "../search.html" : "search.html";
    const url = new URL(base, window.location.href);
    if (query) url.searchParams.set("q", query);
    return url.toString();
  }

  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const localInput = form.querySelector('input[type="search"], input[name="q"], input');
      const q = ((localInput && localInput.value) || "").trim();
      window.location.href = getSearchPageUrl(q);
    });
  });

  // Render hasil di search.html
  if (!isSearchPage) return;

  const resultsWrap = document.querySelector("#searchResults");
  const summary = document.querySelector("#searchSummary");
  if (!resultsWrap) return;

  function esc(s) {
    return String(s || "").replace(/[&<>\"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));
  }

  function normalize(s) {
    return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function highlight(text, q) {
    const t = String(text || "");
    if (!q) return esc(t);
    const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${safeQ})`, "ig");
    return esc(t).replace(re, "<mark>$1</mark>");
  }

  function render(items, q) {
    resultsWrap.innerHTML = "";
    if (!q) {
      summary && (summary.textContent = "Ketik kata kunci untuk mencari catatan dan halaman di website.");
      return;
    }

    const nq = normalize(q);
    const scored = items
      .map((it) => {
        const hay = normalize([it.title, it.snippet, it.section].join(" "));
        if (!hay.includes(nq)) return null;
        // scoring sederhana: title match lebih tinggi
        let score = 0;
        if (normalize(it.title).includes(nq)) score += 5;
        if (normalize(it.section).includes(nq)) score += 2;
        if (normalize(it.snippet).includes(nq)) score += 1;
        return { ...it, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    summary && (summary.textContent = scored.length
      ? `Menampilkan ${scored.length} hasil untuk \"${q}\".`
      : `Tidak ada hasil untuk \"${q}\".`);

    if (scored.length === 0) {
      resultsWrap.innerHTML = `<p class="search-empty">Coba kata kunci lain, atau gunakan kata yang lebih umum.</p>`;
      return;
    }

    const frag = document.createDocumentFragment();
    scored.forEach((it) => {
      const card = document.createElement("article");
      card.className = "article-card";
      card.innerHTML = `
        <div class="article-content">
          <div class="article-meta">${esc(it.section || "")}</div>
          <h3 class="article-title"><a href="${esc(it.url)}">${highlight(it.title, q)}</a></h3>
          <p class="article-excerpt">${highlight(it.snippet, q)}</p>
        </div>
      `;
      frag.appendChild(card);
    });
    resultsWrap.appendChild(frag);
  }

  // Path index tergantung lokasi
  const indexUrl = window.location.pathname.includes("/catatan/") || window.location.pathname.includes("/artikel/")
    ? "../assets/search-index.json"
    : "assets/search-index.json";

  fetch(indexUrl, { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((data) => {
      // Support 2 formats:
      // 1) Array: [ {...}, {...} ]
      // 2) Object: { items: [ {...}, {...} ], ... }
      const items = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.items) ? data.items : []);
      render(items, qFromUrl);
    })
    .catch(() => {
      summary && (summary.textContent = "Gagal memuat indeks pencarian.");
    });
})();

  // ===== 6) PAGINATION (Catatan Harian) =====
  // Otomatis membagi .article-card per halaman berdasarkan data-per-page pada .pagination
  (function initPagination() {
    const grid = document.querySelector(".article-grid");
    const cards = grid ? Array.from(grid.querySelectorAll(".article-card")) : [];
    const pager = document.querySelector("nav.pagination");
    const ul = pager ? pager.querySelector("ul") : null;
    if (!grid || !pager || !ul || cards.length === 0) return;

    const perPageAttr = pager.getAttribute("data-per-page");
    const perPage = Math.max(1, parseInt(perPageAttr || "6", 10) || 6);

    const params = new URLSearchParams(window.location.search);
    const q = (params.get("q") || "").trim();
    if (q) {
      // Saat search aktif, pagination tidak dijalankan (ditangani oleh Site Search)
      return;
    }
    const requestedPage = parseInt(params.get("page") || "1", 10) || 1;

    const totalPages = Math.max(1, Math.ceil(cards.length / perPage));
    const page = Math.min(Math.max(1, requestedPage), totalPages);

    // tampilkan hanya card untuk halaman aktif
    cards.forEach((card, i) => {
      const start = (page - 1) * perPage;
      const end = start + perPage;
      card.style.display = (i >= start && i < end) ? "" : "none";
    });

    // bangun pagination (hindari dobel)
    ul.innerHTML = "";

    // helper buat URL halaman
    const baseFile = (window.location.pathname.split("/").pop() || "harian.html");
    const makeHref = (p) => `${baseFile}?page=${p}`;

    const makeLi = ({ cls = "", label = "", href = "", isSpan = false, aria = "" }) => {
      const li = document.createElement("li");
      if (cls) li.className = cls;
      if (isSpan) {
        const span = document.createElement("span");
        span.textContent = label;
        if (aria) span.setAttribute("aria-label", aria);
        li.appendChild(span);
      } else {
        const a = document.createElement("a");
        a.textContent = label;
        a.href = href || "#";
        if (aria) a.setAttribute("aria-label", aria);
        li.appendChild(a);
      }
      return li;
    };

    // Prev
    if (page <= 1) {
      ul.appendChild(makeLi({ cls: "prev disabled", label: "← Sebelumnya", isSpan: true }));
    } else {
      ul.appendChild(makeLi({ cls: "prev", label: "← Sebelumnya", href: makeHref(page - 1) }));
    }

    // Angka halaman (tampilkan semua kalau <= 7, kalau banyak pakai elipsis)
    const maxNumbers = 7;
    const addEllipsis = () => ul.appendChild(makeLi({ cls: "dots", label: "…", isSpan: true }));

    if (totalPages <= maxNumbers) {
      for (let p = 1; p <= totalPages; p++) {
        if (p === page) ul.appendChild(makeLi({ cls: "active", label: String(p), isSpan: true }));
        else ul.appendChild(makeLi({ label: String(p), href: makeHref(p) }));
      }
    } else {
      // selalu tampilkan 1, halaman aktif ±1, dan halaman terakhir
      const pagesToShow = new Set([1, totalPages, page - 1, page, page + 1].filter(p => p >= 1 && p <= totalPages));
      const sorted = Array.from(pagesToShow).sort((a, b) => a - b);

      // sisipkan elipsis jika ada gap
      let prevP = 0;
      sorted.forEach((p) => {
        if (prevP && p - prevP > 1) addEllipsis();
        if (p === page) ul.appendChild(makeLi({ cls: "active", label: String(p), isSpan: true }));
        else ul.appendChild(makeLi({ label: String(p), href: makeHref(p) }));
        prevP = p;
      });
    }

    // Next
    if (page >= totalPages) {
      ul.appendChild(makeLi({ cls: "next disabled", label: "Selanjutnya →", isSpan: true }));
    } else {
      ul.appendChild(makeLi({ cls: "next", label: "Selanjutnya →", href: makeHref(page + 1) }));
    }
  })();

});
