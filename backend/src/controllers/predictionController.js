const pool = require('../config/db');

// Importar pronósticos de partido desde JSON de Scorevix
async function importMatchPredictions(req, res) {
  const { match_id, predictions } = req.body;

  if (!match_id || !Array.isArray(predictions)) {
    return res.status(400).json({ error: 'match_id y predictions[] son requeridos' });
  }

  try {
    let imported = 0;
    let skipped = 0;

    for (const pred of predictions) {
      const { user_name, initials, home_score, away_score } = pred;

      // Upsert usuario
      const userRes = await pool.query(
        `INSERT INTO users (user_name, initials)
         VALUES ($1, $2)
         ON CONFLICT (user_name) DO UPDATE SET initials = EXCLUDED.initials
         RETURNING id`,
        [user_name, initials || user_name[0].toUpperCase()]
      );
      const userId = userRes.rows[0].id;

      // Upsert pronóstico
      await pool.query(
        `INSERT INTO match_predictions (match_id, user_id, home_score, away_score, points)
         VALUES ($1, $2, $3, $4, 0)
         ON CONFLICT (match_id, user_id) DO UPDATE
           SET home_score = EXCLUDED.home_score,
               away_score = EXCLUDED.away_score,
               points = 0`,
        [match_id, userId, home_score, away_score]
      );
      imported++;
    }

    res.json({ message: `${imported} pronósticos importados, ${skipped} omitidos` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Agregar pronóstico manual de partido
async function addMatchPrediction(req, res) {
  const { match_id, user_id, home_score, away_score } = req.body;

  if (!user_id) return res.status(400).json({ error: 'Falta user_id' });

  try {
    const result = await pool.query(
      `INSERT INTO match_predictions (match_id, user_id, home_score, away_score, points)
       VALUES ($1, $2, $3, $4, 0)
       ON CONFLICT (match_id, user_id) DO UPDATE
         SET home_score = EXCLUDED.home_score,
             away_score = EXCLUDED.away_score
       RETURNING *`,
      [match_id, user_id, home_score, away_score]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Ver pronósticos de un partido
async function getMatchPredictions(req, res) {
  const { match_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.user_name, u.initials, mp.home_score, mp.away_score, mp.points
       FROM match_predictions mp
       JOIN users u ON u.id = mp.user_id
       WHERE mp.match_id = $1
       ORDER BY mp.points DESC, u.user_name ASC`,
      [match_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { importMatchPredictions, addMatchPrediction, getMatchPredictions };
