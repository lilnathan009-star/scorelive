require('dotenv').config();
const pool = require('./src/config/db');

async function main() {
  // Equipos en group_predictions que NO están en ningún group_results
  const { rows } = await pool.query(`
    SELECT DISTINCT team FROM (
      SELECT team1 as team FROM group_predictions WHERE tournament_id=1
      UNION SELECT team2 FROM group_predictions WHERE tournament_id=1
      UNION SELECT third_team FROM group_predictions WHERE tournament_id=1
    ) t
    WHERE team IS NOT NULL
    AND team NOT IN (
      SELECT team1 FROM group_results WHERE tournament_id=1
      UNION SELECT team2 FROM group_results WHERE tournament_id=1
      UNION SELECT third_team FROM group_results WHERE tournament_id=1 AND third_team IS NOT NULL
    )
    ORDER BY team
  `);

  if (rows.length === 0) {
    console.log('✓ No hay nombres de equipos sin coincidencia');
  } else {
    console.log('⚠️  Equipos en picks que NO coinciden con ningún resultado:');
    rows.forEach(r => console.log('  -', r.team));
  }

  // Usuarios sin group predictions
  const { rows: noPicks } = await pool.query(`
    SELECT u.user_name FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM group_predictions gp WHERE gp.user_id = u.id AND gp.tournament_id = 1
    )
    ORDER BY u.user_name
  `);
  if (noPicks.length > 0) {
    console.log('\nUsuarios SIN picks de grupos:');
    noPicks.forEach(r => console.log('  -', r.user_name));
  }

  await pool.end();
}
main();
