/**
 * K7 ESPORTS Backend
 * Simple Express server for shared data + secure admin auth.
 * Data is stored in a JSON file (works for development).
 * On Render free tier the filesystem is ephemeral — data resets on restart.
 * For production persistence use Supabase (see supabase/ folder and README).
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-k7-secret-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'alskdjfhG10';
const DATA_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure directories exist
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Default data structure
const defaultData = {
  settings: {
    teamName: 'K7 ESPORTS',
    tagline: 'MORE THAN JUST A TEAM',
    description: {
      ru: 'Профессиональный состав по Counter-Strike 2. Дисциплина, стратегия и воля к победе.',
      en: 'Professional Counter-Strike 2 roster. Discipline, strategy and the will to win.'
    },
    region: 'CIS',
    defaultLang: 'ru',
    theme: 'black-red', // black-red | white-red | black-yellow | black-blue
    darkMode: true
  },
  players: [
    { id: '1', nickname: 'Player1', role: 'IGL', rating: '1.15', photo: '', visible: true, order: 1, stats: {} },
    { id: '2', nickname: 'Player2', role: 'AWPER', rating: '1.22', photo: '', visible: true, order: 2, stats: {} },
    { id: '3', nickname: 'Player3', role: 'RIFLER', rating: '1.08', photo: '', visible: true, order: 3, stats: {} },
    { id: '4', nickname: 'Player4', role: 'SUPPORT', rating: '1.05', photo: '', visible: true, order: 4, stats: {} },
    { id: '5', nickname: 'Player5', role: 'ENTRY FRAGGER', rating: '1.18', photo: '', visible: true, order: 5, stats: {} }
  ],
  teamStats: [
    { id: 'rating', label: { ru: 'Rating 3.0', en: 'Rating 3.0' }, value: '1.14', visible: true, order: 1, decimals: 2 },
    { id: 'winrate', label: { ru: 'Winrate', en: 'Winrate' }, value: '68%', visible: true, order: 2, decimals: 0 },
    { id: 'entrying', label: { ru: 'Entrying', en: 'Entrying' }, value: '1.09', visible: true, order: 3, decimals: 2 },
    { id: 'utility', label: { ru: 'Utility', en: 'Utility' }, value: '4.1', visible: true, order: 4, decimals: 1 }
  ],
  matches: [],
  news: [],
  highlights: [],
  socials: {
    telegram: '',
    tiktok: '',
    twitch: '',
    steam: ''
  },
  ratingHistory: [] // for chart: [{date, value}]
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return { ...defaultData, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading data:', e.message);
  }
  return structuredClone(defaultData);
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving data:', e.message);
    return false;
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Rate limit simple in-memory
const loginAttempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < 15 * 60 * 1000); // 15 min
  if (recent.length >= 8) return false;
  recent.push(now);
  loginAttempts.set(ip, recent);
  return true;
}

// ============ PUBLIC API ============

app.get('/api/data', (req, res) => {
  const data = loadData();
  // Return only public fields
  res.json({
    settings: data.settings,
    players: data.players.filter(p => p.visible).sort((a, b) => a.order - b.order),
    teamStats: data.teamStats.filter(s => s.visible).sort((a, b) => a.order - b.order),
    matches: data.matches.slice(0, 20),
    news: data.news.slice(0, 10),
    highlights: data.highlights.slice(0, 10),
    socials: data.socials,
    ratingHistory: data.ratingHistory
  });
});

// ============ AUTH ============

app.post('/api/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = jwt.sign({ role: 'admin', ts: Date.now() }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, expiresIn: 12 * 3600 });
});

// ============ PROTECTED ADMIN API ============

app.get('/api/admin/data', authMiddleware, (req, res) => {
  res.json(loadData());
});

app.put('/api/admin/settings', authMiddleware, (req, res) => {
  const data = loadData();
  data.settings = { ...data.settings, ...req.body };
  if (saveData(data)) {
    res.json({ success: true, settings: data.settings });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.put('/api/admin/players', authMiddleware, (req, res) => {
  const data = loadData();
  data.players = req.body;
  if (saveData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.put('/api/admin/team-stats', authMiddleware, (req, res) => {
  const data = loadData();
  data.teamStats = req.body;
  if (saveData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.put('/api/admin/matches', authMiddleware, (req, res) => {
  const data = loadData();
  data.matches = req.body;
  if (saveData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.put('/api/admin/news', authMiddleware, (req, res) => {
  const data = loadData();
  data.news = req.body;
  if (saveData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.put('/api/admin/highlights', authMiddleware, (req, res) => {
  const data = loadData();
  data.highlights = req.body;
  if (saveData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.put('/api/admin/socials', authMiddleware, (req, res) => {
  const data = loadData();
  data.socials = { ...data.socials, ...req.body };
  if (saveData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.put('/api/admin/rating-history', authMiddleware, (req, res) => {
  const data = loadData();
  data.ratingHistory = req.body;
  if (saveData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

app.post('/api/admin/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

// Fallback to index.html for SPA-like behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`K7 ESPORTS server running on port ${PORT}`);
  // Ensure default data exists
  if (!fs.existsSync(DATA_FILE)) {
    saveData(defaultData);
    console.log('Initialized default data');
  }
});
