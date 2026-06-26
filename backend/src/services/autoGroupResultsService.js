const pool = require('../config/db');
const { fetchESPNStandings } = require('./espnService');
const { recalculateGroups } = require('./scoringService');

// Nombres ESPN → nombres usados en predicciones
const ESPN_NAME_MAP = {
  'Bosnia-Herz':  'Bosnia-Herzegovina',
  'USA':          'United States',
  'Türkiye':      'Turkey',
  'IR Iran':      'Iran',
  'Korea Republic': 'South Korea',
};
const norm = name => ESPN_NAME_MAP[name] ?? name;

async function autoGroupResults(io) {
  try {
    const standings = await fetchESPNStandings();

    const { rows: [tournament] } = await pool.query(
      'SELECT id FROM tournaments ORDER BY id ASC LIMIT 1'
    );
    if (!tournament) return;
    const tid = tournament.id;

    let anyUpdated = false;
    let allGroupsDone = true;
    const thirds = [];

    for (const group of standings) {
      const groupLetter = group.group.replace('Group ', '');
      const table = group.table;

      // Grupo completo = todos jugaron 3 partidos
      const isComplete = table.length === 4 && table.every(t => t.played >= 3);
      if (!isComplete) { allGroupsDone = false; continue; }

      const team1 = norm(table[0].team);
      const team2 = norm(table[1].team);
      thirds.push({ team: norm(table[2].team), group: groupLetter, points: table[2].points, gd: table[2].gd, gf: table[2].gf });

      // Upsert resultado del grupo (solo team1 y team2, sin tocar third_team aún)
      const { rows: existing } = await pool.query(
        'SELECT team1, team2 FROM group_results WHERE tournament_id = $1 AND group_name = $2',
        [tid, groupLetter]
      );

      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO group_results (tournament_id, group_name, team1, team2)
           VALUES ($1, $2, $3, $4)`,
          [tid, groupLetter, team1, team2]
        );
        console.log(`[AutoGroup] Inserted ${groupLetter}: ${team1}, ${team2}`);
        anyUpdated = true;
      } else if (existing[0].team1 !== team1 || existing[0].team2 !== team2) {
        await pool.query(
          `UPDATE group_results SET team1 = $1, team2 = $2
           WHERE tournament_id = $3 AND group_name = $4`,
          [team1, team2, tid, groupLetter]
        );
        console.log(`[AutoGroup] Updated ${groupLetter}: ${team1}, ${team2}`);
        anyUpdated = true;
      }
    }

    // Terceros: solo cuando los 12 grupos terminaron
    if (allGroupsDone && thirds.length === 12) {
      const sorted = [...thirds].sort((a, b) =>
        b.points - a.points || b.gd - a.gd || b.gf - a.gf
      );
      const advancing = new Set(sorted.slice(0, 8).map(t => t.group));

      for (const t of thirds) {
        const thirdTeam = advancing.has(t.group) ? t.team : null;
        const { rows: [cur] } = await pool.query(
          'SELECT third_team FROM group_results WHERE tournament_id = $1 AND group_name = $2',
          [tid, t.group]
        );
        if (cur && cur.third_team !== thirdTeam) {
          await pool.query(
            'UPDATE group_results SET third_team = $1 WHERE tournament_id = $2 AND group_name = $3',
            [thirdTeam, tid, t.group]
          );
          console.log(`[AutoGroup] Tercero ${t.group}: ${thirdTeam ?? 'no clasifica'}`);
          anyUpdated = true;
        }
      }
    }

    if (anyUpdated) {
      await recalculateGroups(tid, io);
      console.log('[AutoGroup] Puntos recalculados.');
    }
  } catch (err) {
    console.error('[AutoGroup] Error:', err.message);
  }
}

function startAutoGroupResults(io) {
  autoGroupResults(io);
  // Revisar cada 10 minutos
  setInterval(() => autoGroupResults(io), 10 * 60 * 1000);
  console.log('[AutoGroup] Revisando resultados de grupos cada 10 minutos.');
}

module.exports = { startAutoGroupResults };
