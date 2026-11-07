/** Legenda onder een paneel: kleur of vorm met een korte uitleg. 'ring' = gestippeld rondje (buiten pentatonisch). */
export function Legend({ items }: { items: [string, string, boolean?][] }) {
  return (
    <div className="legend">
      {items.map(([color, label, round]) => (
        <span key={label}><i className={color === 'ring' ? 'ring' : undefined} style={color === 'ring' ? { borderRadius: '50%' } : { background: color, borderColor: color, borderRadius: round ? '50%' : undefined }} /><span>{label}</span></span>
      ))}
    </div>
  );
}
