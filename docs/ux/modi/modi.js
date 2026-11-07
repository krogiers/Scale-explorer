/* Gedeelde logica voor de modi-schetsen: rooster, bruggen en routes. Bouwt op ../concepts/engine.js. */

/** Kenmerkend akkoord per modus (trap): Lyd II, Ion V, Mix ♭VII, Dor IV, Aeo ♭VI, Fry ♭II, Loc ♭V. Bevat telkens de kenmerkende noot. */
const CHARDEG = [1, 4, 6, 3, 5, 1, 4];
const fifths = (pc) => m12(pc * 7);
/** Kwintpositie van de moederladder (majeur) van een modus: C = 0, G = 1, F = 11 ... */
const parentOf = (r, m) => fifths(m12(r - LPC[OFF[m]]));
/** Grondtoon van modus m binnen de moederladder op kwintpositie k. */
const rootAt = (k, m) => m12(m12(k * 7) + LPC[OFF[m]]);
const modeOn = (k, r) => [0, 1, 2, 3, 4, 5, 6].find((m) => rootAt(k, m) === m12(r)) ?? -1;
const signedK = (k) => { k = m12(k); return k > 6 ? k - 12 : k; };
const sigText = (k) => { const s = scale(m12(k * 7), 1).sig; return s > 0 ? s + '♯' : s < 0 ? -s + '♭' : '0'; };
const rootName = (r, m) => nn(scale(r, m).notes[0]);
const diffCount = (a, b) => 7 - [...scale(a.r, a.m).pcs].filter((p) => scale(b.r, b.m).pcs.has(p)).length;

/** Alles wat je nodig hebt om van modus a naar modus b te springen. */
function bridge(a, b, size) {
  const A = scale(a.r, a.m), B = scale(b.r, b.m);
  const ca = chords(a.r, a.m, size), cb = chords(b.r, b.m, size), ka = new Set(ca.map((c) => c.key)), kb = new Set(cb.map((c) => c.key));
  const newNotes = B.notes.filter((n) => !A.pcs.has(n.pc));
  const kind = a.r === b.r && a.m === b.m ? 'zelf' : newNotes.length === 0 ? 'relatief' : a.r === b.r ? 'parallel' : 'buur';
  return {
    A, B, newNotes, kind,
    shared: cb.filter((c) => ka.has(c.key)),
    fresh: cb.filter((c) => !ka.has(c.key)),
    gone: ca.filter((c) => !kb.has(c.key)),
    tonic: cb[0], char: cb[CHARDEG[b.m]],
  };
}

/** Een pivot en een signaalakkoord kiezen: het signaal brengt de nieuwe noot, de pivot ligt er zo dicht mogelijk bij. */
function pickPair(br) {
  const signal = br.fresh.find((c) => c.key === br.char.key) ?? br.fresh.find((c) => !c.q.includes('°') && !c.q.includes('♭5')) ?? br.fresh[0];
  const pivot = [...br.shared].sort((x, y) => shared(y, signal) - shared(x, signal))[0];
  return { pivot, signal };
}

/**
 * Kortste route: één noot per stap (een kwint op de cirkel van moederladders).
 * Tussenstations houden de grondtoon van a vast als dat kan (parallel lenen), anders die van b.
 * Klopt de moederladder al, dan volgt nog een relatieve stap: alleen het tonale centrum verschuift.
 */
function route(a, b, size) {
  const ka = parentOf(a.r, a.m), kb = parentOf(b.r, b.m), d = signedK(kb - ka), dir = Math.sign(d);
  const steps = [];
  let cur = a;
  for (let i = 1; i <= Math.abs(d); i++) {
    const k = m12(ka + dir * i);
    let next;
    if (i === Math.abs(d)) next = b;
    else if (modeOn(k, a.r) >= 0) next = { r: a.r, m: modeOn(k, a.r) };
    else if (modeOn(k, b.r) >= 0) next = { r: b.r, m: modeOn(k, b.r) };
    else next = { r: rootAt(k, 1), m: 1 };
    const br = bridge(cur, next, size);
    steps.push({ from: cur, to: next, br, ...pickPair(br) });
    cur = next;
  }
  if (cur.r !== b.r || cur.m !== b.m) steps.push({ from: cur, to: b, br: bridge(cur, b, size), pivot: null, signal: null });
  return steps;
}

const play = (ch) => Snd.chord(ch, 1.1);
function playSeq(list, gap = 900) { list.filter(Boolean).forEach((c, i) => setTimeout(() => play(c), i * gap)); }

/** Kleine helpers voor de DOM. */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function chipHtml(c, cls = '', sub = '') { return `<button type="button" class="chip ${cls}" data-chord="${c.r},${c.m},${c.deg}">${esc(c.name)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`; }
/** Klik op een akkoordchip speelt het akkoord (grootte uit data-size op body). */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-chord]');
  if (!el) return;
  const [r, m, d] = el.dataset.chord.split(',').map(Number);
  play(chord(r, m, d, Number(document.body.dataset.size || 3)));
});
function rootOptions(sel) {
  return [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5].map((pc) => `<option value="${pc}"${pc === sel ? ' selected' : ''}>${nn(scale(pc, 1).notes[0])}</option>`).join('');
}
function modeOptions(sel) { return MODES.map((n, m) => `<option value="${m}"${m === sel ? ' selected' : ''}>${n}</option>`).join(''); }
function sizeSeg(size, onChange) {
  const el = document.createElement('div');
  el.className = 'seg';
  el.innerHTML = `<button type="button" data-s="3">Drieklank</button><button type="button" data-s="4">Vierklank</button>`;
  const sync = () => el.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.s) === size)));
  el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; size = Number(b.dataset.s); document.body.dataset.size = size; sync(); onChange(size); });
  sync();
  return el;
}
