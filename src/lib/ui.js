import { renderHistoryChart } from './history.js';

export function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const tabEl = document.querySelector(`[data-tab="${tab}"]`);
  const panelEl = document.getElementById(`panel-${tab}`);
  if (tabEl) tabEl.classList.add('active');
  if (panelEl) panelEl.classList.add('active');
  if (tab === 'history') renderHistoryChart();
}

export function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

window.switchTab = switchTab;
