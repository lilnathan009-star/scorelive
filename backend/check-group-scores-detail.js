require('dotenv').config();
const pool = require('./src/config/db');

async function main() {
  const { rows: results } = await pool.query(
    'SELECT group_name, team1, team2, third_team FROM group_results WHERE tournament_id=1'
  );
  const resultMap = {};
  results.forEach(r => resultMap[r.group_name] = r);

  const { rows: users } = await pool.query('SELECT id, user_name FROM users ORDER BY user_name');

  for (const user of users) {
    const { rows: picks } = await pool.query(
      'SELECT group_name, team1, team2, third_team, points FROM group_predictions WHERE user_id=$1 AND tournament_id=1 ORDER BY group_name',
      [user.id]
    );

    let totalDB = 0, totalCalc = 0;
    const errors = [];

    for (const p of picks) {
      const r = resultMap[p.group_name];
      if (!r) continue;

      const allQualified = [r.team1, r.team2];
      if (r.third_team) allQualified.push(r.third_team);

      let calc = 0;
      for (const team of [p.team1, p.team2, p.third_team].filter(Boolean)) {
        if (allQualified.includes(team)) calc += 3;
      }

      totalDB += parseInt(p.points) || 0;
      totalCalc += calc;

      if (calc !== parseInt(p.points)) {
        errors.push(`  Grupo ${p.group_name}: picks=[${p.team1},${p.team2},${p.third_team}] DB=${p.points} CALC=${calc} (clasificados: ${allQualified.join(',')})`);
      }
    }

    if (errors.length > 0 || totalDB !== totalCalc) {
      console.log(`\n⚠️  ${user.user_name}: DB=${totalDB} CALC=${totalCalc}`);
      errors.forEach(e => console.log(e));
    } else {
      console.log(`✓  ${user.user_name}: ${totalDB} pts`);
    }
  }

  await pool.end();
}
main();
