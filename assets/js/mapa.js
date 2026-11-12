/* Mapa 2D do evento: contornos reais (OSM) + zonas internas + localização ao vivo.
   Unidade do SVG = metro. Origem = centroide do CINCO. Norte = cima. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const state = {
    svg: null, vb: { x: 0, y: 0, w: 100, h: 100 },
    lat0: 0, lon0: 0, kx: 1, ky: 111320,
    cincoBounds: null,
    watchId: null, userXY: null, lastFix: null,
    pointers: new Map(), pinchDist: 0,
    userTouched: false, pendingFit: null,
    floor: 0,
  };
  const POI_ICON = { banheiro: '🚻', entrada: '🚪', alimentacao: '🍽️', compras: '🛍️', info: 'ℹ️', food: '🍔', escada: '🪜', agua: '💧' };

  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };

  // ---------- projecao ----------
  const proj = ([lat, lon]) => [ (lon - state.lon0) * state.kx, -(lat - state.lat0) * state.ky ];
  const polyPts = (coords) => coords.map((c) => proj(c).map((v) => v.toFixed(1)).join(',')).join(' ');
  const bboxOf = (coords) => {
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    coords.forEach((c) => {
      const [x, y] = proj(c);
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    });
    return { minx, miny, maxx, maxy };
  };

  // ---------- viewbox ----------
  function applyVB() {
    state.svg.setAttribute('viewBox', `${state.vb.x} ${state.vb.y} ${state.vb.w} ${state.vb.h}`);
  }
  function fitBounds(b, padFrac) {
    const frame = state.svg.getBoundingClientRect();
    if (frame.width < 10 || frame.height < 10) {
      // aba do mapa ainda oculta: guarda o fit para quando ela aparecer
      state.pendingFit = { b, padFrac };
      return;
    }
    const pad = Math.max(b.maxx - b.minx, b.maxy - b.miny) * (padFrac == null ? 0.12 : padFrac);
    const w = (b.maxx - b.minx) + pad * 2, h = (b.maxy - b.miny) + pad * 2;
    const ratio = frame.width / frame.height;
    let W = w, H = h;
    if (W / H < ratio) W = H * ratio; else H = W / ratio;
    state.vb = { x: (b.minx + b.maxx) / 2 - W / 2, y: (b.miny + b.maxy) / 2 - H / 2, w: W, h: H };
    state.pendingFit = null;
    applyVB();
  }
  function zoomAt(fx, fy, factor) {
    const nw = Math.min(Math.max(state.vb.w * factor, 30), 4000);
    const scale = nw / state.vb.w;
    state.vb.x = fx - (fx - state.vb.x) * scale;
    state.vb.y = fy - (fy - state.vb.y) * scale;
    state.vb.w = nw; state.vb.h = state.vb.h * scale;
    applyVB();
  }
  const clientToMap = (cx, cy) => {
    const r = state.svg.getBoundingClientRect();
    return [ state.vb.x + ((cx - r.left) / r.width) * state.vb.w, state.vb.y + ((cy - r.top) / r.height) * state.vb.h ];
  };

  // ---------- desenho ----------
  function wrapLabel(parent, text, x, y, cls, maxChars) {
    const words = String(text).split(' ');
    const lines = [];
    let cur = '';
    words.forEach((w) => {
      if ((cur + ' ' + w).trim().length > (maxChars || 14)) { if (cur) lines.push(cur); cur = w; }
      else cur = (cur + ' ' + w).trim();
    });
    if (cur) lines.push(cur);
    const t = el('text', { x, y: y - (lines.length - 1) * 3.4, class: cls });
    lines.forEach((ln, i) => {
      const ts = el('tspan', { x, dy: i === 0 ? 0 : 6.8 });
      ts.textContent = ln;
      t.appendChild(ts);
    });
    parent.appendChild(t);
  }
  const centroid = (coords) => {
    let sx = 0, sy = 0;
    coords.forEach((c) => { const [x, y] = proj(c); sx += x; sy += y; });
    return [sx / coords.length, sy / coords.length];
  };

  function build(osm, interior) {
    const svg = state.svg;
    svg.innerHTML = '';
    const cinco = osm.buildings.find((b) => b.id === 'cinco');
    // origem no centroide do CINCO
    let slat = 0, slon = 0;
    cinco.coords.forEach((c) => { slat += c[0]; slon += c[1]; });
    state.lat0 = slat / cinco.coords.length;
    state.lon0 = slon / cinco.coords.length;
    state.kx = 111320 * Math.cos(state.lat0 * Math.PI / 180);

    const gCtx = el('g', { id: 'g-ctx' });
    const gMain = el('g', { id: 'g-main' });
    const gFloors = [el('g', { id: 'g-floor-0' }), el('g', { id: 'g-floor-1', style: 'display:none' })];
    svg.append(gCtx, gMain, gFloors[0], gFloors[1]);

    // contexto: complexo e predios vizinhos
    osm.buildings.forEach((b) => {
      if (b.id === 'cinco') return;
      if (b.kind === 'complex') {
        gCtx.appendChild(el('polygon', { points: polyPts(b.coords), class: 'b-ring' }));
        return;
      }
      gCtx.appendChild(el('polygon', { points: polyPts(b.coords), class: 'b-ctx' }));
      const [cx, cy] = centroid(b.coords);
      if (b.kind === 'food') {
        gCtx.appendChild(el('circle', { cx, cy, r: 5, class: 'poi-dot' }));
        const ic = el('text', { x: cx, y: cy + 2.3, class: 'poi-ico' });
        ic.textContent = POI_ICON.food;
        gCtx.appendChild(ic);
        wrapLabel(gCtx, b.name, cx, cy + 12, 'map-label lbl-ctx', 16);
      } else {
        wrapLabel(gCtx, b.name, cx, cy, 'map-label lbl-ctx', 16);
      }
    });

    // pavilhao do evento
    gMain.appendChild(el('polygon', { points: polyPts(cinco.coords), class: 'b-cinco' }));
    state.cincoBounds = bboxOf(cinco.coords);

    // zonas internas, agrupadas por andar
    interior.zones.forEach((z) => {
      const g = gFloors[z.floor || 0];
      const attrs = { points: polyPts(z.poly), 'data-zone': z.id, 'data-floor': z.floor || 0, rx: 1 };
      if (z.type === 'sala') {
        attrs.fill = hexA(z.color || '#264D55', 0.16);
        attrs.stroke = z.color || '#264D55';
        attrs['stroke-width'] = '1';
      } else {
        attrs.class = 'z-' + z.type;
      }
      g.appendChild(el('polygon', attrs));
      const [cx, cy] = centroid(z.poly);
      const sala = z.type === 'sala';
      if (z.emoji) {
        const em = el('text', { x: cx, y: cy - 2.6, class: 'map-emoji' });
        em.textContent = z.emoji;
        g.appendChild(em);
      }
      wrapLabel(g, z.name, cx, cy + (z.emoji ? 4.6 : 2), 'map-label' + (sala ? '' : ' lbl-espaco'), sala ? 12 : 13);
    });

    // pontos de interesse, por andar
    interior.pois.forEach((p) => {
      const g = gFloors[p.floor || 0];
      const [x, y] = proj(p.at);
      g.appendChild(el('circle', { cx: x, cy: y, r: 5, class: 'poi-dot', 'data-poi': p.id, 'data-floor': p.floor || 0 }));
      const ic = el('text', { x, y: y + 2.3, class: 'poi-ico' });
      ic.textContent = POI_ICON[p.type] || '📌';
      g.appendChild(ic);
      const title = el('title', {});
      title.textContent = p.name;
      g.lastChild.appendChild(title);
    });

    // marcador do usuario
    const gu = el('g', { id: 'user-marker', visibility: 'hidden' });
    gu.appendChild(el('circle', { id: 'user-acc', cx: 0, cy: 0, r: 20 }));
    gu.appendChild(el('circle', { id: 'user-pulse', cx: 0, cy: 0, r: 5 }));
    gu.appendChild(el('circle', { id: 'user-dot', cx: 0, cy: 0, r: 3.4 }));
    svg.appendChild(gu);

    fitBounds(state.cincoBounds, 0.14);
  }
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  // ---------- andares ----------
  function setFloor(f) {
    state.floor = f;
    const g0 = state.svg.querySelector('#g-floor-0');
    const g1 = state.svg.querySelector('#g-floor-1');
    if (g0) g0.style.display = f === 0 ? '' : 'none';
    if (g1) g1.style.display = f === 1 ? '' : 'none';
    document.querySelectorAll('[data-floor-btn]').forEach((b) => {
      const on = +b.dataset.floorBtn === f;
      b.classList.toggle('btn-primary', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function buildFloorButtons() {
    const bar = document.querySelector('.map-toolbar');
    [[0, '🏟️ Térreo'], [1, '🪜 Piso superior']].forEach(([f, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn' + (f === 0 ? ' btn-primary' : '');
      b.dataset.floorBtn = f;
      b.textContent = label;
      b.addEventListener('click', () => setFloor(f));
      bar.appendChild(b);
    });
  }

  // ---------- legenda ----------
  function buildLegend(data, interior) {
    const lg = $('#map-legend');
    lg.innerHTML = '';
    const add = (html) => { const s = document.createElement('span'); s.className = 'legend-item'; s.innerHTML = html; lg.appendChild(s); };
    data.rooms.forEach((r) => add(`<span class="legend-swatch" style="background:${hexA(r.color, 0.5)};border:1px solid ${r.color}"></span>${r.short}`));
    add('<span class="legend-swatch" style="background:rgba(133,177,174,.45)"></span>Espaços Sebrae');
    add('<span class="legend-swatch" style="background:rgba(154,205,120,.45)"></span>Parceiros');
    add('<span class="legend-swatch" style="background:rgba(243,204,119,.6)"></span>Credenciamento');
    add('<span class="legend-swatch" style="background:rgba(230,126,34,.4)"></span>Alimentação');
    add('🚻 Banheiros');
    add('🪜 Escadas e elevadores');
    add('💧 Hidratação');
    add('<span class="legend-swatch" style="background:#1668DC;border-radius:50%"></span>Você');
  }

  // ---------- interacao (pan / zoom / pinch) ----------
  function bindGestures() {
    const svg = state.svg;
    svg.addEventListener('pointerdown', (e) => {
      state.userTouched = true;
      svg.setPointerCapture(e.pointerId);
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (state.pointers.size === 2) {
        const [a, b] = [...state.pointers.values()];
        state.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!state.pointers.has(e.pointerId)) return;
      const prev = state.pointers.get(e.pointerId);
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (state.pointers.size === 1) {
        const r = svg.getBoundingClientRect();
        state.vb.x -= (e.clientX - prev.x) * (state.vb.w / r.width);
        state.vb.y -= (e.clientY - prev.y) * (state.vb.h / r.height);
        applyVB();
      } else if (state.pointers.size === 2) {
        const [a, b] = [...state.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (state.pinchDist > 0 && d > 0) {
          const [mx, my] = clientToMap((a.x + b.x) / 2, (a.y + b.y) / 2);
          zoomAt(mx, my, state.pinchDist / d);
        }
        state.pinchDist = d;
      }
    });
    const up = (e) => { state.pointers.delete(e.pointerId); state.pinchDist = 0; };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      state.userTouched = true;
      const [mx, my] = clientToMap(e.clientX, e.clientY);
      zoomAt(mx, my, e.deltaY > 0 ? 1.18 : 0.85);
    }, { passive: false });
  }

  // ---------- geolocalizacao ----------
  function setStatus(msg, cls) {
    const box = $('#geo-status');
    box.hidden = false;
    box.className = 'geo-status' + (cls ? ' ' + cls : '');
    box.innerHTML = msg;
  }
  function startGeo() {
    if (!('geolocation' in navigator)) {
      setStatus('Seu navegador não oferece geolocalização.', 'err');
      return;
    }
    setStatus('Solicitando permissão de localização...');
    if (state.watchId != null) navigator.geolocation.clearWatch(state.watchId);
    state.watchId = navigator.geolocation.watchPosition(onFix, onGeoErr, {
      enableHighAccuracy: true, maximumAge: 2000, timeout: 15000,
    });
  }
  function onFix(pos) {
    const { latitude, longitude, accuracy } = pos.coords;
    const [x, y] = proj([latitude, longitude]);
    state.userXY = [x, y];
    state.lastFix = pos;
    const g = $('#user-marker');
    g.setAttribute('visibility', 'visible');
    g.setAttribute('transform', `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);
    const accR = Math.min(Math.max(accuracy, 5), 160);
    $('#user-acc').setAttribute('r', accR.toFixed(0));
    $('#btn-center').hidden = false;
    $('#btn-geo').textContent = '📍 Localização ativa';
    const dist = Math.hypot(x, y);
    if (dist > 1200) {
      setStatus(`Você está a <strong>${(dist / 1000).toFixed(1)} km</strong> do pavilhão. O ponto azul aparece quando você chegar ao Riocentro. Precisão atual: ${Math.round(accuracy)} m.`, '');
    } else {
      setStatus(`Localização ativa. Precisão de <strong>${Math.round(accuracy)} m</strong> (dentro de prédio o GPS pode variar). O ponto azul se move com você.`, 'ok');
    }
  }
  function onGeoErr(err) {
    if (err.code === 1) {
      setStatus('Permissão negada. Para ativar: toque no <strong>cadeado</strong> ao lado do endereço, abra <strong>Permissões</strong> e libere <strong>Localização</strong>. No iPhone: Ajustes, Safari, Localização.', 'err');
    } else if (err.code === 2) {
      setStatus('Não foi possível obter sua posição agora. Verifique se o GPS do aparelho está ligado.', 'err');
    } else {
      setStatus('A localização demorou para responder. Tente novamente em área mais aberta.', 'err');
    }
  }
  function centerOnUser() {
    if (!state.userXY) return;
    const [x, y] = state.userXY;
    const w = Math.min(state.vb.w, 180);
    const frame = state.svg.getBoundingClientRect();
    const h = w * (frame.height / Math.max(frame.width, 1));
    state.vb = { x: x - w / 2, y: y - h / 2, w, h };
    applyVB();
  }

  // ---------- foco (integracao com agenda e comida) ----------
  function flash(elm) {
    if (!elm) return;
    elm.classList.remove('zone-flash');
    void elm.getBoundingClientRect();
    elm.classList.add('zone-flash');
    setTimeout(() => elm.classList.remove('zone-flash'), 3600);
  }
  // adia o fit por dois frames: garante que a aba do mapa já esteja visível e medida
  function deferred(fn) {
    state.userTouched = true;
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }
  function focusZone(id) {
    deferred(() => {
      const poly = state.svg.querySelector(`[data-zone="${id}"]`);
      if (!poly) { fitBounds(state.cincoBounds, 0.14); return; }
      const floor = +(poly.getAttribute('data-floor') || 0);
      if (floor !== state.floor) setFloor(floor);
      const pts = poly.getAttribute('points').split(' ').map((p) => p.split(',').map(Number));
      let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
      pts.forEach(([x, y]) => {
        if (x < minx) minx = x; if (x > maxx) maxx = x;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
      });
      fitBounds({ minx, miny, maxx, maxy }, 1.1);
      flash(poly);
    });
  }
  function focusPoi(id) {
    deferred(() => {
      const dot = state.svg.querySelector(`[data-poi="${id}"]`);
      if (!dot) { fitBounds(state.cincoBounds, 0.14); return; }
      const x = +dot.getAttribute('cx'), y = +dot.getAttribute('cy');
      fitBounds({ minx: x - 55, miny: y - 55, maxx: x + 55, maxy: y + 55 }, 0.1);
      flash(dot);
    });
  }
  function focusBuilding(id, osm) {
    deferred(() => {
      const b = osm.buildings.find((bb) => bb.id === id);
      if (!b) return;
      fitBounds(bboxOf(b.coords), 0.6);
    });
  }

  // ---------- init ----------
  window.Mapa = {
    init(data, osm, interior) {
      state.svg = $('#map-svg');
      build(osm, interior);
      buildLegend(data, interior);
      buildFloorButtons();
      bindGestures();
      $('#btn-geo').addEventListener('click', startGeo);
      $('#btn-center').addEventListener('click', centerOnUser);
      $('#btn-fit').addEventListener('click', () => fitBounds(state.cincoBounds, 0.14));
      this._osm = osm;
      window.addEventListener('resize', () => { if (!state.userTouched) fitBounds(state.cincoBounds, 0.14); });
    },
    focusZone,
    focusPoi,
    focusBuilding(id) { focusBuilding(id, this._osm); },
    refit() { if (state.cincoBounds) fitBounds(state.cincoBounds, 0.14); },
    refitIfNeeded() {
      if (state.pendingFit) fitBounds(state.pendingFit.b, state.pendingFit.padFrac);
      else if (!state.userTouched && state.cincoBounds) fitBounds(state.cincoBounds, 0.14);
    },
  };
})();
