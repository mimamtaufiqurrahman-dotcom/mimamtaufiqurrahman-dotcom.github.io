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

  // ===== 7) AUTO-HIDE SOCIAL ICONS (jika kosong / '#') =====
  (function initSocialAutoHide() {
    const section = document.querySelector("section.media-social");
    if (!section) return;
    const icons = Array.from(section.querySelectorAll(".social-icons a"));
    if (!icons.length) return;

    let visible = 0;
    icons.forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (!href || href === "#") {
        a.style.display = "none";
      } else {
        visible += 1;
      }
    });
    if (visible === 0) section.style.display = "none";
  })();

  // ===== 8) POST ENHANCEMENTS (reading time + related + next/prev) =====
  (function initPostEnhancements() {
    const postEl = document.querySelector("article.post");
    if (!postEl) return;

    // Resolve root prefix based on CSS path (supports ../ on article pages)
    const cssLink = document.querySelector('link[href*="assets/css/style.css"]');
    const cssHref = (cssLink && cssLink.getAttribute("href")) || "assets/css/style.css";
    const rootPrefix = cssHref.startsWith("../") ? "../" : "";
    const postsUrl = rootPrefix + "assets/posts.json";

    function esc(s) {
      return String(s || "").replace(/[&<>\"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m]));
    }

    function normalizePath(p) {
      return String(p || "").replace(/^https?:\/\/[^/]+/i, "");
    }

    // ---- Reading time (±200 wpm)
    (function addReadingTime() {
      const headerSubtitle = document.querySelector(".page-header .subtitle");
      const text = postEl.innerText || "";
      const words = (text.match(/\S+/g) || []).length;
      const minutes = Math.max(1, Math.round(words / 200));
      if (headerSubtitle) {
        const span = document.createElement("span");
        span.className = "post-meta-inline";
        span.textContent = ` · ${minutes} menit baca`;
        headerSubtitle.appendChild(span);
      }
    })();

    // ---- Related + Prev/Next
    fetch(postsUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.posts)) return;
        const posts = data.posts;

        const currentPath = normalizePath(window.location.pathname);
        // Match by pathname end (karena ada ../ di posts.json)
        const idx = posts.findIndex((p) => {
          const pPath = normalizePath((p.url || "").replace(/^\.\.\//, "/"));
          return currentPath.endsWith(pPath);
        });
        if (idx < 0) return;

        const current = posts[idx];
        const currentLabels = Array.isArray(current.labels) ? current.labels.map((x) => String(x).toLowerCase()) : [];

        const prev = posts[idx + 1] || null; // posts.json: terbaru di atas, jadi prev = item setelahnya
        const next = posts[idx - 1] || null;

        // Container after article
        const tools = document.createElement("div");
        tools.className = "post-tools";

        // Prev/Next
        const nav = document.createElement("nav");
        nav.className = "post-nav";
        nav.setAttribute("aria-label", "Navigasi catatan");
        if (prev) {
          const a = document.createElement("a");
          a.href = rootPrefix + String(prev.url || "").replace(/^\.\.\//, "");
          a.innerHTML = `<div class="nav-label">← Sebelumnya</div><div class="nav-title">${esc(prev.title)}</div>`;
          nav.appendChild(a);
        }
        if (next) {
          const a = document.createElement("a");
          a.href = rootPrefix + String(next.url || "").replace(/^\.\.\//, "");
          a.innerHTML = `<div class="nav-label">Selanjutnya →</div><div class="nav-title">${esc(next.title)}</div>`;
          nav.appendChild(a);
        }
        if (nav.children.length) tools.appendChild(nav);

        // Related by shared labels (max 5)
        const related = posts
          .map((p, i) => ({ p, i }))
          .filter(({ i }) => i !== idx)
          .map(({ p }) => {
            const labs = Array.isArray(p.labels) ? p.labels.map((x) => String(x).toLowerCase()) : [];
            const score = labs.reduce((acc, l) => acc + (currentLabels.includes(l) ? 1 : 0), 0);
            return { p, score };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((x) => x.p);

        if (related.length) {
          const box = document.createElement("section");
          box.className = "related-posts";
          box.innerHTML = `<h3>Tulisan terkait</h3>`;
          const ul = document.createElement("ul");
          related.forEach((p) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = rootPrefix + String(p.url || "").replace(/^\.\.\//, "");
            a.textContent = p.title || "";
            li.appendChild(a);
            ul.appendChild(li);
          });
          box.appendChild(ul);
          tools.appendChild(box);
        }

        if (tools.children.length) {
          postEl.insertAdjacentElement("afterend", tools);
        }
      })
      .catch(() => {});
  })();

});


(function () {
  let ticking = false;

  function updateReadingProgress() {
    const bar = document.getElementById("readingProgress");
    if (!bar) return;

    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

    bar.style.width = percent + "%";
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          updateReadingProgress();
          ticking = false;
        });
      }
    },
    { passive: true }
  );

  // initialize once (for short pages)
  document.addEventListener("DOMContentLoaded", updateReadingProgress);
})();
