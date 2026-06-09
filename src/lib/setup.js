import { saveConfig } from './config.js';
import { showApp } from './auth.js';

let currentSetupStep = 1;

export function setupNext(step) {
  const errEl = document.getElementById('setupError');
  if (errEl) errEl.classList.remove('visible');

  if (step === 1) {
    const agentId = document.getElementById('setupAgentId').value.trim();
    if (!agentId) {
      if (errEl) { errEl.textContent = 'Please enter your ElevenLabs Agent ID.'; errEl.classList.add('visible'); }
      return;
    }
  }

  const curStep = document.getElementById(`setupStep${step}`);
  const nextStep = document.getElementById(`setupStep${step + 1}`);
  const curDot = document.getElementById(`stepDot${step}`);
  const nextDot = document.getElementById(`stepDot${step + 1}`);

  if (curStep) curStep.classList.remove('active');
  if (nextStep) nextStep.classList.add('active');
  if (curDot) { curDot.classList.remove('active'); curDot.classList.add('done'); }
  if (nextDot) nextDot.classList.add('active');
  currentSetupStep = step + 1;
}

export function setupBack(step) {
  const curStep = document.getElementById(`setupStep${step}`);
  const prevStep = document.getElementById(`setupStep${step - 1}`);
  const curDot = document.getElementById(`stepDot${step}`);
  const prevDot = document.getElementById(`stepDot${step - 1}`);

  if (curStep) curStep.classList.remove('active');
  if (prevStep) prevStep.classList.add('active');
  if (curDot) curDot.classList.remove('active');
  if (prevDot) { prevDot.classList.remove('done'); prevDot.classList.add('active'); }
  currentSetupStep = step - 1;
}

export async function completeSetup() {
  const errEl = document.getElementById('setupError');
  if (errEl) errEl.classList.remove('visible');

  const adminPassword = document.getElementById('setupAdminPassword').value;
  if (!adminPassword || adminPassword.length < 4) {
    if (errEl) { errEl.textContent = 'Please set an admin password (at least 4 characters).'; errEl.classList.add('visible'); }
    return;
  }

  const config = {
    agentId: document.getElementById('setupAgentId').value.trim(),
    elevenLabsApiKey: document.getElementById('setupElevenLabsApiKey').value.trim(),
    aiProvider: document.getElementById('setupAiProvider').value,
    aiApiKey: document.getElementById('setupAiApiKey').value.trim(),
    adminHash: simpleHash(adminPassword),
  };

  await saveConfig(config);
  showApp();
}

export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString();
}

window.setupNext = setupNext;
window.setupBack = setupBack;
window.completeSetup = completeSetup;
