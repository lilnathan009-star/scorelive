require('dotenv').config();
const pool = require('./src/config/db');
const { recalculateGroups } = require('./src/services/scoringService');

async function main() {
  // Ver cuántos picks tienen "DR Congo"
  const { rows: before } = await pool.query(`
    SELECT COUNT(*)::int as total FROM group_predictions
    WHERE team1='DR Congo' OR team2='DR Congo' OR third_team='DR Congo'
  `);
  console.log(`Picks con "DR Congo": ${before[0].total}`);

  // Corregir
  await pool.query(`UPDATE group_predictions SET team1='Congo DR' WHERE team1='DR Congo'`);
  await pool.query(`UPDATE group_predictions SET team2='Congo DR' WHERE team2='DR Congo'`);
  await pool.query(`UPDATE group_predictions SET third_team='Congo DR' WHERE third_team='DR Congo'`);
  console.log('✓ Nombres corregidos a "Congo DR"');

  // Recalcular
  const { rows: [t] } = await pool.query('SELECT id FROM tournaments ORDER BY id ASC LIMIT 1');
  await recalculateGroups(t.id, null);
  console.log('✓ Puntos recalculados');

  // Mostrar picks de Leonardo para verificar
  const { rows: leo } = await pool.query(`
    SELECT gp.group_name, gp.team1, gp.team2, gp.third_team, gp.points
    FROM group_predictions gp JOIN users u ON u.id=gp.user_id
    WHERE u.user_name='Leonardo Flores' AND gp.tournament_id=1
    ORDER BY gp.group_name
  `);
  console.log('\nLeonardo Flores verificado:');
  leo.forEach(r => console.log(`  Grupo ${r.group_name}: [${r.team1}, ${r.team2}, ${r.third_team}] = ${r.points}pts`));

  // Leaderboard grupos
  const { rows } = await pool.query(`
    SELECT u.user_name, COALESCE(SUM(gp.points),0)::int as group_pts
    FROM users u JOIN group_predictions gp ON gp.user_id=u.id AND gp.tournament_id=1
    GROUP BY u.user_name ORDER BY group_pts DESC
  `);
  console.log('\nPuntos grupos actualizados:');
  rows.forEach(r => console.log(`  ${r.user_name}: ${r.group_pts} pts`));

  await pool.end();
}
main();
