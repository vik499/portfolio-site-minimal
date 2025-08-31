/**
 * Minimal Sanity → static HTML integration (no React/Next/TS).
 * Usage:
 *  1) Put this file at /js/sanity-feed.js
 *  2) In <head> of each page, add (BEFORE your /js/script.js Swiper init):
 *     <script defer src="/js/sanity-feed.js"></script>
 *  3) Set PROJECT_ID and DATASET below.
 *  4) Make sure your dataset is public for read, and documents are published.
 */

const PROJECT_ID  = "9zb8j7xw";   // ← твой projectId
const DATASET     = "production";  // ← или твой dataset
const API_VERSION = "2025-08-27";

const API_BASE = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}`;

/** Build query URL */
function qUrl(groq) {
  return `${API_BASE}?query=${encodeURIComponent(groq)}`;
}

/** Add/override URL params for Sanity image CDN */
function withParams(rawUrl, params = {}) {
  if (!rawUrl) return "";
  const u = new URL(rawUrl);
  // дефолты: автоформат + повышенное качество
  if (!("auto" in params)) u.searchParams.set("auto", "format");
  if (!("q" in params))    u.searchParams.set("q", "90");
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/** Build a responsive srcset string (широкий ряд ширин для ретины/4К) */
function buildSrcset(rawUrl, widths = [800, 1200, 1600, 2000, 2400, 3000, 3600]) {
  return widths
    .map((w) => `${withParams(rawUrl, { w })} ${w}w`)
    .join(", ");
}


/** Legacy helper kept for internal use (single size) */
function imgUrl(rawUrl, { w = 1200, fit = "max", auto = "format" } = {}) {
  if (!rawUrl) return "";
  const url = new URL(rawUrl);
  url.searchParams.set("w", String(w));
  url.searchParams.set("fit", fit);
  url.searchParams.set("auto", auto);
  return url.toString();
}

/** Fetch GROQ result */
async function fetchGroq(groq) {
  const res = await fetch(qUrl(groq));
  if (!res.ok) throw new Error(`Sanity HTTP ${res.status}`);
  const json = await res.json();
  return json.result;
}

/** Render helpers */
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* =====================
   1) INDEX: Hero slider
   ===================== */
async function initHero() {
  const wrapper = document.querySelector(".swiper .swiper-wrapper");
  if (!wrapper) return;

  // Expect a singleton document "home" with slides[]
  const GROQ = `*[_type=="home"][0]{
    slides[]{
      "src": image.asset->url,
      alt,
      caption
    }
  }`;

  try {
    const home = await fetchGroq(GROQ);
    if (!home || !home.slides || !home.slides.length) return;

    // Clear static slides
    wrapper.innerHTML = "";

    for (const s of home.slides) {
     const src    = withParams(s.src, { w: 1600 }); // базовый фолбэк
const srcset = buildSrcset(s.src, [800, 1200, 1600, 2000, 2400, 3000, 3600]);
const sizes  = "100vw"; // слайд тянется на всю ширину экрана

const slide = el(`
  <div class="swiper-slide">
    <img
      src="${src}"
      srcset="${srcset}"
      sizes="${sizes}"
      alt="${s.alt || ""}"
      loading="lazy"
    >
    ${s.caption ? `<div class="slide-caption">${s.caption}</div>` : ""}
  </div>
`);

      wrapper.appendChild(slide);
    }

    // If Swiper already initialized elsewhere, attempt an update
    if (window && window.swiper) {
      try { window.swiper.update(); } catch {}
    }
    // Otherwise, try to initialize if available and not already initialized
    if (window && window.Swiper && !document.querySelector(".swiper.swiper-initialized")) {
      try {
        window.swiper = new Swiper(".swiper", {
          loop: true,
          speed: 500,
          autoplay: { delay: 3000, disableOnInteraction: false },
          effect: "slide",
        });
      } catch {}
    }
  } catch (e) {
    console.error("Hero init failed:", e);
  }
}

/* =========================
   2) PORTFOLIO: Albums list
   ========================= */
async function initPortfolio() {
  const container = document.querySelector(".portfolio-grid__container");
  if (!container) return;

  const GROQ = `*[_type=="album"] | order(coalesce(order, 9999) asc){
    title,
    "slug": slug.current,
    "cover": cover.asset->url,
    "count": count(gallery)
  }`;

  try {
    const items = await fetchGroq(GROQ);
    if (!items || !items.length) return;
    container.innerHTML = "";

    for (const a of items) {
      const href   = `album.html?slug=${encodeURIComponent(a.slug)}`;
const cover  = withParams(a.cover, { w: 1200 });
const srcset = buildSrcset(a.cover, [400, 800, 1200, 1600, 2000]);
const sizes  = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";


      const card = el(`
        <div class="portfolio-item__container-item">
          <h1 class="portfolio-title">${a.title || ""}</h1>
          <div class="portfolio-item">
            <a href="${href}" class="portfolio-item__link">
              <img
                src="${cover}"
                srcset="${srcset}"
                sizes="${sizes}"
                alt="${a.title || "album"}"
                loading="lazy"
              >
            </a>
          </div>
        </div>
      `);
      container.appendChild(card);
    }
  } catch (e) {
    console.error("Portfolio init failed:", e);
  }
}

/* =======================
   3) ALBUM: Photos by slug
   ======================= */
async function initAlbumPage() {
  const grid = document.querySelector("#album-photos");
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  if (!slug) {
    grid.innerHTML = "<p>Не указан slug альбома (?slug=...)</p>";
    return;
  }

  const GROQ = `*[_type=="album" && slug.current==$slug][0]{
    title,
    gallery[]{
      "src": asset->url,
      alt
    }
  }`;

  try {
    // Param interpolation via string replace (since using HTTP GET without variables)
    const safeSlug = slug.replace(/'/g, "\\'");
    const query = GROQ.replace("$slug", `'${safeSlug}'`);
    const album = await fetchGroq(query);
    const titleEl = document.getElementById("album-title");

    if (album?.title) {
      if (titleEl) titleEl.textContent = album.title;
      document.title = album.title;
    }
    if (!album?.gallery?.length) {
      grid.innerHTML = "<p>В этом альбоме пока нет фото.</p>";
      return;
    }

    grid.innerHTML = "";
    for (const ph of album.gallery) {
const src    = withParams(ph.src, { w: 1600 });
const srcset = buildSrcset(ph.src, [800, 1200, 1600, 2000, 2400, 3000]);
const sizes  = "(max-width: 768px) 100vw, 1200px";


      const item = el(`
        <figure class="album-photo">
          <img
            src="${src}"
            srcset="${srcset}"
            sizes="${sizes}"
            alt="${ph.alt || ""}"
            loading="lazy"
          >
        </figure>
      `);
      grid.appendChild(item);
    }
  } catch (e) {
    console.error("Album init failed:", e);
    grid.innerHTML = "<p>Ошибка загрузки альбома.</p>";
  }
}

/* Entry */
document.addEventListener("DOMContentLoaded", () => {
  initHero();
  initPortfolio();
  initAlbumPage();
});
