/* Bootstrap: carrega dados, inicia módulos e controla a navegação por abas. */
(function () {
  'use strict';

  const VIEWS = ['agenda', 'mapa', 'comida', 'portes'];

  function showView(name) {
    if (!VIEWS.includes(name)) name = 'agenda';
    VIEWS.forEach((v) => {
      document.querySelector(`#view-${v}`).hidden = (v !== name);
      document.querySelectorAll(`.nav-item[data-view="${v}"]`)
        .forEach((a) => a.classList.toggle('active', v === name));
    });
    if (name === 'mapa' && window.Mapa && window.Mapa._inited) {
      // o SVG precisa de medidas reais do frame para encaixar o viewBox
      requestAnimationFrame(() => window.Mapa.refitIfNeeded && window.Mapa.refitIfNeeded());
    }
    window.scrollTo({ top: 0 });
  }

  function route() {
    showView((location.hash || '#agenda').slice(1));
  }

  function liveChip() {
    const chip = document.querySelector('#live-chip');
    const d = new Date();
    const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (hoje >= '2026-11-10' && hoje <= '2026-11-12') {
      chip.hidden = false;
      chip.textContent = 'AO VIVO';
    }
  }

  async function boot() {
    window.addEventListener('hashchange', route);
    liveChip();

    try {
      const [agenda, osm, interior, comida] = await Promise.all([
        fetch('data/agenda.json').then((r) => r.json()),
        fetch('data/mapa-osm.json').then((r) => r.json()),
        fetch('data/mapa-interior.json').then((r) => r.json()),
        fetch('data/alimentacao.json').then((r) => r.json()),
      ]);
      window.Agenda.init(agenda);
      window.Mapa.init(agenda, osm, interior);
      window.Mapa._inited = true;
      window.Comida.init(comida);
      window.Contato.init();
      route();
    } catch (e) {
      document.querySelector('#main').innerHTML =
        '<div class="food-note" style="margin:20px">Falha ao carregar os dados do guia. Verifique a conexão e recarregue a página.</div>';
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* opcional */ });
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
