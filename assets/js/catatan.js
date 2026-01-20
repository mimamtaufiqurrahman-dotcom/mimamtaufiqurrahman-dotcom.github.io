(function () {
  function qs(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function buildPageHref(page, label) {
    // Buat URL relatif yang konsisten: index.html?label=...&page=...
    const u = new URL("index.html", window.location.href);
    if (label) u.searchParams.set("label", label);
    u.searchParams.set("page", String(page));
    // Kembalikan path relatif (tanpa origin)
    return u.pathname.split("/").pop() + "?" + u.searchParams.toString();
  }

  function renderPagination({ totalItems, perPage, currentPage, label }) {
    const pager = document.querySelector("nav.pagination");
    const ul = pager ? pager.querySelector("ul") : null;
    if (!pager || !ul) return;

    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    if (totalPages <= 1) {
      pager.style.display = "none";
      ul.innerHTML = "";
      return;
    }
    pager.style.display = "";

    const page = Math.min(Math.max(1, currentPage), totalPages);
    ul.innerHTML = "";

    const makeLi = ({ cls = "", labelText = "", href = "", isSpan = false }) => {
      const li = document.createElement("li");
      if (cls) li.className = cls;
      if (isSpan) {
        const span = document.createElement("span");
        span.textContent = labelText;
        li.appendChild(span);
      } else {
        const a = document.createElement("a");
        a.textContent = labelText;
        a.href = href;
        li.appendChild(a);
      }
      return li;
    };

    // Prev
    if (page <= 1) ul.appendChild(makeLi({ cls: "prev disabled", labelText: "← Sebelumnya", isSpan: true }));
    else ul.appendChild(makeLi({ cls: "prev", labelText: "← Sebelumnya", href: buildPageHref(page - 1, label) }));

    // Angka halaman (ringkas dengan elipsis)
    const maxNumbers = 7;
    const addEllipsis = () => ul.appendChild(makeLi({ cls: "dots", labelText: "…", isSpan: true }));

    if (totalPages <= maxNumbers) {
      for (let p = 1; p <= totalPages; p++) {
        if (p === page) ul.appendChild(makeLi({ cls: "active", labelText: String(p), isSpan: true }));
        else ul.appendChild(makeLi({ labelText: String(p), href: buildPageHref(p, label) }));
      }
    } else {
      const pagesToShow = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
      const sorted = Array.from(pagesToShow).sort((a, b) => a - b);
      let prevP = 0;
      sorted.forEach((p) => {
        if (prevP && p - prevP > 1) addEllipsis();
        if (p === page) ul.appendChild(makeLi({ cls: "active", labelText: String(p), isSpan: true }));
        else ul.appendChild(makeLi({ labelText: String(p), href: buildPageHref(p, label) }));
        prevP = p;
      });
    }

    // Next
    if (page >= totalPages) ul.appendChild(makeLi({ cls: "next disabled", labelText: "Selanjutnya →", isSpan: true }));
    else ul.appendChild(makeLi({ cls: "next", labelText: "Selanjutnya →", href: buildPageHref(page + 1, label) }));
  }

  function applyPagingToCards({ cards, perPage, currentPage }) {
    const totalPages = Math.max(1, Math.ceil(cards.length / perPage));
    const page = Math.min(Math.max(1, currentPage), totalPages);
    const start = (page - 1) * perPage;
    const end = start + perPage;

    cards.forEach((card, i) => {
      card.style.display = (i >= start && i < end) ? "" : "none";
    });
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function humanLabel(label) {
    // simple title-case
    return String(label || "").replace(/(^|\s|-|_)\S/g, s => s.toUpperCase());
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  async function load() {
    const label = (qs("label") || "").toLowerCase();
    const requestedPage = parseInt(qs("page") || "1", 10) || 1;

    const titleEl = document.getElementById("catatanTitle");
    const descEl = document.getElementById("catatanDesc");
    const chipsEl = document.getElementById("labelChips");
    const listEl = document.getElementById("postList");
    const emptyEl = document.getElementById("emptyState");

    if (!chipsEl || !listEl) return;

    const res = await fetch("../assets/posts.json", { cache: "no-store" });
    const data = await res.json();

    const labels = (data.labels || []).map(l => String(l));
    const posts = (data.posts || []);

    // Render chips
    const allHref = "index.html";
    let chips = `<a href="${allHref}" class="${label ? "" : "active"}">Semua</a>`;
    labels.forEach(l => {
      const active = (l.toLowerCase() === label) ? "active" : "";
      chips += `<a href="index.html?label=${encodeURIComponent(l)}" class="${active}">${escapeHtml(humanLabel(l))}</a>`;
    });
    chipsEl.innerHTML = chips;

    // Filter posts
    const filtered = label
      ? posts.filter(p => Array.isArray(p.labels) && p.labels.map(x => String(x).toLowerCase()).includes(label))
      : posts;

    // Title/desc
    if (titleEl) titleEl.textContent = label ? `Label: ${humanLabel(label)}` : "Semua Catatan";
    if (descEl) descEl.textContent = label ? `Menampilkan catatan dengan label "${humanLabel(label)}".` : "Pilih label untuk memfilter daftar tulisan.";

    // Render list
    if (!filtered.length) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      // Sembunyikan pagination jika tidak ada data
      renderPagination({ totalItems: 0, perPage: 6, currentPage: 1, label });
      return;
    } else {
      if (emptyEl) emptyEl.style.display = "none";
    }

    const html = filtered.map(p => {
      const meta = [p.date ? formatDate(p.date) : "", (p.labels || []).length ? (p.labels || []).map(humanLabel).join(" · ") : ""]
        .filter(Boolean).join(" · ");

      return `
        <article class="article-card">
          <h3><a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a></h3>
          <div class="meta">${escapeHtml(meta)}</div>
          <div class="excerpt">${escapeHtml(p.excerpt || "")}</div>
        </article>
      `;
    }).join("");

    listEl.innerHTML = html;

    // ===== Pagination (jalan SETELAH list dirender) =====
    const pager = document.querySelector("nav.pagination");
    const perPageAttr = pager ? pager.getAttribute("data-per-page") : "6";
    const perPage = Math.max(1, parseInt(perPageAttr || "6", 10) || 6);
    const cards = Array.from(listEl.querySelectorAll(".article-card"));

    applyPagingToCards({ cards, perPage, currentPage: requestedPage });
    renderPagination({ totalItems: cards.length, perPage, currentPage: requestedPage, label });
  }

  document.addEventListener("DOMContentLoaded", load);
})();
