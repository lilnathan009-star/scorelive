const pool = require('../config/db');
const { recalculateMatch } = require('../services/scoringService');

// Crear partido
async function createMatch(req, res) {
  const { tournament_id, home_team, away_team, match_date, phase, api_match_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO matches (tournament_id, home_team, away_team, match_date, phase, api_match_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tournament_id, home_team, away_team, match_date, phase || 'group', api_match_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ese partido ya existe en el torneo' });
    }
    res.status(500).json({ error: err.message });
  }
}

// Listar partidos de un torneo
async function getMatches(req, res) {
  const { tournament_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM matches WHERE tournament_id = $1 ORDER BY match_date ASC',
      [tournament_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Actualizar resultado real de un partido → recalcula puntos → broadcast
async function updateResult(req, res) {
  const { id } = req.params;
  const { home_score, away_score } = req.body;
  const io = req.app.get('io');

  try {
    await pool.query(
      `UPDATE matches SET home_score = $1, away_score = $2 WHERE id = $3`,
      [home_score, away_score, id]
    );
    await recalculateMatch(id, io);
    res.json({ message: 'Resultado actualizado y puntos recalculados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createMatch, getMatches, updateResult };
