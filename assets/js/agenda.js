/* Agenda: grade de salas em timeline, estilo Google Agenda.
   Depende de data/agenda.json carregado pelo app.js. */
(function () {
  'use strict';

  const HOUR_PX = 112; // altura de 1 hora na grade
  const state = {
    data: null,
    day: null,          // 'YYYY-MM-DD'
    hidden: new Set(),  // salas ocultas
    favOnly: false,
    favs: new Set(),
    nowTimer: null,
  };

  // ---------- util ----------
  const $ = (s) => document.querySelector(s);
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const hexToRgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function loadFavs() {
    try {
      const raw = localStorage.getItem('srs26-favs');
      if (raw) state.favs = new Set(JSON.parse(raw));
    } catch (e) { /* armazenamento indisponivel */ }
  }
  function saveFavs() {
    try { localStorage.setItem('srs26-favs', JSON.stringify([...state.favs])); } catch (e) { /* ok */ }
  }

  // ---------- abas de dia ----------
  function renderTabs() {
    const wrap = $('#day-tabs');
    wrap.innerHTML = '';
    const hoje = todayStr();
    state.data.days.forEach((d) => {
      const [, , dd] = d.date.split('-');
      const wd = (d.label.split(' - ')[1] || '').trim();
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day-tab' + (d.date === state.day ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', d.date === state.day ? 'true' : 'false');
      btn.innerHTML = `<span class="d-num">${dd}/11</span><span class="d-wd">${esc(wd)}</span>` +
        (d.date === hoje ? '<span class="d-today">HOJE</span>' : '');
      btn.addEventListener('click', () => { state.day = d.date; renderTabs(); renderGrid(); });
      wrap.appendChild(btn);
    });
  }

  // ---------- filtros de sala ----------
  function renderFilters() {
    const wrap = $('#room-filters');
    wrap.innerHTML = '';
    state.data.rooms.forEach((r) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'room-chip' + (state.hidden.has(r.id) ? ' off' : '');
      chip.innerHTML = `<span class="dot" style="background:${r.color}"></span>${esc(r.short)}`;
      chip.addEventListener('click', () => {
        if (state.hidden.has(r.id)) state.hidden.delete(r.id); else state.hidden.add(r.id);
        renderFilters(); renderGrid();
      });
      wrap.appendChild(chip);
    });
    const fav = document.createElement('button');
    fav.type = 'button';
    fav.className = 'room-chip fav-chip' + (state.favOnly ? ' on' : '');
    fav.textContent = '★ Favoritas';
    fav.addEventListener('click', () => { state.favOnly = !state.favOnly; renderFilters(); renderGrid(); });
    wrap.appendChild(fav);
  }

  // ---------- grade ----------
  function renderGrid() {
    const tl = $('#timeline');
    const ev = state.data.event;
    const start = toMin(ev.gridStart), end = toMin(ev.gridEnd);
    const totalH = ((end - start) / 60) * HOUR_PX;
    const rooms = state.data.rooms.filter((r) => !state.hidden.has(r.id));
    const day = state.data.days.find((d) => d.date === state.day);

    tl.innerHTML = '';
    tl.style.gridTemplateColumns = `52px repeat(${rooms.length}, minmax(172px, 1fr))`;

    if (!rooms.length) { tl.innerHTML = '<div class="tl-empty">Nenhuma sala selecionada. Ative uma sala nos filtros acima.</div>'; return; }

    // cabecalho
    const corner = document.createElement('div');
    corner.className = 'tl-corner';
    tl.appendChild(corner);
    rooms.forEach((r) => {
      const th = document.createElement('div');
      th.className = 'tl-head';
      th.style.background = r.color;
      th.textContent = r.short;
      th.title = r.name;
      tl.appendChild(th);
    });

    // regua de horas
    const gutter = document.createElement('div');
    gutter.className = 'tl-gutter';
    gutter.style.height = totalH + 'px';
    for (let m = start; m <= end; m += 60) {
      const lbl = document.createElement('span');
      lbl.className = 'tl-hour';
      lbl.style.top = (((m - start) / 60) * HOUR_PX) + 'px';
      if (m === start) lbl.style.transform = 'none';
      lbl.textContent = `${Math.floor(m / 60)}h`;
      gutter.appendChild(lbl);
    }
    tl.appendChild(gutter);

    // colunas
    rooms.forEach((r) => {
      const col = document.createElement('div');
      col.className = 'tl-col';
      col.style.height = totalH + 'px';
      col.style.backgroundSize = `100% ${HOUR_PX}px, 100% ${HOUR_PX}px`;
      const talks = (day ? day.talks : []).filter((t) => t.room === r.id)
        .filter((t) => !state.favOnly || state.favs.has(t.id));
      talks.forEach((t) => {
        const top = ((toMin(t.start) - start) / 60) * HOUR_PX;
        const h = Math.max(((toMin(t.end) - toMin(t.start)) / 60) * HOUR_PX - 3, 30);
        const el = document.createElement('div');
        el.className = 'talk' + (h > 84 ? ' tall' : '');
        el.style.top = top + 'px';
        el.style.height = h + 'px';
        el.style.borderLeftColor = r.color;
        el.style.background = hexToRgba(r.color, 0.09);
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        const favOn = state.favs.has(t.id);
        el.innerHTML =
          `<span class="talk-fav${favOn ? ' on' : ''}" data-fav="${t.id}" title="Favoritar">★</span>` +
          `<div class="talk-time">${t.start}</div>` +
          `<div class="talk-title">${esc(t.title)}</div>` +
          (h > 62 && t.speakers ? `<div class="talk-speaker">${esc(t.speakers)}</div>` : '');
        el.addEventListener('click', (evn) => {
          if (evn.target.dataset && evn.target.dataset.fav) { toggleFav(t.id, evn.target); return; }
          openSheet(t, r);
        });
        el.addEventListener('keydown', (evn) => { if (evn.key === 'Enter') openSheet(t, r); });
        col.appendChild(el);
      });
      tl.appendChild(col);
    });

    renderNowLine(start, end, totalH);
    if (state.nowTimer) clearInterval(state.nowTimer);
    state.nowTimer = setInterval(() => renderNowLine(start, end, totalH), 30000);
    scrollToNow(start);
  }

  function scrollToNow(start) {
    if (state.day !== todayStr()) return;
    const wrap = $('#timeline-wrap');
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    const y = ((m - start) / 60) * HOUR_PX - 90;
    if (y > 0) wrap.scrollTop = y;
  }

  function renderNowLine(start, end, totalH) {
    const tl = $('#timeline');
    const old = tl.querySelector('.now-line');
    if (old) old.remove();
    if (state.day !== todayStr()) return;
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    if (m < start || m > end) return;
    const headH = tl.querySelector('.tl-head') ? tl.querySelector('.tl-head').offsetHeight : 36;
    const line = document.createElement('div');
    line.className = 'now-line';
    line.style.left = '52px';
    line.style.right = '0';
    line.style.top = (headH + ((m - start) / 60) * HOUR_PX) + 'px';
    tl.appendChild(line);
  }

  function toggleFav(id, el) {
    if (state.favs.has(id)) state.favs.delete(id); else state.favs.add(id);
    saveFavs();
    if (el) el.classList.toggle('on', state.favs.has(id));
    if (state.favOnly) renderGrid();
  }

  // ---------- sheet de detalhes ----------
  function openSheet(t, room) {
    const sheet = $('#talk-sheet'), back = $('#sheet-backdrop'), box = $('#sheet-content');
    const favOn = state.favs.has(t.id);
    const initials = (t.speakers || t.title).split(/[\s/]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    const media = t.img
      ? `<img class="sheet-photo" src="${t.img}" alt="Foto: ${esc(t.speakers)}" loading="lazy">`
      : `<div class="sheet-avatar" style="background:${room.color}">${esc(initials)}</div>`;
    const descHtml = (t.desc || '').split(/\n{2,}/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('') ||
      '<p class="muted">Detalhes desta atividade serão divulgados pelo evento.</p>';
    box.innerHTML =
      media +
      `<span class="sheet-roomchip" style="background:${room.color}">${esc(room.name)}${room.local ? ' · ' + esc(room.local) : ''}</span>` +
      `<div class="sheet-time">🕐 ${t.start} às ${t.end}</div>` +
      `<h2 class="sheet-title" id="sheet-title">${esc(t.title)}</h2>` +
      (t.speakers ? `<div class="sheet-speakers">🎤 ${esc(t.speakers)}</div>` : '') +
      `<div class="sheet-desc">${descHtml}</div>` +
      `<div class="sheet-actions">` +
      `<button type="button" class="btn" id="sheet-fav">${favOn ? '★ Favoritada' : '☆ Favoritar'}</button>` +
      `<button type="button" class="btn btn-primary" id="sheet-map">🗺️ Ver sala no mapa</button>` +
      `</div>`;
    sheet.hidden = false; back.hidden = false;
    document.body.style.overflow = 'hidden';
    $('#sheet-fav').addEventListener('click', () => {
      toggleFav(t.id, null);
      $('#sheet-fav').textContent = state.favs.has(t.id) ? '★ Favoritada' : '☆ Favoritar';
      renderGrid();
    });
    $('#sheet-map').addEventListener('click', () => {
      closeSheet();
      location.hash = '#mapa';
      if (window.Mapa) window.Mapa.focusZone(t.room);
    });
  }
  function closeSheet() {
    $('#talk-sheet').hidden = true;
    $('#sheet-backdrop').hidden = true;
    document.body.style.overflow = '';
  }

  // ---------- init ----------
  window.Agenda = {
    init(data) {
      state.data = data;
      loadFavs();
      const hoje = todayStr();
      state.day = data.days.some((d) => d.date === hoje) ? hoje : data.days[0].date;
      renderTabs();
      renderFilters();
      renderGrid();
      $('#sheet-close').addEventListener('click', closeSheet);
      $('#sheet-backdrop').addEventListener('click', closeSheet);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
    },
  };
})();
