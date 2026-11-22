import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Plus, Trash2, CalendarDays, Info, Save } from 'lucide-react';
import { api } from '../api';
import type { DayLog, Symptom } from '../types';
import { SEVERITIES, SYMPTOMS } from '../constants';
import { addDays, formatDate, plural, todayISO } from '../utils';
import { useToast } from '../context/ToastContext';
import { Alert, Card, Chip, EmptyState, Field, PageHeader, SectionTitle, Spinner, StatCard } from '../components/ui';

export default function SymptomsPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [day, setDay] = useState<DayLog | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState('');
  const [history, setHistory] = useState<Symptom[]>([]);
  const [busy, setBusy] = useState(false);

  const loadDay = useCallback(async () => {
    try {
      const data = await api.get<DayLog>(`/logs/day?date=${date}`);
      setDay(data);
      setSelected(Object.fromEntries(data.symptoms.map((s) => [s.name, s.severity])));
      setNotes(Object.fromEntries(data.symptoms.map((s) => [s.name, s.notes || ''])));
    } catch (e) { toast((e as Error).message, 'error'); }
  }, [date, toast]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.get<{ symptoms: Symptom[] }>(`/logs/symptoms?from=${addDays(todayISO(), -89)}&to=${todayISO()}`);
      setHistory(data.symptoms);
    } catch (e) { toast((e as Error).message, 'error'); }
  }, [toast]);

  useEffect(() => { loadDay(); }, [loadDay]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    if (SYMPTOMS.some((s) => s.toLowerCase() === name.toLowerCase()) || selected[name]) { toast('That symptom is already on your list.', 'info'); return; }
    setSelected((prev) => ({ ...prev, [name]: 'mild' }));
    setCustom('');
  };

  const save = async () => {
    setBusy(true);
    try {
      const items = Object.entries(selected).map(([name, severity]) => ({ name, severity: severity as Symptom['severity'], notes: notes[name] || null }));
      await api.put('/logs/symptoms', { date, items });
      toast('Symptoms saved for this day.'); await loadDay(); await loadHistory();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const remove = async (id?: number) => {
    if (!id) return;
    try { await api.delete(`/logs/symptoms/${id}`); toast('Symptom removed.'); await loadDay(); await loadHistory(); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const frequency = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach((s) => map.set(s.name, (map.get(s.name) || 0) + 1));
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [history]);

  const severityCounts = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach((s) => map.set(s.severity, (map.get(s.severity) || 0) + 1));
    return map;
  }, [history]);

  if (!day) return <Spinner label="Loading symptoms…" />;

  return (
    <div className="page symptoms-page">
      <PageHeader eyebrow="Track how you feel" title="Symptom tracker" subtitle="Notice patterns over time — knowledge that can help you plan and advocate for yourself." />

      <div className="tracker-layout">
        <div className="tracker-main">
          <Card>
            <div className="date-picker-row">
              <div><span className="field-label">Logging for</span><div className="input-with-icon date-input"><CalendarDays size={17} /><input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></div></div>
              <span className="day-context">Cycle day {day.cycleDay} · {day.phase}</span>
            </div>

            <SectionTitle title="What are you experiencing?" hint="Choose any that apply today." />
            <div className="chip-wrap large">
              {SYMPTOMS.map((name) => <Chip key={name} active={Boolean(selected[name])} onClick={() => setSelected((prev) => {
                const next = { ...prev };
                if (next[name]) delete next[name]; else next[name] = 'mild';
                return next;
              })}>{name}</Chip>)}
            </div>

            <div className="custom-symptom">
              <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} placeholder="Add a custom symptom…" />
              <button className="btn btn-soft btn-small" onClick={addCustom}><Plus size={15} /> Add</button>
            </div>

            {Object.keys(selected).length > 0 && (
              <div className="symptom-detail-list">
                {Object.entries(selected).map(([name, severity]) => (
                  <div className="symptom-detail" key={name}>
                    <div className="symptom-detail-head"><strong>{name}</strong><div className="segmented">
                      {SEVERITIES.map((s) => <button key={s.value} className={severity === s.value ? 'active' : ''} onClick={() => setSelected((prev) => ({ ...prev, [name]: s.value }))}><i style={{ background: s.color }} />{s.label}</button>)}
                    </div></div>
                    <input className="note-inline" value={notes[name] || ''} onChange={(e) => setNotes((prev) => ({ ...prev, [name]: e.target.value }))} placeholder="Add a note about this symptom (optional)" />
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-primary" onClick={save} disabled={busy}><Save size={17} /> {busy ? 'Saving…' : 'Save symptoms'}</button>
          </Card>

          <Card>
            <SectionTitle title="Symptom frequency" hint="Your most recorded symptoms over the last 90 days." />
            {frequency.length ? (
              <div className="chart-box small-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={frequency} margin={{ top: 8, right: 12, left: -22, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval={0} angle={-20} textAnchor="end" height={55} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--hover)' }} />
                    <Bar dataKey="count" name="Entries" fill="var(--primary-soft)" radius={[7, 7, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState icon={<Activity size={22} />} title="No symptom data yet" description="Log a few days and your frequency chart will appear here." />}
          </Card>
        </div>

        <div className="tracker-side">
          <div className="stat-grid two">
            <StatCard label="Entries (90d)" value={history.length} sub="All symptoms" icon={<Activity size={17} />} tone="rose" />
            <StatCard label="Severe days" value={severityCounts.get('severe') || 0} sub="Worth discussing with a clinician" icon={<Info size={17} />} tone="lavender" />
          </div>

          <Card>
            <SectionTitle title="Recent entries" />
            {history.length === 0 ? <EmptyState title="Nothing logged yet" description="Your symptom history will build up here." /> : (
              <div className="history-list">
                {history.slice(0, 12).map((s) => (
                  <div className="history-item" key={`${s.date}-${s.name}-${s.id}`}>
                    <div><strong>{s.name}</strong><small>{formatDate(s.date, { month: 'short', day: 'numeric' })}</small></div>
                    <span className={`severity-pill sev-${s.severity}`}>{s.severity}</span>
                    <button className="icon-button tiny" onClick={() => remove(s.id)} title="Delete"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Alert tone="info">Tracking symptoms is for self-understanding, not diagnosis. If something worries you, speak with a healthcare professional.</Alert>
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 12, boxShadow: 'var(--shadow)' };
