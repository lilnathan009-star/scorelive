require('dotenv').config();
const pool = require('./src/config/db');

async function main() {
  const { rows } = await pool.query(`
    SELECT group_name, team1, team2, third_team
    FROM group_results WHERE tournament_id = 1
    ORDER BY group_name
  `);
  rows.forEach(r =>
    console.log(`Grupo ${r.group_name}: ${r.team1} / ${r.team2} / tercero: ${r.third_team ?? 'null'}`)
  );
  await pool.end();
}
main();
