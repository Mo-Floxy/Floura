import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, Save, Smile, Trash2, Heart } from 'lucide-react';
import { api } from '../api';
import type { DayLog, Mood } from '../types';
import { MOOD_OPTIONS } from '../constants';
import { addDays, daysBetween, formatDate, todayISO } from '../utils';
import { useToast } from '../context/ToastContext';
import { Alert, Card, Chip, EmptyState, Field, PageHeader, SectionTitle, Spinner, StatCard } from '../components/ui';

export default function MoodsPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [day, setDay] = useState<DayLog | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Mood[]>([]);
  const [busy, setBusy] = useState(false);

  const loadDay = useCallback(async () => {
    try {
      const data = await api.get<DayLog>(`/logs/day?date=${date}`);
      setDay(data); setSelected(data.moods.map((m) => m.mood));
      setNotes(Object.fromEntries(data.moods.map((m) => [m.mood, m.notes || ''])));
    } catch (e) { toast((e as Error).message, 'error'); }
  }, [date, toast]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.get<{ moods: Mood[] }>(`/logs/moods?from=${addDays(todayISO(), -89)}&to=${todayISO()}`);
      setHistory(data.moods);
    } catch (e) { toast((e as Error).message, 'error'); }
  }, [toast]);

  useEffect(() => { loadDay(); }, [loadDay]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const save = async () => {
    setBusy(true);
    try {
      await api.put('/logs/moods', { date, moods: selected.map((mood) => ({ mood, notes: notes[mood] || null })) });
      toast('Mood saved for this day.'); await loadDay(); await loadHistory();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const remove = async (id?: number) => {
    if (!id) return;
    try { await api.delete(`/logs/moods/${id}`); toast('Mood entry removed.'); await loadDay(); await loadHistory(); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const distribution = useMemo(() => MOOD_OPTIONS.map((m) => ({
    name: m.name,
    count: history.filter((h) => h.mood === m.name).length,
    color: m.color,
  })).filter((m) => m.count > 0).sort((a, b) => b.count - a.count), [history]);

  const heatmap = useMemo(() => {
    const days = 84;
    const start = addDays(todayISO(), -(days - 1));
    return Array.from({ length: days }, (_, i) => {
      const d = addDays(start, i);
      const moods = history.filter((h) => h.date === d);
      const primary = MOOD_OPTIONS.find((m) => m.name === moods[0]?.mood);
      return { date: d, count: moods.length, color: primary?.color || null, mood: moods[0]?.mood || null };
    });
  }, [history]);

  const moodDays = new Set(history.map((h) => h.date)).size;
  const topMood = distribution[0]?.name || '—';

  if (!day) return <Spinner label="Loading your mood journal…" />;

  return (
    <div className="page moods-page">
      <PageHeader eyebrow="Your emotional wellbeing" title="Mood tracker" subtitle="All feelings are welcome here. Notice what supports your mood through each phase." />

      <div className="tracker-layout">
        <div className="tracker-main">
          <Card className="mood-entry-card">
            <div className="date-picker-row">
              <div><span className="field-label">Logging for</span><div className="input-with-icon date-input"><CalendarDays size={17} /><input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></div></div>
              <span className="day-context">Cycle day {day.cycleDay} · {day.phase}</span>
            </div>
            <SectionTitle title="How are you feeling?" hint="You can choose more than one." />
            <div className="mood-grid">
              {MOOD_OPTIONS.map((mood) => {
                const Icon = mood.icon;
                const active = selected.includes(mood.name);
                return (
                  <button key={mood.name} className={`mood-tile ${active ? 'active' : ''}`} style={{ '--mood-color': mood.color } as React.CSSProperties}
                    onClick={() => setSelected((prev) => active ? prev.filter((m) => m !== mood.name) : [...prev, mood.name])}>
                    <span className="mood-icon"><Icon size={23} strokeWidth={1.7} /></span><span>{mood.name}</span>
                  </button>
                );
              })}
            </div>
            {selected.length > 0 && (
              <div className="mood-notes">
                {selected.map((mood) => <Field key={mood} label={`${mood} — note (optional)`}><input value={notes[mood] || ''} onChange={(e) => setNotes((prev) => ({ ...prev, [mood]: e.target.value }))} placeholder="What influenced this feeling?" /></Field>)}
              </div>
            )}
            <button className="btn btn-primary" onClick={save} disabled={busy}><Save size={17} /> {busy ? 'Saving…' : 'Save mood'}</button>
          </Card>

          <Card>
            <SectionTitle title="Your mood rhythm" hint="A gentle visual of the last 12 weeks." />
            {history.length ? (
              <>
                <div className="heatmap">
                  {heatmap.map((cell) => <span key={cell.date} className="heat-cell" title={`${formatDate(cell.date, { month: 'short', day: 'numeric' })}: ${cell.mood || 'no entry'}`}
                    style={{ background: cell.color ? `${cell.color}${cell.count > 1 ? '' : 'b3'}` : undefined }} />)}
                </div>
                <div className="heatmap-legend"><span>Less</span><i style={{ background: 'var(--surface-3)' }} /><i style={{ background: '#E9B44C66' }} /><i style={{ background: '#D98BA6' }} /><span>More</span></div>
                <div className="chart-box small-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution} margin={{ top: 8, right: 12, left: -22, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--hover)' }} />
                      <Bar dataKey="count" name="Days" fill="var(--primary-soft)" radius={[7, 7, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : <EmptyState icon={<Smile size={22} />} title="Your mood story starts here" description="Log a feeling today and watch your patterns emerge." />}
          </Card>
        </div>

        <div className="tracker-side">
          <div className="stat-grid two">
            <StatCard label="Days logged" value={moodDays} sub="Last 90 days" icon={<CalendarDays size={17} />} tone="lavender" />
            <StatCard label="Most frequent" value={topMood} sub="Your leading mood" icon={<Heart size={17} />} tone="rose" />
          </div>
          <Card>
            <SectionTitle title="Recent moods" />
            {history.length === 0 ? <EmptyState title="No entries yet" /> : (
              <div className="history-list">
                {history.slice(0, 12).map((m) => {
                  const meta = MOOD_OPTIONS.find((x) => x.name === m.mood);
                  return (
                    <div className="history-item" key={`${m.date}-${m.mood}-${m.id}`}>
                      <div><strong><span className="mood-mini-dot" style={{ background: meta?.color }} />{m.mood}</strong><small>{formatDate(m.date, { month: 'short', day: 'numeric' })}{m.notes ? ` · ${m.notes.slice(0, 30)}` : ''}</small></div>
                      <button className="icon-button tiny" onClick={() => remove(m.id)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          <Alert tone="info">Persistent low mood, anxiety or overwhelm deserve support. Consider reaching out to a trusted person or a healthcare professional.</Alert>
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 12, boxShadow: 'var(--shadow)' };
