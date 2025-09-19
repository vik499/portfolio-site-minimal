# Portfolio site — Natalia Mazina

Статический сайт-портфолио фотографа.  
Сайт получает контент (альбомы, фото, модальное окно, соц.сети) из **Sanity CMS** и отображает его на страницах.  
Развёрнут на **GitHub Pages** + подключен кастомный домен.

---

## 🚀 Технологии

- HTML5, CSS3 (адаптив, сетки, модалка, анимации)
- JavaScript (ES6+)
- [Sanity.io](https://www.sanity.io/) — headless CMS, хранение альбомов/фото/контента
- GROQ — язык запросов к данным Sanity
- GitHub Pages — бесплатный хостинг
- Кастомный домен: `nataliamazina.ru`

---

## 📂 Структура проекта

project-root/
│
├── index.html # Главная страница
├── portfolio.html # Каталог альбомов
├── album.html # Страница конкретного альбома
├── contacts.html # Страница с контактами (если используется отдельно)
│
├── css/
│ ├── styles.css # Базовые стили
│ └── media.css # Адаптив
│
├── js/
│ ├── sanity-feed.js # "Мост" к Sanity (GROQ-запросы + рендеринг)
│ ├── contacts-modal.js # Логика модального окна
│ └── ...
│
├── img/ # Локальные картинки (логотип, иконки)
├── README.md
└── CNAME # Указывает на кастомный домен для GitHub Pages

---

## 🔗 Связь с Sanity

Сайт получает данные через публичный CDN Sanity:

- `sanity-feed.js` — формирует **GROQ-запросы** и делает `fetch`:
  - `initPortfolio()` — список альбомов на главной и portfolio.html
  - `initAlbumPage()` — фотографии конкретного альбома
  - `initHero()` — слайдер (если включён)
  - `initModalFromSanity()` — модальное окно «Контакты»
  - `initSocialLinksFromSanity()` — соц.сети в футере/хедере

### Пример GROQ-запроса
```groq
*[_type == "album"]{
  _id,
  title,
  slug,
  cover{asset->{url, metadata{dimensions}}}
}