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
    const featuredEl = document.getElementById("homeFeatured");
    const emptyEl = document.getElementById("homeEmpty");
    if (!listEl) return;

    try {
      const res = await fetch("assets/posts.json", { cache: "no-store" });
      const data = await res.json();

      const postsAll = (data.posts || []);
      const posts = postsAll.slice(0, 6); // tampilkan 6 terbaru
      if (!posts.length) {
        if (emptyEl) emptyEl.style.display = "block";
        return;
      }

      // Featured = post paling terbaru
      const featured = posts[0];
      const rest = posts.slice(1);

      if (featuredEl && featured) {
        const metaFeat = [
          featured.date ? formatDate(featured.date) : "",
          Array.isArray(featured.labels) && featured.labels.length ? featured.labels.map(humanLabel).join(" · ") : ""
        ].filter(Boolean).join(" · ");

        featuredEl.innerHTML = `
          <article class="featured-card">
            <div class="featured-body">
              <div class="meta">${escapeHtml(metaFeat)}</div>
              <h3><a href="${escapeHtml(featured.url.replace("../",""))}">${escapeHtml(featured.title)}</a></h3>
              <p class="excerpt">${escapeHtml(featured.excerpt || "")}</p>
              <p class="featured-cta"><a class="btn btn-glass btn-sm" href="${escapeHtml(featured.url.replace("../",""))}">Baca catatan →</a></p>
            </div>
          </article>
        `;
      }

      const html = rest.map(p => {
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
