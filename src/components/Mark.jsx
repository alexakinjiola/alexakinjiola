import { useId } from 'react';

/*
  The "Aa" seal — Alex Akinjiola's initials set in Instrument Serif italic,
  which is also the type-specimen symbol designers know. Glyphs are outlined
  paths, so the mark renders identically everywhere (no font dependency).
*/
export const GLYPH_A = 'M-62 0Q-74 0 -74 10Q-74 19 -58 23L-42 26Q-22 30 -7.5 45.5Q7 61 20 89L319 714Q324 724 329.0 727.0Q334 730 338 730Q343 730 346.5 727.0Q350 724 350 714L361 80Q362 52 368.0 41.5Q374 31 393 26L406 23Q418 20 418 11Q418 0 401 0H236Q223 0 223 10Q223 21 243 23L263 25Q280 27 286.5 36.0Q293 45 293 67L291 222Q291 248 264 248H157Q131 248 118 222L53 88Q26 31 71 25L85 23Q100 21 100 11Q100 0 83 0ZM161 278H273Q290 278 290 295L288 568H283L152 295Q148 288 151.0 283.0Q154 278 161 278Z';
export const GLYPH_a = 'M89 -9Q53 -9 33.0 22.0Q13 53 13 113Q13 170 29.0 227.5Q45 285 73.0 337.0Q101 389 136.5 429.0Q172 469 211.5 492.5Q251 516 290 516Q309 516 326.0 508.5Q343 501 354 485Q360 476 366 476Q372 476 378 485Q389 501 396.0 505.5Q403 510 409 510Q422 510 419 496L330 113Q315 48 350 48Q373 48 391.5 79.0Q410 110 429 175Q432 186 442 186Q449 186 451.0 180.0Q453 174 451 166Q432 72 400.0 31.5Q368 -9 323 -9Q284 -9 267.5 24.0Q251 57 264 114L277 169Q279 176 274.5 177.0Q270 178 267 172Q212 71 169.5 31.0Q127 -9 89 -9ZM114 42Q138 42 167.0 71.0Q196 100 224.5 146.0Q253 192 277.0 245.0Q301 298 315.5 347.0Q330 396 330 430Q330 491 287 491Q261 491 232.0 467.5Q203 444 176.5 404.0Q150 364 128.5 313.5Q107 263 94.0 208.5Q81 154 81 102Q81 67 89.5 54.5Q98 42 114 42Z';
export const TRANSFORM_A = 'translate(24 25.2) scale(0.03102 -0.03102) translate(-393.5 -360.5)';
export const TRANSFORM_a = 'translate(24 25.2) scale(0.03102 -0.03102) translate(15.5 -360.5)';

/* Letters only, for placing on any surface. */
export function Glyphs({ inkA = '#F4F7FC', inka = 'currentColor' }) {
  return (
    <>
      <path d={GLYPH_A} transform={TRANSFORM_A} fill={inkA} />
      <path d={GLYPH_a} transform={TRANSFORM_a} fill={inka} />
    </>
  );
}

export default function Mark({ size = 40, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`mark ${className}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}ink`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A9CCFF" /><stop offset=".5" stopColor="#5B9BFF" /><stop offset="1" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id={`${id}bg`} x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#16264A" /><stop offset="1" stopColor="#050A16" />
        </linearGradient>
        <linearGradient id={`${id}edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A9CCFF" stopOpacity=".75" /><stop offset=".5" stopColor="#3B82F6" stopOpacity=".12" /><stop offset="1" stopColor="#5B9BFF" stopOpacity=".55" />
        </linearGradient>
        <radialGradient id={`${id}glow`} cx=".72" cy=".78" r=".6">
          <stop offset="0" stopColor="#3B82F6" stopOpacity=".35" /><stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill={`url(#${id}bg)`} />
      <circle cx="24" cy="24" r="23" fill={`url(#${id}glow)`} />
      <circle className="mark-ring" cx="24" cy="24" r="22.25" fill="none" stroke={`url(#${id}edge)`} strokeWidth="1.5" />
      <g className="mark-glyphs"><Glyphs inka={`url(#${id}ink)`} /></g>
    </svg>
  );
}
