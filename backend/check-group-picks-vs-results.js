require('dotenv').config();
const pool = require('./src/config/db');

async function main() {
  // Ver picks de Waldo con los resultados al lado
  const { rows } = await pool.query(`
    SELECT
      gp.group_name,
      gp.team1 as pick1, gp.team2 as pick2, gp.third_team as pick3,
      gp.points,
      gr.team1 as res1, gr.team2 as res2, gr.third_team as res3
    FROM group_predictions gp
    JOIN users u ON u.id = gp.user_id
    LEFT JOIN group_results gr ON gr.tournament_id = gp.tournament_id AND gr.group_name = gp.group_name
    WHERE u.user_name = 'Waldo' AND gp.tournament_id = 1
    ORDER BY gp.group_name
  `);

  console.log('Waldo:');
  rows.forEach(r => {
    console.log(`Grupo ${r.group_name}: picks=[${r.pick1}, ${r.pick2}, ${r.pick3}] pts=${r.points} | resultado=[${r.res1}, ${r.res2}, ${r.res3}]`);
  });

  await pool.end();
}
main();
