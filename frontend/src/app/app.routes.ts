import { Routes } from '@angular/router';
import { Leaderboard } from './pages/leaderboard/leaderboard';
import { Admin } from './pages/admin/admin';

export const routes: Routes = [
  { path: '', component: Leaderboard },
  { path: 'admin', component: Admin },
];
