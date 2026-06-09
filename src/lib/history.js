import { scoreHistory, historyChart, setHistoryChart } from './state.js';
import { displayScorecard } from './scorecard.js';
import { getGradeClass, getGradeLabel } from './grading.js';
import { switchTab } from './ui.js';

export function renderHistoryList() {
  const container = document.getElementById('historyList');
  const emptyEl = document.getElementById('historyEmpty');
  const dlBtn = document.getElementById('downloadHistoryBtn');

  if (scoreHistory.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    if (dlBtn) dlBtn.style.display = 'none';
    if (container) { container.innerHTML = ''; if (emptyEl) container.appendChild(emptyEl); }
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  if (dlBtn) dlBtn.style.display = 'inline-flex';

  if (container) {
    container.innerHTML = scoreHistory.map((s, i) => {
      const cls = getGradeClass(s.overall_score);
      const dateStr = s.createdAt.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });
      return `<div class="history-item" onclick="viewHistoryItem(${i})">
        <div><div style="font-weight:600;font-size:14px;margin-bottom:2px;">Practice Call #${scoreHistory.length-i}</div><div class="date">${dateStr}</div></div>
        <span class="score-pill badge-${cls}">${s.overall_score}/10 &middot; ${s.overall_grade}</span>
      </div>`;
    }).join('');
  }
}

export function viewHistoryItem(i) {
  if (scoreHistory[i]) {
    displayScorecard(scoreHistory[i]);
    switchTab('scorecard');
  }
}

export function renderHistoryChart() {
  const canvas = document.getElementById('historyChart');
  if (!canvas) return;
  if (historyChart) { historyChart.destroy(); setHistoryChart(null); }
  if (scoreHistory.length === 0) return;

  const sorted = [...scoreHistory].reverse();
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: sorted.map(s => s.createdAt.toLocaleDateString('en-US', { month:'short', day:'numeric' })),
      datasets: [{
        label: 'Overall Score', data: sorted.map(s => s.overall_score),
        borderColor: '#7fad41', backgroundColor: 'rgba(127,173,65,0.1)', borderWidth: 3,
        pointBackgroundColor: sorted.map(s => { if(s.overall_score>=9)return'#5a8a1e';if(s.overall_score>=7)return'#7fad41';if(s.overall_score>=5)return'#d4a017';if(s.overall_score>=3)return'#e17055';return'#c0392b'; }),
        pointRadius: 6, pointHoverRadius: 8, tension: 0.3, fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { min:0, max:10, ticks:{ stepSize:1, callback:v=>({10:'10 - Great!',8:'8 - Good',6:'6 - Fine',4:'4 - Not So Good',2:'2 - Disaster'}[v]||v), font:{size:11}, color:'#4a4e57' }, grid:{color:'rgba(217,217,217,0.5)'} },
        x: { ticks:{font:{size:11},color:'#4a4e57'}, grid:{display:false} }
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor:'#212934', titleFont:{size:13}, bodyFont:{size:12}, padding:12, cornerRadius:8,
          callbacks: { label: ctx => `Score: ${ctx.parsed.y}/10 (${getGradeLabel(ctx.parsed.y)})` } }
      }
    }
  });
  setHistoryChart(chart);
}

window.viewHistoryItem = viewHistoryItem;
