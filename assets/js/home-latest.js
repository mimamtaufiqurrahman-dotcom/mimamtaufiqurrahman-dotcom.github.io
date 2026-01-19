(function () {
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function humanLabel(label) {
    return String(label || "").replace(/(^|\s|-|_)\S/g, s => s.toUpperCase());
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    } catch {
      return iso;
    }
  }

  async function loadHomePosts() {
    const listEl = document.getElementById("homePostList");
    const emptyEl = document.getElementById("homeEmpty");
    if (!listEl) return;

    try {
      const res = await fetch("assets/posts.json", { cache: "no-store" });
      const data = await res.json();

      const posts = (data.posts || []).slice(0, 6); // tampilkan 6 terbaru
      if (!posts.length) {
        if (emptyEl) emptyEl.style.display = "block";
        return;
      }

      const html = posts.map(p => {
        const meta = [
          p.date ? formatDate(p.date) : "",
          Array.isArray(p.labels) && p.labels.length ? p.labels.map(humanLabel).join(" · ") : ""
        ].filter(Boolean).join(" · ");

        return `
          <article class="article-card">
            <h3><a href="${escapeHtml(p.url.replace("../",""))}">${escapeHtml(p.title)}</a></h3>
            <div class="meta">${escapeHtml(meta)}</div>
            <div class="excerpt">${escapeHtml(p.excerpt || "")}</div>
          </article>
        `;
      }).join("");

      listEl.innerHTML = html;
    } catch (e) {
      if (emptyEl) {
        emptyEl.style.display = "block";
        emptyEl.innerHTML = "<p>Gagal memuat catatan. Cek file assets/posts.json.</p>";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", loadHomePosts);
})();
