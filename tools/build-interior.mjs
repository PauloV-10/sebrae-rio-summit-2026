// Gera data/mapa-interior.json: zonas internas do CINCO em lat/lon.
// O CINCO e um losango (~165m x 164m). Sistema de coordenadas afim:
//   a = eixo W->E (-1 = apice oeste, +1 = apice leste)
//   b = eixo N->S (-1 = ponta norte, +1 = ponta sul)
// Regra de contorno: |a| + |b| <= ~0.95 mantem o ponto dentro do losango.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REPO = ROOT;
const osm = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'mapa-osm.json'), 'utf8'));
const cinco = osm.buildings.find(b => b.id === 'cinco');
const pts = cinco.coords.slice();
if (pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
// pts: 0,7 = ponta norte | 1,2 = apice leste | 3,4 = ponta sul | 5,6 = apice oeste
const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
const N = mid(pts[0], pts[7]);
const E = mid(pts[1], pts[2]);
const S = mid(pts[3], pts[4]);
const W = mid(pts[5], pts[6]);
const C = [(N[0] + E[0] + S[0] + W[0]) / 4, (N[1] + E[1] + S[1] + W[1]) / 4];
const AX = [(E[0] - W[0]) / 2, (E[1] - W[1]) / 2]; // meio-eixo a
const BX = [(S[0] - N[0]) / 2, (S[1] - N[1]) / 2]; // meio-eixo b
const P = (a, b) => [
  +(C[0] + a * AX[0] + b * BX[0]).toFixed(7),
  +(C[1] + a * AX[1] + b * BX[1]).toFixed(7),
];
const quad = (corners) => corners.map(([a, b]) => {
  if (Math.abs(a) + Math.abs(b) > 0.97) throw new Error(`fora do losango: a=${a} b=${b}`);
  return P(a, b);
});

// ---------------- layout representativo (ajustar com o mapa oficial do evento) ----------------
// floor 0 = Terreo | floor 1 = 2o piso (Varanda e salas de conteudo; Sala Atitude
// confirmada como Sala 203 C no video oficial do @sebraerj de 12/11/2026)
// Distribuicao em faixas paralelas ao eixo N-S, com folga entre vizinhos para os rotulos.
const zones = [
  // ===== TERREO =====
  // ponta norte -> centro
  { id: 'esp-startups', name: 'Startups', emoji: '🚀', type: 'espaco', floor: 0,
    poly: quad([[-0.14, -0.76], [0.10, -0.76], [0.16, -0.62], [-0.20, -0.62]]) },
  { id: 'esp-sebraelab', name: 'SebraeLab', emoji: '🧪', type: 'espaco', floor: 0,
    poly: quad([[-0.34, -0.56], [-0.04, -0.56], [-0.04, -0.40], [-0.38, -0.40]]) },
  { id: 'esp-gamesrj', name: 'Sebrae Games RJ', emoji: '🎮', type: 'espaco', floor: 0,
    poly: quad([[0.02, -0.56], [0.30, -0.56], [0.36, -0.40], [0.02, -0.40]]) },
  { id: 'esp-consult', name: 'Consultorias', emoji: '💼', type: 'espaco', floor: 0,
    poly: quad([[-0.56, -0.32], [-0.30, -0.32], [-0.30, -0.16], [-0.60, -0.16]]) },
  { id: 'esp-assessoria', name: 'Assessoria de Negócios', emoji: '🤝', type: 'espaco', floor: 0,
    poly: quad([[-0.24, -0.34], [0.06, -0.34], [0.06, -0.16], [-0.24, -0.16]]) },
  { id: 'esp-imersivas', name: 'Experiências Imersivas', emoji: '🥽', type: 'espaco', floor: 0,
    poly: quad([[0.12, -0.34], [0.44, -0.34], [0.50, -0.16], [0.12, -0.16]]) },
  // faixa central
  { id: 'entrada-hall', name: 'Credenciamento', emoji: '🎫', type: 'servico', floor: 0,
    poly: quad([[-0.74, -0.02], [-0.46, -0.02], [-0.46, 0.12], [-0.74, 0.12]]) },
  { id: 'praca', name: 'Praça de Alimentação', emoji: '🍽️', type: 'alimentacao', floor: 0,
    poly: quad([[-0.46, -0.08], [-0.06, -0.08], [-0.06, 0.14], [-0.46, 0.14]]) },
  { id: 'mercado', name: 'Mercado Sebrae', emoji: '🧺', type: 'espaco', floor: 0,
    poly: quad([[0.00, -0.08], [0.42, -0.08], [0.36, 0.16], [0.00, 0.16]]) },
  { id: 'esp-verde', name: 'Área de Experiências', emoji: '🌿', type: 'espaco', floor: 0,
    poly: quad([[0.48, -0.26], [0.74, -0.06], [0.60, 0.08], [0.44, -0.08]]) },
  // ala sul
  { id: 'esp-turismo', name: 'Turismo FIRJAN SENAC', emoji: '🧭', type: 'espaco', floor: 0,
    poly: quad([[-0.70, 0.16], [-0.42, 0.16], [-0.36, 0.34], [-0.58, 0.34]]) },
  { id: 'futuro', name: 'Palco Futuro', emoji: '🎤', type: 'sala', color: '#264D55', floor: 0,
    poly: quad([[-0.40, 0.22], [0.40, 0.22], [0.10, 0.80], [-0.10, 0.80]]) },
  // ===== 2o PISO =====
  { id: 'juridica', name: 'Sala Inovação Jurídica', emoji: '⚖️', type: 'sala', color: '#C98A2D', floor: 1,
    poly: quad([[-0.34, -0.58], [-0.06, -0.58], [-0.06, -0.40], [-0.42, -0.40]]) },
  { id: 'unisuam', name: 'Sala UNISUAM', emoji: '🎓', type: 'sala', color: '#B5485E', floor: 1,
    poly: quad([[0.02, -0.60], [0.30, -0.60], [0.38, -0.40], [0.02, -0.40]]) },
  { id: 'atitude', name: 'Sala Atitude (203 C)', emoji: '✊', type: 'sala', color: '#8A4FBF', floor: 1,
    poly: quad([[-0.60, -0.30], [-0.16, -0.30], [-0.16, -0.10], [-0.60, -0.10]]) },
  { id: 'canva', name: 'Sala CANVA', emoji: '🎨', type: 'sala', color: '#00A5B5', floor: 1,
    poly: quad([[0.00, -0.30], [0.44, -0.30], [0.52, -0.10], [0.00, -0.10]]) },
  { id: 'varanda', name: 'Varanda', emoji: '🏪', type: 'espaco', floor: 1,
    poly: quad([[-0.80, -0.02], [-0.26, -0.02], [-0.26, 0.12], [-0.80, 0.12]]) },
  { id: 'vao', name: 'Vão livre (vista do térreo)', emoji: '', type: 'vao', floor: 1,
    poly: quad([[-0.30, 0.20], [0.30, 0.20], [0.08, 0.70], [-0.08, 0.70]]) },
];

const pois = [
  // terreo
  { id: 'entrada', name: 'Entrada principal', type: 'entrada', floor: 0, at: P(-0.90, 0.03) },
  { id: 'escada-t', name: 'Escada rolante (salas no 2º piso)', type: 'escada', floor: 0, at: P(-0.70, 0.14) },
  { id: 'wc-norte', name: 'Banheiros (ala norte)', type: 'banheiro', floor: 0, at: P(0.00, -0.90) },
  { id: 'wc-oeste', name: 'Banheiros (centro, lado oeste)', type: 'banheiro', floor: 0, at: P(-0.26, 0.26) },
  { id: 'wc-leste', name: 'Banheiros (lado leste)', type: 'banheiro', floor: 0, at: P(0.62, 0.14) },
  { id: 'wc-sul', name: 'Banheiros (fundo do Palco Futuro)', type: 'banheiro', floor: 0, at: P(-0.16, 0.74) },
  // 2o piso
  { id: 'escada-2p', name: 'Escada rolante (descer para o térreo)', type: 'escada', floor: 1, at: P(-0.70, 0.16) },
  { id: 'wc-2p', name: 'Banheiros (2º piso)', type: 'banheiro', floor: 1, at: P(0.00, -0.72) },
];

const out = {
  note: 'Layout interno representativo, ancorado no poligono real do CINCO (OSM). Ajustar com o mapa oficial do evento.',
  axes: { C, AX, BX },
  zones,
  pois,
};
fs.writeFileSync(path.join(REPO, 'data', 'mapa-interior.json'), JSON.stringify(out, null, 1), 'utf8');

const R = 111320, cosLat = Math.cos(-22.9786 * Math.PI / 180);
const d = (p, q) => Math.hypot((q[0] - p[0]) * R, (q[1] - p[1]) * R * cosLat);
console.log('zonas:', zones.length, '| pois:', pois.length);
console.log('eixo W-E (m):', Math.round(d(W, E)), '| eixo N-S (m):', Math.round(d(N, S)));
console.log('Palco Futuro aprox (m2):', Math.round(d(P(-0.42, 0.22), P(0.42, 0.22)) * d(P(0, 0.22), P(0, 0.82))));
