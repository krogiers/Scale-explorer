import type { ReactNode } from 'react';
import { blueNote, CHAR_DEGREE, pentatonic, scaleOf, type Chord, type Note, type Scale } from '../../core';
import { COMP_TIMBRES } from '../../audio';
import { LOOP_STYLES, type LoopStyle } from '../../audio/loop';
import { fill } from '../../i18n';
import { transposeNote, writtenScale } from '../../naming';
import { BPM_MAX, BPM_MIN, chordOf, practiceAt, PRACTICE_BARS, useApp, useLoop, type CompTimbre } from '../../state';
import { Heading, Staff, useClef } from '../../ui';

/** Bediening van de meespeelloop (de speler zelf zit in de gedeelde toestand, zie state/loop). */
export function LoopControls() {
  const { state, dispatch, t, names, scaleLabel } = useApp();
  const { running, info, nextChord, melodyNow, newMelody, opts, setOpts: set, toggle, practice, setPracticeBars } = useLoop();
  const drill = running ? practice : null;
  const [clef, setClef] = useClef();
  // notenbalken staan in je stemming, zoals de rest: de geschreven noten
  const written = (s: Scale) => writtenScale(s, names.reading);
  const writtenChord = (c: Chord) => c.notes.map((n) => transposeNote(n, names.reading));

  let now = <p className="muted small">{t.loopIdle}</p>;
  if (running && info) {
    if (info.chord < 0) {
      now = <div className="loop-now"><span className="lbl">{t.countingIn}</span><b className="count">{info.beat + 1}</b></div>;
    } else if (drill) {
      // oefening: de modus die nu geldt, wat je anders speelt dan in de andere, en wanneer de wissel komt
      const at = practiceAt(drill, info);
      const s = scaleOf(at.now.root, at.now.mode), o = scaleOf(at.other.root, at.other.mode);
      const added = s.notes.filter((n) => !o.pcs.has(n.pc)), gone = o.notes.filter((n) => !s.pcs.has(n.pc));
      const list = (ns: typeof added) => ns.map(names.note).join(', ');
      now = (
        <div className="loop-now drill">
          <b className="loop-chord">{scaleLabel(s)}</b>
          <div className="loop-what">
            <span className="loop-scale">{added.length ? fill(t.prPlay, { new: list(added), old: list(gone) }) : fill(t.prSame, { root: names.note(s.notes[0]) })}</span>
            <span className="tones-big">{s.notes.map((n) => <span key={n.pc} className={o.pcs.has(n.pc) ? undefined : 'hot'}>{names.note(n)} </span>)}</span>
            <span className="muted small">{at.barsLeft === 1 ? fill(t.prSwitch1, { scale: scaleLabel(o) }) : fill(t.prSwitch, { scale: scaleLabel(o), n: at.barsLeft })}</span>
          </div>
          <div className="beats" aria-hidden="true">
            {Array.from({ length: info.beats }, (_, i) => <i key={i} className={i === info.beat ? 'on' : ''} />)}
          </div>
        </div>
      );
    } else if (state.path.length > 0) {
      const p = state.path[info.chord % state.path.length];
      const s = scaleOf(p.root, p.mode);
      const c = chordOf(p);
      const penta = pentatonic(s);
      const blue = blueNote(s);
      const char = s.notes[CHAR_DEGREE[s.mode]].pc;
      // het volgende akkoord (met de herhalingen meegerekend) en wat er in zijn ladder anders is
      // met één akkoord (een vamp) is het volgende hetzelfde: het vak blijft dan toch staan, zodat niets verspringt
      const np = state.path[nextChord] ?? p;
      const ns = scaleOf(np.root, np.mode);
      const changed = ns.notes.filter((n) => !s.pcs.has(n.pc));
      const notes = (ns: Note[], cls?: (n: Note) => string | undefined) => ns.map((n, i) => <span key={i} className={cls?.(n)}>{names.note(n)}</span>);
      const row = (label: string, body: ReactNode) => <><dt>{label}</dt><dd className="tones-big">{body}</dd></>;
      const next = (x: Scale) => (
        <div className="loop-next" aria-live="off">
          <span className="lbl">{t.lnNext}</span>
          <b className="loop-next-chord">{names.chord(chordOf(np!))}</b>
          <span className="small">{scaleLabel(x)}</span>
          <span className="tones-big">{notes(x.notes, (n) => (s.pcs.has(n.pc) ? undefined : 'hot'))}</span>
          <span className="muted small">{changed.length ? fill(t.lnChanged, { notes: changed.map(names.note).join(', ') }) : t.lnSame}</span>
          <Staff notes={writtenChord(chordOf(np!))} clef={clef} chord mark={(n) => (s.pcs.has((n.pc - names.reading.semis + 12) % 12) ? undefined : 'hot')} label={`${names.chord(chordOf(np!))}: ${chordOf(np!).notes.map(names.note).join(' ')}`} />
        </div>
      );
      // vaste kolommen (nu · noten en notenbalken · daarna): tijdens het spelen verspringt er niets
      now = (
        <div className="loop-now fixed">
          <div className="ln-now">
            <b className={`loop-chord${names.chord(c).length > 5 ? ' long' : ''}`}>{names.chord(c)}</b>
            <div className="beats" aria-hidden="true">
              {Array.from({ length: info.beats }, (_, i) => <i key={i} className={i === info.beat ? 'on' : ''} />)}
            </div>
          </div>
          <div className="loop-what">
            <span className="loop-scale">{fill(t.nowPlay, { scale: scaleLabel(s) })}</span>
            <dl className="loop-notes">
              {row(t.lnChord, notes(c.notes))}
              {row(t.lnScale, notes(s.notes, (n) => (n.pc === char ? 'char' : undefined)))}
              {row(t.penta, notes(penta.notes))}
              {row(t.blue, blue.inScale ? <span className="muted small">{t.blueInScale}</span> : <span className="bl">{names.note(blue.note)}</span>)}
            </dl>
            <span className="muted small">{fill(t.charHint, { note: names.note(s.notes[CHAR_DEGREE[s.mode]]) })}</span>
            <div className="staves">
              <div className="seg clef-pick" role="group" aria-label={t.clef}>
                <button type="button" aria-pressed={clef === 'treble'} title={t.clefTreble} aria-label={t.clefTreble} onClick={() => setClef('treble')}>{'\u{1D11E}'}</button>
                <button type="button" aria-pressed={clef === 'bass'} title={t.clefBass} aria-label={t.clefBass} onClick={() => setClef('bass')}>{'\u{1D122}'}</button>
              </div>
              <figure><figcaption>{t.lnChord}</figcaption>
                <Staff notes={writtenChord(c)} clef={clef} chord label={`${names.chord(c)}: ${c.notes.map(names.note).join(' ')}`} /></figure>
              <figure><figcaption>{t.lnScale}</figcaption>
                <Staff notes={written(s).notes} clef={clef} mark={(n) => (n.pc === (char + names.reading.semis) % 12 ? 'char' : undefined)} label={`${scaleLabel(s)}: ${s.notes.map(names.note).join(' ')}`} /></figure>
              {opts.melody && (() => {
                // de melodie bij dit akkoord, gespeld zoals in de ladder en in je stemming (met echte octaven)
                const mn = melodyNow.map((x) => s.notes.find((n) => n.pc === x.midi % 12) ?? s.notes[0]);
                return (
                  <figure className="mel"><figcaption>{t.melody}</figcaption>
                    <Staff notes={mn.map((n) => transposeNote(n, names.reading))} midis={melodyNow.map((x) => x.midi + names.reading.semis)} clef={clef}
                      label={`${t.melody}: ${mn.map(names.note).join(' ')}`} /></figure>
                );
              })()}
            </div>
          </div>
          {next(ns)}
        </div>
      );
    }
  }

  return (
    <div className="loop">
      <Heading title={drill ? fill(t.prTitle, { a: scaleLabel(scaleOf(drill.a.root, drill.a.mode)), b: scaleLabel(scaleOf(drill.b.root, drill.b.mode)) }) : t.loopTitle} help={drill ? t.prHelp : t.loopHelp}>
        <button type="button" className={`loopbtn${running ? ' on' : ''}`} aria-pressed={running} onClick={toggle} disabled={!running && state.path.length === 0}>
          {running ? '■ ' + t.loopStop : '▶ ' + t.loopStart}
        </button>
      </Heading>
      <div className="loop-controls">
        <div className="field grow"><label htmlFor="bpm">{t.tempo}: <b>{state.bpm} BPM</b></label>
          <input id="bpm" type="range" min={BPM_MIN} max={BPM_MAX} step={2} value={state.bpm} onChange={(e) => dispatch({ type: 'settings', patch: { bpm: +e.target.value } })} />
        </div>
        {drill ? (
          <div className="field"><label htmlFor="every">{t.prEvery}</label>
            <select id="every" value={drill.bars} onChange={(e) => setPracticeBars(+e.target.value)}>
              {PRACTICE_BARS.map((n) => <option key={n} value={n}>{n === 1 ? t.prBar : fill(t.prBars, { n })}</option>)}
            </select>
          </div>
        ) : (
          <div className="field"><label htmlFor="style">{t.accompaniment}</label>
            <select id="style" value={opts.style} onChange={(e) => set({ style: e.target.value as LoopStyle })}>
              {LOOP_STYLES.map((k) => <option key={k} value={k}>{t.styles[k]}</option>)}
            </select>
          </div>
        )}
        <div className="field"><label htmlFor="comp">{t.compTimbre}</label>
          <select id="comp" value={state.compTimbre} title={t.compTimbreHelp} onChange={(e) => dispatch({ type: 'settings', patch: { compTimbre: e.target.value as CompTimbre } })}>
            {COMP_TIMBRES.map((k) => <option key={k} value={k}>{t.timbres[k]}</option>)}
          </select>
        </div>
        {!drill && <label className="check"><input id="drums" type="checkbox" checked={opts.drums} onChange={(e) => set({ drums: e.target.checked })} /> {t.drums}</label>}
        <label className="check"><input id="metro" type="checkbox" checked={opts.metronome} onChange={(e) => set({ metronome: e.target.checked })} /> {t.metronome}</label>
        <label className="check"><input id="countin" type="checkbox" checked={opts.countIn} onChange={(e) => set({ countIn: e.target.checked })} /> {t.countIn}</label>
        {!drill && <>
          <label className="check" title={t.melodyHelp}><input id="melody" type="checkbox" checked={!!opts.melody} onChange={(e) => set({ melody: e.target.checked })} /> ♪ {t.melody}</label>
          {opts.melody && <button type="button" className="ghost" title={t.melodyNewTip} onClick={newMelody}>↻ {t.melodyNew}</button>}
        </>}
      </div>
      <div aria-live="polite">{now}</div>
    </div>
  );
}
