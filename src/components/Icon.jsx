/* Google Material Symbols (Outlined). Decorative by default. */
export default function Icon({ name, size, fill = false, className = '', label }) {
  const style = {};
  if (size) style.fontSize = size;
  if (fill) style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
  return (
    <span
      className={`icon ${className}`}
      style={style}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {name}
    </span>
  );
}
