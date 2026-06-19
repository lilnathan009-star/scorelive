const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';

// ESPN usa nombres distintos a football-data.org — normalizamos al mismo estándar
const ESPN_NAME_MAP = {
  'USA':           'United States',
  'Türkiye':       'Turkey',
  'Ivory Coast':   'Ivory Coast',
  'Korea Republic':'South Korea',
  'Bosnia-Herz':   'Bosnia-Herzegovina',
  'IR Iran':       'Iran',
  'Curaçao':       'Curaçao',
};

async function espnFetch(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  return res.json();
}

function mapStatus(name) {
  if (name === 'STATUS_IN_PROGRESS') return 'live';
  if (name === 'STATUS_HALFTIME')    return 'live';
  if (name === 'STATUS_FULL_TIME' || name === 'STATUS_FINAL') return 'finished';
  return 'pending';
}

function normName(n) { return ESPN_NAME_MAP[n] ?? n; }

function mapEvent(comp, event) {
  const home = comp.competitors.find(c => c.homeAway === 'home');
  const away = comp.competitors.find(c => c.homeAway === 'away');
  const st   = comp.status?.type;
  const isHT = st?.name === 'STATUS_HALFTIME';

  const goals = (comp.details || [])
    .filter(d => d.scoringPlay)
    .map(d => ({
      minute:   d.clock?.displayValue ?? '',
      team:     d.team?.id === home?.id ? 'home' : 'away',
      scorer:   d.athletesInvolved?.[0]?.shortName ?? '',
      ownGoal:  d.ownGoal,
      penalty:  d.penaltyKick,
    }));

  const cards = (comp.details || [])
    .filter(d => d.yellowCard || d.redCard)
    .map(d => ({
      minute:  d.clock?.displayValue ?? '',
      team:    d.team?.id === home?.id ? 'home' : 'away',
      player:  d.athletesInvolved?.[0]?.shortName ?? '',
      yellow:  d.yellowCard,
      red:     d.redCard,
    }));

  return {
    espnId:      comp.id,
    date:        comp.startDate,
    status:      mapStatus(st?.name),
    period:      isHT ? 'HT' : (st?.name === 'STATUS_IN_PROGRESS' ? 'live' : null),
    clock:       isHT ? 'MT' : (comp.status?.displayClock ?? null),
    home:        normName(home?.team?.shortDisplayName ?? ''),
    away:        normName(away?.team?.shortDisplayName ?? ''),
    homeScore:   home?.score != null ? parseInt(home.score) : null,
    awayScore:   away?.score != null ? parseInt(away.score) : null,
    homeLogo:    home?.team?.logo ?? '',
    awayLogo:    away?.team?.logo ?? '',
    goals,
    cards,
  };
}

// Todos los partidos del Mundial hoy (en vivo + recientes)
async function fetchWCScoreboard() {
  const data = await espnFetch('/scoreboard');
  return (data.events || []).map(ev => mapEvent(ev.competitions[0], ev));
}

// Partidos de una fecha específica YYYY-MM-DD
async function fetchWCScoreboardDate(date) {
  const d = date.replace(/-/g, '');
  const data = await espnFetch(`/scoreboard?dates=${d}`);
  return (data.events || []).map(ev => mapEvent(ev.competitions[0], ev));
}

module.exports = { fetchWCScoreboard, fetchWCScoreboardDate };
