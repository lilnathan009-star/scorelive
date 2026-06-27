require('dotenv').config();
const pool = require('./src/config/db');
const { recalculateGroups } = require('./src/services/scoringService');

async function main() {
  try {
    const { rows: [t] } = await pool.query('SELECT id FROM tournaments ORDER BY id ASC LIMIT 1');
    if (!t) { console.log('No hay torneo'); process.exit(0); }

    console.log(`Recalculando grupos para torneo ${t.id}...`);
    await recalculateGroups(t.id, null);

    const { rows } = await pool.query(`
      SELECT u.user_name, COALESCE(SUM(gp.points),0)::int as group_pts
      FROM users u
      JOIN group_predictions gp ON gp.user_id = u.id AND gp.tournament_id = $1
      GROUP BY u.user_name ORDER BY group_pts DESC
    `, [t.id]);

    console.log('\nPuntos de grupos actualizados:');
    rows.forEach(r => console.log(`  ${r.user_name}: ${r.group_pts} pts`));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
