const pool = require('../config/db');
const { fetchWCScoreboardDate } = require('./espnService');

// Crea en la DB partidos del Mundial que empiezan en las próximas 2 horas
// y que aún no están registrados (por api_match_id o por equipos)
async function autoImportUpcomingMatches() {
  try {
    // Obtener torneo activo
    const { rows: [tournament] } = await pool.query(
      `SELECT id FROM tournaments ORDER BY id ASC LIMIT 1`
    );
    if (!tournament) return;

    // Revisar hoy y mañana (por si el servidor está en UTC diferente)
    const now = new Date();
    const dates = [
      now.toISOString().slice(0, 10),
      new Date(now.getTime() + 86400000).toISOString().slice(0, 10),
    ];

    for (const date of dates) {
      const events = await fetchWCScoreboardDate(date);

      for (const ev of events) {
        if (!ev.espnId || !ev.home || !ev.away) continue;

        const matchStart = new Date(ev.date);
        const msUntilStart = matchStart - now;
        const hoursUntilStart = msUntilStart / 3600000;

        // Solo los que empiezan entre ahora y 2 horas (o ya están live)
        if (ev.status === 'finished') continue;
        if (hoursUntilStart > 2 || hoursUntilStart < -3) continue;

        // ¿Ya existe por api_match_id?
        const { rows: byApi } = await pool.query(
          `SELECT id FROM matches WHERE api_match_id = $1`,
          [String(ev.espnId)]
        );
        if (byApi.length > 0) continue;

        // ¿Ya existe por equipos + fecha (±1 día)?
        const { rows: byTeams } = await pool.query(
          `SELECT id FROM matches
           WHERE home_team ILIKE $1 AND away_team ILIKE $2
             AND ABS(EXTRACT(EPOCH FROM (match_date - $3::timestamptz))) < 86400`,
          [ev.home, ev.away, ev.date]
        );
        if (byTeams.length > 0) {
          // Vincula api_match_id si falta
          if (!byTeams[0].api_match_id) {
            await pool.query(
              `UPDATE matches SET api_match_id = $1 WHERE id = $2`,
              [String(ev.espnId), byTeams[0].id]
            );
          }
          continue;
        }

        // Crear partido
        await pool.query(
          `INSERT INTO matches (tournament_id, home_team, away_team, match_date, status, phase, api_match_id)
           VALUES ($1, $2, $3, $4, 'pending', 'group', $5)`,
          [tournament.id, ev.home, ev.away, ev.date, String(ev.espnId)]
        );
        console.log(`[AutoMatch] Creado: ${ev.home} vs ${ev.away} @ ${ev.date}`);
      }
    }
  } catch (err) {
    console.error('[AutoMatch] Error:', err.message);
  }
}

function startAutoMatchImport() {
  // Ejecutar al arrancar
  autoImportUpcomingMatches();
  // Luego cada 10 minutos
  setInterval(autoImportUpcomingMatches, 10 * 60 * 1000);
  console.log('AutoMatch: revisando partidos próximos cada 10 minutos.');
}

module.exports = { startAutoMatchImport };
