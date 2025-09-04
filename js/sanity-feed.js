/**
 * Minimal Sanity → static HTML integration (no React/Next/TS).
 * Подключай до своего script.js
 */

const PROJECT_ID  = "9zb8j7xw";
const DATASET     = "production";
const API_VERSION = "2025-08-27";
const API_BASE = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}`;

/* ---------- helpers ---------- */
function qUrl(groq){ return `${API_BASE}?query=${encodeURIComponent(groq)}`; }

function withParams(rawUrl, params = {}) {
  if (!rawUrl) return "";
  const u = new URL(rawUrl);
  if (!("auto" in params)) u.searchParams.set("auto", "format");
  if (!("q" in params))    u.searchParams.set("q", "90");
  for (const [k,v] of Object.entries(params)) u.searchParams.set(k, String(v));
  return u.toString();
}

function buildSrcset(rawUrl, widths=[800,1200,1600,2000,2400,3000,3600]) {
  return widths.map(w=>`${withParams(rawUrl,{w})} ${w}w`).join(", ");
}

function imgUrl(rawUrl, { w=1200, fit="max", auto="format" } = {}) {
  if (!rawUrl) return "";
  const u = new URL(rawUrl);
  u.searchParams.set("w", String(w));
  u.searchParams.set("fit", fit);
  u.searchParams.set("auto", auto);
  return u.toString();
}

async function fetchGroq(groq){
  const res = await fetch(qUrl(groq));
  if (!res.ok) throw new Error(`Sanity HTTP ${res.status}`);
  const json = await res.json();
  return json.result;
}

function el(html){
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* ---------- global loader ---------- */
let __loaderCount = 0;
function ensureOverlay(){
  if (document.querySelector(".loader-overlay")) return;
  const overlay = document.createElement("div");
  overlay.className = "loader-overlay";
  overlay.innerHTML = `
    <div class="loader" role="status" aria-live="polite" aria-label="Загрузка">
      <span class="loader__circle"></span>
    </div>`;
  document.body.appendChild(overlay);
}
function removeOverlay(){ const o = document.querySelector(".loader-overlay"); if (o) o.remove(); }
function beginLoad(){ if (++__loaderCount === 1) ensureOverlay(); }
function endLoad(){ if (__loaderCount>0 && --__loaderCount===0) removeOverlay(); }
async function fetchGroqTracked(groq){ beginLoad(); try { return await fetchGroq(groq); } finally { endLoad(); } }

/* =====================
   1) INDEX: Hero slider
   ===================== */
async function initHero() {
  const wrapper = document.querySelector(".swiper .swiper-wrapper");
  if (!wrapper) return;

  const GROQ = `*[_type=="home"][0]{ slides[]{ "src": image.asset->url, alt, caption } }`;

  try {
    const home = await fetchGroqTracked(GROQ);
    if (!home?.slides?.length) return;

    wrapper.innerHTML = "";

    const dpr   = Math.min(window.devicePixelRatio || 1, 3);
    const needW = Math.ceil(window.innerWidth  * dpr);
    const needH = Math.ceil(window.innerHeight * dpr);

    // доминирующее измерение: портрет — высота, ландшафт — ширина
    const common = { q: 90, fit: "max", auto: "format" };
    const heroParams = needH >= needW ? { ...common, h: needH } : { ...common, w: needW };

    for (const s of home.slides) {
      const src = withParams(s.src, heroParams);
      const slide = el(`
        <div class="swiper-slide">
          <img src="${src}" alt="${s.alt || ""}" fetchpriority="high" decoding="async">
          ${s.caption ? `<div class="slide-caption">${s.caption}</div>` : ""}
        </div>
      `);
      wrapper.appendChild(slide);
    }

    const count = wrapper.querySelectorAll(".swiper-slide").length;
    if (window.swiper && typeof window.swiper.destroy === "function") {
      try { window.swiper.destroy(true, true); } catch {}
      window.swiper = null;
    }
    if (count > 0 && window.Swiper) {
      window.swiper = new Swiper(".swiper", {
        loop: count > 1,
        speed: 500,
        autoplay: count > 1 ? { delay: 3000, disableOnInteraction: false } : false,
        effect: "slide",
        observer: true,
        observeParents: true,
      });
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
    title, "slug": slug.current, "cover": cover.asset->url, "count": count(gallery)
  }`;

  try {
    const items = await fetchGroqTracked(GROQ);
    if (!items?.length) return;
    container.innerHTML = "";

    for (const a of items) {
      const href   = `album.html?slug=${encodeURIComponent(a.slug)}`;
      const cover  = withParams(a.cover, { w: 1400, q: 90, fit: "max" });
      const srcset = buildSrcset(a.cover, [600, 900, 1200, 1600, 2000]);
      const sizes  = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

      const card = el(`
        <div class="portfolio-item__container-item">
          <h1 class="portfolio-title">${a.title || ""}</h1>
          <div class="portfolio-item">
            <a href="${href}" class="portfolio-item__link">
              <img src="${cover}" srcset="${srcset}" sizes="${sizes}" alt="${a.title || "album"}" loading="lazy">
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

  const titleEl = document.getElementById("album-title");
  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) { grid.innerHTML = "<p>Не указан slug альбома (?slug=...)</p>"; return; }

  const GROQ = `*[_type=="album" && slug.current==$slug][0]{
    title, gallery[]{ "src": asset->url, alt }
  }`;

  try {
    const query = GROQ.replace("$slug", `'${slug.replace(/'/g, "\\'")}'`);
    const album = await fetchGroqTracked(query);

    if (album?.title) { if (titleEl) titleEl.textContent = album.title; document.title = album.title; }

    if (!album?.gallery?.length) {
      grid.classList.add('is-empty');
      grid.innerHTML = `<div class="empty-album" role="status" aria-live="polite">В этом альбоме пока нет фото :(</div>`;
      return;
    }
    grid.classList.remove('is-empty');

    grid.innerHTML = "";
    for (const ph of album.gallery) {
      const src    = withParams(ph.src, { w: 1600, q: 90, fit: "max" });
      const srcset = buildSrcset(ph.src, [600, 900, 1200, 1600, 2400]);
      const sizes  = "(max-width: 768px) 100vw, 1200px";
      const item = el(`
        <figure class="album-photo">
          <img src="${src}" srcset="${srcset}" sizes="${sizes}" alt="${ph.alt || ""}" loading="lazy">
        </figure>
      `);
      grid.appendChild(item);
    }
  } catch (e) {
    console.error("Album init failed:", e);
    grid.innerHTML = "<p style='color:#c33;text-align:center;padding:24px'>Ошибка загрузки альбома. Попробуйте обновить страницу.</p>";
  }
}

/* =======================
   4) SOCIALS + MODAL (раздельно!)
   ======================= */

// A) Соцсети из отдельного singleton-документа 'socials'
async function initSocialLinksFromSanity() {
  const GROQ = `coalesce(*[_id=="socials"][0], *[_type=="socials"][0]){ vkUrl, instagramUrl, telegramUrl }`;
  try {
    const data = await fetchGroqTracked(GROQ);
    if (!data) return;

    const norm = (v) => (typeof v === 'string' ? v.trim() : '');
    const map = { VK: norm(data.vkUrl), Instagram: norm(data.instagramUrl), Telegram: norm(data.telegramUrl) };

    for (const [label, url] of Object.entries(map)) {
      document.querySelectorAll(`a[aria-label="${label}"]`).forEach((a) => {
        if (url) {
          // если задано в Sanity — переопределяем
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.classList.remove("is-disabled");
          a.removeAttribute("aria-disabled");
          a.tabIndex = 0;
        } else {
          // если в Sanity пусто — НЕ ломаем дефолт из HTML
          if (!a.getAttribute('href')) {
            a.classList.add("is-disabled");
            a.setAttribute("aria-disabled", "true");
            a.tabIndex = -1;
          }
        }
      });
    }
  } catch (e) {
    console.error("Socials init failed:", e);
  }
}

// B) Модалка из singleton-документа 'settings'
async function initModalFromSanity() {
  const imgDesktop = document.querySelector('[data-sanity-modal-img="desktop"]');
  const imgMobile  = document.querySelector('[data-sanity-modal-img="mobile"]');
  const titleEl    = document.querySelector('[data-sanity-modal-title]');
  const textEl     = document.querySelector('[data-sanity-modal-text]');

  const GROQ = `coalesce(*[_id=="settings"][0], *[_type=="settings"][0]){
    "desktop": modalImage.asset->url,
    "mobile":  modalImageMobile.asset->url,
    modalAlt, modalTitle, modalText
  }`;

  try {
    const data = await fetchGroqTracked(GROQ);
    if (!data) return;

    const applyImg = (el, url) => {
      if (!el || !url) return;
      const base   = withParams(url, { w: 1200, q: 90, auto: "format" });
      const srcset = buildSrcset(url, [600, 900, 1200, 1600, 2000]);
      el.src = base; el.srcset = srcset; el.sizes = "(max-width: 768px) 100vw, 600px";
      if (data.modalAlt) el.alt = data.modalAlt;
    };

    applyImg(imgDesktop, data.desktop);
    applyImg(imgMobile,  data.mobile);
    if (titleEl && data.modalTitle) titleEl.textContent = data.modalTitle;
    if (textEl  && data.modalText)  textEl.textContent  = data.modalText;
  } catch (e) {
    console.error("Modal init failed:", e);
  }
}

/* ---------- entry ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initHero();
  initPortfolio();
  initAlbumPage();
  initSocialLinksFromSanity(); // ссылки отдельно
  initModalFromSanity();       // модалка отдельно
});