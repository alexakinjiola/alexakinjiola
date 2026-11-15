import { Link } from 'react-router';
import Icon from './Icon';
import Magnetic from './Magnetic';

/*
  One button for the whole site.
  variant: 'primary' | 'secondary' | 'light'   size: 'md' | 'sm'
  Internal routes use <Link>; anything with a protocol or a file opens as a normal anchor.
*/
export default function Button({ to, href, variant = 'primary', size = 'md', icon, iconStart, magnetic = variant === 'primary', children, download, ...rest }) {
  const cls = `btn btn-${variant} btn-${size}`;
  const inner = (
    <>
      {iconStart && <Icon name={iconStart} size={size === 'sm' ? 16 : 18} />}
      <span className="btn-label">{children}</span>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} className="btn-icon" />}
    </>
  );
  const external = href && /^https?:/.test(href);
  const el = to ? (
    <Link to={to} className={cls} {...rest}>{inner}</Link>
  ) : (
    <a href={href} className={cls} download={download} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
      {inner}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}
