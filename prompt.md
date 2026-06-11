Build a PWA (Progressive Web App) personal budget tracker in Bulgarian language
with GitHub Gist as the backend storage for a single user.

## Stack
- Vanilla HTML + CSS + JS (no frameworks)
- GitHub Gist REST API for cloud persistence
- localStorage as offline cache / fallback
- Service Worker for offline support
- Web App Manifest for installability

## File structure
budget-app/
├── index.html
├── manifest.json
├── sw.js
└── icons/
    ├── icon-192.png
    └── icon-512.png

---

## GitHub Gist sync

### How it works
- All budget data is stored in a single Gist as one JSON file: `budget.json`
- The app reads and writes this file via the GitHub Gist REST API
- localStorage is used as an offline cache — always written on every save
- On app load: fetch from Gist first, fall back to localStorage if offline
- On every save: write to localStorage immediately, then sync to Gist async

### Gist JSON structure
{
  "2026_3": {
    "income": 800,
    "expenses": [...],
    "notes": "Бележки за март"
  },
  "2026_4": {
    "income": 800,
    "expenses": [...],
    "notes": ""
  }
}

### GitHub API calls

GET (load all data):
fetch(`https://api.github.com/gists/${GIST_ID}`, {
  headers: {
    'Authorization': `token ${TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  }
})
→ response.data.files['budget.json'].content → JSON.parse()

PATCH (save all data):
fetch(`https://api.github.com/gists/${GIST_ID}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `token ${TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    files: {
      'budget.json': {
        content: JSON.stringify(allData, null, 2)
      }
    }
  })
})

### Sync status indicator (top right of header)
- ☁️ Synced — last sync time (e.g. "☁️ 14:32")
- 🔄 Syncing... — during API call (spinning or pulsing)
- 📴 Offline — when navigator.onLine is false
- ⚠️ Sync error — on API failure, with retry button

### Conflict strategy
Last-write-wins. Single user, no conflict resolution needed.
Always merge: load full Gist JSON → update only current month key → save full JSON back.
Never overwrite the entire file — always preserve other months.

---

## First launch / Setup screen

On first open, if no TOKEN or GIST_ID in localStorage, show a full-screen setup modal:

### Step 1 — GitHub Token
- Title: "Свържи с GitHub"
- Explanation: "Данните ти ще се пазят в GitHub Gist — безплатно, сигурно, достъпно от всеки телефон."
- Numbered instructions:
  1. Отиди на github.com/settings/tokens
  2. Кликни "Generate new token (classic)"
  3. Дай му име: "Моят Бюджет"
  4. Отметни само: gist
  5. Кликни "Generate token"
  6. Копирай токена и го постави тук
- Input field: "Постави токена тук..." (type=password)
- Button: "Продължи →"
- Validate token on continue: call GET /user with the token
  - Success → proceed to Step 2
  - Failure → show "Невалиден токен, опитай отново" in red

### Step 2 — Create or connect Gist
Two options as cards:

Option A — "Създай нов Gist" (primary, recommended)
- Button calls POST /gists:
  {
    description: "Моят Бюджет — данни",
    public: false,
    files: { "budget.json": { content: "{}" } }
  }
- Saves returned gist.id to localStorage as GIST_ID
- Shows success: "✓ Готово! Gist създаден."

Option B — "Свържи съществуващ Gist"
- Input: "Gist ID или URL"
- Parse Gist ID from URL if full URL is pasted
- Validate by fetching it and checking for budget.json file
- If budget.json missing: offer to create it in that Gist

After setup complete:
- Save TOKEN and GIST_ID to localStorage
- Load data from Gist
- Close modal → show main app
- Show "⚙️ Настройки" button in header to re-open setup later

### Settings modal (accessible anytime from header)
- Shows masked token (last 4 chars visible)
- Shows Gist ID with link to view it on github.com
- "Смени токен" button
- "Изчисти локалните данни" button (with confirmation)
- "Експортирай всичко като JSON" download button

---

## Data model

### Month key
Format: `{year}_{month}` where month is 0-indexed (January = 0)
Example: "2026_4" = May 2026

### Expense object
{
  id: string,          // "e1" or "custom_" + timestamp
  cat: string,         // "fixed" | "health" | "family" | "food" | "other"
  icon: string,        // emoji
  name: string,
  note: string,
  amount: number,
  enabled: boolean
}

### Default expenses (loaded for any new/empty month)
Fixed:
  { id:"e1", cat:"fixed", icon:"⚡", name:"Ток, вода, телефон, ТВ", amount:150, note:"Всеки месец", enabled:true }

Health:
  { id:"e2", cat:"health", icon:"💊", name:"Лекарства", amount:100, note:"Всеки месец", enabled:true }
  { id:"e3", cat:"health", icon:"👁️", name:"Очни манипулации", amount:100, note:"3 месеца поред, после почивка", enabled:true }

Family:
  { id:"e4", cat:"family", icon:"👦", name:"За внука", amount:100, note:"Всеки месец", enabled:true }

Food:
  { id:"e5", cat:"food", icon:"🥩", name:"Месо", amount:60, note:"", enabled:true }
  { id:"e6", cat:"food", icon:"🍎", name:"Плодове и зеленчуци", amount:50, note:"", enabled:true }
  { id:"e7", cat:"food", icon:"🥡", name:"Готови храни", amount:40, note:"Потенциал за намаляване", enabled:true }

Other:
  { id:"e8",  cat:"other", icon:"⚰️", name:"Гробища (цветя + транспорт)", amount:60, note:"2-3 пъти месечно × 30 €", enabled:true }
  { id:"e9",  cat:"other", icon:"👗", name:"Дрехи", amount:0, note:"~100 € на ~3 месеца", enabled:true }
  { id:"e10", cat:"other", icon:"🧴", name:"Домакински консумативи", amount:25, note:"Препарати, тоалетни", enabled:true }
  { id:"e11", cat:"other", icon:"☕", name:"Кафе и малки удоволствия", amount:20, note:"", enabled:true }
  { id:"e12", cat:"other", icon:"🔧", name:"Ремонти / непредвидени", amount:30, note:"Резервен фонд", enabled:true }

---

## UI — Screens

### Bottom navigation (3 tabs)
Tab 1: 💰 Бюджет
Tab 2: 📊 История
Tab 3: 💡 Съвети

---

### Tab 1 — Бюджет

**Sticky header**
- Left: app title "💶 Моят Бюджет"
- Right: sync status indicator + ⚙️ settings button

**Month navigator** (below header title)
- ‹  Март 2026  › 
- Arrows change month, auto-save current before switching

**Hero balance**
- Label: "Остатък за месеца"
- Large number with € sign, Georgia serif font
- Color: green (>80), yellow (0–80), red (negative)
- Subtitle: "{income} € приход − {totalExpenses} € разходи"

**Progress bar**
- Label left: "Разходи"
- Label right: "{pct}%"
- Fill color matches balance color

**3-column summary cards**
- Приход (green) | Разходи (red) | Баланс (gold)

**Status bar**
- 🌟 Отличен месец — balance > 120 €
- ✅ Балансиран — balance 80–120 €
- ⚠️ Много стегнат — balance 0–80 €
- 🚨 Дефицит {amount} € — negative balance

**Income row**
- 🏦 Пенсия | editable number input | €
- Changes trigger immediate recalc + save

**Expense sections** (Fixed → Health → Family → Food → Other)
- Section header: category name (uppercase, gold) + category total (right)
- Each expense row:
  - [emoji] [name] [note below name] [amount input] [€] [checkbox toggle]
  - Disabled rows: grayed out, strikethrough amount, excluded from totals
  - Amount input: borderless, right-aligned, Georgia serif
- "＋ Добави разход" dashed button at bottom of Other section

**Notes textarea**
- Placeholder: "Бележки за месеца..."
- Auto-resize or fixed 70px height

**Auto-save behavior**
- Every input change → save to localStorage immediately
- Debounce 1500ms → sync to Gist
- "✓ Запазено" flash on successful Gist sync

---

### Tab 2 — История

- List of all months found in the full Gist JSON
- Sorted newest first
- Each row: "Март 2026" | "800 € приход · 741 € разходи" | "+59 €" (color-coded)
- Tap on a month → navigate to it in the Бюджет tab
- Empty state: "📭 Все още няма запазени месеци."

---

### Tab 3 — Съвети

Static tip cards, left border accent:

1. 🍽️ (green border) Готови храни → домашно готвене
   "Намали от 40 € на 15-20 €. Домашното готвене е 2-3 пъти по-евтино."
   Badge: "Спестяване: ~20 € / месец = 240 € / год."

2. 📺 (gold border) ТВ и телефон пакет
   "По-малък пакет може да спести 10-15 € без промяна в начина на живот."
   Badge: "Спестяване: ~10-15 € / месец"

3. 👗 (gold border) Дрехи само в леките месеци
   "Планирай дрехи само в месеците БЕЗ очни манипулации."
   Badge: "Контрол на тежките месеци"

4. 🏦 (blue border) Резервен фонд
   "В месеците без очни — прехвърляй 50-100 € настрана."
   Badge: "Цел: 500 € резерв"

5. ⚠️ (red border) Тежките месеци
   "Очни + дрехи + 3× гробища = потенциален дефицит. Следи ги в История."

Summary card at bottom:
  "Сега: ~42 € остатък
   С оптимизация: ~75-80 € остатък
   За 6 месеца: до 400-500 € резерв"

---

## Design system

Colors:
  --bg:        #0e0e0e
  --surface:   #171717
  --card:      #1f1f1f
  --border:    #2a2a2a
  --text:      #e8e4dc
  --muted:     #888888
  --accent:    #c8a84b
  --accent-dim:#7a6228
  --green:     #4caf7d
  --red:       #e06060
  --warn:      #e0a040

Typography:
  - UI: 'Segoe UI', Arial, sans-serif
  - Numbers/financial: Georgia, serif
  - Base size: 14px

Layout:
  - Mobile-first, max-width 480px centered on desktop
  - Bottom nav: fixed, 56px height + safe-area-inset-bottom
  - Sticky header: ~90px
  - All content padded 16px horizontal
  - Card border-radius: 12px
  - Min tap target: 44px

---

## PWA manifest (manifest.json)
{
  "name": "Моят Бюджет",
  "short_name": "Бюджет",
  "description": "Личен бюджетен тракер",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0e0e0e",
  "theme_color": "#c8a84b",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}

## iOS meta tags (in index.html <head>)
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Бюджет">
<link rel="apple-touch-icon" href="icons/icon-192.png">

---

## Service Worker (sw.js)

Strategy: Cache-first with network fallback
Cache name: "budget-v1"
Files to cache on install: ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

On fetch:
  - Match cache first
  - If not in cache: fetch from network, cache the response, return it
  - If network fails and not in cache: return offline fallback

On activate:
  - Delete old cache versions (any cache name !== "budget-v1")

Register in index.html:
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}

---

## Generate icons programmatically

Since no PNG files exist yet, generate them using Canvas API in a
build script (generate-icons.js) that creates icon-192.png and icon-512.png:
- Dark background: #0e0e0e
- Gold circle or rounded square
- "€" symbol centered in Georgia serif, color #c8a84b
- Save as PNG using canvas.toBuffer()

Run with: node generate-icons.js

---

## Error handling

- GitHub API rate limit (403): show "Лимит на заявките. Опитай след малко."
- Network offline: show 📴 badge, work from localStorage, queue sync for when online
- Invalid token (401): show setup modal again with "Токенът е изтекъл или невалиден"
- Gist not found (404): show "Gist не е намерен. Провери ID-то в настройките."
- All errors: non-blocking toast notification at top, auto-dismiss 4 seconds

---

## Deployment target
- GitHub Pages (recommended): repo name = budget-app → available at https://{username}.github.io/budget-app/
- All asset paths must be relative
- No build step required — pure static files