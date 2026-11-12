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

// ---------------- layout calibrado com o mapa oficial do evento ----------------
// Fontes (fotos de 12/11/2026): "Mapa de localizacao - Piso Superior" do Summit e
// "Planta baixa do terreo" do Riocentro. O predio e um QUADRADO rotacionado 45
// graus: os lados da planta viram as faces do losango. Coordenadas (u, v) da
// planta (u = oeste->leste, v = norte->sul, de -1 a 1, centro 0) convertem para
// os eixos do losango por a = (u + v) / 2 e b = (v - u) / 2; os retangulos das
// salas saem alinhados as paredes reais. |a|+|b| = max(|u|,|v|), entao manter
// u, v dentro de [-0.9, 0.9] garante o interior do predio.
const UV = (u, v) => P((u + v) / 2, (v - u) / 2);
const QUV = (u0, v0, u1, v1) => [UV(u0, v0), UV(u1, v0), UV(u1, v1), UV(u0, v1)];
const zones = [
  // ===== TERREO (planta baixa oficial do Riocentro) =====
  { id: 'futuro', name: 'Palco Futuro (Sala 101)', emoji: '🎤', type: 'sala', color: '#264D55', floor: 0,
    poly: QUV(-0.72, -0.52, 0.28, 0.56) },
  { id: 'foyer', name: 'Foyer', emoji: '🚪', type: 'espaco', floor: 0,
    poly: QUV(0.36, -0.5, 0.75, 0.58) },
  { id: 'unisuam', name: 'Sala UNISUAM (Sala 103)', emoji: '🎓', type: 'sala', color: '#B5485E', floor: 0,
    poly: QUV(-0.68, 0.62, -0.28, 0.86) },
  { id: 'entrada-hall', name: 'Credenciamento', emoji: '🎫', type: 'servico', floor: 0,
    poly: QUV(0.5, 0.62, 0.74, 0.88) },
  { id: 'lanchonete', name: 'Lanchonete', emoji: '☕', type: 'alimentacao', floor: 0,
    poly: QUV(0.66, -0.88, 0.88, -0.66) },
  { id: 'restaurante', name: 'Copa / Alimentação', emoji: '🍽️', type: 'alimentacao', floor: 0,
    poly: QUV(-0.24, 0.62, -0.04, 0.82) },
  // ===== PISO SUPERIOR (mapa oficial do Summit) =====
  { id: 'juridica', name: 'Sala Inovação Jurídica', emoji: '⚖️', type: 'sala', color: '#C98A2D', floor: 1,
    poly: QUV(-0.84, -0.55, -0.48, 0.3) },
  { id: 'canva', name: 'Sala CANVA', emoji: '🎨', type: 'sala', color: '#00A5B5', floor: 1,
    poly: QUV(-0.66, 0.4, -0.06, 0.78) },
  { id: 'atitude', name: 'Sala Atitude (203 C)', emoji: '✊', type: 'sala', color: '#8A4FBF', floor: 1,
    poly: QUV(0.46, -0.55, 0.82, 0.32) },
  { id: 'esp2', name: 'Assessoria de Negócios (2)', emoji: '🤝', type: 'espaco', floor: 1,
    poly: QUV(-0.34, -0.8, -0.06, -0.66) },
  { id: 'esp1', name: 'SebraeLab (1)', emoji: '🧪', type: 'espaco', floor: 1,
    poly: QUV(-0.38, -0.62, -0.1, -0.48) },
  { id: 'esp3', name: 'DETRAN (3)', emoji: '🪪', type: 'parceiro', floor: 1,
    poly: QUV(-0.02, -0.86, 0.24, -0.7) },
  { id: 'esp4', name: 'Sebrae Games (4)', emoji: '🎮', type: 'espaco', floor: 1,
    poly: QUV(-0.38, -0.42, -0.2, -0.28) },
  { id: 'esp5', name: 'Startups (5)', emoji: '🚀', type: 'espaco', floor: 1,
    poly: QUV(-0.14, -0.52, 0.12, -0.3) },
  { id: 'esp6', name: 'Turismo Sebrae (6)', emoji: '🧭', type: 'espaco', floor: 1,
    poly: QUV(0.16, -0.6, 0.32, -0.46) },
  { id: 'esp7', name: 'Experiências Imersivas (7)', emoji: '🥽', type: 'espaco', floor: 1,
    poly: QUV(-0.2, 0.0, -0.04, 0.16) },
  { id: 'esp8', name: 'UNISUAM (8)', emoji: '🎓', type: 'parceiro', floor: 1,
    poly: QUV(-0.06, -0.1, 0.1, 0.06) },
  { id: 'esp9', name: 'Consultoria (9)', emoji: '💼', type: 'espaco', floor: 1,
    poly: QUV(0.08, -0.2, 0.24, -0.04) },
  { id: 'esp10', name: 'SENAC (10)', emoji: '📚', type: 'parceiro', floor: 1,
    poly: QUV(0.22, -0.3, 0.38, -0.14) },
  { id: 'esp11', name: 'FIRJAN (11)', emoji: '🏭', type: 'parceiro', floor: 1,
    poly: QUV(0.3, -0.44, 0.44, -0.28) },
  { id: 'mercado', name: 'Mercado Sebrae (12)', emoji: '🧺', type: 'espaco', floor: 1,
    poly: QUV(0.04, 0.42, 0.34, 0.66) },
  { id: 'esp13', name: 'Estandes de expositores (13)', emoji: '🏪', type: 'parceiro', floor: 1,
    poly: QUV(0.4, 0.4, 0.68, 0.62) },
];

const pois = [
  // terreo
  { id: 'entrada-ne', name: 'Entrada nordeste (estacionamento)', type: 'entrada', floor: 0, at: UV(0.84, -0.6) },
  { id: 'entrada-se', name: 'Entrada sudeste (credenciamento)', type: 'entrada', floor: 0, at: UV(0.84, 0.72) },
  { id: 'escada-foyer', name: 'Escadas para o piso superior', type: 'escada', floor: 0, at: UV(0.5, 0.52) },
  { id: 'elevadores-t', name: 'Elevadores', type: 'escada', floor: 0, at: UV(0.76, -0.56) },
  { id: 'wc-103', name: 'Banheiros (junto à Sala 103)', type: 'banheiro', floor: 0, at: UV(-0.1, 0.76) },
  { id: 'wc-cred', name: 'Banheiros (credenciamento)', type: 'banheiro', floor: 0, at: UV(0.42, 0.76) },
  // piso superior
  { id: 'escada-p1', name: 'Escadas para o térreo (lounge de entrada)', type: 'escada', floor: 1, at: UV(0.56, 0.68) },
  { id: 'elevadores-p1', name: 'Elevadores / acesso PCD', type: 'escada', floor: 1, at: UV(0.76, -0.58) },
  { id: 'wc-p1a', name: 'Banheiros (lado leste)', type: 'banheiro', floor: 1, at: UV(0.42, -0.06) },
  { id: 'wc-p1b', name: 'Banheiros (centro-sul)', type: 'banheiro', floor: 1, at: UV(0.08, 0.28) },
  { id: 'hidratacao', name: 'Ponto de hidratação', type: 'agua', floor: 1, at: UV(0.32, 0.3) },
];

const out = {
  note: 'Layout calibrado com o mapa oficial do Piso Superior do Summit e a planta baixa do terreo do Riocentro (fotos de 12/11/2026), ancorado no poligono real do CINCO (OSM).',
  axes: { C, AX, BX },
  zones,
  pois,
};
fs.writeFileSync(path.join(REPO, 'data', 'mapa-interior.json'), JSON.stringify(out, null, 1), 'utf8');

const R = 111320, cosLat = Math.cos(-22.9786 * Math.PI / 180);
const d = (p, q) => Math.hypot((q[0] - p[0]) * R, (q[1] - p[1]) * R * cosLat);
console.log('zonas:', zones.length, '| pois:', pois.length);
console.log('eixo W-E (m):', Math.round(d(W, E)), '| eixo N-S (m):', Math.round(d(N, S)));
console.log('Palco Futuro (Sala 101) aprox (m2):', Math.round(d(UV(-0.72, -0.52), UV(0.28, -0.52)) * d(UV(-0.72, -0.52), UV(-0.72, 0.56))));
