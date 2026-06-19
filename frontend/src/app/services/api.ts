import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Torneos
  getTournaments(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/tournaments`);
  }
  createTournament(name: string): Observable<any> {
    return this.http.post(`${BASE}/tournaments`, { name });
  }

  // Partidos
  getMatches(tournamentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/matches/${tournamentId}`);
  }
  createMatch(data: any): Observable<any> {
    return this.http.post(`${BASE}/matches`, data);
  }
  updateResult(matchId: number, home: number, away: number): Observable<any> {
    return this.http.put(`${BASE}/matches/${matchId}/result`, { home_score: home, away_score: away });
  }

  // Pronósticos de partido
  importMatchPredictions(matchId: number, predictions: any[]): Observable<any> {
    return this.http.post(`${BASE}/predictions/match/import`, { match_id: matchId, predictions });
  }
  addMatchPrediction(data: any): Observable<any> {
    return this.http.post(`${BASE}/predictions/match`, data);
  }
  getMatchPredictions(matchId: number): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/predictions/match/${matchId}`);
  }

  // Grupos
  setGroupResult(data: any): Observable<any> {
    return this.http.post(`${BASE}/groups/result`, data);
  }
  importGroupPredictions(tournamentId: number, predictions: any[]): Observable<any> {
    return this.http.post(`${BASE}/groups/predictions/import`, { tournament_id: tournamentId, predictions });
  }

  // Semifinales
  setSemifinalResult(tournamentId: number, teams: any[]): Observable<any> {
    return this.http.post(`${BASE}/semifinals/result`, { tournament_id: tournamentId, teams });
  }
  importSemifinalPredictions(tournamentId: number, predictions: any[]): Observable<any> {
    return this.http.post(`${BASE}/semifinals/predictions/import`, { tournament_id: tournamentId, predictions });
  }

  // Final
  setFinalResult(tournamentId: number, champion: string, runnerUp: string): Observable<any> {
    return this.http.post(`${BASE}/final/result`, { tournament_id: tournamentId, champion, runner_up: runnerUp });
  }
  importFinalPredictions(tournamentId: number, predictions: any[]): Observable<any> {
    return this.http.post(`${BASE}/final/predictions/import`, { tournament_id: tournamentId, predictions });
  }

  // Leaderboard
  getLeaderboard(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/leaderboard`);
  }

  updateMatchApiId(matchId: number, apiMatchId: string): Observable<any> {
    return this.http.put(`${BASE}/matches/${matchId}/api-id`, { api_match_id: apiMatchId });
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/users`);
  }

  getESPNScoreboard(date?: string): Observable<any[]> {
    const q = date ? `?date=${date}` : '';
    return this.http.get<any[]>(`${BASE}/espn/scoreboard${q}`);
  }

  getWCStandings(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/football/standings`);
  }

  getWCResults(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/football/results`);
  }

  getLiveFootballEvents(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/football/live`);
  }

  getTodayFootballEvents(date?: string): Observable<any[]> {
    const q = date ? `?date=${date}` : '';
    return this.http.get<any[]>(`${BASE}/football/today${q}`);
  }

  searchFootballEvents(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/football/search?q=${encodeURIComponent(query)}`);
  }
}
