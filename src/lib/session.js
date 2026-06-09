import { getConfig } from './config.js';
import { logAuditEvent } from './firestore.js';
import { transcript, isSessionActive, sessionStartTime, setTranscript, setIsSessionActive, setConversationId, setSessionStartTime, setLastDisplayedScorecard, conversationId } from './state.js';
import { updateTranscriptPanel } from './scorecard.js';
import { switchTab } from './ui.js';
import { startTranscriptPolling } from './elevenlabs.js';
import { fetchElevenLabsTranscript, fetchMostRecentTranscript, parseManualTranscript } from './elevenlabs.js';
import { generateScorecard } from './scoring.js';

export function startSession() {
  const config = getConfig();
  const agentId = config ? config.agentId : '';
  if (!agentId) { alert('ElevenLabs Agent ID not configured. Ask your admin to set it up.'); return; }

  setTranscript([]);
  setIsSessionActive(true);
  setSessionStartTime(Date.now());
  setConversationId('conv_' + Date.now());
  logAuditEvent('info', 'App', 'Session started', '');

  const startBtn = document.getElementById('startBtn');
  const endBtn = document.getElementById('endBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const placeholder = document.getElementById('placeholder');
  const liveTranscript = document.getElementById('liveTranscript');
  const scorecardContent = document.getElementById('scorecardContent');
  const scorecardEmpty = document.getElementById('scorecardEmpty');

  if (startBtn) startBtn.style.display = 'none';
  if (endBtn) endBtn.style.display = 'inline-flex';
  if (statusDot) statusDot.classList.add('live');
  if (statusText) statusText.textContent = 'Live - Speak now';
  if (placeholder) placeholder.style.display = 'none';
  if (liveTranscript) liveTranscript.style.display = 'block';
  if (scorecardContent) { scorecardContent.innerHTML = ''; scorecardContent.classList.remove('visible'); }
  if (scorecardEmpty) scorecardEmpty.style.display = 'none';
  updateTranscriptPanel();

  const container = document.getElementById('widget-container');
  if (container) {
    container.innerHTML = '';
    const widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', agentId);
    container.appendChild(widget);
    container.classList.add('visible');
  }

  const captureConvId = (e) => {
    if (e.detail) {
      const id = e.detail.conversationId || e.detail.conversation_id || e.detail.id;
      if (id) { setConversationId(id); console.log('Captured conversation ID:', id); }
    }
  };
  const widget = container ? container.querySelector('elevenlabs-convai') : null;
  if (widget) {
    widget.addEventListener('elevenlabs-convai:conversation', captureConvId);
    widget.addEventListener('elevenlabs-convai:call', captureConvId);
    document.addEventListener('elevenlabs-convai:conversation', captureConvId);
    document.addEventListener('elevenlabs-convai:call', captureConvId);
    startTranscriptPolling(widget);
  }

  const liveEl = document.getElementById('liveTranscript');
  if (liveEl) {
    liveEl.innerHTML = `
      <div style="text-align:center; padding:40px;">
        <div style="font-size:64px; margin-bottom:16px;">&#127897;</div>
        <h3 style="margin-bottom:8px;">Conversation Active</h3>
        <p style="color:var(--text-dim); max-width:420px; margin:0 auto; line-height:1.6;">
          The ElevenLabs voice widget is in the bottom-right corner. Click it to start speaking.
        </p>
        <p style="color:var(--text-dim); margin-top:16px; font-size:13px;">
          When done, click <strong style="color:var(--red);">End &amp; Score</strong> for your scorecard.
        </p>
      </div>
      <div style="margin-top:24px; padding:20px; background:var(--surface); border-radius:12px; border:1px solid var(--border);">
        <p style="font-size:13px; color:var(--text-dim); margin-bottom:12px;">
          <strong>Manual Transcript</strong> &mdash; If the widget's transcript isn't captured automatically,
          paste the conversation below after your call.
        </p>
        <textarea id="manualTranscript" rows="8" style="width:100%; padding:10px 12px; background:#fafafa; border:1px solid var(--border); border-radius:8px; color:var(--text); font-size:14px; font-family:inherit; outline:none; resize:vertical;" placeholder="Paste transcript here...&#10;&#10;Prospect: Hello...&#10;You: Hi, I'm reaching out because..."></textarea>
      </div>
    `;
  }
}

export async function endSession() {
  setIsSessionActive(false);

  const container = document.getElementById('widget-container');
  if (container) { container.classList.remove('visible'); container.innerHTML = ''; }

  const startBtn = document.getElementById('startBtn');
  const endBtn = document.getElementById('endBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (startBtn) startBtn.style.display = 'inline-flex';
  if (endBtn) endBtn.style.display = 'none';
  if (statusDot) { statusDot.classList.remove('live'); statusDot.classList.add('scoring'); }
  if (statusText) statusText.textContent = 'Fetching transcript...';

  switchTab('scorecard');
  const scorecardEmpty = document.getElementById('scorecardEmpty');
  const scoringOverlay = document.getElementById('scoringOverlay');
  if (scorecardEmpty) scorecardEmpty.style.display = 'none';
  if (scoringOverlay) scoringOverlay.classList.add('visible');

  const hasRealConvId = conversationId && !conversationId.startsWith('conv_');

  if (transcript.length === 0) {
    const config = getConfig();
    const elevenLabsKey = config ? config.elevenLabsApiKey : '';
    if (elevenLabsKey) {
      const overlayH3 = document.querySelector('#scoringOverlay h3');
      if (overlayH3) overlayH3.textContent = 'Retrieving transcript from ElevenLabs...';
      try {
        if (hasRealConvId) {
          await fetchElevenLabsTranscript(conversationId);
        } else {
          console.log('No conversation ID captured from widget — trying to fetch most recent conversation...');
          await fetchMostRecentTranscript(elevenLabsKey, config.agentId);
        }
      } catch (err) {
        console.warn('Could not fetch ElevenLabs transcript:', err.message);
        logAuditEvent('error', 'ElevenLabs', 'Failed to fetch transcript', 'ConvID: ' + (conversationId || 'none') + ' | Error: ' + err.message);
      }
    }
  }

  if (transcript.length === 0) {
    const manualEl = document.getElementById('manualTranscript');
    if (manualEl && manualEl.value.trim()) {
      parseManualTranscript(manualEl.value.trim());
    }
  }

  if (transcript.length === 0) {
    logAuditEvent('error', 'App', 'No transcript captured', 'ConvID: ' + (conversationId || 'none') + ' | Had real conv ID: ' + hasRealConvId + ' | Session duration: ' + (sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) + 's' : 'unknown'));
    const overlay = document.getElementById('scoringOverlay');
    if (overlay) overlay.classList.remove('visible');
    if (statusDot) statusDot.classList.remove('scoring');
    if (statusText) statusText.textContent = 'No transcript';
    const content = document.getElementById('scorecardContent');
    if (content) {
      content.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text-dim);">
          <div style="font-size:48px; margin-bottom:16px;">&#128221;</div>
          <h3 style="margin-bottom:12px; color:var(--text);">No Transcript Captured</h3>
          <p style="max-width:480px; margin:0 auto; line-height:1.6; font-size:14px;">
            The conversation transcript wasn't captured automatically. This can happen if the ElevenLabs conversation didn't fully connect, or if the conversation ID wasn't captured.
          </p>
          <p style="max-width:480px; margin:16px auto 0; line-height:1.6; font-size:14px;">
            <strong>To score your call:</strong> Click "New Session," start a new call, and when done, paste the transcript into the "Manual Transcript" box before clicking "End & Score."
          </p>
          <p style="max-width:480px; margin:16px auto 0; line-height:1.6; font-size:13px; color:var(--text-dim);">
            Tip: You can also copy a transcript from the ElevenLabs dashboard and paste it here.
          </p>
        </div>
      `;
      content.classList.add('visible');
    }
    return;
  }

  if (statusText) statusText.textContent = 'Scoring...';
  const overlayH3 = document.querySelector('#scoringOverlay h3');
  if (overlayH3) overlayH3.textContent = 'Analyzing your conversation...';
  await generateScorecard();
}

export function resetAll() {
  setTranscript([]);
  setIsSessionActive(false);
  setConversationId(null);
  setSessionStartTime(null);
  setLastDisplayedScorecard(null);

  const container = document.getElementById('widget-container');
  if (container) { container.classList.remove('visible'); container.innerHTML = ''; }
  const startBtn = document.getElementById('startBtn');
  const endBtn = document.getElementById('endBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const placeholder = document.getElementById('placeholder');
  const liveTranscript = document.getElementById('liveTranscript');
  const scorecardContent = document.getElementById('scorecardContent');
  const scorecardEmpty = document.getElementById('scorecardEmpty');
  const scoringOverlay = document.getElementById('scoringOverlay');

  if (startBtn) startBtn.style.display = 'inline-flex';
  if (endBtn) endBtn.style.display = 'none';
  if (statusDot) statusDot.className = 'status-dot';
  if (statusText) statusText.textContent = 'Ready';
  if (placeholder) placeholder.style.display = 'block';
  if (liveTranscript) liveTranscript.style.display = 'none';
  if (scorecardContent) { scorecardContent.innerHTML = ''; scorecardContent.classList.remove('visible'); }
  if (scorecardEmpty) scorecardEmpty.style.display = 'block';
  if (scoringOverlay) scoringOverlay.classList.remove('visible');
  updateTranscriptPanel();
  switchTab('conversation');
}

window.startSession = startSession;
window.endSession = endSession;
window.resetAll = resetAll;
