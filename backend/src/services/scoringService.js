const pool = require('../config/db');

function calculateMatchPoints(prediction, realHome, realAway) {
  const predHome = prediction.home_score;
  const predAway = prediction.away_score;

  const exactMatch = predHome === realHome && predAway === realAway;
  if (exactMatch) return 8; // 3 ganador + 1 gol local + 1 gol visitante + 3 bonus exacto

  let points = 0;

  // Acertar ganador o empate
  const realWinner = realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw';
  const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
  if (realWinner === predWinner) points += 3;

  // Acertar gol de cada equipo individualmente
  if (predHome === realHome) points += 1;
  if (predAway === realAway) points += 1;

  return points;
}

async function recalculateMatch(matchId, io) {
  const matchRes = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
  const match = matchRes.rows[0];

  if (match.home_score === null || match.away_score === null) return;

  const predsRes = await pool.query(
    'SELECT * FROM match_predictions WHERE match_id = $1',
    [matchId]
  );

  for (const pred of predsRes.rows) {
    const pts = calculateMatchPoints(pred, match.home_score, match.away_score);
    await pool.query(
      'UPDATE match_predictions SET points = $1, calculated_at = NOW() WHERE id = $2',
      [pts, pred.id]
    );
  }

  await broadcastLeaderboard(io);
}

async function recalculateGroups(tournamentId, io) {
  const resultRes = await pool.query(
    'SELECT * FROM group_results WHERE tournament_id = $1',
    [tournamentId]
  );

  for (const result of resultRes.rows) {
    const predsRes = await pool.query(
      'SELECT * FROM group_predictions WHERE tournament_id = $1 AND group_name = $2',
      [tournamentId, result.group_name]
    );

    for (const pred of predsRes.rows) {
      let pts = 0;
      const realTeams = [result.team1, result.team2];
      const predTeams = [pred.team1, pred.team2];

      // 3 pts por cada equipo clasificado acertado
      for (const team of predTeams) {
        if (realTeams.includes(team)) pts += 3;
      }

      // mejor tercero: +3 si el equipo clasificó de cualquier forma (1°, 2° o como mejor tercero)
      if (pred.third_team) {
        const allQualified = [result.team1, result.team2];
        if (result.third_team) allQualified.push(result.third_team);
        if (allQualified.includes(pred.third_team)) pts += 3;

        // +3 adicional si acertaste exactamente el mejor tercero
        if (result.third_team && pred.third_team === result.third_team) pts += 3;
      }

      await pool.query(
        'UPDATE group_predictions SET points = $1, calculated_at = NOW() WHERE id = $2',
        [pts, pred.id]
      );
    }
  }

  await broadcastLeaderboard(io);
}

async function recalculateSemifinals(tournamentId, io) {
  const resultRes = await pool.query(
    'SELECT * FROM semifinal_results WHERE tournament_id = $1',
    [tournamentId]
  );

  const realTeams = resultRes.rows.map(r => r.team);

  const predsRes = await pool.query(
    'SELECT * FROM semifinal_predictions WHERE tournament_id = $1',
    [tournamentId]
  );

  for (const pred of predsRes.rows) {
    const pts = realTeams.includes(pred.team) ? 6 : 0;
    await pool.query(
      'UPDATE semifinal_predictions SET points = $1, calculated_at = NOW() WHERE id = $2',
      [pts, pred.id]
    );
  }

  await broadcastLeaderboard(io);
}

async function recalculateFinal(tournamentId, io) {
  const resultRes = await pool.query(
    'SELECT * FROM final_result WHERE tournament_id = $1',
    [tournamentId]
  );
  if (!resultRes.rows.length) return;
  const result = resultRes.rows[0];

  const predsRes = await pool.query(
    'SELECT * FROM final_predictions WHERE tournament_id = $1',
    [tournamentId]
  );

  for (const pred of predsRes.rows) {
    const champPts = pred.champion === result.champion ? 20 : 0;
    const runnerPts = pred.runner_up === result.runner_up ? 10 : 0;
    await pool.query(
      'UPDATE final_predictions SET champion_points = $1, runner_up_points = $2, calculated_at = NOW() WHERE id = $3',
      [champPts, runnerPts, pred.id]
    );
  }

  await broadcastLeaderboard(io);
}

async function broadcastLeaderboard(io) {
  const res = await pool.query('SELECT * FROM leaderboard');
  if (io) io.emit('leaderboard_update', res.rows);
}

module.exports = {
  recalculateMatch,
  recalculateGroups,
  recalculateSemifinals,
  recalculateFinal,
  broadcastLeaderboard,
};
