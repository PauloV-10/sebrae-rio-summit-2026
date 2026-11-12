# Sebrae Rio Summit 2026 - Guia Portes

Guia web do Sebrae Rio Summit 2026 (10 a 12/11, Centro de Convenções do Riocentro), feito pela Portes para uso no celular durante o evento.

**Produção:** https://paulov-10.github.io/sebrae-rio-summit-2026/

## Módulos

1. **Agenda**: as 5 salas (Palco Futuro, Atitude, CANVA, Inovação Jurídica, UNISUAM) em timeline estilo Google Agenda, com linha do "agora", favoritos, filtros por sala e ficha de cada palestra (foto do palestrante, bio e descrição oficial).
2. **Mapa**: planta 2D do pavilhão com contorno real (OpenStreetMap) e zonas internas (salas, espaços, banheiros, credenciamento, praça de alimentação). Pede permissão de localização e mostra a posição do usuário em tempo real sobre o mapa, com círculo de precisão.
3. **Alimentação**: onde comer dentro do pavilhão e no complexo, com cardápio e Instagram de cada ponto.
4. **Portes**: QR Code que abre o WhatsApp do comercial com mensagem pronta para agendar consultoria.

## Stack

HTML + CSS + JavaScript puros, sem build e sem dependência externa em runtime (a única lib, `qrcode-generator`, está vendorizada em `vendor/`). PWA com service worker (funciona com internet fraca no pavilhão). Hospedado no GitHub Pages.

## Estrutura

```
index.html              casca da aplicação (4 abas)
assets/css/style.css    identidade visual Portes
assets/js/              app, agenda, mapa, alimentacao, contato
assets/palestrantes/    fotos otimizadas (max 400px)
data/agenda.json        123 palestras com horários, bios e fotos
data/mapa-osm.json      contornos reais dos prédios (OpenStreetMap)
data/mapa-interior.json zonas internas e pontos de interesse
data/alimentacao.json   locais de comida (editável durante o evento)
tools/                  pipeline que gera os data/*.json a partir de tools/raw/
```

## Como atualizar a alimentação durante o evento

Edite `data/alimentacao.json` direto no GitHub (botão de lápis), preenchendo `nome`, `desc`, `cardapio` e `instagram` dos operadores confirmados no local. O site atualiza sozinho em 1 a 2 minutos após o commit.

## Como refinar o mapa interno

O contorno do pavilhão é real (OSM). As zonas internas são representativas: estão em `tools/build-interior.mjs` em coordenadas do losango do prédio (`a` = oeste/leste, `b` = norte/sul, de -1 a 1). Com o mapa oficial em mãos, ajuste os quadriláteros e rode:

```
node tools/build-interior.mjs
```

## Fontes dos dados

- Programação, bios e fotos: site oficial sebraeriosummit.com.br (extração em 12/11/2026)
- Contornos dos prédios: OpenStreetMap (Overpass API)
- Capacidades das salas e espaços: Agência Sebrae RJ

Projeto do Grupo Portes (Portes Contabilidade + Portes Soluções), Macaé/RJ.
