const pool = require('../config/db');
const {
  recalculateGroups,
  recalculateSemifinals,
  recalculateFinal,
} = require('../services/scoringService');

// Crear torneo
async function createTournament(req, res) {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tournaments (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Listar torneos
async function getTournaments(req, res) {
  try {
    const result = await pool.query('SELECT * FROM tournaments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Cargar clasificados reales por grupo → recalcula puntos grupos
async function setGroupResult(req, res) {
  const { tournament_id, group_name, team1, team2, third_team } = req.body;
  const io = req.app.get('io');
  try {
    await pool.query(
      `INSERT INTO group_results (tournament_id, group_name, team1, team2, third_team)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tournament_id, group_name) DO UPDATE
         SET team1 = EXCLUDED.team1, team2 = EXCLUDED.team2, third_team = EXCLUDED.third_team`,
      [tournament_id, group_name, team1, team2, third_team || null]
    );
    await recalculateGroups(tournament_id, io);
    res.json({ message: 'Resultado de grupo guardado y puntos recalculados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Cargar pronósticos de grupos desde JSON
async function importGroupPredictions(req, res) {
  const { tournament_id, predictions } = req.body;
  // predictions: [{ user_name, initials, group_picks: { A: [team1, team2, team3?], ... } }]
  try {
    for (const pred of predictions) {
      const userRes = await pool.query(
        `INSERT INTO users (user_name, initials) VALUES ($1, $2)
         ON CONFLICT (user_name) DO UPDATE SET initials = EXCLUDED.initials
         RETURNING id`,
        [pred.user_name, pred.initials || pred.user_name[0].toUpperCase()]
      );
      const userId = userRes.rows[0].id;

      for (const [group_name, teams] of Object.entries(pred.group_picks)) {
        await pool.query(
          `INSERT INTO group_predictions (tournament_id, user_id, group_name, team1, team2, third_team)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tournament_id, user_id, group_name) DO UPDATE
             SET team1 = EXCLUDED.team1, team2 = EXCLUDED.team2, third_team = EXCLUDED.third_team`,
          [tournament_id, userId, group_name, teams[0], teams[1], teams[2] || null]
        );
      }
    }
    res.json({ message: 'Pronósticos de grupos importados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Cargar semifinalistas reales
async function setSemifinalResult(req, res) {
  const { tournament_id, teams } = req.body;
  // teams: [{ bracket: '1', team: 'Argentina' }, ...]
  const io = req.app.get('io');
  try {
    for (const { bracket, team } of teams) {
      await pool.query(
        `INSERT INTO semifinal_results (tournament_id, bracket, team)
         VALUES ($1, $2, $3)
         ON CONFLICT (tournament_id, bracket) DO UPDATE SET team = EXCLUDED.team`,
        [tournament_id, bracket, team]
      );
    }
    await recalculateSemifinals(tournament_id, io);
    res.json({ message: 'Semifinalistas guardados y puntos recalculados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Cargar pronósticos de semifinales desde JSON
async function importSemifinalPredictions(req, res) {
  const { tournament_id, predictions } = req.body;
  // predictions: [{ user_name, initials, brackets: { '1': 'Argentina', '2': 'Brasil', ... } }]
  try {
    for (const pred of predictions) {
      const userRes = await pool.query(
        `INSERT INTO users (user_name, initials) VALUES ($1, $2)
         ON CONFLICT (user_name) DO UPDATE SET initials = EXCLUDED.initials
         RETURNING id`,
        [pred.user_name, pred.initials || pred.user_name[0].toUpperCase()]
      );
      const userId = userRes.rows[0].id;

      for (const [bracket, team] of Object.entries(pred.brackets)) {
        await pool.query(
          `INSERT INTO semifinal_predictions (tournament_id, user_id, bracket, team)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (tournament_id, user_id, bracket) DO UPDATE SET team = EXCLUDED.team`,
          [tournament_id, userId, bracket, team]
        );
      }
    }
    res.json({ message: 'Pronósticos de semifinales importados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Cargar resultado final real
async function setFinalResult(req, res) {
  const { tournament_id, champion, runner_up } = req.body;
  const io = req.app.get('io');
  try {
    await pool.query(
      `INSERT INTO final_result (tournament_id, champion, runner_up)
       VALUES ($1, $2, $3)
       ON CONFLICT (tournament_id) DO UPDATE SET champion = EXCLUDED.champion, runner_up = EXCLUDED.runner_up`,
      [tournament_id, champion, runner_up]
    );
    await recalculateFinal(tournament_id, io);
    res.json({ message: 'Resultado final guardado y puntos recalculados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Cargar pronósticos de final
async function importFinalPredictions(req, res) {
  const { tournament_id, predictions } = req.body;
  // predictions: [{ user_name, initials, champion, runner_up }]
  try {
    for (const pred of predictions) {
      const userRes = await pool.query(
        `INSERT INTO users (user_name, initials) VALUES ($1, $2)
         ON CONFLICT (user_name) DO UPDATE SET initials = EXCLUDED.initials
         RETURNING id`,
        [pred.user_name, pred.initials || pred.user_name[0].toUpperCase()]
      );
      const userId = userRes.rows[0].id;

      await pool.query(
        `INSERT INTO final_predictions (tournament_id, user_id, champion, runner_up)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tournament_id, user_id) DO UPDATE
           SET champion = EXCLUDED.champion, runner_up = EXCLUDED.runner_up`,
        [tournament_id, userId, pred.champion, pred.runner_up]
      );
    }
    res.json({ message: 'Pronósticos de final importados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createTournament,
  getTournaments,
  setGroupResult,
  importGroupPredictions,
  setSemifinalResult,
  importSemifinalPredictions,
  setFinalResult,
  importFinalPredictions,
};
