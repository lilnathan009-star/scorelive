import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocketService, LeaderboardEntry, LiveMatch } from '../../services/socket';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

const TEAM_ISO: Record<string, string> = {
  'Mexico': 'mx', 'México': 'mx',
  'Brazil': 'br', 'Brasil': 'br',
  'Argentina': 'ar', 'Colombia': 'co', 'Uruguay': 'uy', 'Chile': 'cl',
  'Ecuador': 'ec', 'Peru': 'pe', 'Perú': 'pe', 'Venezuela': 've',
  'Paraguay': 'py', 'Bolivia': 'bo', 'United States': 'us', 'USA': 'us',
  'Canada': 'ca', 'Costa Rica': 'cr', 'Honduras': 'hn',
  'Panama': 'pa', 'Panamá': 'pa', 'El Salvador': 'sv',
  'Jamaica': 'jm', 'Haiti': 'ht', 'Haití': 'ht', 'Trinidad and Tobago': 'tt',
  'Germany': 'de', 'Alemania': 'de', 'France': 'fr', 'Francia': 'fr',
  'Spain': 'es', 'España': 'es', 'Portugal': 'pt',
  'Netherlands': 'nl', 'Países Bajos': 'nl', 'England': 'gb-eng',
  'Italy': 'it', 'Italia': 'it', 'Belgium': 'be', 'Bélgica': 'be',
  'Croatia': 'hr', 'Croacia': 'hr', 'Switzerland': 'ch', 'Suiza': 'ch',
  'Poland': 'pl', 'Polonia': 'pl', 'Denmark': 'dk', 'Dinamarca': 'dk',
  'Austria': 'at', 'Sweden': 'se', 'Suecia': 'se', 'Norway': 'no', 'Noruega': 'no',
  'Ukraine': 'ua', 'Ucrania': 'ua', 'Serbia': 'rs', 'Turkey': 'tr', 'Turquía': 'tr',
  'Czech Republic': 'cz', 'Chequia': 'cz', 'Hungary': 'hu', 'Hungría': 'hu',
  'Slovakia': 'sk', 'Eslovaquia': 'sk', 'Scotland': 'gb-sct', 'Escocia': 'gb-sct',
  'Wales': 'gb-wls', 'Gales': 'gb-wls', 'Romania': 'ro', 'Rumanía': 'ro',
  'Albania': 'al', 'Georgia': 'ge', 'Slovenia': 'si', 'Eslovenia': 'si',
  'Morocco': 'ma', 'Marruecos': 'ma', 'Senegal': 'sn', 'Nigeria': 'ng',
  'Cameroon': 'cm', 'Camerún': 'cm', 'Ghana': 'gh', 'Egypt': 'eg', 'Egipto': 'eg',
  'South Africa': 'za', 'Sudáfrica': 'za', 'Ivory Coast': 'ci', 'Costa de Marfil': 'ci',
  'Algeria': 'dz', 'Argelia': 'dz', 'Tunisia': 'tn', 'Túnez': 'tn',
  'Mali': 'ml', 'Congo': 'cd', 'DR Congo': 'cd', 'Congo DR': 'cd',
  'Democratic Republic of Congo': 'cd', "Congo, DR": 'cd',
  'Cape Verde': 'cv', 'Cabo Verde': 'cv',
  'Czechia': 'cz',
  'Bosnia and Herzegovina': 'ba', 'Bosnia-Herzegovina': 'ba', 'Bosnia & Herzegovina': 'ba',
  'New Zealand': 'nz', 'Nueva Zelanda': 'nz',
  'South Korea': 'kr', 'Korea Republic': 'kr', 'Corea del Sur': 'kr',
  'Japan': 'jp', 'Japón': 'jp', 'Australia': 'au',
  'Saudi Arabia': 'sa', 'Arabia Saudí': 'sa', 'Iran': 'ir',
  'Curaçao': 'cw', 'Curacao': 'cw',
  'Qatar': 'qa', 'China': 'cn', 'Indonesia': 'id', 'Iraq': 'iq',
  'Jordan': 'jo', 'Jordania': 'jo', 'Uzbekistan': 'uz', 'Uzbekistán': 'uz',
  'Kenya': 'ke', 'Tanzania': 'tz', 'Zimbabwe': 'zw', 'Mozambique': 'mz',
  'Libya': 'ly', 'Sudan': 'sd', 'Ethiopia': 'et', 'Rwanda': 'rw',
  'Zambia': 'zm', 'Angola': 'ao', 'Benin': 'bj', 'Burkina Faso': 'bf',
  'Finland': 'fi', 'Greece': 'gr', 'Israel': 'il', 'Iceland': 'is',
  'Kosovo': 'xk', 'North Macedonia': 'mk', 'Montenegro': 'me',
};

const TEAM_ES: Record<string, string> = {
  // América del Norte y Central
  'Mexico': 'México', 'United States': 'EE.UU.', 'Canada': 'Canadá',
  'Costa Rica': 'Costa Rica', 'Honduras': 'Honduras', 'Panama': 'Panamá',
  'El Salvador': 'El Salvador', 'Jamaica': 'Jamaica', 'Haiti': 'Haití',
  'Trinidad and Tobago': 'Trinidad y Tobago', 'Curaçao': 'Curaçao',
  // América del Sur
  'Brazil': 'Brasil', 'Argentina': 'Argentina', 'Colombia': 'Colombia',
  'Uruguay': 'Uruguay', 'Chile': 'Chile', 'Ecuador': 'Ecuador',
  'Peru': 'Perú', 'Venezuela': 'Venezuela', 'Paraguay': 'Paraguay',
  'Bolivia': 'Bolivia', 'Cape Verde': 'Cabo Verde',
  // Europa
  'Germany': 'Alemania', 'France': 'Francia', 'Spain': 'España',
  'Portugal': 'Portugal', 'Netherlands': 'Países Bajos', 'England': 'Inglaterra',
  'Italy': 'Italia', 'Belgium': 'Bélgica', 'Croatia': 'Croacia',
  'Switzerland': 'Suiza', 'Poland': 'Polonia', 'Denmark': 'Dinamarca',
  'Austria': 'Austria', 'Sweden': 'Suecia', 'Norway': 'Noruega',
  'Ukraine': 'Ucrania', 'Serbia': 'Serbia', 'Turkey': 'Turquía',
  'Czech Republic': 'Rep. Checa', 'Czechia': 'Rep. Checa',
  'Hungary': 'Hungría', 'Slovakia': 'Eslovaquia', 'Scotland': 'Escocia',
  'Wales': 'Gales', 'Romania': 'Rumanía', 'Albania': 'Albania',
  'Georgia': 'Georgia', 'Slovenia': 'Eslovenia',
  'Bosnia-Herzegovina': 'Bosnia-Herzegovina', 'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'North Macedonia': 'Macedonia del Norte', 'Montenegro': 'Montenegro',
  'Kosovo': 'Kosovo', 'Finland': 'Finlandia', 'Greece': 'Grecia',
  'Iceland': 'Islandia', 'Israel': 'Israel',
  // África
  'Morocco': 'Marruecos', 'Senegal': 'Senegal', 'Nigeria': 'Nigeria',
  'Cameroon': 'Camerún', 'Ghana': 'Ghana', 'Egypt': 'Egipto',
  'South Africa': 'Sudáfrica', 'Ivory Coast': 'Costa de Marfil',
  'Algeria': 'Argelia', 'Tunisia': 'Túnez', 'Mali': 'Mali',
  'DR Congo': 'R.D. Congo', 'Congo DR': 'R.D. Congo',
  'Democratic Republic of Congo': 'R.D. Congo',
  // Asia y Oceanía
  'South Korea': 'Corea del Sur', 'Korea Republic': 'Corea del Sur',
  'Japan': 'Japón', 'Australia': 'Australia', 'Saudi Arabia': 'Arabia Saudí',
  'Iran': 'Irán', 'Qatar': 'Catar', 'China': 'China',
  'Indonesia': 'Indonesia', 'Iraq': 'Irak', 'Jordan': 'Jordania',
  'Uzbekistan': 'Uzbekistán', 'New Zealand': 'Nueva Zelanda',
};

function getFlagUrl(team: string): string {
  const iso = TEAM_ISO[team];
  return iso ? `https://flagcdn.com/w80/${iso}.png` : '';
}

function teamEs(name: string): string {
  return TEAM_ES[name] ?? name;
}

@Component({
  selector: 'app-leaderboard',
  imports: [CommonModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class Leaderboard implements OnInit, OnDestroy {
  readonly confetti = Array.from({length: 18}, (_, i) => i);

  entries: LeaderboardEntry[] = [];
  liveMatches: LiveMatch[] = [];
  currentMatchIdx = 0;

  // Vista activa
  activeView: 'leaderboard' | 'mundial' = 'leaderboard';
  mundialTab: 'standings' | 'results' | 'events' = 'standings';

  // Datos del Mundial
  wcStandings: any[] = [];
  wcResults: any[] = [];
  espnEvents: any[] = [];

  // Resumen fase de grupos
  groupSummary: any[] = [];
  selectedGroup = 'Group A';
  wcLoading = false;

  espnClockMap: Record<string, string> = {};
  espnGoalsMap: Record<string, {home: any[], away: any[]}> = {};

  private previousEntries: LeaderboardEntry[] = [];
  private subs: Subscription[] = [];
  private pollInterval: any;
  private matchPollInterval: any;
  private rotateInterval: any;
  private espnInterval: any;

  constructor(
    private socketService: SocketService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  openStream() {
    window.open('https://la16hd.com/dsportsar.php', 'dsports', 'width=640,height=380,resizable=yes');
  }

  ngOnInit() {
    this.cargarLeaderboard();
    this.loadStats();
    this.loadWCData();
    this.loadGroupSummary();

    // Correr polls fuera del zone de Angular para no triggear change detection en cada tick
    this.zone.runOutsideAngular(() => {
      this.pollInterval = setInterval(() => this.cargarLeaderboard(), 5000);
      this.matchPollInterval = setInterval(() => this.cargarPartidosVivos(), 30000);
      this.espnInterval = setInterval(() => { this.pollESPNClock(); this.refreshStandings(); }, 15000);
    });

    // Leaderboard via socket
    this.subs.push(
      this.socketService.onLeaderboardUpdate().subscribe(data => {
        if (data.length > 0) {
          const prev = [...this.entries];
          this.previousEntries = prev;
          this.entries = this.addPositions(data);
          this.recentChanges = this.entries
            .map(e => {
              const p = prev.find(x => x.user_id === e.user_id);
              return { user_id: e.user_id, user_name: e.user_name, position: e.position ?? 99, delta: p ? e.total_points - p.total_points : 0, trend: e.trend ?? 'same' };
            })
            .filter(e => e.delta !== 0)
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
            .slice(0, 5);
          if (this.recentChanges.length > 0) this.loadGossip();
          this.http.get<any[]>('/api/groups/summary').subscribe({
            next: gs => { this.groupSummary = gs; },
            error: () => {}
          });
          this.cdr.detectChanges();
        }
      })
    );

    // Lista completa de partidos (reemplaza el array — maneja partidos que terminan)
    this.subs.push(
      this.socketService.onLiveMatchesList().subscribe(list => {
        const prevLen = this.liveMatches.length;
        this.liveMatches = list.sort((a: LiveMatch, b: LiveMatch) => a.id - b.id);
        // Si el índice actual ya no existe, volver al primero
        if (this.currentMatchIdx >= this.liveMatches.length) {
          this.currentMatchIdx = 0;
        }
        // Iniciar rotación si recién aparecieron varios partidos
        if (prevLen <= 1 && this.liveMatches.length > 1) {
          this.startRotation();
        }
        this.cdr.detectChanges();
      })
    );

    // Actualización individual: score + minuto en tiempo real
    this.subs.push(
      this.socketService.onMatchUpdate().subscribe(match => {
        if (match.status === 'finished') {
          this.liveMatches = this.liveMatches.filter(m => m.id !== match.id);
          if (this.currentMatchIdx >= this.liveMatches.length) {
            this.currentMatchIdx = 0;
          }
        } else {
          const idx = this.liveMatches.findIndex(m => m.id === match.id);
          if (idx >= 0) {
            this.liveMatches[idx] = { ...this.liveMatches[idx], ...match };
          }
        }
        // Actualizar referencia del modal si el partido que cambió es el que está abierto
        if (this.predModalMatch && this.predModalMatch.id === match.id) {
          this.predModalMatch = { ...this.predModalMatch, ...match };
          // Recargar pronósticos para que los puntos se actualicen
          this.http.get<any[]>(`/api/predictions/match/${match.id}`).subscribe({
            next: data => { this.predModalPreds = data; this.cdr.detectChanges(); },
            error: () => {}
          });
        }
        this.cdr.detectChanges();
      })
    );

    // Carga inicial de partidos y ESPN
    this.cargarPartidosVivos();
    this.pollESPNClock();
  }

  startRotation() {
    clearInterval(this.rotateInterval);
    if (this.liveMatches.length <= 1) {
      this.currentMatchIdx = 0;
      return;
    }
    // Rotar entre todos los partidos (en vivo o pending)
    this.zone.runOutsideAngular(() => {
      this.rotateInterval = setInterval(() => {
        this.currentMatchIdx = (this.currentMatchIdx + 1) % this.liveMatches.length;
        this.cdr.detectChanges();
      }, 6000);
    });
  }

  get currentMatch(): LiveMatch | null {
    return this.liveMatches[this.currentMatchIdx] ?? null;
  }

  getFlagUrl(team: string): string { return getFlagUrl(team); }
  teamEs(name: string): string { return teamEs(name); }

  isLive(match: LiveMatch): boolean { return match.status === 'live'; }
  isPending(match: LiveMatch): boolean { return match.status === 'pending'; }

  formatMatchTime(match: LiveMatch): string {
    if (!match.match_date) return '';
    return new Date(match.match_date).toLocaleTimeString('es', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Guayaquil'
    });
  }

  formatMatchDay(match: LiveMatch): string {
    if (!match.match_date) return '';
    return new Date(match.match_date).toLocaleDateString('es', {
      day: 'numeric', month: 'short',
      timeZone: 'America/Guayaquil'
    });
  }

  cargarPartidosVivos() {
    this.http.get<LiveMatch[]>('/api/matches/live').subscribe({
      next: data => {
        this.liveMatches = data.sort((a: LiveMatch, b: LiveMatch) => a.id - b.id);
        if (this.currentMatchIdx >= this.liveMatches.length) {
          this.currentMatchIdx = 0;
        }
        this.startRotation();
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  loadGroupSummary() {
    this.http.get<any[]>('/api/groups/summary').subscribe({
      next: data => { this.groupSummary = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  cargarLeaderboard() {
    this.http.get<any[]>('/api/leaderboard').subscribe({
      next: data => {
        this.entries = this.addPositions(data);
        if (this.gossipPool.length === 0) this.loadGossip();
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  private loadSavedPositions(): Record<number, number> {
    try {
      const raw = localStorage.getItem('sl_positions');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  private savePositions(entries: LeaderboardEntry[]) {
    const map: Record<number, number> = {};
    entries.forEach(e => { if (e.position) map[e.user_id] = e.position; });
    localStorage.setItem('sl_positions', JSON.stringify(map));
  }

  addPositions(data: any[]): LeaderboardEntry[] {
    const saved = this.loadSavedPositions();
    const result = data.map((e, i) => {
      const newPos = i + 1;
      const prev = this.previousEntries.find(p => p.user_id === e.user_id);
      const prevPos = prev?.position ?? saved[e.user_id] ?? newPos;
      const delta = prevPos - newPos;
      return {
        ...e,
        total_points: Number(e.total_points),
        position: newPos,
        trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same',
        trendDelta: Math.abs(delta),
      };
    });
    this.savePositions(result);
    return result;
  }

  pollESPNClock() {
    this.http.get<any[]>('/api/espn/scoreboard').subscribe({
      next: events => {
        const clockMap: Record<string, string> = { ...this.espnClockMap };
        const goalsMap: Record<string, {home: any[], away: any[]}> = { ...this.espnGoalsMap };
        for (const ev of events) {
          const hasScore = (ev.homeScore ?? 0) > 0 || (ev.awayScore ?? 0) > 0;
          const isActive = ev.status === 'live' || (ev.status === 'pending' && hasScore);
          if (isActive || ev.status === 'finished') {
            const key = `${ev.home}|${ev.away}`;
            if (isActive) {
              clockMap[key] = ev.period === 'HT' ? 'MT' : (ev.clock ?? '');
            }
            if (ev.goals?.length > 0) {
              goalsMap[key] = {
                home: ev.goals.filter((g: any) => g.team === 'home'),
                away: ev.goals.filter((g: any) => g.team === 'away'),
              };
            }
          }
        }
        this.espnClockMap = clockMap;
        this.espnGoalsMap = goalsMap;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  getESPNClock(match: LiveMatch | null): string {
    if (!match) return '';
    const key = `${match.home_team}|${match.away_team}`;
    return this.espnClockMap[key] ?? '';
  }

  getMatchGoals(match: LiveMatch | null, side: 'home' | 'away'): any[] {
    if (!match) return [];
    const key = `${match.home_team}|${match.away_team}`;
    return this.espnGoalsMap[key]?.[side] ?? [];
  }

  switchView(v: 'leaderboard' | 'mundial') {
    this.activeView = v;
    if (v === 'mundial' && this.wcStandings.length === 0) {
      this.loadWCData();
    }
    this.cdr.detectChanges();
  }

  refreshStandings() {
    this.http.get<any[]>('/api/football/standings').subscribe({
      next: data => { this.wcStandings = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadWCData() {
    this.wcLoading = true;
    this.http.get<any[]>('/api/football/standings').subscribe({
      next: data => { this.wcStandings = data; this.wcLoading = false; this.cdr.detectChanges(); },
      error: () => { this.wcLoading = false; this.cdr.detectChanges(); }
    });
    this.http.get<any[]>('/api/football/results').subscribe({
      next: data => { this.wcResults = data; this.cdr.detectChanges(); },
      error: () => {}
    });
    this.http.get<any[]>('/api/espn/scoreboard').subscribe({
      next: data => { this.espnEvents = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  // Partidos ESPN del día seleccionado (para navegar entre días)
  espnSelectedDate = new Date().toISOString().slice(0, 10);

  loadESPNDate(offset: number) {
    const d = new Date(this.espnSelectedDate);
    d.setDate(d.getDate() + offset);
    this.espnSelectedDate = d.toISOString().slice(0, 10);
    this.http.get<any[]>(`/api/espn/scoreboard?date=${this.espnSelectedDate}`).subscribe({
      next: data => { this.espnEvents = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  formatESPNDate(): string {
    return new Date(this.espnSelectedDate + 'T12:00:00').toLocaleDateString('es', {
      weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Guayaquil'
    });
  }

  get currentGroupStandings(): any[] {
    return this.wcStandings.find(g => g.group === this.selectedGroup)?.table ?? [];
  }

  get groupNames(): string[] {
    return this.wcStandings.map(g => g.group);
  }

  get bestThirds(): any[] {
    return this.wcStandings
      .map(g => {
        const third = g.table?.[2];
        if (!third) return null;
        return { ...third, group: g.group.replace('Group ', '') };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.points - a.points || b.gd - a.gd || (b.goalsFor ?? 0) - (a.goalsFor ?? 0));
  }

  getFlagFromCrest(crest: string, teamName: string): string {
    const iso = TEAM_ISO[teamName];
    if (iso) return `https://flagcdn.com/w40/${iso}.png`;
    return crest ?? '';
  }

  formatResultDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es', {
      day: 'numeric', month: 'short',
      timeZone: 'America/Guayaquil'
    });
  }

  formatResultTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Guayaquil'
    });
  }

  get maxPoints(): number {
    if (this.entries.length === 0) return 1;
    return Math.max(...this.entries.map(e => e.total_points)) || 1;
  }

  private get _numCols(): number {
    const n = this.entries.length;
    return n <= 4 ? 1 : n <= 8 ? 2 : n <= 12 ? 3 : n <= 16 ? 4 : 5;
  }

  private get _perCol(): number {
    return Math.ceil(this.entries.length / this._numCols);
  }

  getPlayerX(entry: LeaderboardEntry): number {
    if (this.entries.length === 0) return 50;
    const col = Math.floor(((entry.position ?? 1) - 1) / this._perCol);
    if (this._numCols === 1) return 72;
    // col 0 (mejores) → 78%, col final (peores) → 14%
    return 78 - (col / (this._numCols - 1)) * 64;
  }

  getPlayerY(index: number, _total: number): number {
    const col = Math.floor(index / this._perCol);
    const posInCol = index % this._perCol;
    const colCount = Math.min(this._perCol, this.entries.length - col * this._perCol);
    if (colCount <= 1) return 50;
    const pad = 12;
    return pad + (posInCol / (colCount - 1)) * (100 - 2 * pad);
  }

  getFieldHeight(): number {
    return Math.min(500, Math.max(260, this._perCol * 66 + 60));
  }

  getPosEmoji(position: number): string {
    const map: Record<number, string> = {
      1:  '🤩', // eufórico
      2:  '😎', // cool
      3:  '😤', // determinado
      4:  '😁', // muy feliz
      5:  '😄', // contento
      6:  '🙂', // bien
      7:  '😌', // tranquilo
      8:  '🤔', // pensando
      9:  '😶', // sin palabras
      10: '😑', // meh
      11: '🙄', // eye-roll
      12: '😒', // aburrido
      13: '😔', // decaído
      14: '😟', // preocupado
      15: '😕', // confundido
      16: '😣', // sufriendo
      17: '😩', // agotado
      18: '😫', // exhausto
      19: '😢', // llorando
      20: '😭', // llorando a mares
      21: '😱', // gritando de horror
      22: '🤯', // cabeza explotada
      23: '💀', // muerto
      24: '🤦', // facepalm
      25: '😵', // knock-out
    };
    return map[position] ?? '😵';
  }

  trackById(_: number, e: LeaderboardEntry) { return e.user_id; }

  gossipMessages: { emoji: string; text: string }[] = [];
  private gossipPool: { emoji: string; text: string }[] = [];
  private gossipLoading = false;
  private gossipRotateInterval: any;

  statsData = { predictions: 0, accuracy: 0 };
  recentChanges: { user_id: number; user_name: string; position: number; delta: number; trend: string }[] = [];
  starPredictor = '';

  loadStats() {
    this.http.get<any>('/api/stats').subscribe({
      next: d => { this.statsData = d; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  get trendStats() {
    return {
      up: this.entries.filter(e => e.trend === 'up').length,
      down: this.entries.filter(e => e.trend === 'down').length,
    };
  }

  get achievements() {
    const e = this.entries;
    if (!e.length) return [];

    const used = new Set<string>();
    const list: { emoji: string; label: string; name: string }[] = [];

    const add = (emoji: string, label: string, raw: string) => {
      const name = raw.split(' ')[0];
      if (used.has(name)) return;
      used.add(name);
      list.push({ emoji, label, name });
    };

    // Líder
    add('👑', 'Líder', e[0].user_name);

    // Remontada: el que más subió y está más abajo en la tabla
    const climbers = e.filter(x => x.trend === 'up')
      .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
    if (climbers.length > 0) add('🚀', 'Remontada', climbers[0].user_name);

    // Pulpo Paul: mejor predictor — solo cuando ya cargó y no es el mismo jugador
    if (this.starPredictor) add('🐙', 'Pulpo Paul', this.starPredictor);

    // Cazador: 2do lugar subiendo, solo si hay espacio y es diferente
    if (list.length < 3 && e.length > 1 && e[1].trend === 'up') {
      add('🎯', 'Cazador', e[1].user_name);
    }

    return list;
  }

  loadGossip() {
    if (this.gossipLoading) return;
    this.gossipLoading = true;
    const leaderPool = this.buildLeaderboardPool();

    this.http.get<any[]>('/api/gossip-data').subscribe({
      next: matches => {
        const matchPool = this.buildMatchPool(matches);
        this.gossipPool = [...matchPool, ...leaderPool];
        this.gossipLoading = false;
        this.rotateGossip();
        this.startGossipRotation();
        this.cdr.detectChanges();
      },
      error: () => {
        this.gossipPool = leaderPool;
        this.gossipLoading = false;
        this.rotateGossip();
        this.startGossipRotation();
        this.cdr.detectChanges();
      }
    });
  }

  private buildMatchPool(matches: any[]): { emoji: string; text: string }[] {
    const pool: { emoji: string; text: string }[] = [];
    const fn = (name: string) => name.split(' ')[0];
    const tn = (t: string) => t.split(' ').slice(0, 2).join(' ');

    for (const m of matches) {
      if (!m.predictions?.length) continue;
      const rH = m.home_score, rA = m.away_score;
      const hN = tn(m.home_team), aN = tn(m.away_team);
      const result = rH > rA ? 'home' : rA > rH ? 'away' : 'draw';
      const winner = result === 'home' ? hN : result === 'away' ? aN : null;
      const loser  = result === 'home' ? aN : result === 'away' ? hN : null;

      const preds      = m.predictions;
      const total      = preds.length;
      const exactHits  = preds.filter((p: any) => p.pred_home === rH && p.pred_away === rA);
      const zeroPoints = preds.filter((p: any) => p.points === 0);
      const betHome    = preds.filter((p: any) => p.pred_home > p.pred_away);
      const betAway    = preds.filter((p: any) => p.pred_away > p.pred_home);
      const betDraw    = preds.filter((p: any) => p.pred_home === p.pred_away);
      const betWinner  = result === 'home' ? betHome : result === 'away' ? betAway : betDraw;
      const betLoser   = result === 'home' ? betAway : result === 'away' ? betHome : [];

      // ── Marcador exacto ──
      if (exactHits.length === 1) {
        pool.push({ emoji: '🎯', text: `${fn(exactHits[0].user_name)} fue el único que clavó el ${rH}-${rA} de ${hN} vs ${aN}.` });
      } else if (exactHits.length >= 2) {
        const ns = exactHits.slice(0, 2).map((p: any) => fn(p.user_name)).join(' y ');
        pool.push({ emoji: '🎯', text: `${ns} acertaron el ${rH}-${rA} exacto en ${hN} vs ${aN}. Cracks.` });
      } else if (exactHits.length === 0 && m.status === 'finished') {
        pool.push({ emoji: '🙈', text: `Nadie clavó el marcador exacto de ${hN} vs ${aN}. El fútbol es impredecible.` });
      }

      // ── Apostaron por el perdedor ──
      if (loser && betLoser.length === 1) {
        const p = betLoser[0];
        pool.push({ emoji: '😭', text: `${fn(p.user_name)} apostó ${p.pred_home}-${p.pred_away} por ${p.pred_home > p.pred_away ? hN : aN}. Ganó ${winner}.` });
      } else if (loser && betLoser.length >= 2 && betLoser.length <= 4) {
        const ns = betLoser.slice(0, 2).map((p: any) => fn(p.user_name)).join(', ');
        pool.push({ emoji: '😬', text: `${ns} y otros apostaron por ${loser}. ${winner} los dejó fríos.` });
      } else if (loser && betLoser.length > total * 0.55) {
        pool.push({ emoji: '💀', text: `${betLoser.length} de ${total} apostaron por ${loser}. ${winner} ganó. Masacre colectiva.` });
        pool.push({ emoji: '😤', text: `${winner} era el que nadie quería. Arrecho nunca muere, y si muere, muere arrecho ñaño.` });
      }

      // ── Pocos apostaron por el ganador ──
      if (winner && betWinner.length > 0 && betWinner.length <= 3 && total > 5) {
        const ns = betWinner.slice(0, 2).map((p: any) => fn(p.user_name)).join(' y ');
        pool.push({ emoji: '🦅', text: `Solo ${betWinner.length} creyeron en ${winner}. ${ns} entre ellos. Cobraron bien.` });
        pool.push({ emoji: '😤', text: `${winner} ganó y casi nadie lo vio venir. Arrecho nunca muere, y si muere, muere arrecho broder.` });
      }

      // ── Todos apostaron por el ganador ──
      if (winner && betWinner.length > total * 0.8) {
        pool.push({ emoji: '📖', text: `${betWinner.length} de ${total} apostaron por ${winner} y acertaron. Raro verlos a todos felices.` });
      }

      // ── Cero puntos ──
      if (zeroPoints.length > 0 && zeroPoints.length <= 3) {
        const ns = zeroPoints.map((p: any) => fn(p.user_name)).join(', ');
        pool.push({ emoji: '🥲', text: `${ns} sacó 0 puntos en ${hN} vs ${aN}. Día para olvidar.` });
      } else if (zeroPoints.length > 4) {
        pool.push({ emoji: '💥', text: `${zeroPoints.length} jugadores se fueron con cero en ${hN} vs ${aN}. Nadie lo vio venir.` });
        pool.push({ emoji: '😤', text: `${hN} vs ${aN} dejó a ${zeroPoints.length} con cero. Arrecho nunca muere, y si muere, muere arrecho. Pero este marcador mató a todos.` });
      }

      // ── Empate ──
      if (result === 'draw') {
        pool.push({ emoji: '😐', text: `Empate ${rH}-${rA} en ${hN} vs ${aN}. El resultado más difícil de adivinar.` });
        if (betDraw.length === 0) {
          pool.push({ emoji: '😂', text: `Nadie apostó por el empate de ${hN} vs ${aN}. Ni uno solo.` });
        } else if (betDraw.length === 1) {
          pool.push({ emoji: '🔮', text: `${fn(betDraw[0].user_name)} fue el único que apostó empate en ${hN} vs ${aN}. Adivino.` });
        }
      }
    }

    // Compute star predictor (player with most points across recent matches)
    const totals: Record<string, number> = {};
    for (const m of matches) {
      for (const p of (m.predictions || [])) {
        totals[p.user_name] = (totals[p.user_name] || 0) + (p.points || 0);
      }
    }
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    if (top) this.starPredictor = top[0].split(' ')[0];

    return pool;
  }

  private buildLeaderboardPool(): { emoji: string; text: string }[] {
    const e = this.entries;
    if (e.length < 2) return [];
    const n = (u: any) => u.user_name.split(' ')[0];
    const pool: { emoji: string; text: string }[] = [];

    const L  = n(e[0]);
    const UL = n(e[e.length - 1]);
    const d01 = e[0].total_points - e[1].total_points;

    // ── Líder ──
    pool.push(
      { emoji: '👑', text: `${L} con ${d01} pts de ventaja. ¿Alguien lo para?` },
      { emoji: '😴', text: `${L} durmiendo y sigue primero. Los demás sufriendo.` },
      { emoji: '🤷', text: `${L} viendo Netflix mientras los demás rezan.` },
      { emoji: '💪', text: `${L} aguanta el liderato. Por ahora.` },
      { emoji: '🎩', text: `${L} recibe coronas y ni se inmuta.` },
      { emoji: '🥱', text: `${L} bostezando en primer lugar. ¿Qué le hace?` },
      { emoji: '😎', text: `${L} en modo vacaciones mentales. Sigue primero igual.` },
      { emoji: '🏆', text: `${L} ya eligió dónde pone el trofeo. Que no se confíe.` },
      { emoji: '🤩', text: `${L} brilla desde el #1. Pero el torneo no terminó.` },
      { emoji: '🍑', text: `${L} arriba de todos. Así le gusta estar.` },
      { emoji: '🧘', text: `${L} ni suda. Los demás chorreando.` },
      { emoji: '🐓', text: `${L} canta primero y canta más duro que todos.` },
      { emoji: '🌡️', text: `${L} tiene los pronósticos calientes. El resto congelados.` },
      { emoji: '💆', text: `${L} se da masajes en el primer puesto. Muy cómodo ahí.` },
      { emoji: '🦁', text: `${L} rugiendo en la cima. Difícil de tumbar pero no imposible.` },
      { emoji: '🎻', text: `${L} toca el primer violín. Los demás ponen el ritmo.` },
      { emoji: '😇', text: `${L} ni reza antes de cada partido. Tampoco lo necesita.` },
      { emoji: '🛁', text: `${L} metido en la bañera de puntos. A gusto total.` },
      { emoji: '🐔', text: `${L} está como el gallo del barrio. Nadie se mete. Por ahora.` },
      { emoji: '💪', text: `${L} está teso pana. Duro de bajar ese man.` },
      { emoji: '😏', text: `${L} bien subido arriba de todos. Así nomás ñaño.` },
      { emoji: '🌶️', text: `${L} picante en la cima. Que le paren si pueden.` },
      { emoji: '🤙', text: `${L} ni se enferma de nervios. Ese es el man.` },
      { emoji: '🍺', text: `${L} en primero y ya brindando con caña. Que no se le suban los humos.` },
      { emoji: '🎯', text: `${L} la tiene bacán nomás. Los demás viendo cómo.` },
      { emoji: '🦅', text: `${L} volando solo en el primer lugar. De caña ese man.` },
      { emoji: '😤', text: `${L} bien arrecho arriba. Bajarlo va a costar.` },
      { emoji: '🍺', text: `${L} en primero. De ley se merece una biela fría.` },
      { emoji: '💪', text: `${L} de una en el liderato. Ya saaabe broder.` },
      { emoji: '🎯', text: `${L} pilas toda la jornada. Así se hace ñaño.` },
      { emoji: '👑', text: `${L} arriba y bien embalado. Los demás solo miran.` },
      { emoji: '😎', text: `${L} bacán nomás en el primero. Chévere que se sienta así.` },
      { emoji: '🎉', text: `${L} de farra en el primer puesto. Que dure la farra.` },
      { emoji: '🦅', text: `${L} volando de ley sobre todos. Pilas los que quieren alcanzarle.` },
      { emoji: '🤩', text: `${L} bien embalado pana. Qué mejor estar así de arriba.` },
      { emoji: '😤', text: `${L} primero y sin dar señales de bajar. Arrecho nunca muere, y si muere, muere arrecho ñaño.` },
    );

    // ── Segundo ──
    if (e.length >= 2) {
      const S = n(e[1]);
      pool.push(
        { emoji: '😤', text: `${S} en segundo otra vez. Duele más que el último.` },
        { emoji: '🔪', text: `${S} tan cerca y tan lejos. La eterna historia del eterno segundo.` },
        { emoji: '😏', text: `${S} dice que va tranquilo. Nadie le cree.` },
        { emoji: '🥈', text: `${S} coleccionando platas. Alguien tiene que hacerlo.` },
        { emoji: '😒', text: `${S} harto del segundo lugar. Pero ahí sigue.` },
        { emoji: '🫠', text: `${S} a ${d01} pts del primero. ${d01 <= 5 ? 'Alcanzable.' : 'Lejos.'}` },
        { emoji: '🤬', text: `${S} internamente destruido. Externamente sonríe.` },
        { emoji: '🚿', text: `${S} tan cerca de ${L} que casi le lava la espalda.` },
        { emoji: '👃', text: `${S} oliendo los talones de ${L}. A ver si alcanza.` },
        { emoji: '🛏️', text: `${S} duerme en el segundo piso. Quiere el penthouse.` },
        { emoji: '📮', text: `${S} siempre entrega primero pero llega segundo. Cruel.` },
        { emoji: '🪞', text: `${S} se mira al espejo y ve al futuro campeón. Por ahora solo ve el segundo.` },
        { emoji: '🔥', text: `${S} caliente como la caña de Otavalo. Pero aún no quema al primero.` },
        { emoji: '😤', text: `${S} tan cerca que le huele el champú a ${L}. Falta poco ñaño.` },
        { emoji: '🥈', text: `${S} coleccionando plata. Alguien tiene que hacerlo pana.` },
        { emoji: '💀', text: `${S} dice que no le molesta el segundo. Le molesta y harto.` },
        { emoji: '🐕', text: `${S} siguiendo a ${L} paso a paso. Como perro fiel pero con ganas de morder.` },
        { emoji: '😒', text: `${S} en segundo otra vez. Ya fue pana, pero el torneo no ha acabado.` },
        { emoji: '😅', text: `${S} segundo... mentira que no le afecta. Le afecta harto.` },
        { emoji: '🍺', text: `${S} pidió una biela en segundo lugar. Que la disfrute mientras piensa cómo subir.` },
        { emoji: '😤', text: `${S} arrecho con el segundo. Verás que en la próxima jornada truena.` },
        { emoji: '🤙', text: `${S} de ley va a llegar. Broder, tiempo al tiempo.` },
        { emoji: '🧠', text: `${S} pilas en el segundo puesto. Esperando su momento de ley.` },
      );
    }

    // ── Tercero ──
    if (e.length >= 3) {
      const T = n(e[2]);
      const d12 = e[1].total_points - e[2].total_points;
      pool.push(
        { emoji: '🎯', text: `${T} en tercero. El bronce también brilla, dicen.` },
        { emoji: '🤫', text: `${T} callado en el podio. Los silenciosos son peligrosos.` },
        { emoji: '😬', text: `${T} mirando arriba y abajo al mismo tiempo.` },
        { emoji: '🥉', text: `${T} tiene medalla pero quiere más. Normal.` },
        { emoji: '👁️', text: `${T} a ${d12} pts del segundo. La matemática existe.` },
        { emoji: '🎸', text: `${T} toca bien pero no es el solista. Todavía.` },
        { emoji: '🌡️', text: `${T} tibio en el podio. Ni frío ni caliente. Peligroso.` },
        { emoji: '🕯️', text: `${T} en bronce, encendido. El fuego puede crecer.` },
        { emoji: '😏', text: `${T} de tercero pero con caña. Los del podio que se cuiden.` },
        { emoji: '🤫', text: `${T} chambea callado desde el tercero. Eso es lo peligroso.` },
        { emoji: '🧲', text: `${T} pegadito al podio. Nomás no llega al segundo todavía.` },
        { emoji: '😏', text: `${T} en bronce bien fresco. Pilas que ese man sube de ley.` },
        { emoji: '🍺', text: `${T} toma su biela en el tercero y planea el asalto. Pilas.` },
      );
    }

    // ── Cuarto ──
    if (e.length >= 4) {
      const C = n(e[3]);
      pool.push(
        { emoji: '😭', text: `${C} a un paso del podio. Un paso que parece kilómetros.` },
        { emoji: '💔', text: `${C} el mejor de los que no están en top 3. Pobre consuelo.` },
        { emoji: '😡', text: `${C} fuera del podio otra vez. La rabia se acumula.` },
        { emoji: '🫤', text: `${C} en cuarto. Ni chicha ni limonada.` },
        { emoji: '🔥', text: `${C} a punto de entrar al podio. O no. Quién sabe.` },
        { emoji: '🚪', text: `${C} tocando la puerta del podio. Nadie abre.` },
        { emoji: '🪑', text: `${C} sin silla en el podio. La música paró justo antes.` },
        { emoji: '4️⃣', text: `${C} en cuarto. El número más ingrato del fútbol.` },
        { emoji: '😮‍💨', text: `${C} suspirando fuerte desde el cuarto escalón.` },
        { emoji: '🤦', text: `${C} fuera del podio. Qué macana man.` },
        { emoji: '😡', text: `${C} arrecho con la tabla. La tabla no le hace caso.` },
        { emoji: '🍺', text: `${C} pidió caña para el dolor del cuarto puesto. La segunda ronda.` },
        { emoji: '😵', text: `${C} chuta, qué dolor el cuarto puesto broder.` },
        { emoji: '🥲', text: `${C} afuera del podio. La plena que duele? De ley que sí.` },
        { emoji: '😤', text: `${C} arrecho con el cuarto. Verás que ese man truena pronto.` },
      );
    }

    // ── Quinto ──
    if (e.length >= 5) {
      const Q = n(e[4]);
      pool.push(
        { emoji: '👀', text: `${Q} en quinto. Acechando. Siempre acechando.` },
        { emoji: '🤙', text: `${Q} a un partido de cambiar todo. Eso dicen todos.` },
        { emoji: '🎲', text: `${Q} necesita que los de arriba fallen. El fútbol es así.` },
        { emoji: '🕵️', text: `${Q} en quinto, peligroso cuando nadie lo ve.` },
        { emoji: '🐍', text: `${Q} en modo serpiente. Quieto pero listo para morder.` },
        { emoji: '🥊', text: `${Q} calentando los puños. El podio que cuide la espalda.` },
        { emoji: '🐍', text: `${Q} en modo serpiente serrana. Quieto pero listo.` },
        { emoji: '😤', text: `${Q} bien arrecho desde el quinto. Eso es motivación nomás.` },
        { emoji: '🎯', text: `${Q} tripea desde el quinto. Cuando llega, llega de caña.` },
        { emoji: '👀', text: `${Q} en el quinto pilas. Ese man no está de adorno.` },
        { emoji: '🤙', text: `${Q} dale que dale desde el quinto. De una que sube.` },
      );
    }

    // ── Rivalidades entre pares consecutivos ──
    for (let i = 0; i < Math.min(e.length - 1, 12); i++) {
      const A = n(e[i]), B = n(e[i + 1]);
      const d = e[i].total_points - e[i + 1].total_points;
      if (d === 0) {
        pool.push(
          { emoji: '🤝', text: `${A} y ${B} igualados en puntos. Solo el desempate los separa.` },
          { emoji: '⚖️', text: `${A} y ${B} empatados. El próximo partido decide.` },
          { emoji: '😳', text: `${A} y ${B} con los mismos puntos. Tensión máxima.` },
          { emoji: '🫱🫲', text: `${A} y ${B} juntos en puntos. Pero solo uno puede quedar arriba.` },
          { emoji: '🥊', text: `${A} y ${B} igualados. La próxima jornada los separa.` },
          { emoji: '🔥', text: `${A} y ${B} empatados ñaño. Eso duele más que perder solo.` },
          { emoji: '😤', text: `${A} y ${B} igualitos. Los dos arrechos y los dos sin poder subir.` },
          { emoji: '⚡', text: `${A} y ${B} igualados. Más peleados que liguista y barcelonista.` },
          { emoji: '😅', text: `${A} y ${B} empatados... la plena? De ley que sí ñaño.` },
        );
      } else if (d <= 2) {
        pool.push(
          { emoji: '⚡', text: `${A} y ${B} a ${d} pt${d > 1 ? 's' : ''}. Un gol de diferencia.` },
          { emoji: '🔥', text: `${B} persigue a ${A} con ${d} pt${d > 1 ? 's' : ''}. Modo cazador.` },
          { emoji: '😰', text: `${A} con ${d} pt${d > 1 ? 's' : ''} sobre ${B}. Duerme mal.` },
          { emoji: '💣', text: `${A} vs ${B}: ${d} pt${d > 1 ? 's' : ''} de diferencia. Esto explota.` },
          { emoji: '🔫', text: `${A} y ${B} afilando los cuchillos. Solo queda uno en pie.` },
          { emoji: '🧨', text: `${A} y ${B} con ${d} pt${d > 1 ? 's' : ''} de diferencia. Dinamita pura.` },
          { emoji: '🌶️', text: `${A} y ${B} peleados más que mono y serrano. ${d} pt${d > 1 ? 's' : ''} nomás los separa.` },
          { emoji: '😤', text: `${B} bien arrecho con ${A}. ${d} pt${d > 1 ? 's' : ''} de diferencia y ya se siente.` },
          { emoji: '🎯', text: `${B} pilas detrás de ${A}. ${d} pt${d > 1 ? 's' : ''} de diferencia y de una que lo alcanza.` },
          { emoji: '🍺', text: `${A} con ${d} pt${d > 1 ? 's' : ''} sobre ${B}. Los dos necesitan una biela pa' los nervios.` },
        );
      } else if (d <= 5) {
        pool.push(
          { emoji: '👀', text: `${B} a ${d} pts de ${A}. Se viene.` },
          { emoji: '🏃', text: `${B} corriendo detrás de ${A}. La distancia se cierra.` },
          { emoji: '😤', text: `${A} siente el aliento de ${B}. Son ${d} pts.` },
          { emoji: '🎯', text: `${B} apunta directo a ${A}. Buena puntería.` },
          { emoji: '🐕', text: `${B} detrás de ${A} como perro en cacería. No suelta.` },
          { emoji: '🏃', text: `${B} corriendo al ${A} como cobrador de deudas. ${d} pts debe.` },
          { emoji: '👀', text: `${B} mirando a ${A} como el perro mira el hueso. Ya va a morder.` },
          { emoji: '😤', text: `${B} arrecho con ${A} desde hace jornadas. Verás que cuando llegue truena.` },
          { emoji: '🤙', text: `${B} de una que alcanza a ${A}. Dale broder, son ${d} pts nomás.` },
        );
      } else if (d <= 10) {
        pool.push(
          { emoji: '🎯', text: `${B} a ${d} pts de ${A}. Lejos pero no imposible.` },
          { emoji: '🤔', text: `${A} cómodo ${d} pts sobre ${B}. Por ahora.` },
          { emoji: '🔭', text: `${B} necesita telescopio para ver a ${A}. ${d} pts de distancia.` },
        );
      }
    }

    // ── Subiendo ──
    for (const r of e.filter(x => x.trend === 'up')) {
      const R = n(r);
      pool.push(
        { emoji: '🚀', text: `${R} de remontada. No lo den por muerto.` },
        { emoji: '📈', text: `${R} subiendo esta jornada. Los de arriba que abran los ojos.` },
        { emoji: '😤', text: `${R} activó el modo bestia. Cuidado con él.` },
        { emoji: '🔝', text: `${R} en racha. Algo hizo bien esta vez.` },
        { emoji: '💥', text: `${R} explotó esta jornada. No para.` },
        { emoji: '🎯', text: `${R} acertando de a poco. Va escalando.` },
        { emoji: '🌶️', text: `${R} picante esta jornada. Quema desde abajo.` },
        { emoji: '🎣', text: `${R} pescando puntos mientras otros ven el río pasar.` },
        { emoji: '🏋️', text: `${R} levantó puntos esta ronda. Bien pesados.` },
        { emoji: '⬆️', text: `${R} para arriba como los precios. Sin parar.` },
        { emoji: '🔑', text: `${R} encontró la llave. Ahora a ver qué puerta abre.` },
        { emoji: '🌶️', text: `${R} subiendo picante ñaño. Cuidado los de arriba.` },
        { emoji: '💪', text: `${R} chambea duro esta jornada. Se nota y cómo.` },
        { emoji: '🤙', text: `${R} de caña esta ronda. Ese man no para.` },
        { emoji: '🐂', text: `${R} toro suelto subiendo la tabla. Que le paren.` },
        { emoji: '🎯', text: `${R} metiéndola al ángulo esta jornada. Al pelo nomás.` },
        { emoji: '😤', text: `${R} bien arrecho para arriba. Cuando se arrecha ese man no hay quien lo pare.` },
        { emoji: '🚀', text: `${R} de una para arriba ñaño. Dale que dale.` },
        { emoji: '⚡', text: `${R} embalado esta jornada. Pilas los de arriba broder.` },
        { emoji: '🍺', text: `${R} subiendo y ya merece una biela. Se la ganó de ley.` },
        { emoji: '🎯', text: `${R} pilas esta jornada. De ley que no para.` },
        { emoji: '🔥', text: `${R} en farra de puntos. No para ni a tomar trago.` },
        { emoji: '😤', text: `${R} arrecho para arriba. Qué mejor cuando así se pone.` },
        { emoji: '😤', text: `${R} subiendo sin parar. Arrecho nunca muere, y si muere, muere arrecho broder.` },
      );
    }

    // ── Bajando ──
    for (const f of e.filter(x => x.trend === 'down')) {
      const F = n(f);
      pool.push(
        { emoji: '😭', text: `${F} apostó con el corazón. El corazón le falló.` },
        { emoji: '🪦', text: `Los pronósticos de ${F} esta jornada, descansen en paz.` },
        { emoji: '🤦', text: `${F} vio el partido y lloró. Los puntos también.` },
        { emoji: '📉', text: `${F} bajando. Así es el fútbol, amigo.` },
        { emoji: '😬', text: `${F} eligió mal. Todos elegimos mal a veces.` },
        { emoji: '🥲', text: `${F} dice que tenía razón pero la tabla no opina lo mismo.` },
        { emoji: '🛝', text: `${F} en tobogán. Hacia abajo y sin frenos.` },
        { emoji: '🧊', text: `${F} más frío que sus pronósticos. Y eso ya es decir.` },
        { emoji: '💸', text: `${F} botó los puntos como si sobraran. No sobraban.` },
        { emoji: '🚽', text: `Los puntos de ${F} fueron directo al drenaje esta jornada.` },
        { emoji: '🪁', text: `${F} apuntó, lanzó y falló. Qué puntería la de él.` },
        { emoji: '🎪', text: `${F} convirtió su pronóstico en un show. Lástima que nadie aplaudió.` },
        { emoji: '🤦', text: `${F} falló más que un chiro en casino. Qué macana.` },
        { emoji: '😭', text: `${F} más perdido que turista en la Mitad del Mundo.` },
        { emoji: '🍺', text: `${F} esta jornada solo ganó sed. Y ni caña alivió el dolor.` },
        { emoji: '🌊', text: `${F} surfeando el fondo de la tabla. Sin tabla.` },
        { emoji: '🥲', text: `${F} se la pensó mucho, salió peor. Qué macana pana.` },
        { emoji: '🎰', text: `${F} apostó con corazón de guambra. El fútbol no perdona eso.` },
        { emoji: '💀', text: `${F} botó los puntos como volantes de descuento. Gratis y todo.` },
        { emoji: '🤷', text: `${F} ya fue esta jornada. Que Dios y el próximo partido le ayuden.` },
        { emoji: '😵', text: `${F} con chuchaqui de malos pronósticos. Y ni chupo.` },
        { emoji: '💀', text: `${F} chiro de puntos ñaño. Chiro total.` },
        { emoji: '🤦', text: `${F} chuta, qué jornada tan carajo la de ese man.` },
        { emoji: '🥲', text: `${F} lámpara la situación broder. Bien lámpara.` },
        { emoji: '😭', text: `${F} apostó de farra y salió chumado de puntos negativos.` },
        { emoji: '🧟', text: `${F} bajando como loquillo. Qué pasó con ese man.` },
        { emoji: '😤', text: `${F} arrecho con sus propios pronósticos. Y tiene razón.` },
      );
    }

    // ── Zona media (pos 6-14) ──
    for (const m of e.filter(x => (x.position ?? 99) >= 6 && (x.position ?? 99) <= 14)) {
      const M = n(m);
      pool.push(
        { emoji: '😐', text: `${M} en tierra de nadie. Ni arriba ni abajo.` },
        { emoji: '👀', text: `${M} acechando desde el medio. Nadie lo nota todavía.` },
        { emoji: '🤔', text: `${M} lleva jornadas sin moverse. El hombre del statu quo.` },
        { emoji: '🎭', text: `${M} en el medio del drama sin ser parte del drama.` },
        { emoji: '⏳', text: `${M} esperando su momento. Sigue esperando.` },
        { emoji: '🥙', text: `${M} en el relleno del sándwich. Sin ser pan ni carne.` },
        { emoji: '🚦', text: `${M} en amarillo permanente. Ni avanza ni retrocede.` },
        { emoji: '🫥', text: `${M} invisible desde la mitad. Ni amenaza ni sufre. Raro.` },
        { emoji: '🐠', text: `${M} nadando en el medio del banco. Tranquilo pero perdido.` },
        { emoji: '📻', text: `${M} en la frecuencia del medio. Sin señal clara.` },
        { emoji: '😴', text: `${M} echando siesta en el medio. Sin prisa, sin gloria pana.` },
        { emoji: '🤷', text: `${M} ni arriba ni abajo. Como sánduche sin sal ñaño.` },
        { emoji: '☕', text: `${M} en zona de confort tomando cafecito. El confort es el enemigo.` },
        { emoji: '🦥', text: `${M} a paso de perezoso en el medio de la tabla. Llegarás... algún día.` },
        { emoji: '🌫️', text: `${M} invisible desde la mitad. Como niebla de Quito.` },
        { emoji: '🎭', text: `${M} actor de reparto en su propia pelicula mundialista.` },
        { emoji: '😴', text: `${M} fresco en el medio. Demasiado fresco broder.` },
        { emoji: '🤷', text: `${M} en cacho permanente desde el medio. Ni sube ni baja.` },
        { emoji: '☕', text: `${M} vacilar tranquilo en la mitad de la tabla. O sea... qué más.` },
        { emoji: '🌫️', text: `${M} invisible como niebla de Quito. Ahí está pero no se ve.` },
        { emoji: '😏', text: `${M} chévere el man pero sin moverse. Qué fue ñaño.` },
        { emoji: '🦥', text: `${M} a paso de perezoso. Llegarás broder... algún día.` },
      );
    }

    // ── Zona baja ──
    for (const p of e.filter(x => (x.position ?? 99) >= 15 && (x.position ?? 99) < e.length)) {
      const P = n(p);
      pool.push(
        { emoji: '😬', text: `${P} en zona de peligro. No es el lugar que quería.` },
        { emoji: '🆘', text: `${P} necesita puntos urgente. Urgentísimo.` },
        { emoji: '😓', text: `${P} mirando la tabla y preferiría no mirarla.` },
        { emoji: '🙈', text: `${P} cerró los ojos y la tabla sigue igual.` },
        { emoji: '🕳️', text: `${P} cayendo en el hoyo. Y el hoyo es profundo.` },
        { emoji: '🔦', text: `${P} necesita linterna para ver la salida desde donde está.` },
        { emoji: '⛏️', text: `${P} cavando hacia arriba. Largo el camino que viene.` },
        { emoji: '🍺', text: `${P} ya pidió otra en la barra del fondo. Que alivie.` },
        { emoji: '😬', text: `${P} en zona de peligro. Qué macana la suya ñaño.` },
        { emoji: '🌧️', text: `${P} más nublado que Quito en invierno. Todo gris por allá.` },
        { emoji: '🥲', text: `${P} mirando la tabla pa que cambie sola. No cambia pana.` },
        { emoji: '🤦', text: `${P} botó la bola esta jornada y le salió caro.` },
        { emoji: '🆘', text: `${P} necesita puntos urgente. Urgentísimo ñaño. Ya.` },
        { emoji: '😵', text: `${P} chiro de puntos y sin trago que lo alivie.` },
        { emoji: '🍺', text: `${P} ya pidió la jaba entera. Pa' olvidar la tabla.` },
        { emoji: '😤', text: `${P} arrecho con su situación. Verás que explota pronto.` },
        { emoji: '💀', text: `${P} chuta broder, qué zona tan carajo donde está.` },
        { emoji: '🤦', text: `${P} con chuchaqui de toda la jornada. Qué lámpara.` },
      );
    }

    // ── Último ──
    pool.push(
      { emoji: '💀', text: `${UL} en el sótano. Una remontada épica sería histórica.` },
      { emoji: '🙏', text: `${UL} necesita un milagro. El fútbol tiene de eso.` },
      { emoji: '🤡', text: `${UL} apostó con lógica. El fútbol no tiene lógica.` },
      { emoji: '😤', text: `${UL} dice que el próximo partido lo cambia todo. Siempre.` },
      { emoji: '🥲', text: `${UL} último pero con dignidad. Eso cuenta, ¿no?` },
      { emoji: '🫡', text: `${UL} desde el fondo lucha. Respeto.` },
      { emoji: '🎰', text: `${UL} arriesgó en todos los partidos. Así salió.` },
      { emoji: '😵', text: `${UL} revisando qué salió mal. Spoiler: todo.` },
      { emoji: '🌱', text: `${UL} en el último lugar pero el torneo no terminó.` },
      { emoji: '🏗️', text: `${UL} construyendo desde los cimientos. Muy desde los cimientos.` },
      { emoji: '📡', text: `Los puntos de ${UL} no tienen señal. Se perdieron en el camino.` },
      { emoji: '🧯', text: `${UL} apagando incendios con más incendios. No funciona.` },
      { emoji: '🐢', text: `${UL} va a su ritmo. Muy. Su. Ritmo.` },
      { emoji: '🌋', text: `${UL} necesita una erupción de puntos. Urgente.` },
      { emoji: '🏚️', text: `${UL} vive en el sótano. Hay peores barrios, dicen.` },
      { emoji: '🥚', text: `${UL} prometió huevos y entregó cáscaras. Partido tras partido.` },
      { emoji: '🎪', text: `${UL} ha hecho del último lugar su propio circo. Función diaria.` },
      { emoji: '🫳', text: `${UL} soltando todo esta jornada. Puntos incluidos.` },
      { emoji: '🔋', text: `${UL} en rojo total. Sin batería, sin puntos, sin explicación.` },
      { emoji: '💀', text: `${UL} tan abajo que los demás necesitan GPS para encontrarle.` },
      { emoji: '🥲', text: `${UL} en el fondo del tanque. El fondo del fondo pana.` },
      { emoji: '🍺', text: `${UL} ya pidió la caña más grande del local. Para olvidar nomás.` },
      { emoji: '🤡', text: `${UL} apostó con corazón de guambra. El fútbol no tiene corazón ñaño.` },
      { emoji: '😵', text: `${UL} más chiro de puntos que nadie. Cero, nada, ni uno.` },
      { emoji: '🌋', text: `${UL} necesita una erupción de puntos. Del Cotopaxi pa arriba.` },
      { emoji: '🧟', text: `${UL} sigue vivo en el torneo. Medio vivo pero vivo.` },
      { emoji: '🏚️', text: `${UL} vive en el sótano de la tabla. Hay peores barrios dicen.` },
      { emoji: '🤷', text: `${UL} ya fue pana. Pero el fútbol da revancha. A veces.` },
      { emoji: '😤', text: `${UL} arrecho desde el último lugar. Esa rabia hay que meterla en los pronósticos.` },
      { emoji: '🦆', text: `${UL} nadando en el fondo solo. Ni los patos le hacen compañía.` },
      { emoji: '🍺', text: `${UL} necesita una jaba entera de bielas pa' procesar esta tabla.` },
      { emoji: '😵', text: `${UL} con el chuchaqui más largo del torneo. Y ni chupo.` },
      { emoji: '🤡', text: `${UL} loquillo apostando al revés toda la jornada. Qué fue.` },
      { emoji: '😤', text: `${UL} arrecho con todo: los pronósticos, el fútbol, la vida, la tabla.` },
      { emoji: '💀', text: `${UL} chiro de puntos. Ni contando los canguiles alcanza.` },
      { emoji: '🥲', text: `${UL} de ley ya fue broder. Pero verás que remonta. Mentira. O no.` },
      { emoji: '🧟', text: `${UL} más abajo que los cimientos. Chuta la situación ñaño.` },
      { emoji: '😭', text: `${UL} tan chiro de puntos que hasta el último lugar se puso foco.` },
      { emoji: '🎰', text: `${UL} apostó como loquillo y salió como chiro. Así nomás es.` },
    );

    return pool;
  }

  startGossipRotation() {
    if (this.gossipRotateInterval) return;
    this.zone.runOutsideAngular(() => {
      this.gossipRotateInterval = setInterval(() => {
        this.rotateGossip();
        this.cdr.detectChanges();
      }, 20000);
    });
  }

  rotateGossip() {
    this.gossipMessages = [...this.gossipPool]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  }

  get topRivalry() {
    const e = this.entries;
    if (e.length < 2) return null;
    let best = { a: e[0], b: e[1], diff: e[0].total_points - e[1].total_points };
    for (let i = 1; i < e.length - 1; i++) {
      const diff = e[i].total_points - e[i + 1].total_points;
      if (diff < best.diff) best = { a: e[i], b: e[i + 1], diff };
    }
    return best;
  }

  private readonly FORMATION_ROLES: Record<string, string[]> = {
    fwd: ['LW', 'CF', 'RW'],
    mid: ['LCM', 'CM', 'RCM'],
    def: ['LB',  'LCB', 'RCB', 'RB'],
    gk:  ['GK'],
  };

  getRole(row: string, index: number): string {
    return this.FORMATION_ROLES[row]?.[index] ?? '';
  }

  // Fila de delanteros: CF (#1) al centro, LW (#2) izq, RW (#3) der
  get forwardRow() {
    const e = this.entries;
    return [
      { entry: e[1], role: 'LW', cf: false },
      { entry: e[0], role: 'CF', cf: true  },
      { entry: e[2], role: 'RW', cf: false },
    ].filter(x => x.entry);
  }

  // Modal picks de grupos
  showGroupPicksModal = false;
  groupPicksUser = '';
  groupPicksList: any[] = [];
  groupPicksLoading = false;

  openGroupPicksModal(entry: LeaderboardEntry) {
    this.groupPicksUser = entry.user_name;
    this.groupPicksList = [];
    this.groupPicksLoading = true;
    this.showGroupPicksModal = true;
    this.http.get<any[]>(`/api/groups/picks/${encodeURIComponent(entry.user_name)}`).subscribe({
      next: data => { this.groupPicksList = data; this.groupPicksLoading = false; this.cdr.detectChanges(); },
      error: () => { this.groupPicksLoading = false; this.cdr.detectChanges(); }
    });
  }

  closeGroupPicksModal() {
    this.showGroupPicksModal = false;
    this.groupPicksUser = '';
  }

  getMatchProbs(match: LiveMatch | null): { home: number; draw: number; away: number } | null {
    if (!match) return null;
    const ev = this.espnEvents.find(e =>
      e.home === match.home_team && e.away === match.away_team
    );
    if (!ev || ev.homePct == null || ev.awayPct == null) return null;
    return {
      home: Math.round(ev.homePct),
      draw: Math.round(ev.drawPct ?? Math.max(0, 100 - ev.homePct - ev.awayPct)),
      away: Math.round(ev.awayPct),
    };
  }

  isPickCorrect(pick: any, team: string): boolean {
    if (!pick.result_team1) return false;
    return pick.result_team1 === team || pick.result_team2 === team;
  }

  isThirdCorrect(pick: any): boolean {
    return !!(pick.result_third_team && pick.third_team === pick.result_third_team);
  }

  isThirdWrong(pick: any): boolean {
    return !!(pick.result_team1 && !this.isThirdCorrect(pick));
  }

  // Modal pronósticos
  showPredModal = false;
  predModalTitle = '';
  predModalMatch: LiveMatch | null = null;
  predModalPreds: any[] = [];
  predModalLoading = false;

  openPredModal(match: LiveMatch | null) {
    if (!match) return;
    this.predModalMatch = match;
    this.predModalTitle = `${teamEs(match.home_team)} vs ${teamEs(match.away_team)}`;
    this.predModalPreds = [];
    this.predModalLoading = true;
    this.showPredModal = true;
    this.http.get<any[]>(`/api/predictions/match/${match.id}`).subscribe({
      next: data => { this.predModalPreds = data; this.predModalLoading = false; this.cdr.detectChanges(); },
      error: () => { this.predModalLoading = false; this.cdr.detectChanges(); }
    });
  }

  closePredModal() {
    this.showPredModal = false;
    this.predModalMatch = null;
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    clearInterval(this.pollInterval);
    clearInterval(this.matchPollInterval);
    clearInterval(this.rotateInterval);
    clearInterval(this.espnInterval);
    clearInterval(this.gossipRotateInterval);
  }
}
