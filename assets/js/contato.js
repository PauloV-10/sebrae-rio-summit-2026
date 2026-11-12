/* Contato Portes: QR Code (com a logo no centro) para o WhatsApp do comercial. */
(function () {
  'use strict';

  const FONE = '5522999412555';
  const MENSAGEM = 'Olá, vim através do Sebrae summit no dia 12/11, gostaria de agendar minha consultoria';

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }

  function init() {
    const url = `https://wa.me/${FONE}?text=${encodeURIComponent(MENSAGEM)}`;

    document.querySelector('#wa-row').href = url;

    // QR em SVG com correção de erro alta (H) para aceitar a logo central
    try {
      const qr = qrcode(0, 'H');
      qr.addData(url);
      qr.make();
      const box = document.querySelector('#qr-box');
      box.insertAdjacentHTML('afterbegin', qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }));
    } catch (e) {
      const plate = document.querySelector('.qr-logo-plate');
      if (plate) plate.hidden = true;
      document.querySelector('#qr-box').insertAdjacentHTML('afterbegin',
        '<p class="muted">Não foi possível gerar o QR Code. Use o botão verde abaixo.</p>');
    }

    document.querySelector('#btn-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast('Link copiado!');
      } catch (e) {
        const inp = document.createElement('textarea');
        inp.value = url;
        document.body.appendChild(inp);
        inp.select();
        document.execCommand('copy');
        inp.remove();
        toast('Link copiado!');
      }
    });
  }

  window.Contato = { init };
})();
