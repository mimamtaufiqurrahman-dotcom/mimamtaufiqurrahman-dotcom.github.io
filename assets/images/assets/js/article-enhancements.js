// article-enhancements.js
// Enhancements for article pages:
// - Adds reading time to subtitle
// - Injects previous/next navigation
// - Injects related posts based on shared labels

(function () {
  const article = document.querySelector("article.post");
  if (!article) return;

  const subtitleEl = document.querySelector(".page-header .subtitle");

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeLabel(l) {
    return String(l || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");
  }

  function getCurrentFileName() {
    const parts = (window.location.pathname || "").split("/");
    return parts[parts.length - 1] || "";
  }

  function computeReadingTimeMinutes(text) {
    const words = (String(text || "").match(/\S+/g) || []).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return { minutes, words };
  }

  // 1) Reading time
  try {
    const plain = article.innerText || article.textContent || "";
    const rt = computeReadingTimeMinutes(plain);
    if (subtitleEl) {
      // Avoid duplicating if already present
      if (!/menit\s+baca/i.test(subtitleEl.textContent || "")) {
        subtitleEl.textContent = `${subtitleEl.textContent} · ${rt.minutes} menit baca`;
      }
    }
  } catch (_) {
    // no-op
  }

  // 2) Prev/Next + 3) Related
  const currentFile = getCurrentFileName();
  const postsUrl = "../assets/posts.json";

  fetch(postsUrl)
    .then((r) => r.json())
    .then((data) => {
      const posts = Array.isArray(data?.posts) ? data.posts : [];
      if (!posts.length) return;

      // Find current by filename match
      const idx = posts.findIndex((p) => String(p?.url || "").endsWith(`/artikel/${currentFile}`) || String(p?.url || "").endsWith(`../artikel/${currentFile}`) || String(p?.url || "").endsWith(currentFile));
      if (idx < 0) return;

      const current = posts[idx];
      const currentLabels = new Set((current.labels || []).map(normalizeLabel));

      // Prev = newer (index - 1), Next = older (index + 1) because posts.json is sorted desc
      const prev = idx > 0 ? posts[idx - 1] : null;
      const next = idx < posts.length - 1 ? posts[idx + 1] : null;

      const wrap = document.createElement("section");
      wrap.className = "post-extras";
      wrap.innerHTML = `
        <div class="post-extras-inner">
          <div class="post-nav" aria-label="Navigasi artikel">
            ${prev ? `<a class="post-nav-link" href="${escapeHtml(String(prev.url || "../index.html").replace(/^\.\.\//, "../"))}"><span class="post-nav-kicker">← Sebelumnya</span><span class="post-nav-title">${escapeHtml(prev.title || "")}</span></a>` : `<span class="post-nav-spacer"></span>`}
            ${next ? `<a class="post-nav-link" href="${escapeHtml(String(next.url || "../index.html").replace(/^\.\.\//, "../"))}"><span class="post-nav-kicker">Selanjutnya →</span><span class="post-nav-title">${escapeHtml(next.title || "")}</span></a>` : `<span class="post-nav-spacer"></span>`}
          </div>

          <div class="related-block" aria-label="Artikel terkait">
            <h2 class="related-title">Tulisan terkait</h2>
            <div class="related-list" id="relatedList"></div>
          </div>
        </div>
      `;

      // Insert after article
      article.parentNode?.appendChild(wrap);

      const relatedEl = wrap.querySelector("#relatedList");
      if (!relatedEl) return;

      const related = posts
        .filter((p, i) => i !== idx)
        .map((p) => {
          const labels = new Set((p.labels || []).map(normalizeLabel));
          let score = 0;
          labels.forEach((l) => {
            if (currentLabels.has(l)) score += 1;
          });
          return score > 0 ? { p, score } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => x.p);

      if (related.length === 0) {
        relatedEl.innerHTML = `<p class="related-empty">Belum ada tulisan terkait.</p>`;
        return;
      }

      relatedEl.innerHTML = related
        .map((p) => {
          const href = escapeHtml(String(p.url || "").replace(/^\.\.\//, "../"));
          const title = escapeHtml(p.title || "");
          const meta = escapeHtml((p.date || "").replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3-$2-$1"));
          const excerpt = escapeHtml(p.excerpt || "");
          return `
            <div class="article-card">
              <h3><a href="${href}">${title}</a></h3>
              <p class="meta">${meta}</p>
              <p class="excerpt">${excerpt}</p>
            </div>
          `;
        })
        .join("");
    })
    .catch(() => {
      // no-op
    });
})();
