import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly statCards = [
    {
      label: "Today's New Joiners",
      value: 0,
      icon: 'person_add',
      color: '#e8f5e9',
      iconColor: '#4caf50',
    },
    {
      label: 'Leave on Today',
      value: 0,
      icon: 'event_busy',
      color: '#fce4ec',
      iconColor: '#e91e63',
    },
    {
      label: 'Joining This Week',
      value: 0,
      icon: 'calendar_today',
      color: '#fff3e0',
      iconColor: '#ff9800',
    },
    { label: 'Total Strength', value: 0, icon: 'groups', color: '#fce4ec', iconColor: '#e91e63' },
  ];
}
