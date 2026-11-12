/* Contato Portes: QR Code para o WhatsApp do comercial com mensagem pronta. */
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

    document.querySelector('#qr-msg-text').textContent = `"${MENSAGEM}"`;
    document.querySelector('#btn-whats').href = url;

    // QR em SVG (vendor/qrcode.js define a global `qrcode`)
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      document.querySelector('#qr-box').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    } catch (e) {
      document.querySelector('#qr-box').innerHTML =
        '<p class="muted">Não foi possível gerar o QR Code. Use o botão abaixo.</p>';
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
