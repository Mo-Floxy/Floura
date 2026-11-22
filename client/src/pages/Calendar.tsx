import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarPlus, X, Sparkles, Droplet, Moon, Activity, PencilLine } from 'lucide-react';
import { api } from '../api';
import type { DayLog, Period, Predictions } from '../types';
import { CALENDAR_LEGEND, MOOD_OPTIONS, PHASE_META } from '../constants';
import { formatDate, monthMatrix, parseDate, shortDate, todayISO } from '../utils';
import { useToast } from '../context/ToastContext';
import { Alert, Card, Field, Modal, PageHeader, SectionTitle, Spinner } from '../components/ui';

interface CyclesResponse { periods: Period[]; stats: Predictions['stats']; predictions: Predictions }

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const { toast } = useToast();
  const [cycles, setCycles] = useState<CyclesResponse | null>(null);
  const [selected, setSelected] = useState(todayISO());
  const [dayLog, setDayLog] = useState<DayLog | null>(null);
  const [view, setView] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [editor, setEditor] = useState<{ open: boolean; id?: number; startDate: string; endDate: string; notes: string } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setCycles(await api.get<CyclesResponse>('/cycles')); }
    catch (e) { toast((e as Error).message, 'error'); }
  }, [toast]);
  const loadDay = useCallback(async (date: string) => {
    try {
      const data = await api.get<DayLog>(`/logs/day?date=${date}`);
      setDayLog(data); setNote(data.dailyNote || '');
    } catch (e) { toast((e as Error).message, 'error'); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDay(selected); }, [selected, loadDay]);

  const predictions = cycles?.predictions;
  const periods = cycles?.periods || [];
  const cells = useMemo(() => monthMatrix(view.year, view.month), [view]);

  const classify = (date: string) => {
    const period = periods.find((p) => date >= p.startDate && date <= (p.endDate || p.startDate));
    if (period) return { kind: 'period', title: 'Period day' };
    if (date === predictions?.nextPeriod || predictions?.upcoming?.some((u) => date >= u.start && date <= u.end)) return { kind: 'predicted', title: 'Predicted period' };
    if (date === predictions?.ovulation || predictions?.upcoming?.some((u) => u.ovulation === date)) return { kind: 'ovulation', title: 'Estimated ovulation' };
    if ((predictions?.fertileStart && date >= predictions.fertileStart && date <= predictions.fertileEnd) || predictions?.upcoming?.some((u) => date >= u.fertileStart && date <= u.fertileEnd)) return { kind: 'fertile', title: 'Fertile window' };
    return { kind: 'normal', title: '' };
  };

  const selectedPeriod = periods.find((p) => selected >= p.startDate && selected <= (p.endDate || p.startDate));
  const openEditor = (period?: Period) => {
    setEditor({
      open: true,
      id: period?.id,
      startDate: period?.startDate || selected,
      endDate: period?.endDate || (period ? '' : selected),
      notes: period?.notes || '',
    });
  };

  const savePeriod = async () => {
    if (!editor) return;
    setBusy(true);
    try {
      const payload = { startDate: editor.startDate, endDate: editor.endDate || null, notes: editor.notes || null };
      if (editor.id) await api.patch(`/cycles/periods/${editor.id}`, payload);
      else await api.post('/cycles/periods', payload);
      toast(editor.id ? 'Period dates updated.' : 'Period dates saved.');
      setEditor(null); await load(); await loadDay(selected);
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const deletePeriod = async () => {
    if (!editor?.id) return;
    setBusy(true);
    try {
      await api.delete(`/cycles/periods/${editor.id}`);
      toast('Period entry deleted.'); setEditor(null); await load(); await loadDay(selected);
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const saveNote = async () => {
    try { await api.put('/logs/daily-notes', { date: selected, notes: note }); toast('Note saved.'); await loadDay(selected); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const changeMonth = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  if (!cycles) return <Spinner label="Loading your calendar…" />;

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="page calendar-page">
      <PageHeader eyebrow="Your cycle" title="Cycle calendar" subtitle="Record your periods and see your personal predictions at a glance."
        actions={<button className="btn btn-primary btn-small" onClick={() => openEditor()}><Plus size={16} /> Log period</button>} />

      <div className="calendar-layout">
        <Card className="calendar-card">
          <div className="calendar-toolbar">
            <div className="month-label"><h2>{monthLabel}</h2><span>{periods.length} recorded period{periods.length === 1 ? '' : 's'}</span></div>
            <div className="calendar-controls">
              <button className="btn btn-soft btn-small" onClick={() => { const d = new Date(); setView({ year: d.getFullYear(), month: d.getMonth() }); setSelected(todayISO()); }}>Today</button>
              <button className="icon-button bordered" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
              <button className="icon-button bordered" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="calendar-weekdays">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="calendar-grid">
            {cells.map((cell) => {
              const info = classify(cell.date);
              const isToday = cell.date === todayISO();
              const isSelected = cell.date === selected;
              return (
                <button key={cell.date} className={`calendar-day kind-${info.kind} ${cell.inMonth ? '' : 'outside'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelected(cell.date)} title={info.title || formatDate(cell.date)}>
                  <span className="day-number">{cell.day}</span>
                  {info.kind === 'ovulation' && <span className="day-symbol">✦</span>}
                  {isToday && <span className="today-label">Today</span>}
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            {CALENDAR_LEGEND.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}
          </div>
          <Alert tone="info">Dotted dates are predictions based on your history. They are estimates, not certainties.</Alert>
        </Card>

        <div className="calendar-side">
          <Card className="day-detail">
            <div className="day-detail-head">
              <div><div className="eyebrow">{selected === todayISO() ? 'TODAY' : 'SELECTED DAY'}</div><h2>{formatDate(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</h2></div>
              {selectedPeriod && <button className="icon-button bordered" title="Edit period dates" onClick={() => openEditor(selectedPeriod)}><PencilLine size={17} /></button>}
            </div>

            {dayLog && (
              <>
                <div className="day-tags">
                  <span className="meta-tag" style={{ color: PHASE_META[dayLog.phase]?.color }}>{PHASE_META[dayLog.phase]?.short || 'Cycle day'} · Day {dayLog.cycleDay}</span>
                  {dayLog.isPeriodDay && <span className="meta-tag period">Period day</span>}
                </div>

                {selectedPeriod ? (
                  <div className="period-entry">
                    <div><strong>Period recorded</strong><p>{formatDate(selectedPeriod.startDate, { month: 'short', day: 'numeric' })} {selectedPeriod.endDate ? `– ${formatDate(selectedPeriod.endDate, { month: 'short', day: 'numeric' })}` : '(ongoing)'} · {selectedPeriod.days || 1} days</p></div>
                    <button className="text-link" onClick={() => openEditor(selectedPeriod)}>Edit</button>
                  </div>
                ) : (
                  <button className="btn btn-soft btn-small btn-block" onClick={() => openEditor()}><CalendarPlus size={16} /> {selected > todayISO() ? 'Mark planned period' : 'Mark period start/end'}</button>
                )}

                <div className="day-log-sections">
                  <div className="day-log-row"><span className="day-log-icon symptom"><Activity size={16} /></span><div><strong>Symptoms</strong><p>{dayLog.symptoms.length ? dayLog.symptoms.map((s) => `${s.name} (${s.severity})`).join(', ') : 'Nothing logged'}</p></div></div>
                  <div className="day-log-row"><span className="day-log-icon mood"><Sparkles size={16} /></span><div><strong>Mood</strong><p>{dayLog.moods.length ? dayLog.moods.map((m) => m.mood).join(', ') : 'Nothing logged'}</p></div></div>
                  <div className="day-log-row"><span className="day-log-icon water"><Droplet size={16} /></span><div><strong>Water</strong><p>{dayLog.water} of {dayLog.waterGoal} glasses</p></div></div>
                  <div className="day-log-row"><span className="day-log-icon sleep"><Moon size={16} /></span><div><strong>Sleep</strong><p>{dayLog.sleep ? `${dayLog.sleep.hours}h · ${dayLog.sleep.quality}` : 'Nothing logged'}</p></div></div>
                </div>

                <Field label="Daily note"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything you’d like to remember about this day…" /></Field>
                <button className="btn btn-ghost btn-small" onClick={saveNote}>Save note</button>
              </>
            )}
          </Card>

          <Card className="mini-predictions">
            <SectionTitle title="Predicted periods" hint="Based on your own rhythm" />
            {predictions?.upcoming?.slice(0, 3).map((u) => (
              <div className="mini-pred-row" key={u.start}><span className="mini-pred-dot" /><div><strong>{shortDate(u.start)} – {shortDate(u.end)}</strong><small>Ovulation ~{shortDate(u.ovulation)}</small></div></div>
            ))}
            {!predictions?.upcoming?.length && <p className="muted-text">Log at least one period to see predictions.</p>}
          </Card>
        </div>
      </div>

      <Modal open={Boolean(editor)} onClose={() => setEditor(null)} title={editor?.id ? 'Edit period entry' : 'Record period dates'}
        footer={<>
          {editor?.id && <button className="btn btn-danger-ghost" onClick={deletePeriod} disabled={busy}><Trash2 size={16} /> Delete</button>}
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setEditor(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={savePeriod} disabled={busy || !editor?.startDate}>{busy ? 'Saving…' : 'Save dates'}</button>
        </>}>
        {editor && <div className="form-stack">
          <Alert tone="info">Enter the first and last day of bleeding. You can come back and edit these any time.</Alert>
          <Field label="First day of period"><input type="date" value={editor.startDate} max={todayISO()} onChange={(e) => setEditor({ ...editor, startDate: e.target.value })} /></Field>
          <Field label="Last day of period (leave empty if ongoing)"><input type="date" value={editor.endDate} max={todayISO()} min={editor.startDate} onChange={(e) => setEditor({ ...editor, endDate: e.target.value })} /></Field>
          <Field label="Notes (optional)"><textarea rows={3} value={editor.notes} onChange={(e) => setEditor({ ...editor, notes: e.target.value })} placeholder="How was this period?" /></Field>
        </div>}
      </Modal>
    </div>
  );
}
