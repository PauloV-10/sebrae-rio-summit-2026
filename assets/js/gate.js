/* Portão de acesso do guia: o código é emitido pelo formulário da Portes
   (Google Forms "Reforma Tributária"), chega por e-mail e é validado no
   Apps Script do portal, que prende o código ao primeiro aparelho. É o
   mesmo validador do estudo CBS 2027, na mesma origem do GitHub Pages. */
(function () {
  'use strict';

  /* Portão desligado em 12/11 a pedido do Paulo: acesso livre durante o
     Summit. Para religar a trava por código, basta voltar para true. */
  var GATE_ATIVO = false;

  var PORTAL = 'https://script.google.com/macros/s/AKfycbyGk9kHt1Je_ESMqXR6pdCVfjYaO26vXeRpSKbN9Lu_SqAVMrSy0l05FEV_an0O6nBGSw/exec';
  var FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeWYYWSLhJPtqj_2kPcZCWcyHw_qrSdKv2_1jigUK0O81QaEQ/viewform';
  var KEY_PASS = 'srs26_pass';
  var KEY_DISP = 'demo_eleven_disp'; /* mesma identidade de aparelho do estudo CBS */
  /* chave master da equipe: só o hash fica no fonte; libera sem rede e sem trava */
  var MASTER_SHA = 'a230d3de81b7055168e6e20f37eec627010846cd4136a9eab22850cd39252e04';

  var $ = function (s) { return document.querySelector(s); };

  function sha256(txt) {
    if (!(window.crypto && crypto.subtle && window.TextEncoder))
      return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt))
      .then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      });
  }
  function eMaster(codigo) {
    return sha256(codigo).then(function (h) { return h === MASTER_SHA; });
  }

  function disp() {
    try {
      var d = localStorage.getItem(KEY_DISP);
      if (!d) {
        d = '';
        if (window.crypto && crypto.getRandomValues) {
          var a = new Uint8Array(16);
          crypto.getRandomValues(a);
          d = Array.prototype.map.call(a, function (b) {
            return ('0' + b.toString(16)).slice(-2);
          }).join('');
        } else {
          for (var i = 0; i < 32; i++)
            d += '0123456789abcdef'.charAt(Math.floor(Math.random() * 16));
        }
        localStorage.setItem(KEY_DISP, d);
      }
      return d;
    } catch (e) { return 'sem-armazenamento'; }
  }

  function valida(codigo) {
    return fetch(PORTAL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ acao: 'valida', codigo: codigo, disp: disp() })
    }).then(function (r) { return r.json(); });
  }

  function libera() {
    var g = $('#gate');
    if (!g) return;
    g.style.transition = 'opacity .25s';
    g.style.opacity = '0';
    setTimeout(function () { g.remove(); }, 260);
  }

  function erro(txt) {
    var e = $('#gate-erro');
    e.hidden = false;
    e.textContent = txt;
    var bt = $('#gate-entrar');
    bt.disabled = false;
    bt.textContent = '🔓 Entrar com meu código';
  }

  function mostra() {
    var g = $('#gate');
    g.hidden = false;
    var form = $('#gate-form');
    if (FORM_URL) { form.href = FORM_URL; form.hidden = false; }
    var bt = $('#gate-entrar'), inp = $('#gate-cod');
    function envia() {
      var c = (inp.value || '').trim().toUpperCase();
      if (!c) { erro('Digite o código recebido por e-mail.'); return; }
      bt.disabled = true;
      bt.textContent = 'Conferindo...';
      eMaster(c).then(function (master) {
        if (master) {
          try { localStorage.setItem(KEY_PASS, c); } catch (e) {}
          libera();
          return;
        }
        valida(c).then(function (j) {
          if (j && j.ok) {
            try { localStorage.setItem(KEY_PASS, c); } catch (e) {}
            libera();
          } else erro((j && j.motivo) || 'Código recusado.');
        }).catch(function () {
          erro('Sem conexão com o validador. Tente de novo.');
        });
      });
    }
    bt.addEventListener('click', envia);
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); envia(); }
    });
    inp.focus();
  }

  if (!GATE_ATIVO) { libera(); return; } /* acesso livre */

  var pass = null;
  try { pass = localStorage.getItem(KEY_PASS); } catch (e) {}
  if (pass) {
    libera(); /* já entrou neste aparelho: libera e revalida por trás */
    eMaster(pass).then(function (master) {
      if (master) return; /* chave master não revalida na rede */
      valida(pass).then(function (j) {
        if (j && !j.ok) {
          try { localStorage.removeItem(KEY_PASS); } catch (e) {}
          location.reload();
        }
      }).catch(function () { /* sem rede: mantém liberado */ });
    });
  } else {
    mostra();
  }
})();
