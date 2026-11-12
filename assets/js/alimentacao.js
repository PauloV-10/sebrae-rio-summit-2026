/* Alimentação: locais de comida dentro e ao redor do evento. */
(function () {
  'use strict';

  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function render(data) {
    const wrap = document.querySelector('#food-list');
    wrap.innerHTML = '';

    if (data.aviso) {
      const note = document.createElement('div');
      note.className = 'food-note';
      note.textContent = data.aviso;
      wrap.appendChild(note);
    }

    data.locais.forEach((l) => {
      const card = document.createElement('article');
      card.className = 'food-card';
      const ok = l.status === 'confirmado';
      const menu = (l.cardapio && l.cardapio.length)
        ? `<ul class="food-menu">${l.cardapio.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
        : '';
      card.innerHTML =
        `<div class="food-head">` +
        `<span class="food-emoji">${l.emoji || '🍴'}</span>` +
        `<div><div class="food-name">${esc(l.nome)}</div><div class="food-where">${esc(l.onde)}</div></div>` +
        `<span class="food-badge${ok ? '' : ' pend'}">${ok ? 'Confirmado' : 'A confirmar'}</span>` +
        `</div>` +
        `<p class="food-desc">${esc(l.desc)}</p>` +
        menu +
        `<div class="food-actions"></div>`;
      const actions = card.querySelector('.food-actions');

      const btnMap = document.createElement('button');
      btnMap.type = 'button';
      btnMap.className = 'btn';
      btnMap.textContent = '🗺️ Ver no mapa';
      btnMap.addEventListener('click', () => {
        location.hash = '#mapa';
        if (!window.Mapa || !l.foco) return;
        if (l.foco.tipo === 'building') window.Mapa.focusBuilding(l.foco.id);
        else if (l.foco.tipo === 'zona') window.Mapa.focusZone(l.foco.id);
        else window.Mapa.focusPoi(l.foco.id);
      });
      actions.appendChild(btnMap);

      if (l.instagram) {
        const a = document.createElement('a');
        a.className = 'btn';
        a.href = `https://www.instagram.com/${l.instagram}`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = `📸 @${l.instagram}`;
        actions.appendChild(a);
      }
      wrap.appendChild(card);
    });
  }

  window.Comida = { init: render };
})();
