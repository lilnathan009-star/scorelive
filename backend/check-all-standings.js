require('dotenv').config();
const { fetchESPNStandings } = require('./src/services/espnService');
const pool = require('./src/config/db');

async function main() {
  const standings = await fetchESPNStandings();

  console.log('=== ESPN STANDINGS vs DB ===\n');

  const { rows: dbResults } = await pool.query(
    'SELECT group_name, team1, team2, third_team FROM group_results WHERE tournament_id=1 ORDER BY group_name'
  );
  const dbMap = {};
  dbResults.forEach(r => dbMap[r.group_name] = r);

  const ESPN_NAME_MAP = {
    'Bosnia-Herz': 'Bosnia-Herzegovina',
    'USA': 'United States',
    'Türkiye': 'Turkey',
    'IR Iran': 'Iran',
    'Korea Republic': 'South Korea',
  };
  const norm = n => ESPN_NAME_MAP[n] ?? n;

  for (const group of standings) {
    const letter = group.group.replace('Group ', '');
    const table = group.table;
    const isComplete = table.length === 4 && table.every(t => t.played >= 3);

    console.log(`Grupo ${letter} (${isComplete ? 'COMPLETO' : 'en curso'}):`);
    table.forEach((t, i) => {
      console.log(`  ${i+1}° ${norm(t.team)} — ${t.points}pts GD:${t.gd} GF:${t.gf} (${t.played} partidos)`);
    });

    const db = dbMap[letter];
    if (db) {
      console.log(`  DB: ${db.team1} / ${db.team2} / tercero: ${db.third_team ?? 'null'}`);
      // Check mismatches
      const espn1 = norm(table[0]?.team);
      const espn2 = norm(table[1]?.team);
      if (isComplete && (db.team1 !== espn1 || db.team2 !== espn2)) {
        console.log(`  ⚠️  DISCREPANCIA! ESPN: ${espn1}/${espn2} vs DB: ${db.team1}/${db.team2}`);
      }
    } else {
      console.log(`  DB: NO EXISTE`);
    }
    console.log('');
  }

  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
