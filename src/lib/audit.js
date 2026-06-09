import { db } from './shared.js';
import { escapeHtml } from './ui.js';

export function openAuditLog() {
  const adminModal = document.getElementById('adminModal');
  const auditModal = document.getElementById('auditLogModal');
  if (adminModal) adminModal.classList.remove('visible');
  if (auditModal) auditModal.classList.add('visible');
  loadAuditLog();
}

export function closeAuditLog() {
  const modal = document.getElementById('auditLogModal');
  if (modal) modal.classList.remove('visible');
}

export async function loadAuditLog() {
  if (!db) return;
  const content = document.getElementById('auditLogContent');
  if (!content) return;
  content.innerHTML = '<div class="dashboard-loading"><div class="spinner"></div><p style="color:var(--text-dim); margin-top:10px;">Loading audit log...</p></div>';

  const filterType = document.getElementById('auditFilterType').value;
  const filterSource = document.getElementById('auditFilterSource').value;

  try {
    const query = db.collection('audit_logs').orderBy('timestamp', 'desc').limit(200);
    const snap = await query.get();
    let logs = [];
    snap.forEach(doc => {
      const d = doc.data();
      logs.push({
        type: d.type || 'info',
        source: d.source || 'Unknown',
        message: d.message || '',
        details: d.details || '',
        userEmail: d.userEmail || 'Unknown',
        conversationId: d.conversationId || '',
        timestamp: d.timestamp ? d.timestamp.toDate() : new Date(),
        userAgent: d.userAgent || ''
      });
    });

    if (filterType !== 'all') logs = logs.filter(l => l.type === filterType);
    if (filterSource !== 'all') logs = logs.filter(l => l.source === filterSource);

    if (logs.length === 0) {
      content.innerHTML = '<div class="dashboard-empty" style="text-align:center; padding:40px; color:var(--text-dim);"><p>No audit log entries found' + (filterType !== 'all' || filterSource !== 'all' ? ' matching the selected filters' : '') + '.</p></div>';
      return;
    }

    const errorCount = logs.filter(l => l.type === 'error').length;
    const warnCount = logs.filter(l => l.type === 'warning').length;
    const infoCount = logs.filter(l => l.type === 'info').length;

    let html = '<div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">';
    html += '<div style="padding:8px 16px; border-radius:8px; background:rgba(192,57,43,0.15); color:#e74c3c; font-size:13px; font-weight:600;">' + errorCount + ' Errors</div>';
    html += '<div style="padding:8px 16px; border-radius:8px; background:rgba(212,160,23,0.15); color:#d4a017; font-size:13px; font-weight:600;">' + warnCount + ' Warnings</div>';
    html += '<div style="padding:8px 16px; border-radius:8px; background:rgba(90,138,30,0.15); color:#5a8a1e; font-size:13px; font-weight:600;">' + infoCount + ' Info</div>';
    html += '</div>';

    html += '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
    html += '<thead><tr style="border-bottom:2px solid var(--border); text-align:left;">';
    html += '<th style="padding:8px 6px;">Time</th>';
    html += '<th style="padding:8px 6px;">Type</th>';
    html += '<th style="padding:8px 6px;">Source</th>';
    html += '<th style="padding:8px 6px;">User</th>';
    html += '<th style="padding:8px 6px;">Message</th>';
    html += '</tr></thead><tbody>';

    logs.forEach(log => {
      const typeColors = { error: '#e74c3c', warning: '#d4a017', info: '#5a8a1e' };
      const typeColor = typeColors[log.type] || 'var(--text-dim)';
      const typeLabel = log.type.charAt(0).toUpperCase() + log.type.slice(1);
      const time = log.timestamp.toLocaleDateString() + ' ' + log.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      const emailShort = log.userEmail.split('@')[0];

      html += '<tr style="border-bottom:1px solid var(--border); cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'table-row\':\'none\'">';
      html += '<td style="padding:8px 6px; white-space:nowrap;">' + escapeHtml(time) + '</td>';
      html += '<td style="padding:8px 6px;"><span style="color:' + typeColor + '; font-weight:600;">' + typeLabel + '</span></td>';
      html += '<td style="padding:8px 6px;">' + escapeHtml(log.source) + '</td>';
      html += '<td style="padding:8px 6px;" title="' + escapeHtml(log.userEmail) + '">' + escapeHtml(emailShort) + '</td>';
      html += '<td style="padding:8px 6px;">' + escapeHtml(log.message) + '</td>';
      html += '</tr>';

      html += '<tr style="display:none; background:rgba(255,255,255,0.03);"><td colspan="5" style="padding:10px 12px; font-size:12px; color:var(--text-dim);">';
      if (log.details) html += '<div><strong>Details:</strong> ' + escapeHtml(log.details) + '</div>';
      if (log.conversationId) html += '<div><strong>Conversation ID:</strong> ' + escapeHtml(log.conversationId) + '</div>';
      if (log.userAgent) {
        const ua = log.userAgent;
        let browser = 'Unknown';
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        let os = 'Unknown';
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac')) os = 'macOS';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
        else if (ua.includes('Android')) os = 'Android';
        html += '<div><strong>Browser/OS:</strong> ' + browser + ' on ' + os + '</div>';
      }
      html += '</td></tr>';
    });

    html += '</tbody></table>';
    content.innerHTML = html;
  } catch (err) {
    console.error('Audit log error:', err);
    content.innerHTML = '<div class="dashboard-empty" style="text-align:center; padding:40px; color:var(--text-dim);"><h3>Error Loading Audit Log</h3><p style="margin-top:8px;">' + escapeHtml(err.message) + '</p></div>';
  }
}

window.openAuditLog = openAuditLog;
window.closeAuditLog = closeAuditLog;
window.loadAuditLog = loadAuditLog;
