const pool = require('../config/db');
const { recalculateMatch } = require('./scoringService');

let simInterval = null;

async function startSimulation(io, matchId) {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }

  // Resetear partido al estado inicial live
  await pool.query(
    `UPDATE matches SET status = 'live', home_score = 0, away_score = 0, current_minute = 1 WHERE id = $1`,
    [matchId]
  );

  let minute = 1;
  let homeScore = 0;
  let awayScore = 0;

  const { rows } = await pool.query(`SELECT * FROM matches WHERE id = $1`, [matchId]);
  const match = rows[0];

  if (!match) throw new Error(`Partido con id=${matchId} no encontrado`);

  const emit = (status) => {
    io.emit('match_update', {
      id: match.id,
      home_team: match.home_team,
      away_team: match.away_team,
      home_score: homeScore,
      away_score: awayScore,
      status,
      minute: status === 'live' ? minute : null,
      match_date: match.match_date
    });
  };

  console.log(`[SIM] Iniciando simulación partido ${matchId}: ${match.home_team} vs ${match.away_team}`);
  emit('live');

  simInterval = setInterval(async () => {
    minute += 1;

    // Gol aleatorio cada ~15 minutos (15% de probabilidad por tick)
    const goal = Math.random() < 0.15;
    if (goal && minute > 5) {
      if (Math.random() < 0.5) homeScore++;
      else awayScore++;
      console.log(`[SIM] GOL! ${match.home_team} ${homeScore}-${awayScore} ${match.away_team} (${minute}')`);
    }

    const status = minute >= 90 ? 'finished' : 'live';

    await pool.query(
      `UPDATE matches SET home_score=$1, away_score=$2, current_minute=$3, status=$4 WHERE id=$5`,
      [homeScore, awayScore, minute, status, matchId]
    );

    if (goal) await recalculateMatch(matchId, io);

    emit(status);

    if (status === 'finished') {
      clearInterval(simInterval);
      simInterval = null;
      console.log(`[SIM] Partido terminado: ${match.home_team} ${homeScore}-${awayScore} ${match.away_team}`);

      // Broadcast lista actualizada (sin el partido terminado)
      const { rows: live } = await pool.query(
        `SELECT *, current_minute AS minute FROM matches WHERE status IN ('live','pending') ORDER BY match_date ASC`
      );
      io.emit('live_matches', live);
    }
  }, 2000); // cada 2 segundos = 1 minuto de partido

  return { match: match.home_team + ' vs ' + match.away_team };
}

function stopSimulation() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
    return true;
  }
  return false;
}

module.exports = { startSimulation, stopSimulation };
