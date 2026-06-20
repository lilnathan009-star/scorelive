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

    if (espnEvents.length === 0) {
      console.log('[ESPN] scoreboard vacío');
    } else {
      console.log(`[ESPN] ${espnEvents.length} partidos: ${espnEvents.map(e => `${e.home} vs ${e.away} [${e.status}] ${e.homeScore ?? '-'}-${e.awayScore ?? '-'}`).join(' | ')}`);
    }

    // Mapa por nombre de equipos y por ESPN ID
    const espnMap = {};
    const espnIdMap = {};
    for (const ev of espnEvents) {
      espnMap[`${ev.home}|${ev.away}`] = ev;
      espnIdMap[String(ev.espnId)] = ev;
    }

    for (const match of matches) {
      // Buscar por ESPN ID primero (más confiable), luego por nombre
      let espn = match.api_match_id ? espnIdMap[String(match.api_match_id)] : null;
      if (!espn) {
        const key = `${match.home_team}|${match.away_team}`;
        espn = espnMap[key];
      }

      if (!espn) {
        console.log(`[ESPN] No encontrado: "${match.home_team} vs ${match.away_team}" (api_id=${match.api_match_id})`);
        continue; // partido no está en el scoreboard de hoy
      }

      const homeScore = espn.homeScore ?? match.home_score;
      const awayScore = espn.awayScore ?? match.away_score;
      const scoreChanged = homeScore !== match.home_score || awayScore !== match.away_score;
      const minute = parseMinute(espn.clock);

      // Si ESPN devuelve score pero status desconocido (pending), tratar como live
      let newStatus = espn.status;
      if (newStatus === 'pending' && (homeScore > 0 || awayScore > 0)) {
        newStatus = 'live';
      }
      // Nunca revertir live → pending (puede ser un blip de la API de ESPN)
      if (match.status === 'live' && newStatus === 'pending') {
        newStatus = 'live';
      }

      const statusChanged = newStatus !== match.status;

      await pool.query(
        `UPDATE matches SET home_score=$1, away_score=$2, status=$3, current_minute=$4 WHERE id=$5`,
        [homeScore, awayScore, newStatus, minute, match.id]
      );

      if (scoreChanged) {
        console.log(`[GOL] ${match.home_team} ${homeScore}-${awayScore} ${match.away_team} (${espn.clock})`);
      }
      if (statusChanged) {
        console.log(`[STATUS] ${match.home_team} vs ${match.away_team}: ${match.status} → ${espn.status}`);
      }

      // Recalcular en cada poll mientras hay marcador (live o finished)
      if (homeScore !== null && awayScore !== null) {
        await recalculateMatch(match.id, io);
      }

      io.emit('match_update', {
        id: match.id,
        home_team: match.home_team,
        away_team: match.away_team,
        home_score: homeScore,
        away_score: awayScore,
        status: newStatus,
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
