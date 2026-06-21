require('dotenv').config();
const { Pool } = require('pg');
const remote = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Tunisia (local) vs Japan (visitante)
// [home_score (Tunisia), away_score (Japan)]
const PREDS = {
  'Jordan Talahua':         [0, 2],
  'Jaime Castro':           [0, 1],
  'Rafael':                 [0, 2],
  'Xavi':                   [0, 3],
  'Carolina':               [0, 1],
  'Gaby':                   [0, 1],
  'Abelito':                [0, 2],
  'A':                      [0, 2],
  'Aaaaa0Hector Paul':      [0, 2],
  'Jose':                   [0, 1],
  'Leonardo Flores':        [0, 3],
  'Jh0N4':                  [0, 2],
  'Andre Michelena':        [0, 1],
  'Juli':                   [0, 2],
  'Andrés Castro':          [0, 2],
  'Patricio Espinosa':      [1, 2],
  'Pableins':               [1, 2],
  '00Sebas':                [1, 3],
  'Adrian':                 [1, 2],
  'Pamela Jesabel Carriel': [1, 2],
  'Waldo':                  [1, 2],
  'Edri Villagran':         [2, 1],
};

async function run() {
  const { rows } = await remote.query(
    `SELECT id, home_team, away_team FROM matches
     WHERE home_team ILIKE '%tun%' AND away_team ILIKE '%jap%' LIMIT 1`
  );

  if (!rows.length) {
    console.error('Partido Tunisia vs Japan no encontrado');
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
