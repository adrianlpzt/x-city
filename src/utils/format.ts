/** "hace 3 h", "hace 5 min", "ahora"... a partir de una fecha ISO. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const seconds = Math.max(0, Math.round((now - t) / 1000));
  if (seconds < 45) return 'ahora';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/** 950 -> "950", 1234 -> "1,2 mil", 2500000 -> "2,5 M" (formato español). */
export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${trimDecimal(n / 1000)} mil`;
  return `${trimDecimal(n / 1_000_000)} M`;
}

function trimDecimal(value: number): string {
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return String(rounded).replace('.', ',');
}

/** Recorta un texto a `max` caracteres "visibles" (respeta emojis). */
export function truncate(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('')}…`;
}

/** Convierte 0xRRGGBB en "#rrggbb" para CSS. */
export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
