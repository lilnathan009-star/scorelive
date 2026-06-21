require('dotenv').config();
const { Pool } = require('pg');
const remote = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Ecuador (local) vs Curaçao (visitante)
// [home_score (Ecuador), away_score (Curaçao)]
const PREDS = {
  'Jaime Castro':           [3, 0],
  '00Sebas':                [2, 0],
  'Leonardo Flores':        [4, 0],
  'Andrés Castro':          [4, 0],
  'Patricio Espinosa':      [3, 0],
  'Xavi':                   [3, 0],
  'Jose Espinosa':          [5, 0],
  'Pableins':               [3, 0],
  'Carolina':               [2, 0],
  'A':                      [3, 0],
  'Gaby':                   [2, 0],
  'Abelito':                [3, 0],
  'Aaaaa0Hector Paul':      [4, 0],
  'Waldo':                  [2, 0],
  'Jose':                   [3, 0],
  'Jh0N4':                  [2, 0],
  'Edri Villagran':         [3, 0],
  'Pamela Jesabel Carriel': [2, 0],
  'Andre Michelena':        [2, 0],
  'Juli':                   [5, 0],
  'Jordan Talahua':         [4, 1],
  'Adrian':                 [4, 1],
  'Rafael':                 [3, 1],
};

async function run() {
  const { rows } = await remote.query(
    `SELECT id, home_team, away_team FROM matches WHERE home_team ILIKE '%ecuador%' AND away_team ILIKE '%cura%' LIMIT 1`
  );

  if (!rows.length) {
    console.error('Partido Ecuador vs Curaçao no encontrado');
    await remote.end(); return;
  }

  const match = rows[0];
  console.log(`Partido: ${match.home_team} vs ${match.away_team} (id=${match.id})`);

  let ok = 0;
  for (const [name, [home, away]] of Object.entries(PREDS)) {
    const { rows: [user] } = await remote.query(`SELECT id FROM users WHERE user_name = $1`, [name]);
    if (!user) { console.log(`⚠ No encontrado: "${name}"`); continue; }
    await remote.query(`
      INSERT INTO match_predictions (match_id, user_id, home_score, away_score, points)
      VALUES ($1, $2, $3, $4, 0)
      ON CONFLICT (match_id, user_id) DO UPDATE SET home_score=$3, away_score=$4
    `, [match.id, user.id, home, away]);
    console.log(`✓ ${name}: ${home}-${away}`);
    ok++;
  }
  console.log(`\nHecho: ${ok} importados.`);
  await remote.end();
}

run().catch(e => { console.error(e.message); remote.end(); });
