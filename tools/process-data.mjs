// Processa a extracao bruta do site do Sebrae Rio Summit + OSM do Riocentro
// Saidas: data/agenda.json, data/mapa-osm.json, scratchpad/img-manifest.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SCRATCH = path.join(ROOT, 'tools', 'raw');
const REPO = ROOT;
fs.mkdirSync(path.join(REPO, 'data'), { recursive: true });
fs.mkdirSync(path.join(REPO, 'assets', 'palestrantes'), { recursive: true });

const raw = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'agenda-completa.json'), 'utf8'));

// ---------- salas ----------
const ROOMS = [
  { id: 'futuro', name: 'Palco Futuro', short: 'Futuro', color: '#264D55', cap: 3000 },
  { id: 'atitude', name: 'Sala Atitude', short: 'Atitude', color: '#8A4FBF', cap: 500 },
  { id: 'canva', name: 'Sala CANVA', short: 'CANVA', color: '#00A5B5', cap: 500 },
  { id: 'juridica', name: 'Sala Inovação Jurídica', short: 'Inovação Jurídica', color: '#C98A2D', cap: 500 },
  { id: 'unisuam', name: 'Sala UNISUAM', short: 'UNISUAM', color: '#B5485E', cap: 500 },
];
const roomIdByName = (n) => {
  const t = (n || '').toLowerCase();
  if (t.includes('futuro')) return 'futuro';
  if (t.includes('atitude')) return 'atitude';
  if (t.includes('canva')) return 'canva';
  if (t.includes('jur')) return 'juridica';
  if (t.includes('unisuam')) return 'unisuam';
  return null;
};

// o site usa uma cor unica de badge; mantemos paleta propria por sala

// ---------- horarios ----------
const parseTime = (s) => {
  const m = (s || '').match(/(\d{1,2})h(\d{2})?/);
  if (!m) return null;
  return (+m[1]) * 60 + (+(m[2] || 0));
};
const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// travessao vira hifen (regra da casa: nada de em-dash nas entregas)
const noDash = (s) => (s || '').replace(/\s*[–—]\s*/g, ' - ');

// ---------- bio / descricao ----------
const cleanDesc = (modalText, speakers) => {
  if (!modalText) return '';
  let t = modalText.replace(/^\s*Palestrante\s*/i, '');
  t = t.split('\n').map(l => l.trim()).filter(Boolean);
  // remove linha que repete os nomes dos palestrantes
  const sp = (speakers || '').trim();
  const out = t.filter(l => l !== sp && l.length > 2);
  return out.join('\n\n').trim();
};

// ---------- imagens ----------
const supplementImgs = {
  'felipe titto': 'https://sebraeriosummit.com.br/images/sebraeriosummit/fotos-palestrantes-srs/felipe-tito.png',
  'camilla pudim': 'https://sebraeriosummit.com.br/images/sebraeriosummit/summit2026/camilla-pudim.jpeg',
  'thiago godoy': 'https://sebraeriosummit.com.br/images/sebraeriosummit/fotos-palestrantes-srs/thiago-godoyy.png',
  'diego maia': 'https://sebraeriosummit.com.br/images/sebraeriosummit/summit2026/Diego%20Maia.png',
  'rafael kiso': 'https://sebraeriosummit.com.br/images/sebraeriosummit/summit2026/rafael-kiso.jpg',
  'primo pobre': 'https://sebraeriosummit.com.br/images/sebraeriosummit/fotos-palestrantes-srs/primo-pobre.png',
  'pedro consorte': 'https://sebraeriosummit.com.br/images/sebraeriosummit/fotos-palestrantes-srs/pedro-consorte.png',
  'patricia ramos': 'https://sebraeriosummit.com.br/images/sebraeriosummit/fotos-palestrantes-srs/patricia-ramos.png',
  'taiana jung': 'https://sebraeriosummit.com.br/images/sebraeriosummit/fotos-palestrantes-srs/taiana-jung.png',
  'gil giardelli': 'https://sebraeriosummit.com.br/images/sebraeriosummit/fotos-palestrantes-srs/gil-tardelli.png',
};
const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const imgManifest = {}; // url -> local filename
const localImgFor = (url) => {
  if (!url) return null;
  if (imgManifest[url]) return imgManifest[url];
  const base = decodeURIComponent(url.split('/').pop()).replace(/\.(jpg|jpeg|png|webp).*$/i, '');
  const file = slugify(base) + '.jpg';
  imgManifest[url] = file;
  return file;
};

// ---------- montar agenda ----------
const modalById = {};
for (const m of raw.modals) modalById[m.id] = m;

const days = raw.days.map(d => {
  const perRoom = {};
  for (const t of d.talks) {
    const rid = roomIdByName(t.room);
    if (!rid) continue;
    (perRoom[rid] ||= []).push(t);
  }
  const talks = [];
  for (const rid of Object.keys(perRoom)) {
    const list = perRoom[rid].map(t => ({ ...t, startMin: parseTime(t.time) })).filter(t => t.startMin != null);
    list.sort((a, b) => a.startMin - b.startMin);
    list.forEach((t, i) => {
      const next = list[i + 1];
      const gap = next ? next.startMin - t.startMin : null;
      let dur;
      if (gap != null && gap > 0) dur = gap <= 70 ? gap : 60;
      else dur = 50;
      const endMin = Math.min(t.startMin + dur, 19 * 60);
      const modal = t.modalId ? modalById[t.modalId] : null;
      let img = t.img || null;
      if (!img) {
        const spLow = (t.speakers || '').toLowerCase();
        for (const [k, v] of Object.entries(supplementImgs)) if (spLow.includes(k)) { img = v; break; }
      }
      // tambem pode haver foto dentro do modal
      if (!img && modal && modal.imgs && modal.imgs.length) img = modal.imgs[0].src;
      talks.push({
        id: `${d.date.slice(8)}-${rid}-${fmt(t.startMin).replace(':', '')}`,
        room: rid,
        start: fmt(t.startMin),
        end: fmt(endMin),
        title: noDash(t.title.replace(/\s+/g, ' ').trim()),
        speakers: noDash((t.speakers || '').replace(/\s+/g, ' ').trim()),
        desc: noDash(modal ? cleanDesc(modal.text, t.speakers) : ''),
        img: img ? 'assets/palestrantes/' + localImgFor(img) : null,
      });
    });
  }
  talks.sort((a, b) => a.start.localeCompare(b.start));
  return { date: d.date, label: d.label, talks };
});

const agenda = {
  event: {
    name: 'Sebrae Rio Summit 2026',
    dates: '10 a 12 de novembro de 2026',
    hours: '10h às 19h',
    venue: 'Centro de Convenções do Riocentro',
    address: 'Av. Salvador Allende, 6555, Barra Olímpica, Rio de Janeiro - RJ',
    site: 'https://sebraeriosummit.com.br',
    instagram: 'https://www.instagram.com/sebraerj',
    gridStart: '10:00',
    gridEnd: '19:00',
  },
  rooms: ROOMS,
  days,
};
fs.writeFileSync(path.join(REPO, 'data', 'agenda.json'), JSON.stringify(agenda, null, 1), 'utf8');

// ---------- OSM ----------
const osm = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'riocentro-osm.json'), 'utf8').replace(/^﻿/, ''));
const WANTED = {
  168180208: { id: 'cinco', name: 'Centro de Convenções (CINCO)', kind: 'venue' },
  168180213: { id: 'pav3', name: 'Pavilhão 3', kind: 'building' },
  168180207: { id: 'pav4', name: 'Pavilhão 4', kind: 'building' },
  168180214: { id: 'pav2', name: 'Pavilhão 2', kind: 'building' },
  420906791: { id: 'riocentro', name: 'Riocentro', kind: 'complex' },
  420906788: { id: 'anfiteatro', name: 'Anfiteatro', kind: 'building' },
  378126271: { id: 'olof', name: 'Olof Palme', kind: 'building' },
  424699741: { id: 'mcdonalds', name: "McDonald's", kind: 'food' },
};
const buildings = [];
for (const e of osm.elements) {
  if (e.type === 'way' && WANTED[e.id] && e.geometry) {
    buildings.push({ ...WANTED[e.id], coords: e.geometry.map(g => [g.lat, g.lon]) });
  }
}
fs.writeFileSync(path.join(REPO, 'data', 'mapa-osm.json'), JSON.stringify({ buildings }, null, 1), 'utf8');

// bbox do CINCO para calibracao
const cinco = buildings.find(b => b.id === 'cinco');
if (cinco) {
  const lats = cinco.coords.map(c => c[0]), lons = cinco.coords.map(c => c[1]);
  console.log('CINCO bbox lat:', Math.min(...lats), Math.max(...lats), 'lon:', Math.min(...lons), Math.max(...lons));
  console.log('CINCO pontos:', JSON.stringify(cinco.coords));
}

fs.writeFileSync(path.join(SCRATCH, 'img-manifest.json'), JSON.stringify(imgManifest, null, 1), 'utf8');
const totalTalks = days.reduce((a, d) => a + d.talks.length, 0);
const comDesc = days.reduce((a, d) => a + d.talks.filter(t => t.desc).length, 0);
const comImg = days.reduce((a, d) => a + d.talks.filter(t => t.img).length, 0);
console.log(`Palestras: ${totalTalks} | com descricao: ${comDesc} | com foto: ${comImg} | imagens unicas: ${Object.keys(imgManifest).length}`);
console.log('Salas e cores:', ROOMS.map(r => r.id + '=' + r.color).join(' '));
for (const d of days) console.log(d.date, '->', d.talks.length, 'palestras');
