const pool = require('../config/db');

async function getLeaderboard(req, res) {
  try {
    const result = await pool.query('SELECT * FROM leaderboard');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getLeaderboard };
