import { transcript, setLastDisplayedScorecard } from './state.js';
import { escapeHtml } from './ui.js';
import { getGradeClass, getGradeLabel } from './grading.js';

export function addTranscriptMessage(role, text) {
  transcript.push({ role, text, timestamp: new Date().toISOString() });
  updateTranscriptPanel();
}

export function updateTranscriptPanel() {
  const area = document.getElementById('transcriptArea');
  if (!area) return;
  if (transcript.length === 0) {
    area.innerHTML = '<div class="transcript-empty"><p>Messages will appear here as the conversation progresses...</p></div>';
    return;
  }
  area.innerHTML = transcript.map(m => `
    <div class="message ${m.role}">
      <div class="role">${m.role === 'user' ? 'You (Sales Rep)' : 'Prospect (AI)'}</div>
      ${escapeHtml(m.text)}
    </div>
  `).join('');
  area.scrollTop = area.scrollHeight;
}

export function displayScorecard(data) {
  setLastDisplayedScorecard(data);

  const overlay = document.getElementById('scoringOverlay');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const el = document.getElementById('scorecardContent');

  if (overlay) overlay.classList.remove('visible');
  if (statusDot) statusDot.classList.remove('scoring');
  if (statusText) statusText.textContent = 'Scored';

  if (!el) return;
  const scoreClass = getGradeClass(data.overall_score);

  el.innerHTML = `
    <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
      <button class="btn btn-secondary" onclick="downloadScorecardPDF()" style="font-size:13px; padding:6px 16px; display:inline-flex; align-items:center; gap:6px;">
        &#128196; Download PDF
      </button>
    </div>
    <div class="score-header">
      <div class="overall-score score-${scoreClass}">
        ${data.overall_score}<span style="font-size:16px;font-weight:400;opacity:0.7;">/10</span>
        <div class="label">${data.overall_grade}</div>
      </div>
      <div class="score-summary">
        <h3>Cold Call Scorecard</h3>
        <p>${escapeHtml(data.summary)}</p>
      </div>
    </div>
    <div class="grade-scale">
      <span class="badge-great">9-10 Great!</span><span class="badge-good">7-8 Good</span>
      <span class="badge-fine">5-6 Fine</span><span class="badge-notgood">3-4 Not So Good</span>
      <span class="badge-disaster">1-2 Disaster</span>
    </div>
    <div class="criteria-grid">
      ${data.criteria.map(c => {
        const cls = getGradeClass(c.score);
        return `<div class="criteria-card">
          <div class="top-row"><h4>${escapeHtml(c.name)}</h4><span class="score-badge badge-${cls}">${c.score}/10 &middot; ${getGradeLabel(c.score)}</span></div>
          <div class="bar"><div class="bar-fill bar-${cls}" style="width:${c.score*10}%"></div></div>
          <div class="feedback">${escapeHtml(c.feedback)}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="strengths-weaknesses">
      <div class="sw-card strengths"><h4>&#9989; Strengths</h4><ul>${data.strengths.map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ul></div>
      <div class="sw-card weaknesses"><h4>&#128200; Areas to Improve</h4><ul>${data.improvements.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}</ul></div>
    </div>
    <div class="coaching-tip"><h4>&#128161; Coaching Tip</h4><p>${escapeHtml(data.coaching_tip)}</p></div>
  `;
  el.classList.add('visible');
}
