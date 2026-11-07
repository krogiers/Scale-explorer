import { stopPlaying, useApp, usePlaying } from '../state';

/**
 * Afspeelknop die weet of hij zelf speelt: ▶ start (en zet wat er speelde stil), ■ stopt.
 * id = de naam waaronder het geluid speelt (zie audio/transport). compact = alleen het symbool.
 */
export function PlayButton({ id, label, onPlay, className = 'ghost', compact = false }: {
  id: string; label: string; onPlay: () => void; className?: string; compact?: boolean;
}) {
  const { t } = useApp();
  const on = usePlaying() === id;
  const text = on ? t.stop : label;
  return (
    <button type="button" className={`${className} playbtn${on ? ' on' : ''}`} aria-pressed={on}
      aria-label={compact ? text : undefined} title={compact ? text : undefined} onClick={() => (on ? stopPlaying() : onPlay())}>
      <span className="pb-ico" aria-hidden="true">{on ? '■' : '▶'}</span>{!compact && <span>{text}</span>}
    </button>
  );
}
