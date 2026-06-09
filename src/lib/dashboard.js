import { db, auth } from './shared.js';
import { dashboardData, setDashboardData } from './state.js';
import { getScoreColor } from './grading.js';
import { escapeHtml } from './ui.js';

export function openDashboard() {
  const adminModal = document.getElementById('adminModal');
  const dashModal = document.getElementById('dashboardModal');
  if (adminModal) adminModal.classList.remove('visible');
  if (dashModal) dashModal.classList.add('visible');
  loadDashboardData();
}

export function closeDashboard() {
  const modal = document.getElementById('dashboardModal');
  if (modal) modal.classList.remove('visible');
}

export async function loadDashboardData() {
  if (!db) return;
  const content = document.getElementById('dashboardContent');
  const statsEl = document.getElementById('dashboardStats');
  if (content) content.innerHTML = '<div class="dashboard-loading"><div class="spinner"></div><p style="color:var(--text-dim); margin-top:10px;">Loading team data...</p></div>';
  if (statsEl) statsEl.innerHTML = '';

  try {
    const allCards = [];
    try {
      const snap = await db.collectionGroup('scorecards').orderBy('createdAt', 'desc').limit(500).get();
      snap.forEach(doc => {
        const d = doc.data();
        const pathParts = doc.ref.path.split('/');
        const userId = pathParts.length >= 2 ? pathParts[1] : '';
        allCards.push({
          id: doc.id,
          email: d.userEmail || 'Unknown',
          userId: userId,
          overall_score: d.overall_score,
          overall_grade: d.overall_grade,
          criteria: d.criteria || [],
          summary: d.summary || '',
          createdAt: d.createdAt ? d.createdAt.toDate() : new Date()
        });
      });
    } catch(e) {
      console.warn('Could not read scorecards via collectionGroup:', e.message);
      if (auth && auth.currentUser) {
        try {
          const snap = await db.collection('users').doc(auth.currentUser.uid).collection('scorecards').orderBy('createdAt', 'desc').limit(50).get();
          snap.forEach(doc => {
            const d = doc.data();
            allCards.push({
              id: doc.id,
              email: d.userEmail || auth.currentUser.email,
              userId: auth.currentUser.uid,
              overall_score: d.overall_score,
              overall_grade: d.overall_grade,
              criteria: d.criteria || [],
              summary: d.summary || '',
              createdAt: d.createdAt ? d.createdAt.toDate() : new Date()
            });
          });
        } catch(e2) { console.warn('Could not read user scorecards:', e2.message); }
      }
    }

    setDashboardData(allCards);

    if (allCards.length === 0) {
      if (statsEl) statsEl.innerHTML = '';
      if (content) content.innerHTML = '<div class="dashboard-empty"><div style="font-size:48px; margin-bottom:12px;">&#128202;</div><h3>No Data Yet</h3><p style="margin-top:8px;">Scorecards will appear here once team members complete practice calls.</p><p style="margin-top:12px; font-size:13px;">Note: Only calls completed after this update will appear in the dashboard.</p></div>';
      return;
    }

    const users = {};
    allCards.forEach(card => {
      if (!users[card.email]) {
        users[card.email] = { email: card.email, calls: [], totalScore: 0 };
      }
      users[card.email].calls.push(card);
      users[card.email].totalScore += card.overall_score;
    });

    const userList = Object.values(users).map(u => ({
      ...u,
      avgScore: (u.totalScore / u.calls.length).toFixed(1),
      bestScore: Math.max(...u.calls.map(c => c.overall_score)),
      lastCall: u.calls[0].createdAt,
      lastScore: u.calls[0].overall_score,
      lastGrade: u.calls[0].overall_grade
    })).sort((a, b) => b.lastCall - a.lastCall);

    const totalCalls = allCards.length;
    const totalUsers = userList.length;
    const overallAvg = (allCards.reduce((s, c) => s + c.overall_score, 0) / totalCalls).toFixed(1);
    const thisWeek = allCards.filter(c => (Date.now() - c.createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000).length;

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-value">${totalUsers}</div><div class="stat-label">Active Users</div></div>
        <div class="stat-card"><div class="stat-value">${totalCalls}</div><div class="stat-label">Total Calls</div></div>
        <div class="stat-card"><div class="stat-value">${overallAvg}</div><div class="stat-label">Avg Score</div></div>
        <div class="stat-card"><div class="stat-value">${thisWeek}</div><div class="stat-label">This Week</div></div>
      `;
    }

    let html = `<table class="user-table">
      <thead><tr>
        <th>User</th><th>Calls</th><th>Avg Score</th><th>Best</th><th>Last Call</th><th>Last Score</th>
      </tr></thead><tbody>`;

    userList.forEach((u, i) => {
      const avgColor = getScoreColor(Math.round(parseFloat(u.avgScore)));
      const lastColor = getScoreColor(u.lastScore);
      const lastDate = u.lastCall.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const lastTime = u.lastCall.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      html += `<tr class="user-row-expandable" onclick="toggleUserDetail(${i})">
        <td class="email-cell">${escapeHtml(u.email)}</td>
        <td>${u.calls.length}</td>
        <td class="score-cell" style="color:rgb(${avgColor.join(',')})">${u.avgScore}/10</td>
        <td class="score-cell">${u.bestScore}/10</td>
        <td>${lastDate}<br><span style="font-size:12px;color:var(--text-dim);">${lastTime}</span></td>
        <td class="score-cell" style="color:rgb(${lastColor.join(',')})">${u.lastScore}/10 &middot; ${u.lastGrade || ''}</td>
      </tr>`;

      html += `<tr class="user-detail" id="userDetail${i}"><td colspan="6">
        <div style="margin-bottom:8px;font-weight:600;font-size:13px;">Call History for ${escapeHtml(u.email)}</div>
        <div class="detail-calls">`;
      u.calls.forEach((c) => {
        const cColor = getScoreColor(c.overall_score);
        const cDate = c.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        html += `<div class="detail-call-card">
          <div class="call-date">${cDate}</div>
          <div class="call-score" style="color:rgb(${cColor.join(',')})">${c.overall_score}/10 &middot; ${c.overall_grade || getGradeLabel(c.overall_score)}</div>
          ${c.summary ? '<div style="margin-top:6px;font-size:12px;color:var(--text-dim);line-height:1.4;">' + escapeHtml(c.summary).substring(0, 120) + (c.summary.length > 120 ? '...' : '') + '</div>' : ''}
        </div>`;
      });
      html += `</div></td></tr>`;
    });

    html += '</tbody></table>';
    if (content) content.innerHTML = html;
  } catch (err) {
    console.error('Dashboard error:', err);
    if (content) content.innerHTML = '<div class="dashboard-empty"><h3>Error Loading Data</h3><p style="margin-top:8px;">' + escapeHtml(err.message) + '</p></div>';
  }
}

export function toggleUserDetail(i) {
  const el = document.getElementById('userDetail' + i);
  if (el) el.classList.toggle('visible');
}

window.openDashboard = openDashboard;
window.closeDashboard = closeDashboard;
window.toggleUserDetail = toggleUserDetail;
