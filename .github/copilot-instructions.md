## Коротко для AI-агентов — что важно знать

Это минимальный статический сайт (HTML/CSS/vanilla JS) — фотопортфолио с динамическими фрагментами, загружаемыми напрямую из Sanity CMS по GROQ через публичный CDN API. В проекте нет сборщика (Webpack/Vite) и нет серверной части — правки обычно затрагивают HTML-шаблоны и простые JS-модули в `js/`.

### Большая картина / архитектура
- Статические страницы: `index.html`, `portfolio.html`, `album.html`, `contacts.html` — простая навигация между ними.
- Динамика и данные: `js/sanity-feed.js` делает GROQ-запросы к Sanity через apicdn.sanity.io и наполняет DOM (hero slides, список альбомов, фото по slug, соцсети, модал).
- UI/Behaviour: `js/contacts-modal.js` управляет локальной модалкой контактов. `js/script.js` намеренно пуст — комментарий в нём: Swiper инициализируется в `sanity-feed.js`.
- Слайдер: библиотека Swiper подключена как локальные бандлы (`css/swiper-bundle.min.css`, `js/swiper-bundle.min.js`) — package.json также содержит зависимость `swiper`, но сайт использует локальные файлы.

### Ключевые файлы и примеры паттернов
- `js/sanity-feed.js` — главный файл для интеграции с Sanity.
  - Константы: `PROJECT_ID`, `DATASET`, `API_VERSION`, `API_BASE` — меняй аккуратно при смене проекта/датасета.
  - Функция `fetchGroq(groq)` и её обёртка `fetchGroqTracked` (показывает/скрывает глобальный лоадер). Использует apicdn с query параметром `query=`.
  - Хелперы для изображений: `withParams`, `buildSrcset`, `imgUrl` — важно использовать их при вставке картинок (оптимизация размеров, srcset).
  - Инициализация компонентов: `initHero()`, `initPortfolio()`, `initAlbumPage()`, `initSocialLinksFromSanity()`, `initModalFromSanity()` — запускаются на DOMContentLoaded.

- DOM-анкеры, на которые опирается код (не менять без обновления JS):
  - Слайдер: `.swiper .swiper-wrapper`
  - Альбом: `#album-photos`, `#album-title`
  - Модал контактов: `#contactsModal`, кнопка открытия `#openContactsBtn`, кнопка закрытия `#closeContactsBtn`
  - data-атрибуты для модалки/изображений: `data-sanity-modal-img="desktop"`, `data-sanity-modal-img="mobile"`, `data-sanity-modal-title`, `data-sanity-modal-text`

### Порядок загрузки скриптов (важно)
В `index.html` скрипты подключаются с `defer` в таком порядке: `swiper-bundle.min.js`, `sanity-feed.js`, `script.js`, `contacts-modal.js`. Не меняй порядок: `sanity-feed.js` инициализирует Swiper и вставляет контент, `script.js` оставлен пустым нарочно.

### Конвенции и заметки по изменению
- Минимализм: избегай добавления сборщиков или трансформеров без явного задания — проект статический.
- Accessibility: модалка и навигация использует aria-атрибуты — сохраняй их или обновляй параллельно с функционалом.
- Избегай двойной инициализации Swiper — код в `sanity-feed.js` уничтожает предыдущий инстанс, проверяет `window.swiper`.
- Social links: `initSocialLinksFromSanity()` сначала берёт singleton-документ с _id == 'socials' (или first `_type=='socials'`) и затем переопределяет href в HTML только если данные есть — см. селекторы `a[aria-label="VK"]`, `Instagram`, `Telegram`.

### Интеграция с Sanity (как добавлять поля)
- GROQ-запросы встроены в `sanity-feed.js`. Пример: `*[_type=="album"] | order(coalesce(order, 9999) asc){ title, "slug": slug.current, "cover": cover.asset->url, "count": count(gallery) }`.
- Если добавляете новые поля в CMS, обновите соответствующий GROQ и затем код, где используется ответ (проверьте наличие ключей перед доступом).

### Как локально запускать/проверять
- Это статический сайт — для корректной работы CORS/URL API рекомендуем использовать простой http-сервер. Примеры команд (macOS/zsh):

```bash
# если хотите установить локально node-зависимости (не обязательно, потому что бандлы локальны)
npm install

# легкий static server (если установлен http-server):
npx http-server -c-1 . -p 8080

# или использовать Python 3 встроенный сервер:
python3 -m http.server 8080
```

Откройте http://localhost:8080/index.html для тестов.

### Частые правки и примеры
- Добавить новый текст в модалку: редактировать HTML шаблон модалки в `index.html` и/или обновить `initModalFromSanity()` чтобы подставлять новые поля.
- Добавить новое изображение в альбом: Sanity должен отдавать `gallery[].asset->url`; в `initAlbumPage()` используется `withParams` + `buildSrcset` — следуйте тому же шаблону.
- Добавить новый раздел данных: создайте GROQ, используйте `fetchGroqTracked` и помните про лоадер и обработку ошибок (логирование через console.error).

### Do / Don't (коротко)
- DO: Проверять DOM-анкеры, порядок скриптов и существование полей в ответе Sanity перед использованием.
- DO: Использовать `withParams`/`buildSrcset` для изображений вместо прямого вставления url.
- DON'T: Добавлять глобальные CSS/JS изменения без проверки влияния на модалку и слайдер.

Если что-то в инструкции непонятно или не хватает информации о workflow (например: деплой, CI, кастомные команды), напишите — добавлю примеры и команды. Готов уточнить и сократить/расширить разделы по вашему запросу.
