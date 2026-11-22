/** All dates in FLOURA are stored as local calendar days in YYYY-MM-DD format. */

export function toISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO() {
  return toISO(new Date());
}

export function addDays(iso, amount) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + amount);
  return toISO(d);
}

export function addMonths(iso, amount) {
  const d = parseISO(iso);
  d.setMonth(d.getMonth() + amount);
  return toISO(d);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from, to) {
  const a = parseISO(from);
  const b = parseISO(to);
  return Math.round((b - a) / 86400000);
}

export function isValidISO(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseISO(value);
  return toISO(d) === value;
}

export function monthBounds(year, month) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDate = new Date(year, month, 0);
  return { first, last: toISO(lastDate) };
}
