// ============================================================
// shared/ambient-data.js
// Centralized ambient audio data for themes and studio
// ============================================================

const AMBIENT_SOUNDS = {
    rain: 'https://dl.dropboxusercontent.com/scl/fi/zwol73h41qnavbduc0qgh/rain.mp3?rlkey=7d82wac3ebncezhbe2vl09alf&st=cu5gupob',
    cafe: 'https://dl.dropboxusercontent.com/scl/fi/awuth8dg03qy0ij2czddi/cafe.mp3?rlkey=5dzngx7pmnsx6utce484e65go&st=lzluvv25',
    waves: 'https://dl.dropboxusercontent.com/scl/fi/9z17yg7u3l6wc2wv9lbp0/waves.mp3?rlkey=kwle5uf8h2vyodgt257t0lnwo&st=g1a3bxx5',
    fireplace: 'https://dl.dropboxusercontent.com/scl/fi/orte59auc36wxng69iy3n/fireplace.mp3?rlkey=xohuvr0p6p1816hvp34kf387q&st=fgatk8qq',
    forest: 'https://dl.dropboxusercontent.com/scl/fi/cy1k2ru7ddi1wm96uohqv/forest.mp3?rlkey=uvsqjyjxbwhk33cmaps931bqu&st=h2b6zlzk',
    'nadin-ah': 'https://dl.dropboxusercontent.com/scl/fi/itmvna64forw61thvwb19/AH-Nadin-Amizah.mp3?rlkey=lmzmxrhjgq9qrabe3sewox21q&st=0s3baidy',
    daniel: 'https://dl.dropboxusercontent.com/scl/fi/nqpvliyw9r780t3wk4636/Daniel-Caesar-Who-Knows.mp3?rlkey=vnfwwhsmuwdyt2lrgwuhjyf9u&st=fgjxdbio',
    mitski: 'https://dl.dropboxusercontent.com/scl/fi/71ib9m69dm2ed9squj191/Mitski-My-Love-Mine-All-Mine.mp3?rlkey=i43d8ng7tbndbuflm1yw3j3r9&st=dad3r4yp',
    'feast-nina': 'https://dl.dropboxusercontent.com/scl/fi/2e0bd1yvyn9jq9vsonl9v/Feast-Nina-Official-Lyric-Video.mp3?rlkey=zc9ua50cujcdhv2dz8ibfz8bt&st=9xu4ozt0&dl=1',
    'feast-tarot': 'https://dl.dropboxusercontent.com/scl/fi/8eypewha6kurv9ffjx559/Tarot-.Feast-_-Lirik-Lagu.mp3?rlkey=jvp17k7g7mtahx0osdxstem9q&st=pe2sk4yb&dl=1',
};

const AMBIENTS = [
    { id: 'none', label: 'Tanpa Suasana', emoji: '🔇' },
    { id: 'rain', label: 'Rintik Hujan', emoji: '🌧️' },
    { id: 'cafe', label: 'Cozy Cafe', emoji: '☕' },
    { id: 'waves', label: 'Deburan Ombak', emoji: '🌊' },
    { id: 'fireplace', label: 'Api Unggun', emoji: '🔥' },
    { id: 'forest', label: 'Hutan Pagi', emoji: '🌲' },
    { id: 'nadin-ah', label: 'Nadin Amizah - Ah', emoji: '☁️' },
    { id: 'daniel', label: 'Daniel Caesar - Who Knows', emoji: '🕊️' },
    { id: 'mitski', label: 'Mitski - My Love Mine All Mine', emoji: '🌕' },
    { id: 'feast-nina', label: 'Feast - Nina', emoji: '🕰️' },
    { id: 'feast-tarot', label: 'Feast - Tarot', emoji: '🃏' },
];
