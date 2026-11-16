/*
  Light "paper" section with flowing wave edges, the signature move of the
  reference design. Dark sections stay dark; these panels break the rhythm.
  Edges are two layered SVG waves that drift slowly sideways.
*/
function Edge({ position }) {
  return (
    <div className={`wave-edge wave-edge-${position}`} aria-hidden="true">
      <svg className="wave-layer wave-layer-back" viewBox="0 0 2880 160" preserveAspectRatio="none">
        <path d="M0 96 C 240 20 480 20 720 80 S 1200 150 1440 96 S 1920 20 2160 80 S 2640 150 2880 96 V160 H0Z" />
      </svg>
      <svg className="wave-layer wave-layer-front" viewBox="0 0 2880 160" preserveAspectRatio="none">
        <path d="M0 110 C 300 40 520 150 760 110 S 1200 40 1440 110 S 1860 150 2200 110 S 2640 40 2880 110 V160 H0Z" />
      </svg>
    </div>
  );
}

export default function WavePanel({ as: Tag = 'section', className = '', children, top = true, bottom = true, ...rest }) {
  return (
    <Tag className={`wave-panel ${className}`} {...rest}>
      {top && <Edge position="top" />}
      <div className="wave-paper" aria-hidden="true" />
      <div className="wave-content">{children}</div>
      {bottom && <Edge position="bottom" />}
    </Tag>
  );
}
