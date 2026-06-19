import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

export interface LeaderboardEntry {
  user_id: number;
  user_name: string;
  initials: string;
  total_points: number;
  position?: number;
  trend?: 'up' | 'down' | 'same';
  trendDelta?: number;
}

export interface LiveMatch {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  minute: number | null;
  period?: 'HT' | 'live' | null;
  match_date?: string;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;

  constructor() {
    const url = typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000';
    this.socket = io(url);
  }

  onLeaderboardUpdate(): Observable<LeaderboardEntry[]> {
    return new Observable(observer => {
      this.socket.on('leaderboard_update', (data: LeaderboardEntry[]) => {
        observer.next(data);
      });
      this.socket.on('connect', () => {
        this.socket.emit('get_leaderboard');
      });
      if (this.socket.connected) {
        this.socket.emit('get_leaderboard');
      }
    });
  }

  // Lista completa de partidos live/pending (reemplaza el array entero)
  onLiveMatchesList(): Observable<LiveMatch[]> {
    return new Observable(observer => {
      this.socket.on('live_matches', (data: LiveMatch[]) => {
        observer.next(data);
      });
      this.socket.on('connect', () => {
        this.socket.emit('get_live_matches');
      });
      if (this.socket.connected) {
        this.socket.emit('get_live_matches');
      }
    });
  }

  // Actualización individual de un partido (score + minuto en tiempo real)
  onMatchUpdate(): Observable<LiveMatch> {
    return new Observable(observer => {
      this.socket.on('match_update', (match: LiveMatch) => {
        observer.next(match);
      });
    });
  }

  disconnect() {
    this.socket.disconnect();
  }
}
