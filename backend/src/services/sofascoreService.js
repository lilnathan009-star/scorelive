const API_KEY = process.env.SOFASCORE_API_KEY;
const API_HOST = 'sportapi7.p.rapidapi.com';
const BASE = 'https://sportapi7.p.rapidapi.com';

const HEADERS = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': API_HOST,
};

async function sofaFetch(path) {
  const url = `${BASE}${path}`;
  console.log(`[SportAPI7] GET ${url}`);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[SportAPI7] ${res.status} →`, body.slice(0, 300));
    throw new Error(`SportAPI7 ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Obtener datos de un evento específico por ID (para polling de score en vivo)
async function fetchEventScore(eventId) {
  const data = await sofaFetch(`/api/v1/event/${eventId}`);
  const ev = data.event;

  const homeScore = ev.homeScore?.current ?? null;
  const awayScore = ev.awayScore?.current ?? null;

  const statusType = ev.status?.type; // 'inprogress' | 'finished' | 'notstarted'
  const statusDesc = ev.status?.description ?? '';

  let status;
  if (statusType === 'inprogress') status = 'live';
  else if (statusType === 'finished') status = 'finished';
  else status = 'pending';

  // Calcular minuto desde el timestamp del período actual
  let minute = null;
  if (statusType === 'inprogress') {
    const now = Math.floor(Date.now() / 1000);
    const periodStart = ev.time?.currentPeriodStartTimestamp;
    if (periodStart) {
      const elapsed = Math.floor((now - periodStart) / 60);
      const isSecondHalf = statusDesc === '2nd half' || statusDesc.includes('Extra');
      const isHalftime = statusDesc === 'Halftime';
      if (isHalftime) {
        minute = 45;
      } else {
        minute = Math.min(elapsed + (isSecondHalf ? 45 : 0), isSecondHalf ? 90 : 45);
      }
    }
  }

  return { homeScore, awayScore, status, minute };
}

// Partidos de fútbol programados para una fecha (YYYY-MM-DD)
async function fetchScheduledEvents(date) {
  const data = await sofaFetch(`/api/v1/sport/football/scheduled-events/${date}`);
  return (data.events || []).map(mapEvent);
}

// Partidos en vivo de fútbol
async function fetchLiveEvents() {
  const data = await sofaFetch('/api/v1/sport/football/events/live');
  return (data.events || []).map(mapEvent);
}

// Buscar por nombre (equipo o torneo)
async function searchEvents(query) {
  const data = await sofaFetch(`/api/v1/search/${encodeURIComponent(query)}`);
  const events = (data.results || [])
    .filter(r => r.type === 'event')
    .map(r => mapEvent(r.entity));
  return events;
}

function mapEvent(ev) {
  return {
    api_match_id: ev.id,
    home_team: ev.homeTeam?.name,
    away_team: ev.awayTeam?.name,
    date: ev.startTimestamp ? new Date(ev.startTimestamp * 1000).toISOString() : null,
    status: ev.status?.type,
    status_desc: ev.status?.description,
    home_score: ev.homeScore?.current ?? null,
    away_score: ev.awayScore?.current ?? null,
    tournament: ev.tournament?.name,
    category: ev.tournament?.category?.name,
  };
}

module.exports = { fetchEventScore, fetchLiveEvents, fetchScheduledEvents, searchEvents };
