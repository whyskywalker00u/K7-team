/* K7 ESPORTS Frontend Application */
(function () {
  'use strict';

  const API = '/api';
  let token = localStorage.getItem('k7_token') || null;
  let currentLang = localStorage.getItem('k7_lang') || 'ru';
  let siteData = null;
  let adminData = null;

  const i18n = {
    ru: {
      nav_home: 'Главная',
      nav_roster: 'Состав',
      nav_stats: 'Статистика',
      nav_matches: 'Матчи',
      nav_news: 'Новости',
      nav_media: 'Медиа',
      roster_title: 'Состав',
      stats_title: 'Статистика команды',
      matches_title: 'Матчи',
      news_title: 'Новости',
      media_title: 'Хайлайты',
      no_matches: 'Матчи пока не добавлены',
      no_news: 'Новостей пока нет',
      no_highlights: 'Хайлайты пока не добавлены',
      login_hint: 'Введите пароль администратора',
      btn_login: 'Войти',
      btn_close: 'Закрыть',
      btn_logout: 'Выйти',
      rating_label: 'Rating'
    },
    en: {
      nav_home: 'Home',
      nav_roster: 'Roster',
      nav_stats: 'Stats',
      nav_matches: 'Matches',
      nav_news: 'News',
      nav_media: 'Media',
      roster_title: 'Roster',
      stats_title: 'Team Statistics',
      matches_title: 'Matches',
      news_title: 'News',
      media_title: 'Highlights',
      no_matches: 'No matches added yet',
      no_news: 'No news yet',
      no_highlights: 'No highlights yet',
      login_hint: 'Enter administrator password',
      btn_login: 'Login',
      btn_close: 'Close',
      btn_logout: 'Logout',
      rating_label: 'Rating'
    }
  };

  // ===== Utils =====
  function $(sel, ctx = document) { return ctx.querySelector(sel); }
  function $$(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

  function toast(msg, type = 'success') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast ' + type;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3000);
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API + path, { ...options, headers });
    if (res.status === 401) {
      token = null;
      localStorage.removeItem('k7_token');
      throw new Error('Unauthorized');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ===== i18n =====
  function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('k7_lang', lang);
    $$('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (i18n[lang] && i18n[lang][key]) el.textContent = i18n[lang][key];
    });
    // Update dynamic content that depends on lang
    if (siteData) renderPublic(siteData);
  }

  // ===== Render Public =====
  function renderPublic(data) {
    siteData = data;
    const s = data.settings || {};

    // Theme
    document.body.dataset.theme = s.theme || 'black-red';

    // Region & titles
    $('#regionValue').textContent = s.region || 'CIS';
    $('#teamName').textContent = s.teamName || 'K7 ESPORTS';
    $('#tagline').textContent = s.tagline || 'MORE THAN JUST A TEAM';
    const desc = s.description || {};
    $('#teamDesc').textContent = (typeof desc === 'object' ? (desc[currentLang] || desc.ru || '') : desc) || '';

    // Players - always 5 slots ideally
    const row = $('#rosterRow');
    const players = (data.players || []).slice(0, 5);
    if (players.length === 0) {
      row.innerHTML = '<p class="empty-state">No players</p>';
    } else {
      row.innerHTML = players.map(p => `
        <article class="player-card">
          <div class="player-photo">
            ${p.photo ? `<img src="${p.photo}" alt="${escapeHtml(p.nickname)}" loading="lazy">` : `<div class="player-photo-placeholder">K7</div>`}
            <span class="player-role">${escapeHtml(p.role || '')}</span>
          </div>
          <div class="player-info">
            <div class="player-nick" title="${escapeHtml(p.nickname)}">${escapeHtml(p.nickname)}</div>
            <div class="player-rating"><span>${i18n[currentLang].rating_label}</span> ${escapeHtml(String(p.rating || '—'))}</div>
          </div>
        </article>
      `).join('');
    }

    // Stats
    const statsGrid = $('#statsGrid');
    const stats = data.teamStats || [];
    if (stats.length === 0) {
      statsGrid.innerHTML = '<p class="empty-state">—</p>';
    } else {
      statsGrid.innerHTML = stats.map(st => {
        const label = (st.label && (st.label[currentLang] || st.label.ru || st.label)) || st.id;
        return `
          <div class="stat-card">
            <div class="stat-value">${escapeHtml(String(st.value))}</div>
            <div class="stat-label">${escapeHtml(label)}</div>
          </div>
        `;
      }).join('');
    }

    // Matches
    const matchesList = $('#matchesList');
    const matches = data.matches || [];
    if (matches.length === 0) {
      matchesList.innerHTML = `<p class="empty-state" data-i18n="no_matches">${i18n[currentLang].no_matches}</p>`;
    } else {
      matchesList.innerHTML = matches.map(m => `
        <div class="match-card">
          <div class="match-meta">
            <span class="match-tournament">${escapeHtml(m.tournament || '')}</span>
            <span>${escapeHtml(m.date || '')}</span>
          </div>
          <div class="match-team left">K7 ESPORTS</div>
          <div class="match-score">${m.score ? escapeHtml(m.score) : '<span class="match-vs">VS</span>'}</div>
          <div class="match-team right">${escapeHtml(m.opponent || 'TBD')}</div>
        </div>
      `).join('');
    }

    // News
    const newsGrid = $('#newsGrid');
    const news = data.news || [];
    if (news.length === 0) {
      newsGrid.innerHTML = `<p class="empty-state" data-i18n="no_news">${i18n[currentLang].no_news}</p>`;
    } else {
      newsGrid.innerHTML = news.map(n => `
        <article class="news-card">
          <div class="news-img">
            ${n.cover ? `<img src="${n.cover}" alt="" loading="lazy">` : '<div class="player-photo-placeholder">K7</div>'}
          </div>
          <div class="news-body">
            <span class="news-date">${escapeHtml(n.date || '')}</span>
            <h3>${escapeHtml(n.title || '')}</h3>
            <p>${escapeHtml(n.text || n.desc || '')}</p>
          </div>
        </article>
      `).join('');
    }

    // Highlights
    const hlGrid = $('#highlightsGrid');
    const hls = data.highlights || [];
    if (hls.length === 0) {
      hlGrid.innerHTML = `<p class="empty-state" data-i18n="no_highlights">${i18n[currentLang].no_highlights}</p>`;
    } else {
      hlGrid.innerHTML = hls.map(h => `
        <article class="highlight-card">
          <div class="highlight-img">
            ${h.cover ? `<img src="${h.cover}" alt="" loading="lazy">` : '<div class="player-photo-placeholder">K7</div>'}
          </div>
          <div class="highlight-body">
            <h3>${escapeHtml(h.title || '')}</h3>
            ${h.url ? `<a href="${escapeHtml(h.url)}" target="_blank" rel="noopener" style="color:var(--accent);font-size:0.85rem">Watch →</a>` : ''}
          </div>
        </article>
      `).join('');
    }

    // Socials
    renderSocials(data.socials || {});
  }

  function renderSocials(socials) {
    const icons = {
      telegram: 'TG',
      tiktok: 'TT',
      twitch: 'TW',
      steam: 'ST'
    };
    const links = Object.entries(socials)
      .filter(([, url]) => url && url.trim())
      .map(([key, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${key}">${icons[key] || key.slice(0,2).toUpperCase()}</a>`);

    const headerSoc = $('#headerSocials');
    const footerSoc = $('#footerSocials');
    if (headerSoc) headerSoc.innerHTML = links.join('');
    if (footerSoc) {
      footerSoc.innerHTML = Object.entries(socials)
        .filter(([, url]) => url && url.trim())
        .map(([key, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${key.charAt(0).toUpperCase() + key.slice(1)}</a>`)
        .join('');
    }
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ===== Load public data =====
  async function loadPublic() {
    try {
      const data = await api('/data');
      renderPublic(data);
    } catch (e) {
      console.error('Failed to load data', e);
      // Fallback empty
      renderPublic({
        settings: { teamName: 'K7 ESPORTS', region: 'CIS', tagline: 'MORE THAN JUST A TEAM', theme: 'black-red', description: { ru: '', en: '' } },
        players: [],
        teamStats: [],
        matches: [],
        news: [],
        highlights: [],
        socials: {}
      });
    }
  }

  // ===== Scroll animations =====
  function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    $$('.section-animate').forEach(el => observer.observe(el));
  }

  // ===== Gear long-press for admin =====
  function initGear() {
    const gear = $('#gearBtn');
    let timer = null;
    let holding = false;

    const start = (e) => {
      e.preventDefault();
      holding = true;
      gear.classList.add('holding');
      timer = setTimeout(() => {
        if (holding) openLogin();
      }, 800);
    };

    const end = () => {
      holding = false;
      gear.classList.remove('holding');
      clearTimeout(timer);
    };

    gear.addEventListener('mousedown', start);
    gear.addEventListener('touchstart', start, { passive: false });
    gear.addEventListener('mouseup', end);
    gear.addEventListener('mouseleave', end);
    gear.addEventListener('touchend', end);
    gear.addEventListener('touchcancel', end);

    // Alternative: double-click
    let lastClick = 0;
    gear.addEventListener('click', (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastClick < 350) openLogin();
      lastClick = now;
    });
  }

  function openLogin() {
    if (token) {
      openAdmin();
      return;
    }
    $('#loginModal').hidden = false;
    $('#adminPass').value = '';
    $('#loginError').hidden = true;
    $('#adminPass').focus();
  }

  function closeLogin() {
    $('#loginModal').hidden = true;
  }

  // ===== Auth =====
  async function handleLogin(e) {
    e.preventDefault();
    const pass = $('#adminPass').value;
    try {
      const res = await api('/login', {
        method: 'POST',
        body: JSON.stringify({ password: pass })
      });
      token = res.token;
      localStorage.setItem('k7_token', token);
      closeLogin();
      toast('Вход выполнен');
      openAdmin();
    } catch (err) {
      $('#loginError').textContent = err.message || 'Неверный пароль';
      $('#loginError').hidden = false;
    }
  }

  function logout() {
    token = null;
    localStorage.removeItem('k7_token');
    $('#adminPanel').hidden = true;
    toast('Вы вышли');
  }

  // ===== Admin Panel =====
  async function openAdmin() {
    try {
      adminData = await api('/admin/data');
      $('#adminPanel').hidden = false;
      renderAdminTabs();
      switchAdminTab('settings');
    } catch (e) {
      token = null;
      localStorage.removeItem('k7_token');
      openLogin();
    }
  }

  function switchAdminTab(name) {
    $$('.admin-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.admin-tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  }

  function renderAdminTabs() {
    renderSettingsTab();
    renderPlayersTab();
    renderStatsTab();
    renderMatchesTab();
    renderNewsTab();
    renderHighlightsTab();
    renderSocialsTab();
    renderThemesTab();
  }

  // --- Settings ---
  function renderSettingsTab() {
    const s = adminData.settings || {};
    const desc = s.description || {};
    $('#tab-settings').innerHTML = `
      <h3 style="margin-bottom:16px">Настройки сайта</h3>
      <form class="admin-form" id="settingsForm">
        <div class="form-row">
          <label>Название команды</label>
          <input name="teamName" value="${escapeHtml(s.teamName || '')}" required>
        </div>
        <div class="form-row">
          <label>Подпись (tagline)</label>
          <input name="tagline" value="${escapeHtml(s.tagline || '')}">
        </div>
        <div class="form-row">
          <label>Регион</label>
          <input name="region" value="${escapeHtml(s.region || '')}" placeholder="CIS">
        </div>
        <div class="form-row">
          <label>Описание (RU)</label>
          <textarea name="desc_ru">${escapeHtml(desc.ru || '')}</textarea>
        </div>
        <div class="form-row">
          <label>Описание (EN)</label>
          <textarea name="desc_en">${escapeHtml(desc.en || '')}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">Сохранить</button>
      </form>
    `;
    $('#settingsForm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        teamName: fd.get('teamName'),
        tagline: fd.get('tagline'),
        region: fd.get('region'),
        description: { ru: fd.get('desc_ru'), en: fd.get('desc_en') }
      };
      try {
        await api('/admin/settings', { method: 'PUT', body: JSON.stringify(body) });
        adminData.settings = { ...adminData.settings, ...body };
        toast('Сохранено');
        loadPublic();
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  // --- Players ---
  function renderPlayersTab() {
    const players = adminData.players || [];
    $('#tab-players').innerHTML = `
      <h3 style="margin-bottom:16px">Управление составом</h3>
      <form class="admin-form" id="playerForm">
        <input type="hidden" name="id">
        <div class="form-row"><label>Никнейм</label><input name="nickname" required></div>
        <div class="form-row"><label>Роль</label>
          <select name="role">
            <option>IGL</option><option>AWPER</option><option>RIFLER</option>
            <option>SUPPORT</option><option>ENTRY FRAGGER</option>
          </select>
        </div>
        <div class="form-row"><label>Rating 3.0</label><input name="rating" placeholder="1.15"></div>
        <div class="form-row"><label>URL фото</label><input name="photo" placeholder="/uploads/..."></div>
        <div class="form-row"><label>Порядок</label><input name="order" type="number" value="1"></div>
        <div class="form-row"><label><input type="checkbox" name="visible" checked> Показывать</label></div>
        <button type="submit" class="btn btn-primary">Сохранить игрока</button>
      </form>
      <div class="admin-list" id="playersList"></div>
    `;
    const list = $('#playersList');
    list.innerHTML = players.sort((a,b)=>a.order-b.order).map(p => `
      <div class="admin-item">
        <div><strong>${escapeHtml(p.nickname)}</strong> — ${escapeHtml(p.role)} (${escapeHtml(p.rating || '—')})</div>
        <div class="admin-item-actions">
          <button class="btn btn-sm btn-outline" data-edit="${p.id}">Изм.</button>
          <button class="btn btn-sm btn-danger" data-del="${p.id}">Удал.</button>
        </div>
      </div>
    `).join('') || '<p class="empty-state">Нет игроков</p>';

    list.onclick = (e) => {
      const id = e.target.dataset.edit || e.target.dataset.del;
      if (!id) return;
      if (e.target.dataset.del) {
        if (!confirm('Удалить игрока?')) return;
        adminData.players = adminData.players.filter(p => p.id !== id);
        savePlayers();
      } else {
        const p = adminData.players.find(x => x.id === id);
        if (!p) return;
        const f = $('#playerForm');
        f.id.value = p.id;
        f.nickname.value = p.nickname;
        f.role.value = p.role;
        f.rating.value = p.rating || '';
        f.photo.value = p.photo || '';
        f.order.value = p.order || 1;
        f.visible.checked = p.visible !== false;
      }
    };

    $('#playerForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const id = f.id.value || String(Date.now());
      const player = {
        id,
        nickname: f.nickname.value.trim(),
        role: f.role.value,
        rating: f.rating.value.trim(),
        photo: f.photo.value.trim(),
        order: parseInt(f.order.value, 10) || 1,
        visible: f.visible.checked,
        stats: {}
      };
      const idx = adminData.players.findIndex(p => p.id === id);
      if (idx >= 0) adminData.players[idx] = player;
      else adminData.players.push(player);
      f.reset();
      f.id.value = '';
      await savePlayers();
    };
  }

  async function savePlayers() {
    try {
      await api('/admin/players', { method: 'PUT', body: JSON.stringify(adminData.players) });
      toast('Состав сохранён');
      renderPlayersTab();
      loadPublic();
    } catch (err) { toast(err.message, 'error'); }
  }

  // --- Stats ---
  function renderStatsTab() {
    const stats = adminData.teamStats || [];
    $('#tab-stats').innerHTML = `
      <h3 style="margin-bottom:16px">Статистика команды</h3>
      <form class="admin-form" id="statsForm">
        ${stats.map((st, i) => `
          <div class="form-row" style="border:1px solid var(--border);padding:12px;border-radius:6px">
            <label>${escapeHtml((st.label && st.label.ru) || st.id)}</label>
            <input name="value_${i}" value="${escapeHtml(String(st.value))}" data-id="${st.id}">
            <label style="margin-top:6px"><input type="checkbox" name="vis_${i}" ${st.visible !== false ? 'checked' : ''}> Показывать</label>
          </div>
        `).join('')}
        <button type="submit" class="btn btn-primary">Сохранить статистику</button>
      </form>
    `;
    $('#statsForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      adminData.teamStats = adminData.teamStats.map((st, i) => ({
        ...st,
        value: f['value_' + i].value,
        visible: f['vis_' + i].checked
      }));
      try {
        await api('/admin/team-stats', { method: 'PUT', body: JSON.stringify(adminData.teamStats) });
        toast('Статистика сохранена');
        loadPublic();
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  // --- Matches ---
  function renderMatchesTab() {
    const matches = adminData.matches || [];
    $('#tab-matches').innerHTML = `
      <h3 style="margin-bottom:16px">Матчи</h3>
      <form class="admin-form" id="matchForm">
        <input type="hidden" name="id">
        <div class="form-row"><label>Турнир</label><input name="tournament" required></div>
        <div class="form-row"><label>Соперник</label><input name="opponent" required></div>
        <div class="form-row"><label>Дата</label><input name="date" placeholder="16 Oct 2026"></div>
        <div class="form-row"><label>Счёт</label><input name="score" placeholder="2:1"></div>
        <div class="form-row"><label>Статус</label>
          <select name="status"><option>upcoming</option><option>live</option><option>finished</option></select>
        </div>
        <button type="submit" class="btn btn-primary">Сохранить матч</button>
      </form>
      <div class="admin-list" id="matchesAdminList"></div>
    `;
    const list = $('#matchesAdminList');
    list.innerHTML = matches.map(m => `
      <div class="admin-item">
        <div>${escapeHtml(m.tournament)}: K7 vs ${escapeHtml(m.opponent)} (${escapeHtml(m.date || '')})</div>
        <div class="admin-item-actions">
          <button class="btn btn-sm btn-danger" data-del="${m.id}">Удал.</button>
        </div>
      </div>
    `).join('') || '<p class="empty-state">Нет матчей</p>';

    list.onclick = (e) => {
      if (e.target.dataset.del) {
        if (!confirm('Удалить?')) return;
        adminData.matches = adminData.matches.filter(m => m.id !== e.target.dataset.del);
        saveMatches();
      }
    };

    $('#matchForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const id = f.id.value || String(Date.now());
      const match = {
        id,
        tournament: f.tournament.value.trim(),
        opponent: f.opponent.value.trim(),
        date: f.date.value.trim(),
        score: f.score.value.trim(),
        status: f.status.value
      };
      const idx = adminData.matches.findIndex(m => m.id === id);
      if (idx >= 0) adminData.matches[idx] = match;
      else adminData.matches.unshift(match);
      f.reset();
      await saveMatches();
    };
  }

  async function saveMatches() {
    try {
      await api('/admin/matches', { method: 'PUT', body: JSON.stringify(adminData.matches) });
      toast('Матчи сохранены');
      renderMatchesTab();
      loadPublic();
    } catch (err) { toast(err.message, 'error'); }
  }

  // --- News ---
  function renderNewsTab() {
    const news = adminData.news || [];
    $('#tab-news').innerHTML = `
      <h3 style="margin-bottom:16px">Новости</h3>
      <form class="admin-form" id="newsForm">
        <input type="hidden" name="id">
        <div class="form-row"><label>Заголовок</label><input name="title" required></div>
        <div class="form-row"><label>Дата</label><input name="date" placeholder="16.10.2026"></div>
        <div class="form-row"><label>Текст</label><textarea name="text" required></textarea></div>
        <div class="form-row"><label>URL обложки</label><input name="cover"></div>
        <button type="submit" class="btn btn-primary">Сохранить новость</button>
      </form>
      <div class="admin-list" id="newsAdminList"></div>
    `;
    const list = $('#newsAdminList');
    list.innerHTML = news.map(n => `
      <div class="admin-item">
        <div><strong>${escapeHtml(n.title)}</strong> (${escapeHtml(n.date || '')})</div>
        <div class="admin-item-actions">
          <button class="btn btn-sm btn-danger" data-del="${n.id}">Удал.</button>
        </div>
      </div>
    `).join('') || '<p class="empty-state">Нет новостей</p>';

    list.onclick = (e) => {
      if (e.target.dataset.del) {
        if (!confirm('Удалить?')) return;
        adminData.news = adminData.news.filter(n => n.id !== e.target.dataset.del);
        saveNews();
      }
    };

    $('#newsForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const id = f.id.value || String(Date.now());
      const item = {
        id,
        title: f.title.value.trim(),
        date: f.date.value.trim(),
        text: f.text.value.trim(),
        cover: f.cover.value.trim()
      };
      const idx = adminData.news.findIndex(n => n.id === id);
      if (idx >= 0) adminData.news[idx] = item;
      else adminData.news.unshift(item);
      f.reset();
      await saveNews();
    };
  }

  async function saveNews() {
    try {
      await api('/admin/news', { method: 'PUT', body: JSON.stringify(adminData.news) });
      toast('Новости сохранены');
      renderNewsTab();
      loadPublic();
    } catch (err) { toast(err.message, 'error'); }
  }

  // --- Highlights ---
  function renderHighlightsTab() {
    const hls = adminData.highlights || [];
    $('#tab-highlights').innerHTML = `
      <h3 style="margin-bottom:16px">Хайлайты</h3>
      <form class="admin-form" id="hlForm">
        <input type="hidden" name="id">
        <div class="form-row"><label>Название</label><input name="title" required></div>
        <div class="form-row"><label>Ссылка (YouTube/Twitch)</label><input name="url"></div>
        <div class="form-row"><label>URL обложки</label><input name="cover"></div>
        <button type="submit" class="btn btn-primary">Сохранить</button>
      </form>
      <div class="admin-list" id="hlAdminList"></div>
    `;
    const list = $('#hlAdminList');
    list.innerHTML = hls.map(h => `
      <div class="admin-item">
        <div>${escapeHtml(h.title)}</div>
        <div class="admin-item-actions">
          <button class="btn btn-sm btn-danger" data-del="${h.id}">Удал.</button>
        </div>
      </div>
    `).join('') || '<p class="empty-state">Нет хайлайтов</p>';

    list.onclick = (e) => {
      if (e.target.dataset.del) {
        if (!confirm('Удалить?')) return;
        adminData.highlights = adminData.highlights.filter(h => h.id !== e.target.dataset.del);
        saveHighlights();
      }
    };

    $('#hlForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const id = f.id.value || String(Date.now());
      const item = { id, title: f.title.value.trim(), url: f.url.value.trim(), cover: f.cover.value.trim() };
      const idx = adminData.highlights.findIndex(h => h.id === id);
      if (idx >= 0) adminData.highlights[idx] = item;
      else adminData.highlights.unshift(item);
      f.reset();
      await saveHighlights();
    };
  }

  async function saveHighlights() {
    try {
      await api('/admin/highlights', { method: 'PUT', body: JSON.stringify(adminData.highlights) });
      toast('Сохранено');
      renderHighlightsTab();
      loadPublic();
    } catch (err) { toast(err.message, 'error'); }
  }

  // --- Socials ---
  function renderSocialsTab() {
    const s = adminData.socials || {};
    $('#tab-socials').innerHTML = `
      <h3 style="margin-bottom:16px">Социальные сети</h3>
      <form class="admin-form" id="socialsForm">
        <div class="form-row"><label>Telegram</label><input name="telegram" value="${escapeHtml(s.telegram || '')}" placeholder="https://t.me/..."></div>
        <div class="form-row"><label>TikTok</label><input name="tiktok" value="${escapeHtml(s.tiktok || '')}"></div>
        <div class="form-row"><label>Twitch</label><input name="twitch" value="${escapeHtml(s.twitch || '')}"></div>
        <div class="form-row"><label>Steam</label><input name="steam" value="${escapeHtml(s.steam || '')}"></div>
        <button type="submit" class="btn btn-primary">Сохранить</button>
      </form>
    `;
    $('#socialsForm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        telegram: fd.get('telegram'),
        tiktok: fd.get('tiktok'),
        twitch: fd.get('twitch'),
        steam: fd.get('steam')
      };
      try {
        await api('/admin/socials', { method: 'PUT', body: JSON.stringify(body) });
        adminData.socials = body;
        toast('Сохранено');
        loadPublic();
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  // --- Themes ---
  function renderThemesTab() {
    const current = (adminData.settings && adminData.settings.theme) || 'black-red';
    const themes = [
      { id: 'black-red', name: 'Black / Red', colors: '#0a0a0b,#ef4444' },
      { id: 'white-red', name: 'White / Red', colors: '#f8f8f8,#dc2626' },
      { id: 'black-yellow', name: 'Black / Yellow', colors: '#0a0a0b,#eab308' },
      { id: 'black-blue', name: 'Black / Blue', colors: '#0a0a0b,#3b82f6' }
    ];
    $('#tab-themes').innerHTML = `
      <h3 style="margin-bottom:16px">Цветовые темы</h3>
      <div class="theme-grid">
        ${themes.map(t => `
          <div class="theme-option ${t.id === current ? 'active' : ''}" data-theme="${t.id}">
            <div class="theme-swatch" style="background:linear-gradient(135deg,${t.colors})"></div>
            <div style="font-size:0.8rem;font-weight:600">${t.name}</div>
          </div>
        `).join('')}
      </div>
    `;
    $$('.theme-option').forEach(el => {
      el.onclick = async () => {
        const theme = el.dataset.theme;
        try {
          await api('/admin/settings', { method: 'PUT', body: JSON.stringify({ theme }) });
          adminData.settings.theme = theme;
          document.body.dataset.theme = theme;
          toast('Тема применена');
          renderThemesTab();
        } catch (err) { toast(err.message, 'error'); }
      };
    });
  }

  // ===== Init =====
  function init() {
    // Lang
    $$('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => applyLang(btn.dataset.lang));
    });
    applyLang(currentLang);

    // Burger
    const burger = $('#burgerBtn');
    const nav = $('#nav');
    if (burger && nav) {
      burger.addEventListener('click', () => nav.classList.toggle('open'));
      nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
    }

    // Login form
    $('#loginForm').addEventListener('submit', handleLogin);
    $('#closeLogin').addEventListener('click', closeLogin);
    $('.modal-backdrop')?.addEventListener('click', closeLogin);

    // Admin nav
    $$('.admin-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchAdminTab(btn.dataset.tab));
    });
    $('#logoutBtn').addEventListener('click', logout);

    // Preview buttons (simple)
    $('#previewDesktop')?.addEventListener('click', () => {
      document.body.classList.remove('preview-mobile');
    });
    $('#previewMobile')?.addEventListener('click', () => {
      document.body.classList.add('preview-mobile');
    });

    initGear();
    initAnimations();
    loadPublic();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
