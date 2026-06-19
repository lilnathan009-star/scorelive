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
