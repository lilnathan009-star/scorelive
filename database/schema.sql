-- =============================================
-- SCORELIVE - PostgreSQL Schema
-- =============================================

-- Participantes
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(100) NOT NULL UNIQUE,
  initials VARCHAR(5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Torneos
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Partidos
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  home_score INTEGER DEFAULT NULL,
  away_score INTEGER DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending | live | finished
  match_date TIMESTAMP,
  phase VARCHAR(30) DEFAULT 'group', -- group | r16 | quarters | semis | final
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pronósticos de partidos (resultado exacto)
CREATE TABLE IF NOT EXISTS match_predictions (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  calculated_at TIMESTAMP,
  UNIQUE(match_id, user_id)
);

-- Pronósticos fase de grupos (clasificados)
CREATE TABLE IF NOT EXISTS group_predictions (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_name VARCHAR(5) NOT NULL, -- A, B, C...
  team1 VARCHAR(100) NOT NULL,
  team2 VARCHAR(100) NOT NULL,
  third_team VARCHAR(100) DEFAULT NULL, -- mejor tercero (opcional)
  points INTEGER DEFAULT 0,
  calculated_at TIMESTAMP,
  UNIQUE(tournament_id, user_id, group_name)
);

-- Clasificados reales por grupo (los que realmente pasaron)
CREATE TABLE IF NOT EXISTS group_results (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  group_name VARCHAR(5) NOT NULL,
  team1 VARCHAR(100) NOT NULL,
  team2 VARCHAR(100) NOT NULL,
  third_team VARCHAR(100) DEFAULT NULL,
  UNIQUE(tournament_id, group_name)
);

-- Pronósticos semifinalistas (1 por bracket)
CREATE TABLE IF NOT EXISTS semifinal_predictions (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bracket VARCHAR(5) NOT NULL, -- 1, 2, 3, 4
  team VARCHAR(100) NOT NULL,
  points INTEGER DEFAULT 0,
  calculated_at TIMESTAMP,
  UNIQUE(tournament_id, user_id, bracket)
);

-- Semifinalistas reales
CREATE TABLE IF NOT EXISTS semifinal_results (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  bracket VARCHAR(5) NOT NULL,
  team VARCHAR(100) NOT NULL,
  UNIQUE(tournament_id, bracket)
);

-- Pronósticos final (campeón y subcampeón)
CREATE TABLE IF NOT EXISTS final_predictions (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  champion VARCHAR(100) NOT NULL,
  runner_up VARCHAR(100) NOT NULL,
  champion_points INTEGER DEFAULT 0,
  runner_up_points INTEGER DEFAULT 0,
  calculated_at TIMESTAMP,
  UNIQUE(tournament_id, user_id)
);

-- Resultado final real
CREATE TABLE IF NOT EXISTS final_result (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  champion VARCHAR(100) NOT NULL,
  runner_up VARCHAR(100) NOT NULL,
  UNIQUE(tournament_id)
);

-- Vista de leaderboard (puntos totales por usuario)
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  u.id AS user_id,
  u.user_name,
  u.initials,
  COALESCE(SUM(mp.points), 0) +
  COALESCE((SELECT SUM(gp.points) FROM group_predictions gp WHERE gp.user_id = u.id), 0) +
  COALESCE((SELECT SUM(sp.points) FROM semifinal_predictions sp WHERE sp.user_id = u.id), 0) +
  COALESCE((SELECT COALESCE(fp.champion_points,0) + COALESCE(fp.runner_up_points,0) FROM final_predictions fp WHERE fp.user_id = u.id LIMIT 1), 0)
  AS total_points
FROM users u
LEFT JOIN match_predictions mp ON mp.user_id = u.id
GROUP BY u.id, u.user_name, u.initials
ORDER BY total_points DESC, u.user_name ASC;
