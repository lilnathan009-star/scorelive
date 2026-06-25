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
  if (name === 'STATUS_IN_PROGRESS')    return 'live';
  if (name === 'STATUS_HALFTIME')       return 'live';
  if (name === 'STATUS_END_OF_PERIOD')  return 'live';
  if (name === 'STATUS_SECOND_HALF')    return 'live';
  if (name === 'STATUS_EXTRA_TIME')     return 'live';
  if (name === 'STATUS_OVERTIME')       return 'live';
  if (name === 'STATUS_PENALTY')        return 'live';
  if (name === 'STATUS_FULL_TIME' || name === 'STATUS_FINAL' ||
      name === 'STATUS_FINAL_AET'  || name === 'STATUS_FINAL_PEN') return 'finished';
  return 'pending';
}

function normName(n) { return ESPN_NAME_MAP[n] ?? n; }

// Convierte moneyline americano (+380, -160) a probabilidad implícita (0-1)
function mlToProb(odds) {
  const n = parseFloat(String(odds).replace(/[^0-9\-\+\.]/g, ''));
  if (isNaN(n)) return 0;
  return n > 0 ? 100 / (n + 100) : Math.abs(n) / (Math.abs(n) + 100);
}

// Extrae probabilidades normalizadas (sin vig) a partir de moneyline
function extractProbs(comp) {
  // Primero intentar predictor ESPN
  const pred = comp.predictor;
  const ph = pred?.homeTeam?.teamChancePct ?? pred?.homeTeam?.gameProjection;
  const pa = pred?.awayTeam?.teamChancePct ?? pred?.awayTeam?.gameProjection;
  if (ph != null && pa != null) {
    const home = parseFloat(ph), away = parseFloat(pa);
    const draw = Math.max(0, 100 - home - away);
    return { homePct: home, drawPct: draw, awayPct: away };
  }

  // Fallback: moneyline de DraftKings
  const ml = comp.odds?.[0]?.moneyline;
  if (!ml) return { homePct: null, drawPct: null, awayPct: null };

  const rh = mlToProb(ml.home?.close?.odds ?? ml.home?.open?.odds);
  const ra = mlToProb(ml.away?.close?.odds ?? ml.away?.open?.odds);
  const rd = mlToProb(ml.draw?.close?.odds ?? ml.draw?.open?.odds);
  const total = rh + ra + rd;
  if (total === 0) return { homePct: null, drawPct: null, awayPct: null };

  return {
    homePct: Math.round((rh / total) * 100),
    drawPct: Math.round((rd / total) * 100),
    awayPct: Math.round((ra / total) * 100),
  };
}

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

  const { homePct, drawPct, awayPct } = extractProbs(comp);

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
    homePct,
    drawPct,
    awayPct,
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
