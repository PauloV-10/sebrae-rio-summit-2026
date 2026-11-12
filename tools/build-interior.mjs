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
const zones = [
  // ala sul: palco principal
  { id: 'futuro', name: 'Palco Futuro', type: 'sala', color: '#264D55',
    poly: quad([[-0.42, 0.22], [0.42, 0.22], [0.10, 0.82], [-0.10, 0.82]]) },
  // faixa central: chegada, alimentacao e mercado
  { id: 'entrada-hall', name: 'Credenciamento', type: 'servico',
    poly: quad([[-0.78, -0.06], [-0.40, -0.06], [-0.40, 0.12], [-0.78, 0.12]]) },
  { id: 'praca', name: 'Praça de Alimentação', type: 'alimentacao',
    poly: quad([[-0.34, -0.06], [0.10, -0.06], [0.10, 0.14], [-0.34, 0.14]]) },
  { id: 'mercado', name: 'Mercado Sebrae', type: 'espaco',
    poly: quad([[0.16, -0.10], [0.62, -0.10], [0.54, 0.16], [0.16, 0.16]]) },
  { id: 'esp-games', name: 'Games + Imersivas', type: 'espaco',
    poly: quad([[0.44, -0.28], [0.66, -0.10], [0.54, 0.02], [0.38, -0.10]]) },
  // ala norte: salas de conteudo e espacos tematicos
  { id: 'atitude', name: 'Sala Atitude', type: 'sala', color: '#8A4FBF',
    poly: quad([[-0.62, -0.32], [-0.12, -0.32], [-0.12, -0.12], [-0.62, -0.12]]) },
  { id: 'canva', name: 'Sala CANVA', type: 'sala', color: '#00A5B5',
    poly: quad([[-0.06, -0.32], [0.46, -0.32], [0.52, -0.12], [-0.06, -0.12]]) },
  { id: 'juridica', name: 'Sala Inovação Jurídica', type: 'sala', color: '#C98A2D',
    poly: quad([[-0.36, -0.58], [-0.02, -0.58], [-0.02, -0.38], [-0.46, -0.38]]) },
  { id: 'unisuam', name: 'Sala UNISUAM', type: 'sala', color: '#B5485E',
    poly: quad([[0.08, -0.58], [0.38, -0.58], [0.44, -0.38], [0.08, -0.38]]) },
  { id: 'esp-startups', name: 'Startups + SebraeLab', type: 'espaco',
    poly: quad([[-0.16, -0.78], [0.08, -0.78], [0.18, -0.62], [-0.24, -0.62]]) },
  { id: 'esp-turismo', name: 'Turismo + FIRJAN + SENAC', type: 'espaco',
    poly: quad([[-0.76, 0.16], [-0.44, 0.16], [-0.36, 0.36], [-0.60, 0.36]]) },
  { id: 'esp-consult', name: 'Consultorias', type: 'espaco',
    poly: quad([[-0.84, -0.06], [-0.64, -0.22], [-0.56, -0.12], [-0.76, 0.02]]) },
];

const pois = [
  { id: 'entrada', name: 'Entrada principal', type: 'entrada', at: P(-0.90, 0.03) },
  { id: 'wc-norte', name: 'Banheiros (ala norte)', type: 'banheiro', at: P(0.00, -0.93) },
  { id: 'wc-oeste', name: 'Banheiros (centro, lado oeste)', type: 'banheiro', at: P(-0.30, 0.22) },
  { id: 'wc-leste', name: 'Banheiros (lado leste)', type: 'banheiro', at: P(0.68, 0.10) },
  { id: 'wc-sul', name: 'Banheiros (fundo do Palco Futuro)', type: 'banheiro', at: P(-0.16, 0.74) },
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
