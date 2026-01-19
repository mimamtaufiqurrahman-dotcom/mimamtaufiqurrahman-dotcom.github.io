(function () {
  function qs(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
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
  }

  document.addEventListener("DOMContentLoaded", load);
})();
