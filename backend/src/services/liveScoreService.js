const pool = require('../config/db');
const { recalculateMatch } = require('./scoringService');
const { fetchWCScoreboard } = require('./espnService');

function parseMinute(clock) {
  if (!clock || clock === 'MT') return null;
  const m = clock.match(/^(\d+)/);
  return m ? parseInt(m[1]) : null;
}

async function broadcastLiveMatches(io) {
  const { rows } = await pool.query(
    `SELECT *, current_minute AS minute FROM matches WHERE status IN ('live','pending') ORDER BY match_date ASC`
  );
  io.emit('live_matches', rows);
}

async function pollLiveMatches(io) {
  try {
    const { rows: matches } = await pool.query(
      `SELECT * FROM matches WHERE status IN ('live','pending')`
    );

    if (matches.length === 0) {
      await broadcastLiveMatches(io);
      return;
    }

    // ESPN: 1 request trae todos los partidos del Mundial con score, reloj y estado
    const espnEvents = await fetchWCScoreboard();

    // Mapa por nombre de equipos (ya normalizados en espnService)
    const espnMap = {};
    for (const ev of espnEvents) {
      espnMap[`${ev.home}|${ev.away}`] = ev;
    }

    for (const match of matches) {
      const key = `${match.home_team}|${match.away_team}`;
      const espn = espnMap[key];

      if (!espn) continue; // partido no está en el scoreboard de hoy

      const homeScore = espn.homeScore ?? match.home_score;
      const awayScore = espn.awayScore ?? match.away_score;
      const scoreChanged = homeScore !== match.home_score || awayScore !== match.away_score;
      const statusChanged = espn.status !== match.status;
      const minute = parseMinute(espn.clock);

      await pool.query(
        `UPDATE matches SET home_score=$1, away_score=$2, status=$3, current_minute=$4 WHERE id=$5`,
        [homeScore, awayScore, espn.status, minute, match.id]
      );

      if (scoreChanged) {
        console.log(`[GOL] ${match.home_team} ${homeScore}-${awayScore} ${match.away_team} (${espn.clock})`);
        await recalculateMatch(match.id, io);
      }
      if (statusChanged) {
        console.log(`[STATUS] ${match.home_team} vs ${match.away_team}: ${match.status} → ${espn.status}`);
      }

      io.emit('match_update', {
        id: match.id,
        home_team: match.home_team,
        away_team: match.away_team,
        home_score: homeScore,
        away_score: awayScore,
        status: espn.status,
        minute,
        clock: espn.clock,
        period: espn.period,
        match_date: match.match_date,
      });
    }

    await broadcastLiveMatches(io);

  } catch (err) {
    console.error('Error en pollLiveMatches:', err.message);
  }
}

function startLivePolling(io) {
  console.log('Live polling iniciado — ESPN (cada 15s, sin límite)');
  pollLiveMatches(io);
  return setInterval(() => pollLiveMatches(io), 15000);
}

module.exports = { startLivePolling, broadcastLiveMatches };
