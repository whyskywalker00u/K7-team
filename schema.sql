-- K7 ESPORTS Supabase Schema (optional migration target)
-- Run this in Supabase SQL Editor after creating a project.

-- Team settings (single row)
CREATE TABLE IF NOT EXISTS team_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  team_name TEXT NOT NULL DEFAULT 'K7 ESPORTS',
  tagline TEXT DEFAULT 'MORE THAN JUST A TEAM',
  description_ru TEXT,
  description_en TEXT,
  region TEXT DEFAULT 'CIS',
  default_lang TEXT DEFAULT 'ru',
  theme TEXT DEFAULT 'black-red',
  dark_mode BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO team_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  role TEXT,
  rating TEXT,
  photo_url TEXT,
  visible BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Team stats (Rating 3.0, Winrate, etc.)
CREATE TABLE IF NOT EXISTS team_stats (
  id TEXT PRIMARY KEY,
  label_ru TEXT,
  label_en TEXT,
  value TEXT NOT NULL,
  visible BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  decimals INT DEFAULT 2
);

INSERT INTO team_stats (id, label_ru, label_en, value, sort_order) VALUES
  ('rating', 'Rating 3.0', 'Rating 3.0', '1.14', 1),
  ('winrate', 'Winrate', 'Winrate', '68%', 2),
  ('entrying', 'Entrying', 'Entrying', '1.09', 3),
  ('utility', 'Utility', 'Utility', '4.1', 4)
ON CONFLICT DO NOTHING;

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament TEXT,
  opponent TEXT,
  match_date TEXT,
  score TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- News
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  cover_url TEXT,
  published_at TEXT,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Highlights
CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT,
  cover_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Social links
CREATE TABLE IF NOT EXISTS socials (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  telegram TEXT,
  tiktok TEXT,
  twitch TEXT,
  steam TEXT
);

INSERT INTO socials (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE socials ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read settings" ON team_settings FOR SELECT USING (true);
CREATE POLICY "Public read players" ON players FOR SELECT USING (visible = true);
CREATE POLICY "Public read stats" ON team_stats FOR SELECT USING (visible = true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read news" ON news FOR SELECT USING (visible = true);
CREATE POLICY "Public read highlights" ON highlights FOR SELECT USING (true);
CREATE POLICY "Public read socials" ON socials FOR SELECT USING (true);

-- Write only via service role / server (no public write policies)
