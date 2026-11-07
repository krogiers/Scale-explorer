/* Gedeelde mini-theorie en klank voor de conceptmockups. Vereenvoudigde kopie van src/core. */
const LET = 'CDEFGAB', LPC = [0, 2, 4, 5, 7, 9, 11], OFF = [3, 0, 4, 1, 5, 2, 6];
const MODES = ['Lydisch', 'Ionisch', 'Mixolydisch', 'Dorisch', 'Aeolisch', 'Frygisch', 'Locrisch'];
const ABBR = ['Lyd', 'Ion', 'Mix', 'Dor', 'Aeo', 'Fry', 'Loc'];
const CHAR = [3, 6, 6, 5, 5, 1, 4];
const m12 = (n) => ((n % 12) + 12) % 12;
const ivs = (m) => LPC.map((_, i) => m12(LPC[(OFF[m] + i) % 7] - LPC[OFF[m]]));
const accOf = (pc, l) => { let a = m12(pc - LPC[l]); return a > 6 ? a - 12 : a; };
const ACC = { '-2': '𝄫', '-1': '♭', 0: '', 1: '♯', 2: '𝄪' };

const _sc = new Map();
function scale(r, m) {
  const k = r + ':' + m;
  if (_sc.has(k)) return _sc.get(k);
  let best;
  for (let l = 0; l < 7; l++) {
    if (Math.abs(accOf(r, l)) > 1) continue;
    const ns = ivs(m).map((x, i) => { const pc = m12(r + x), le = (l + i) % 7; return { pc, l: le, a: accOf(pc, le) }; });
    const sc = ns.reduce((s, n) => s + Math.abs(n.a) + (Math.abs(n.a) > 1 ? 10 : 0), 0), fl = ns.some((n) => n.a < 0);
    if (!best || sc < best.sc || (sc === best.sc && fl && !best.fl)) best = { sc, ns, fl };
  }
  const s = { r, m, notes: best.ns, pcs: new Set(best.ns.map((n) => n.pc)), sig: best.ns.reduce((a, n) => a + n.a, 0) };
  _sc.set(k, s);
  return s;
}
const nn = (n) => LET[n.l] + ACC[n.a];
const Q = { '4,7': '', '3,7': 'm', '3,6': '°', '4,8': '+', '4,7,11': 'maj7', '4,7,10': '7', '3,7,10': 'm7', '3,6,10': 'm7♭5' };
const MINORISH = new Set(['m', '°', 'm7', 'm7♭5']);
const RN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function chord(r, m, deg, size = 3) {
  const s = scale(r, m);
  const notes = [0, 2, 4, 6].slice(0, size).map((k) => s.notes[(deg + k) % 7]);
  const q = Q[notes.slice(1).map((n) => m12(n.pc - notes[0].pc)).join(',')] ?? '';
  let a = m12(notes[0].pc - r) - LPC[deg]; if (a > 6) a -= 12; if (a < -6) a += 12;
  let roman = RN[deg]; if (MINORISH.has(q)) roman = roman.toLowerCase();
  roman = (a < 0 ? '♭' : a > 0 ? '♯' : '') + roman + (q === '°' ? '°' : q === 'm7♭5' ? 'ø' : q === 'maj7' ? 'maj7' : q.includes('7') ? '7' : '');
  return { r, m, deg, notes, q, name: nn(notes[0]) + q, roman, pcs: new Set(notes.map((n) => n.pc)), key: notes[0].pc + q, hasChar: notes.some((n) => n.pc === s.notes[CHAR[m]].pc) };
}
const chords = (r, m, size = 3) => [0, 1, 2, 3, 4, 5, 6].map((d) => chord(r, m, d, size));
const label = (r, m) => nn(scale(r, m).notes[0]) + ' ' + MODES[m];
const shared = (a, b) => [...a.pcs].filter((p) => b.pcs.has(p)).length;
const MOVE = { 3: ['kwintval', 0], 2: ['terts omhoog', 1], 5: ['terts omlaag', 1], 1: ['stap omhoog', 2], 6: ['stap omlaag', 2], 4: ['kwint omhoog', 3] };

/** Volgende stappen: diatonisch, leen (parallelle modus) en modulatie (buur een kwint hoger/lager). */
function targets(r, m, deg, size = 3) {
  const cur = chord(r, m, deg, size), here = chords(r, m, size), keys = new Set(here.map((c) => c.key));
  const dia = here.filter((c) => c.deg !== deg).map((c) => {
    const [why, str] = MOVE[(c.deg - deg + 7) % 7];
    return { ...c, kind: 'dia', str, why: why + ' · ' + shared(cur, c) + ' gedeeld' };
  }).sort((a, b) => a.str - b.str);
  const seen = new Map();
  for (let m2 = 0; m2 < 7; m2++) {
    if (m2 === m) continue;
    for (const c of chords(r, m2, size)) {
      if (keys.has(c.key)) continue;
      const dist = Math.abs(m2 - m), p = seen.get(c.key);
      if (!p || dist < p.dist) seen.set(c.key, { ...c, kind: 'bor', dist, why: 'uit ' + label(r, m2) });
    }
  }
  const bor = [...seen.values()].sort((a, b) => a.dist - b.dist).slice(0, 5);
  const piv = [];
  for (const r2 of [m12(r + 7), m12(r + 5)]) {
    if (!chords(r2, m, size).some((c) => c.key === cur.key)) continue;
    for (const c of chords(r2, m, size)) if (!keys.has(c.key)) piv.push({ ...c, kind: 'piv', why: 'naar ' + label(r2, m) });
  }
  return { cur, dia, bor, piv };
}

/** Bekende progressies, relatief aan de toonsoort: [halve tonen, modus, trap, tellen]. */
const PRESETS = [
  { id: 'iiVI', name: 'ii–V–I', size: 4, items: [[0, 1, 1, 4], [0, 1, 4, 4], [0, 1, 0, 8]] },
  { id: 'blues', name: '12-bar blues', size: 4, items: [[0, 2, 0, 16], [5, 2, 0, 8], [0, 2, 0, 8], [7, 2, 0, 4], [5, 2, 0, 4], [0, 2, 0, 4], [7, 2, 0, 4]] },
  { id: 'pop', name: 'I–vi–IV–V', size: 3, items: [[0, 1, 0, 4], [0, 1, 5, 4], [0, 1, 3, 4], [0, 1, 4, 4]] },
  { id: 'modal', name: 'Modale vamp (Dorisch)', size: 4, items: [[2, 3, 0, 32], [3, 3, 0, 16], [2, 3, 0, 16]] },
  { id: 'pach', name: 'Canon-reeks', size: 3, items: [[0, 1, 0, 4], [0, 1, 4, 4], [0, 1, 5, 4], [0, 1, 2, 4], [0, 1, 3, 4], [0, 1, 0, 4], [0, 1, 3, 4], [0, 1, 4, 4]] },
];

/* Klank: eenvoudige synth, genoeg om de mockup te voelen. */
const Snd = {
  ctx: null,
  c() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  note(midi, t, dur, vol = 0.12) {
    const c = this.c(), o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    f.type = 'lowpass'; f.frequency.value = 2400;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(f); f.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  },
  chord(ch, dur = 1.2) {
    const c = this.c(), t = c.currentTime + 0.02;
    this.note(36 + ch.notes[0].pc, t, dur, 0.16);
    let prev = 47;
    ch.notes.forEach((n, i) => { let x = 48 + n.pc; while (x <= prev) x += 12; prev = x; this.note(x, t + i * 0.015, dur); });
  },
  scale(r, m) {
    const c = this.c(), t = c.currentTime + 0.02;
    let prev = 59 + r - (r > 6 ? 12 : 0);
    [...scale(r, m).notes, scale(r, m).notes[0]].forEach((n, i) => { let x = 60 + n.pc; while (x <= prev) x += 12; while (x > prev + 12) x -= 12; prev = x; this.note(x, t + i * 0.22, 0.35); });
  },
  tick(accent) { const c = this.c(); this.note(accent ? 96 : 89, c.currentTime + 0.01, 0.05, 0.05); },
};
