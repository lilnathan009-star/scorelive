const pool = require('../config/db');

function initSocket(io) {
  io.on('connection', async (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Leaderboard al conectar
    const lb = await pool.query('SELECT * FROM leaderboard');
    socket.emit('leaderboard_update', lb.rows);

    // Partidos live/pending al conectar
    const matches = await pool.query(
      `SELECT *, current_minute AS minute FROM matches WHERE status IN ('live','pending') ORDER BY match_date ASC`
    );
    socket.emit('live_matches', matches.rows);

    socket.on('get_leaderboard', async () => {
      const res = await pool.query('SELECT * FROM leaderboard');
      socket.emit('leaderboard_update', res.rows);
    });

    socket.on('get_live_matches', async () => {
      const res = await pool.query(
        `SELECT *, current_minute AS minute FROM matches WHERE status IN ('live','pending') ORDER BY match_date ASC`
      );
      socket.emit('live_matches', res.rows);
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
    });
  });
}

module.exports = { initSocket };
