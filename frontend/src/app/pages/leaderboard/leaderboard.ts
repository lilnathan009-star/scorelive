import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  'Mali': 'ml', 'Congo': 'cd',
  'South Korea': 'kr', 'Korea Republic': 'kr', 'Corea del Sur': 'kr',
  'Japan': 'jp', 'Japón': 'jp', 'Australia': 'au',
  'Saudi Arabia': 'sa', 'Arabia Saudí': 'sa', 'Iran': 'ir',
  'Qatar': 'qa', 'China': 'cn', 'Indonesia': 'id', 'Iraq': 'iq',
  'Jordan': 'jo', 'Jordania': 'jo', 'Uzbekistan': 'uz', 'Uzbekistán': 'uz',
};

function getFlagUrl(team: string): string {
  const iso = TEAM_ISO[team];
  return iso ? `https://flagcdn.com/w80/${iso}.png` : '';
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarLeaderboard();
    this.pollInterval = setInterval(() => this.cargarLeaderboard(), 5000);

    // Leaderboard via socket
    this.subs.push(
      this.socketService.onLeaderboardUpdate().subscribe(data => {
        if (data.length > 0) {
          this.previousEntries = [...this.entries];
          this.entries = this.addPositions(data);
          this.cdr.detectChanges();
        }
      })
    );

    // Lista completa de partidos (reemplaza el array — maneja partidos que terminan)
    this.subs.push(
      this.socketService.onLiveMatchesList().subscribe(list => {
        const prevLen = this.liveMatches.length;
        this.liveMatches = list;
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
        this.cdr.detectChanges();
      })
    );

    // Carga inicial + poll cada 30s como respaldo
    this.cargarPartidosVivos();
    this.matchPollInterval = setInterval(() => this.cargarPartidosVivos(), 30000);

    // ESPN clock poll cada 15s (sin límite de requests)
    this.pollESPNClock();
    this.espnInterval = setInterval(() => this.pollESPNClock(), 15000);
  }

  startRotation() {
    clearInterval(this.rotateInterval);
    const liveIdx = this.liveMatches.findIndex(m => m.status === 'live');
    if (liveIdx >= 0) {
      // Hay partido en vivo → quedarse fijo en él, no rotar
      this.currentMatchIdx = liveIdx;
      return;
    }
    // Sin partidos en vivo → rotar entre los pending
    if (this.liveMatches.length > 1) {
      this.rotateInterval = setInterval(() => {
        this.currentMatchIdx = (this.currentMatchIdx + 1) % this.liveMatches.length;
        this.cdr.detectChanges();
      }, 6000);
    }
  }

  get currentMatch(): LiveMatch | null {
    // Siempre priorizar el partido en vivo
    const live = this.liveMatches.find(m => m.status === 'live');
    if (live) return live;
    return this.liveMatches[this.currentMatchIdx] ?? null;
  }

  getFlagUrl(team: string): string { return getFlagUrl(team); }

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
        this.liveMatches = data;
        if (this.currentMatchIdx >= this.liveMatches.length) {
          this.currentMatchIdx = 0;
        }
        this.startRotation();
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  cargarLeaderboard() {
    this.http.get<any[]>('/api/leaderboard').subscribe({
      next: data => {
        this.previousEntries = [...this.entries];
        this.entries = this.addPositions(data);
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
          if (ev.status === 'live' || ev.status === 'finished') {
            const key = `${ev.home}|${ev.away}`;
            if (ev.status === 'live') {
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

  // Modal pronósticos
  showPredModal = false;
  predModalTitle = '';
  predModalMatch: LiveMatch | null = null;
  predModalPreds: any[] = [];
  predModalLoading = false;

  openPredModal(match: LiveMatch | null) {
    if (!match) return;
    this.predModalMatch = match;
    this.predModalTitle = `${match.home_team} vs ${match.away_team}`;
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
  }
}
