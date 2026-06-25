import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

type AdminTab = 'match' | 'groups' | 'semifinals' | 'final';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  activeTab: AdminTab = 'match';

  // Torneos
  tournaments: any[] = [];
  selectedTournamentId: number | null = null;
  newTournamentName = '';

  // Partidos
  matches: any[] = [];
  newMatch = { home_team: '', away_team: '', match_date: '', phase: 'group', api_match_id: '' };
  selectedMatchId: number | null = null;
  resultHome: number | null = null;
  resultAway: number | null = null;

  // Búsqueda ESPN
  footballSearchDate = new Date().toISOString().slice(0, 10);
  footballResults: any[] = [];
  footballLoading = false;

  // Pronósticos partido
  predJson = '';
  users: any[] = [];
  manualPred = { user_id: null as number|null, home_score: null as number|null, away_score: null as number|null };
  matchPreds: any[] = [];

  // Grupos
  groupResultData = { group_name: '', team1: '', team2: '', third_team: '' };
  groupPredJson = '';

  // Semifinales
  semifinalTeams = [
    { bracket: '1', team: '' },
    { bracket: '2', team: '' },
    { bracket: '3', team: '' },
    { bracket: '4', team: '' },
  ];
  semifinalPredJson = '';

  // Final
  finalResult = { champion: '', runner_up: '' };
  finalPredJson = '';

  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getTournaments().subscribe(t => {
      this.tournaments = t;
      // Auto-seleccionar el primer torneo (Mundial 2026)
      if (t.length > 0 && !this.selectedTournamentId) {
        this.selectTournament(t[0].id);
      }
      this.cdr.detectChanges();
    });
    this.api.getUsers().subscribe(u => { this.users = u; this.cdr.detectChanges(); });
  }

  createTournament() {
    if (!this.newTournamentName.trim()) return;
    this.api.createTournament(this.newTournamentName).subscribe(t => {
      this.tournaments.unshift(t);
      this.newTournamentName = '';
      this.notify('Torneo creado');
    });
  }

  selectTournament(id: number) {
    this.selectedTournamentId = id;
    this.api.getMatches(id).subscribe(m => this.matches = m);
  }

  isCreating = false;

  createMatch() {
    if (this.isCreating) return;
    if (!this.selectedTournamentId) { this.notify('Selecciona un torneo primero', 'error'); return; }
    if (!this.newMatch.home_team || !this.newMatch.away_team) { this.notify('Faltan nombres de equipos', 'error'); return; }
    this.isCreating = true;
    this.api.createMatch({ ...this.newMatch, tournament_id: this.selectedTournamentId }).subscribe({
      next: m => {
        this.matches.push(m);
        this.newMatch = { home_team: '', away_team: '', match_date: '', phase: 'group', api_match_id: '' };
        this.notify('Partido creado');
        this.isCreating = false;
      },
      error: err => {
        this.notify(err.error?.error || 'Error al crear partido', 'error');
        this.isCreating = false;
      }
    });
  }

  searchFootballMatches(dateOffset = 0) {
    const d = new Date(this.footballSearchDate + 'T12:00:00');
    d.setDate(d.getDate() + dateOffset);
    this.footballSearchDate = d.toISOString().slice(0, 10);
    this.footballLoading = true;
    this.footballResults = [];
    this.api.getESPNScoreboard(this.footballSearchDate).subscribe({
      next: data => {
        this.footballResults = data;
        this.footballLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.notify(err.error?.error || err.message || 'Error al buscar', 'error');
        this.footballLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatSearchDate(): string {
    return new Date(this.footballSearchDate + 'T12:00:00').toLocaleDateString('es', {
      weekday: 'long', day: 'numeric', month: 'long',
      timeZone: 'America/Guayaquil'
    });
  }

  linkMatchApiId(event: Event, m: any) {
    const matchId = parseInt((event.target as HTMLSelectElement).value);
    if (!matchId) return;
    this.api.updateMatchApiId(matchId, String(m.api_match_id)).subscribe({
      next: () => this.notify(`ID ${m.api_match_id} vinculado al partido #${matchId} (${m.home_team} vs ${m.away_team})`),
      error: err => this.notify(err.error?.error || 'Error', 'error')
    });
    (event.target as HTMLSelectElement).value = '';
  }

  useFootballMatch(m: any) {
    // Enviar la hora UTC directamente — el backend la guarda como UTC y el frontend la convierte a Ecuador
    this.newMatch = {
      home_team: m.home,
      away_team: m.away,
      match_date: new Date(m.date).toISOString().slice(0, 16),
      phase: 'group',
      api_match_id: String(m.espnId)
    };
    this.notify(`Partido cargado: ${m.home} vs ${m.away}`);
  }

  updateResult() {
    if (!this.selectedMatchId || this.resultHome === null || this.resultAway === null) return;
    this.api.updateResult(this.selectedMatchId, this.resultHome, this.resultAway).subscribe(() => {
      this.notify('Resultado actualizado — puntos recalculados');
    }, err => this.notify(err.message, 'error'));
  }

  importMatchPredictions() {
    if (!this.selectedMatchId || !this.predJson.trim()) return;
    try {
      const parsed = JSON.parse(this.predJson);
      const predictions = parsed.predictions || parsed;
      this.api.importMatchPredictions(this.selectedMatchId, predictions).subscribe(r => {
        this.predJson = '';
        this.notify(r.message);
      }, err => this.notify(err.error?.error || 'Error', 'error'));
    } catch {
      this.notify('JSON inválido', 'error');
    }
  }

  onPredMatchSelected(matchId: number | null) {
    this.matchPreds = [];
    this.manualPred = { user_id: null, home_score: null, away_score: null };
    if (!matchId) return;
    this.api.getMatchPredictions(matchId).subscribe(preds => {
      this.matchPreds = preds;
      this.cdr.detectChanges();
    });
  }

  onUserSelected(userId: number | null) {
    if (!userId) { this.manualPred.home_score = null; this.manualPred.away_score = null; return; }
    const user = this.users.find((u: any) => u.id === userId);
    const existing = user ? this.matchPreds.find((p: any) => p.user_name === user.user_name) : null;
    this.manualPred.home_score = existing ? existing.home_score : null;
    this.manualPred.away_score = existing ? existing.away_score : null;
    this.cdr.detectChanges();
  }

  addManualPrediction() {
    if (!this.selectedMatchId || !this.manualPred.user_id) { this.notify('Selecciona un participante', 'error'); return; }
    this.api.addMatchPrediction({ ...this.manualPred, match_id: this.selectedMatchId }).subscribe({
      next: () => { this.manualPred = { user_id: null, home_score: null, away_score: null }; this.notify('Pronóstico agregado'); },
      error: err => this.notify(err.error?.error || 'Error', 'error')
    });
  }

  setGroupResult() {
    if (!this.selectedTournamentId) return;
    this.api.setGroupResult({ ...this.groupResultData, tournament_id: this.selectedTournamentId }).subscribe(() => {
      this.groupResultData = { group_name: '', team1: '', team2: '', third_team: '' };
      this.notify('Resultado de grupo guardado');
    });
  }

  importGroupPredictions() {
    if (!this.selectedTournamentId || !this.groupPredJson.trim()) return;
    try {
      const predictions = JSON.parse(this.groupPredJson);
      this.api.importGroupPredictions(this.selectedTournamentId, predictions).subscribe(r => {
        this.groupPredJson = '';
        this.notify(r.message);
      });
    } catch {
      this.notify('JSON inválido', 'error');
    }
  }

  setSemifinalResult() {
    if (!this.selectedTournamentId) return;
    this.api.setSemifinalResult(this.selectedTournamentId, this.semifinalTeams).subscribe(() => {
      this.notify('Semifinalistas guardados');
    });
  }

  importSemifinalPredictions() {
    if (!this.selectedTournamentId || !this.semifinalPredJson.trim()) return;
    try {
      const predictions = JSON.parse(this.semifinalPredJson);
      this.api.importSemifinalPredictions(this.selectedTournamentId, predictions).subscribe(r => {
        this.semifinalPredJson = '';
        this.notify(r.message);
      });
    } catch {
      this.notify('JSON inválido', 'error');
    }
  }

  setFinalResult() {
    if (!this.selectedTournamentId) return;
    this.api.setFinalResult(this.selectedTournamentId, this.finalResult.champion, this.finalResult.runner_up).subscribe(() => {
      this.notify('Resultado final guardado');
    });
  }

  importFinalPredictions() {
    if (!this.selectedTournamentId || !this.finalPredJson.trim()) return;
    try {
      const predictions = JSON.parse(this.finalPredJson);
      this.api.importFinalPredictions(this.selectedTournamentId, predictions).subscribe(r => {
        this.finalPredJson = '';
        this.notify(r.message);
      });
    } catch {
      this.notify('JSON inválido', 'error');
    }
  }

  notify(msg: string, type: 'success' | 'error' = 'success') {
    this.message = msg;
    this.messageType = type;
    this.cdr.detectChanges();
    setTimeout(() => { this.message = ''; this.cdr.detectChanges(); }, 3000);
  }
}
