const API_KEY = process.env.FOOTBALL_API_KEY;
const BASE = 'https://api.football-data.org/v4';
const HEADERS = { 'X-Auth-Token': API_KEY };

async function fdFetch(path) {
  const url = `${BASE}${path}`;
  console.log(`[football-data] GET ${url}`);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function mapMatch(m) {
  return {
    api_match_id: String(m.id),
    home_team: m.homeTeam?.name ?? m.homeTeam?.shortName ?? '',
    away_team: m.awayTeam?.name ?? m.awayTeam?.shortName ?? '',
    date: m.utcDate ?? null,
    status: m.status,
    home_score: m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? null,
    tournament: m.competition?.name ?? '',
    stage: m.stage ?? '',
    group: m.group ?? '',
  };
}

// Partidos en vivo del Mundial (WC)
async function fetchLiveEvents() {
  const data = await fdFetch('/competitions/WC/matches?status=IN_PLAY');
  return (data.matches || []).map(mapMatch);
}

// Partidos programados del Mundial (próximos)
async function fetchScheduledEvents() {
  const data = await fdFetch('/competitions/WC/matches?status=SCHEDULED,TIMED');
  return (data.matches || []).map(mapMatch);
}

// Todos los partidos del Mundial (para buscar por nombre de equipo)
async function searchEvents(query) {
  const data = await fdFetch('/competitions/WC/matches');
  const q = query.toLowerCase();
  const filtered = (data.matches || []).filter(m =>
    m.homeTeam?.name?.toLowerCase().includes(q) ||
    m.awayTeam?.name?.toLowerCase().includes(q) ||
    m.homeTeam?.shortName?.toLowerCase().includes(q) ||
    m.awayTeam?.shortName?.toLowerCase().includes(q)
  );
  return filtered.map(mapMatch);
}

// Tabla de posiciones por grupos
async function fetchStandings() {
  const data = await fdFetch('/competitions/WC/standings');
  return data.standings
    .filter(s => s.type === 'TOTAL')
    .map(s => ({
      group: s.group,
      table: s.table.map(r => ({
        position: r.position,
        team: r.team.shortName || r.team.name,
        tla: r.team.tla,
        crest: r.team.crest,
        played: r.playedGames,
        won: r.won,
        draw: r.draw,
        lost: r.lost,
        gf: r.goalsFor,
        ga: r.goalsAgainst,
        gd: r.goalDifference,
        points: r.points,
      }))
    }));
}

// Últimos resultados del Mundial
async function fetchRecentResults(limit = 20) {
  const data = await fdFetch('/competitions/WC/matches?status=FINISHED');
  const matches = data.matches || [];
  return matches.slice(-limit).reverse().map(m => ({
    id: m.id,
    date: m.utcDate,
    home: m.homeTeam.shortName || m.homeTeam.name,
    away: m.awayTeam.shortName || m.awayTeam.name,
    homeCrest: m.homeTeam.crest,
    awayCrest: m.awayTeam.crest,
    homeScore: m.score.fullTime.home,
    awayScore: m.score.fullTime.away,
    group: m.group?.replace('GROUP_', 'Grupo ') ?? m.stage,
  }));
}

module.exports = { fetchLiveEvents, fetchScheduledEvents, searchEvents, fetchStandings, fetchRecentResults };
