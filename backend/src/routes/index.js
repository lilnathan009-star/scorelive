const express = require('express');
const router = express.Router();

const matchCtrl = require('../controllers/matchController');
const predCtrl = require('../controllers/predictionController');
const leaderCtrl = require('../controllers/leaderboardController');
const tournCtrl = require('../controllers/tournamentController');

// --- Torneos ---
router.post('/tournaments', tournCtrl.createTournament);
router.get('/tournaments', tournCtrl.getTournaments);

// --- Partidos ---
router.post('/matches', matchCtrl.createMatch);
router.get('/matches/live', async (req, res) => {
  const pool = require('../config/db');
  try {
    const { rows } = await pool.query(
      `SELECT *, current_minute AS minute FROM matches WHERE status IN ('live','pending') ORDER BY match_date ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/matches/:tournament_id', matchCtrl.getMatches);
router.put('/matches/:id/result', matchCtrl.updateResult);
router.put('/matches/:id/api-id', async (req, res) => {
  const pool = require('../config/db');
  const { api_match_id } = req.body;
  try {
    await pool.query(`UPDATE matches SET api_match_id=$1 WHERE id=$2`, [api_match_id, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Pronósticos de partido ---
router.post('/predictions/match/import', predCtrl.importMatchPredictions);
router.post('/predictions/match', predCtrl.addMatchPrediction);
router.get('/predictions/match/:match_id', predCtrl.getMatchPredictions);

// --- Grupos ---
router.post('/groups/result', tournCtrl.setGroupResult);
router.post('/groups/predictions/import', tournCtrl.importGroupPredictions);

// --- Semifinales ---
router.post('/semifinals/result', tournCtrl.setSemifinalResult);
router.post('/semifinals/predictions/import', tournCtrl.importSemifinalPredictions);

// --- Final ---
router.post('/final/result', tournCtrl.setFinalResult);
router.post('/final/predictions/import', tournCtrl.importFinalPredictions);

// --- Leaderboard ---
router.get('/leaderboard', leaderCtrl.getLeaderboard);

// --- Resumen fase de grupos (puntos + picks de mejor tercero) ---
router.get('/groups/summary', async (req, res) => {
  const pool = require('../config/db');
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id as user_id,
        u.user_name,
        u.initials,
        COALESCE(SUM(gp.points), 0)::int as group_points,
        json_agg(
          json_build_object('group', gp.group_name, 'team', gp.third_team)
          ORDER BY gp.group_name
        ) FILTER (WHERE gp.third_team IS NOT NULL) as thirds
      FROM users u
      JOIN group_predictions gp ON gp.user_id = u.id AND gp.tournament_id = 1
      GROUP BY u.id, u.user_name, u.initials
      ORDER BY group_points DESC, u.user_name ASC
    `);
    res.json(rows.map(r => ({
      ...r,
      group_points: parseInt(r.group_points) || 0,
      thirds: r.thirds || []
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Picks de grupos por usuario ---
router.get('/groups/picks/:user_name', async (req, res) => {
  const pool = require('../config/db');
  try {
    const { rows } = await pool.query(`
      SELECT
        gp.group_name,
        gp.team1,
        gp.team2,
        gp.third_team,
        COALESCE(gp.points, 0) as points,
        gr.team1 as result_team1,
        gr.team2 as result_team2
      FROM group_predictions gp
      JOIN users u ON u.id = gp.user_id
      LEFT JOIN group_results gr
        ON gr.tournament_id = gp.tournament_id AND gr.group_name = gp.group_name
      WHERE u.user_name = $1 AND gp.tournament_id = 1
      ORDER BY gp.group_name ASC
    `, [req.params.user_name]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Usuarios ---
router.get('/users', async (req, res) => {
  const pool = require('../config/db');
  try {
    const { rows } = await pool.query('SELECT id, user_name, initials FROM users ORDER BY user_name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- football-data.org: solo standings y resultados para sección Mundial ---
const { fetchStandings, fetchRecentResults } = require('../services/footballDataService');

router.get('/football/standings', async (req, res) => {
  try { res.json(await fetchStandings()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/football/results', async (req, res) => {
  try { res.json(await fetchRecentResults(30)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ESPN (sin límite, sin key) ---
const { fetchWCScoreboard, fetchWCScoreboardDate } = require('../services/espnService');

// Partidos del día actual con goleadores y tarjetas
router.get('/espn/scoreboard', async (req, res) => {
  try {
    const date = req.query.date;
    const data = date ? await fetchWCScoreboardDate(date) : await fetchWCScoreboard();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Datos para chismes (partidos recientes + pronósticos) ---
router.get('/gossip-data', async (req, res) => {
  const pool = require('../config/db');
  try {
    const { rows: matches } = await pool.query(`
      SELECT id, home_team, away_team, home_score, away_score, status
      FROM matches
      WHERE status IN ('finished', 'live')
      ORDER BY match_date DESC
      LIMIT 5
    `);

    if (!matches.length) return res.json([]);

    const result = [];
    for (const m of matches) {
      const { rows: preds } = await pool.query(`
        SELECT u.user_name, mp.home_score AS pred_home, mp.away_score AS pred_away, mp.points
        FROM match_predictions mp
        JOIN users u ON u.id = mp.user_id
        WHERE mp.match_id = $1
      `, [m.id]);
      result.push({ ...m, predictions: preds });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Stats del torneo ---
router.get('/stats', async (req, res) => {
  const pool = require('../config/db');
  try {
    const { rows: [r] } = await pool.query(`
      SELECT
        COUNT(*) as total_predictions,
        COALESCE(AVG(CASE WHEN mp.points > 0 THEN 100.0 ELSE 0.0 END), 0) as accuracy
      FROM match_predictions mp
      JOIN matches m ON m.id = mp.match_id
      WHERE m.status = 'finished'
    `);
    res.json({
      predictions: parseInt(r.total_predictions) || 0,
      accuracy: Math.round(parseFloat(r.accuracy) || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Chismes del Mundial (Claude AI) ---
router.get('/gossip', async (req, res) => {
  const pool = require('../config/db');
  try {
    const { rows } = await pool.query(`
      SELECT user_name, total_points, position
      FROM leaderboard
      ORDER BY position ASC
      LIMIT 10
    `);
    if (!rows.length) return res.json([]);

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const top = rows.slice(0, 5).map(r => `#${r.position} ${r.user_name}: ${r.total_points}pts`).join(', ');
    const last = rows[rows.length - 1];

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Eres el comentarista gracioso e irónico de un torneo de predicciones del Mundial entre amigos.
Top del leaderboard: ${top}. Último lugar: ${last.user_name} con ${last.total_points}pts.
Genera exactamente 3 "chismes" cortos, divertidos y variados en español sobre estos jugadores (max 15 palabras cada uno).
Sé creativo, usa humor, pueden ser provocadores pero amistosos.
Responde ÚNICAMENTE con JSON válido en este formato exacto, sin texto adicional:
[{"emoji":"🔥","text":"..."},{"emoji":"😬","text":"..."},{"emoji":"👑","text":"..."}]`
      }]
    });

    const gossip = JSON.parse(msg.content[0].text);
    res.json(gossip);
  } catch (err) {
    console.error('[Gossip]', err.message);
    res.json([]);
  }
});

// --- Simulación (solo para pruebas) ---
const { startSimulation, stopSimulation } = require('../services/simulationService');

router.post('/sim/start/:match_id', async (req, res) => {
  try {
    const io = req.app.get('io');
    const matchId = parseInt(req.params.match_id);
    await require('../config/db').query(
      `UPDATE matches SET status = 'live' WHERE id = $1`, [matchId]
    );
    const result = await startSimulation(io, matchId);
    res.json({ message: `Simulación iniciada: ${result.match}`, speed: '2s = 1 min de partido' });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.post('/sim/stop', (req, res) => {
  const stopped = stopSimulation();
  res.json({ message: stopped ? 'Simulación detenida' : 'No había simulación activa' });
});

module.exports = router;
