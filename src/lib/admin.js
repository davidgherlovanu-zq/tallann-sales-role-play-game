import { getConfig, saveConfig } from './config.js';
import { simpleHash } from './setup.js';

export function openAdminSetup() {
  const modal = document.getElementById('adminModal');
  const fields = document.getElementById('adminFields');
  const unlock = document.getElementById('adminUnlockBtn');
  const passwordCheck = document.getElementById('adminPasswordCheck');
  const errEl = document.getElementById('adminError');
  const sucEl = document.getElementById('adminSuccess');

  if (modal) modal.classList.add('visible');
  if (fields) fields.style.display = 'none';
  if (unlock) unlock.style.display = 'block';
  if (passwordCheck) passwordCheck.value = '';
  if (errEl) errEl.classList.remove('visible');
  if (sucEl) sucEl.classList.remove('visible');
}

export function closeAdminSetup() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.remove('visible');
}

export function unlockAdmin() {
  const password = document.getElementById('adminPasswordCheck').value;
  const config = getConfig();
  const errEl = document.getElementById('adminError');

  if (!config || simpleHash(password) !== config.adminHash) {
    if (errEl) { errEl.textContent = 'Incorrect admin password.'; errEl.classList.add('visible'); }
    return;
  }

  if (errEl) errEl.classList.remove('visible');
  const unlock = document.getElementById('adminUnlockBtn');
  const fields = document.getElementById('adminFields');
  if (unlock) unlock.style.display = 'none';
  if (fields) fields.style.display = 'block';

  const agentId = document.getElementById('adminAgentId');
  const apiKey = document.getElementById('adminElevenLabsApiKey');
  const provider = document.getElementById('adminAiProvider');
  const aiKey = document.getElementById('adminAiApiKey');

  if (agentId) agentId.value = config.agentId || '';
  if (apiKey) apiKey.value = config.elevenLabsApiKey || '';
  if (provider) provider.value = config.aiProvider || 'anthropic';
  if (aiKey) aiKey.value = config.aiApiKey || '';
}

export async function saveAdminSettings() {
  const config = getConfig();
  const agentId = document.getElementById('adminAgentId');
  const apiKey = document.getElementById('adminElevenLabsApiKey');
  const provider = document.getElementById('adminAiProvider');
  const aiKey = document.getElementById('adminAiApiKey');
  const newPass = document.getElementById('adminNewPassword');

  if (agentId) config.agentId = agentId.value.trim();
  if (apiKey) config.elevenLabsApiKey = apiKey.value.trim();
  if (provider) config.aiProvider = provider.value;
  if (aiKey) config.aiApiKey = aiKey.value.trim();

  if (newPass && newPass.value && newPass.value.length >= 4) {
    config.adminHash = simpleHash(newPass.value);
  }

  await saveConfig(config);
  const el = document.getElementById('adminSuccess');
  if (el) { el.textContent = 'Settings saved!'; el.classList.add('visible'); }
}

window.openAdminSetup = openAdminSetup;
window.closeAdminSetup = closeAdminSetup;
window.unlockAdmin = unlockAdmin;
window.saveAdminSettings = saveAdminSettings;
