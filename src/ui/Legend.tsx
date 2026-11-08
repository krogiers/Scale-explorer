/** Legenda onder een paneel: kleur of vorm met een korte uitleg. 'ring' = gestippeld rondje (buiten pentatonisch), 'dash' = gestippeld vakje (zelfde grondtoon in het modirooster). */
export function Legend({ items }: { items: [string, string, boolean?][] }) {
  return (
    <div className="legend">
      {items.map(([color, label, round]) => (
        <span key={label}><i className={color === 'ring' || color === 'dash' ? color : undefined} style={color === 'ring' ? { borderRadius: '50%' } : color === 'dash' ? undefined : { background: color, borderColor: color, borderRadius: round ? '50%' : undefined }} /><span>{label}</span></span>
      ))}
    </div>
  );
}
