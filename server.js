const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'budget.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS budget_data (
    user_id    INTEGER PRIMARY KEY,
    data       TEXT NOT NULL DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: DATA_DIR }),
  secret: process.env.SESSION_SECRET || 'промени-тази-тайна-в-продукция',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

function auth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Не си влязъл в профила.' });
  next();
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Попълни всички полета.' });
  if (username.trim().length < 2) return res.status(400).json({ error: 'Името трябва да е поне 2 знака.' });
  if (password.length < 4) return res.status(400).json({ error: 'Паролата трябва да е поне 4 знака.' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const r = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username.trim(), hash);
    req.session.userId = r.lastInsertRowid;
    req.session.username = username.trim();
    res.json({ ok: true, username: username.trim() });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Това потребителско име вече е заето.' });
    res.status(500).json({ error: 'Грешка при регистрация.' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Попълни всички полета.' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Грешно потребителско име или парола.' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'not logged in' });
  res.json({ userId: req.session.userId, username: req.session.username });
});

app.get('/api/data', auth, (req, res) => {
  const row = db.prepare('SELECT data FROM budget_data WHERE user_id = ?').get(req.session.userId);
  res.json(row ? JSON.parse(row.data) : {});
});

app.put('/api/data', auth, (req, res) => {
  db.prepare(`
    INSERT INTO budget_data (user_id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(req.session.userId, JSON.stringify(req.body));
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Сървърът работи на порт ${PORT}`));
