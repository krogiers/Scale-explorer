import { afterEach, describe, expect, it, vi } from 'vitest';
import { playing, release, stopCurrent, subscribe, takeOver } from './transport';
import { LoopPlayer, loopState } from './loop';
import type { AudioEngine } from './types';

const fakeEngine = () => ({
  now: () => 0, play: vi.fn(), noteAt: vi.fn(), clickAt: vi.fn(), drumAt: vi.fn(), stopAll: vi.fn(), setTimbre: vi.fn(), setMix: vi.fn(),
}) satisfies AudioEngine;

describe('er speelt maar één ding', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('wie begint, zet het vorige stil', () => {
    const a = vi.fn(), b = vi.fn();
    takeOver('a', a);
    takeOver('b', b);
    expect(a).toHaveBeenCalledOnce();
    expect(b).not.toHaveBeenCalled();
  });

  it('wie zelf stopt, wordt later niet nog eens stilgezet', () => {
    const a = vi.fn();
    takeOver('a', a);
    release(a);
    takeOver('b', vi.fn());
    expect(a).not.toHaveBeenCalled();
  });

  it('een akkoord of ladder stopt de loop, en de knop gaat terug naar Start', () => {
    vi.stubGlobal('window', globalThis); // de klok van de loop gebruikt window.setInterval
    const engine = fakeEngine();
    const onBeat = vi.fn();
    const loop = new LoopPlayer(engine, () => [{ voicing: [38, 50, 53], beats: 4 }], () => ({ bpm: 90, metronome: false, drums: false, style: 'comp', countIn: false, meter: 4 }), onBeat);
    loop.start();
    expect(loop.running).toBe(true);
    takeOver('scale', () => engine.stopAll()); // wat playOnly doet
    expect(loop.running).toBe(false);
    expect(loopState.running).toBe(false);
    expect(engine.stopAll).toHaveBeenCalled();
    expect(onBeat).toHaveBeenLastCalledWith(null);
  });

  it('de loop starten zet wat er speelde stil', () => {
    vi.stubGlobal('window', globalThis);
    const engine = fakeEngine();
    const before = vi.fn();
    takeOver('scale', before);
    const loop = new LoopPlayer(engine, () => [{ voicing: [38], beats: 4 }], () => ({ bpm: 90, metronome: false, drums: false, style: 'comp', countIn: false, meter: 4 }), vi.fn());
    loop.start();
    expect(before).toHaveBeenCalledOnce();
    loop.stop();
  });

  it('weet wie er speelt, en ■ zet het stil', () => {
    const a = vi.fn();
    const seen: (string | null)[] = [];
    const off = subscribe(() => seen.push(playing()));
    takeOver('scale', a);
    expect(playing()).toBe('scale');
    stopCurrent();
    expect(a).toHaveBeenCalledOnce();
    expect(playing()).toBeNull();
    expect(seen).toEqual(['scale', null]);
    off();
  });
});
