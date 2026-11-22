export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const toISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const parseDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDays = (iso: string, amount: number) => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + amount);
  return toISO(d);
};

export const daysBetween = (from: string, to: string) => Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);

export const formatDate = (iso: string | null | undefined, options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }) => {
  if (!iso) return '—';
  return parseDate(iso).toLocaleDateString('en-US', options);
};

export const shortDate = (iso: string | null | undefined) => formatDate(iso, { month: 'short', day: 'numeric' });

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const monthMatrix = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: { date: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const dayIndex = i - startOffset + 1;
    if (dayIndex < 1) cells.push({ date: toISO(new Date(year, month - 1, daysInPrev + dayIndex)), day: daysInPrev + dayIndex, inMonth: false });
    else if (dayIndex > daysInMonth) cells.push({ date: toISO(new Date(year, month + 1, dayIndex - daysInMonth)), day: dayIndex - daysInMonth, inMonth: false });
    else cells.push({ date: toISO(new Date(year, month, dayIndex)), day: dayIndex, inMonth: true });
  }
  return cells;
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export const distinct = <T,>(items: T[]) => [...new Set(items)];

export const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function extractFilename(disposition: string | null, fallback: string) {
  const match = disposition?.match(/filename="?([^";]+)"?/);
  return match?.[1] || fallback;
}
