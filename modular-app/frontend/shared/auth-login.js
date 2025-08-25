// Auth page logic (shared copy to avoid path issues on hosting)
// Mirrors pages/auth/login.js

(function () {
  const byId = (id) => document.getElementById(id);
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function safeLog(level, msg, data) {
    try {
      if (window.Logger && typeof Logger[level] === 'function') {
        Logger[level](msg, data);
      } else {
        const map = { success: 'log', info: 'info', warning: 'warn', error: 'error', debug: 'debug' };
        const method = map[level] || 'log';
        console[method](msg, data || '');
      }
    } catch (_) {}
  }

  function showNotification(type, message) {
    const container = byId('notifications');
    if (!container) return alert(message);
    const el = document.createElement('div');
    el.className = `notification notification-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  async function updateServerStatus() {
    const indicator = byId('statusIndicator');
    const text = byId('statusIndicatorText');
    const mode = byId('statusMode');
    try {
      const ok = await window.APIClient.healthCheck();
      if (ok) {
        if (indicator) indicator.textContent = '🟢';
        if (text) text.textContent = 'Online';
        if (mode) mode.textContent = 'Remote API';
      } else {
        if (indicator) indicator.textContent = '🔴';
        if (text) text.textContent = 'Offline';
        if (mode) mode.textContent = 'Local Mode';
      }
    } catch (_) {
      if (indicator) indicator.textContent = '🔴';
      if (text) text.textContent = 'Offline';
      if (mode) mode.textContent = 'Local Mode';
    }
  }

  function setupTabs() {
    const tabs = qsa('.auth-tab');
    const forms = qsa('.auth-form');
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        tabs.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        forms.forEach((f) => f.classList.remove('active'));
        const form = byId(`${target}-form`);
        if (form) form.classList.add('active');
      });
    });
  }

  function setupLogin() {
    const form = byId('loginForm');
    const u = byId('loginUsername');
    const p = byId('loginPassword');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = (u?.value || '').trim();
      const password = p?.value || '';
      if (username.length < 3 || password.length < 6) {
        showNotification('warning', 'Vyplňte platné uživatelské jméno a heslo.');
        return;
      }
      safeLog('info', 'Logging in...', { username });
      const res = await window.APIClient.login(username, password);
      if (res.success && res.data?.token) {
        showNotification('success', 'Přihlášení proběhlo úspěšně.');
        setTimeout(() => {
          window.location.href = '../../pages/quiz/quiz.html';
        }, 400);
      } else {
        const err = res.error || res.data?.error || 'Přihlášení selhalo.';
        showNotification('error', err);
      }
    });
  }

  function setupRegister() {
    const form = byId('registerForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = byId('registerUsername')?.value?.trim() || '';
      const email = byId('registerEmail')?.value?.trim() || '';
      const pw = byId('registerPassword')?.value || '';
      const pw2 = byId('registerPasswordConfirm')?.value || '';
      const agree = byId('agreeTerms');
      if (!username || pw.length < 6) {
        showNotification('warning', 'Zadejte platné jméno a heslo (min. 6 znaků).');
        return;
      }
      if (pw !== pw2) {
        showNotification('warning', 'Hesla se neshodují.');
        return;
      }
      if (agree && !agree.checked) {
        showNotification('warning', 'Musíte souhlasit s podmínkami.');
        return;
      }
      safeLog('info', 'Registering...', { username, email });
      const res = await window.APIClient.register({ username, password: pw, email });
      if (res.success) {
        showNotification('success', 'Registrace úspěšná, přihlašuji...');
        const loginRes = await window.APIClient.login(username, pw);
        if (loginRes.success && loginRes.data?.token) {
          setTimeout(() => {
            window.location.href = '../../pages/quiz/quiz.html';
          }, 400);
        }
      } else {
        const err = res.error || res.data?.error || 'Registrace selhala.';
        showNotification('error', err);
      }
    });
  }

  function setupDemoButtons() {
    qsa('.demo-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const username = btn.getAttribute('data-username') || '';
        const password = btn.getAttribute('data-password') || '';
        const u = byId('loginUsername');
        const p = byId('loginPassword');
        if (u) u.value = username;
        if (p) p.value = password;
      });
    });
  }

  function setupTermsModal() {
    const openers = qsa('[data-navigate="terms"]');
    const modal = byId('termsModal');
    const closeBtn = byId('closeTermsModal');
    const accept = byId('acceptTerms');
    const decline = byId('declineTerms');
    const agree = byId('agreeTerms');
    const show = () => { if (modal) modal.style.display = 'block'; };
    const hide = () => { if (modal) modal.style.display = 'none'; };
    openers.forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); show(); }));
    if (closeBtn) closeBtn.addEventListener('click', hide);
    if (accept) accept.addEventListener('click', () => { if (agree) agree.checked = true; hide(); });
    if (decline) decline.addEventListener('click', () => { if (agree) agree.checked = false; hide(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  }

  function setupResetToggles() {
    const radios = qsa('input[name="resetType"]');
    const forgot = byId('forgot-password-form');
    const change = byId('change-password-form');
    const refresh = () => {
      const selected = qs('input[name="resetType"]:checked')?.value || 'forgot';
      if (selected === 'forgot') {
        if (forgot) forgot.style.display = '';
        if (change) change.style.display = 'none';
      } else {
        if (forgot) forgot.style.display = 'none';
        if (change) change.style.display = '';
      }
    };
    radios.forEach((r) => r.addEventListener('change', refresh));
    refresh();
  }

  function setupApiTest() {
    const btn = byId('testAuthBtn');
    const out = byId('testAuthResults');
    if (!btn || !out) return;
    btn.addEventListener('click', async () => {
      out.style.display = 'block';
      out.textContent = 'Testing...';
      const result = await window.APIClient.testConnection();
      out.textContent = JSON.stringify(result, null, 2);
      const status = byId('loginStatusIndicator');
      if (status) {
        status.style.background = result.healthy ? '#2ecc71' : '#e74c3c';
        status.style.color = '#fff';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const waitForAPI = () =>
      new Promise((resolve) => {
        if (window.APIClient) return resolve();
        const i = setInterval(() => {
          if (window.APIClient) {
            clearInterval(i);
            resolve();
          }
        }, 50);
      });

    waitForAPI().then(() => {
      setupTabs();
      setupLogin();
      setupRegister();
      setupDemoButtons();
      setupTermsModal();
      setupResetToggles();
      setupApiTest();
      updateServerStatus();
      safeLog('success', 'Login page initialized (shared)', { baseURL: window.APIClient.baseURL });
    });
  });
})();
