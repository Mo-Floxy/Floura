import { useCallback, useEffect, useState } from 'react';
import { Droplet, Moon, Footprints, Apple, Plus, Minus, Trash2, Lightbulb, Clock3 } from 'lucide-react';
import { api } from '../api';
import type { DayLog, ExerciseLog, Settings, SleepLog } from '../types';
import { ACTIVITIES, CRAVINGS, SLEEP_QUALITIES } from '../constants';
import { addDays, formatDate, plural, shortDate, todayISO } from '../utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Card, Chip, CircularProgress, EmptyState, Field, PageHeader, SectionTitle, Spinner } from '../components/ui';

const TABS = [
  { key: 'water', label: 'Hydration', icon: Droplet },
  { key: 'sleep', label: 'Sleep', icon: Moon },
  { key: 'exercise', label: 'Movement', icon: Footprints },
  { key: 'nutrition', label: 'Nutrition', icon: Apple },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function WellnessPage() {
  const { settings, updateSettings } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('water');
  const [date, setDate] = useState(todayISO());
  const [day, setDay] = useState<DayLog | null>(null);
  const [waterWeek, setWaterWeek] = useState<{ date: string; glasses: number }[]>([]);
  const [sleepHistory, setSleepHistory] = useState<SleepLog[]>([]);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseLog[]>([]);
  const [nutritionHistory, setNutritionHistory] = useState<{ date: string; food_notes: string | null; craving: string | null }[]>([]);
  const [sleepForm, setSleepForm] = useState({ hours: 7.5, quality: 'good' as SleepLog['quality'], notes: '' });
  const [activity, setActivity] = useState('Walking');
  const [minutes, setMinutes] = useState(30);
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [foodNotes, setFoodNotes] = useState('');
  const [craving, setCraving] = useState('');
  const [goalDraft, setGoalDraft] = useState(settings?.waterGoal || 8);
  const [busy, setBusy] = useState(false);

  const from = addDays(todayISO(), -29);
  const load = useCallback(async () => {
    try {
      const [dayData, waterData, sleepData, exerciseData, nutritionData] = await Promise.all([
        api.get<DayLog>(`/logs/day?date=${date}`),
        api.get<{ water: { date: string; glasses: number }[] }>(`/logs/history?from=${from}&to=${todayISO()}`),
        api.get<{ sleep: SleepLog[] }>('/logs/sleep?from=' + from + '&to=' + todayISO()),
        api.get<{ exercise: ExerciseLog[] }>('/logs/exercise?from=' + from + '&to=' + todayISO()),
        api.get<{ nutrition: { date: string; food_notes: string | null; craving: string | null }[] }>('/logs/nutrition?from=' + from + '&to=' + todayISO()),
      ]);
      setDay(dayData); setWaterWeek(waterData.water.slice(0, 14).reverse());
      setSleepHistory(sleepData.sleep); setExerciseHistory(exerciseData.exercise); setNutritionHistory(nutritionData.nutrition);
      if (dayData.sleep) setSleepForm({ hours: dayData.sleep.hours, quality: dayData.sleep.quality, notes: dayData.sleep.notes || '' });
      setFoodNotes(dayData.nutrition?.food_notes || ''); setCraving(dayData.nutrition?.craving || '');
    } catch (e) { toast((e as Error).message, 'error'); }
  }, [date, from, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (settings?.waterGoal) setGoalDraft(settings.waterGoal); }, [settings?.waterGoal]);

  const setWater = async (glasses: number) => {
    try { await api.put('/logs/water', { date, glasses: Math.max(0, glasses) }); await load(); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const saveGoal = async () => {
    try { await updateSettings({ waterGoal: goalDraft }); toast('Hydration goal saved.'); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const saveSleep = async () => {
    setBusy(true);
    try { await api.put('/logs/sleep', { date, ...sleepForm }); toast('Sleep logged.'); await load(); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const addExercise = async () => {
    setBusy(true);
    try { await api.post('/logs/exercise', { date, activity, minutes, notes: exerciseNotes }); toast('Activity logged.'); setExerciseNotes(''); await load(); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const saveNutrition = async () => {
    setBusy(true);
    try { await api.put('/logs/nutrition', { date, foodNotes, craving: craving || null }); toast('Nutrition notes saved.'); await load(); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const removeExercise = async (id: number) => {
    try { await api.delete(`/logs/exercise/${id}`); toast('Activity removed.'); await load(); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  if (!day) return <Spinner label="Loading your wellness space…" />;
  const goal = settings?.waterGoal || 8;

  return (
    <div className="page wellness-page">
      <PageHeader eyebrow="Everyday care" title="Wellness" subtitle="Small daily habits can make a real difference to how you feel." />

      <div className="tabs">
        {TABS.map((t) => { const Icon = t.icon; return <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}><Icon size={17} /> {t.label}</button>; })}
      </div>

      <div className="date-picker-row compact">
        <div><span className="field-label">Date</span><div className="input-with-icon date-input"><Clock3 size={17} /><input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></div></div>
      </div>

      {tab === 'water' && (
        <div className="wellness-grid">
          <Card className="water-main">
            <SectionTitle title="Daily hydration" hint="Every sip counts." />
            <div className="water-hero">
              <CircularProgress value={(day.water / goal) * 100} size={180} stroke={14} color="var(--water)" track="var(--ring-track)">
                <Droplet size={26} color="var(--water)" fill="var(--water-soft)" />
                <span className="ring-number">{day.water}</span>
                <span className="ring-sub">of {goal} glasses</span>
              </CircularProgress>
              <div className="water-actions">
                <button className="round-btn" onClick={() => setWater(day.water - 1)} aria-label="Remove a glass"><Minus size={20} /></button>
                <button className="round-btn primary" onClick={() => setWater(day.water + 1)} aria-label="Add a glass"><Plus size={22} /></button>
                <p>{day.water >= goal ? 'Beautiful — goal reached today! ✨' : `${goal - day.water} more to reach your goal`}</p>
              </div>
            </div>
            <div className="water-drops big">
              {Array.from({ length: Math.max(goal, day.water) }, (_, i) => <Droplet key={i} size={22} className={i < day.water ? 'filled' : ''} />)}
            </div>
          </Card>
          <div className="wellness-side">
            <Card>
              <SectionTitle title="Your daily goal" hint="Adjust to what works for your body." />
              <div className="goal-row"><button className="icon-button bordered" onClick={() => setGoalDraft(Math.max(1, goalDraft - 1))}><Minus size={16} /></button><strong>{goalDraft} glasses</strong><button className="icon-button bordered" onClick={() => setGoalDraft(Math.min(30, goalDraft + 1))}><Plus size={16} /></button></div>
              <button className="btn btn-soft btn-small btn-block" onClick={saveGoal}>Save goal</button>
            </Card>
            <Card>
              <SectionTitle title="Last 14 days" />
              {waterWeek.length ? <div className="mini-bars">{waterWeek.map((w) => <div className="mini-bar-wrap" key={w.date} title={`${shortDate(w.date)}: ${w.glasses} glasses`}><div className="mini-bar" style={{ height: `${Math.min(100, (w.glasses / goal) * 100)}%` }} /><small>{w.date.slice(8)}</small></div>)}</div> : <EmptyState title="No water logs yet" />}
            </Card>
            <Alert tone="info">Hydration needs vary with activity, climate and health. Listen to your body and follow medical advice if you have fluid restrictions.</Alert>
          </div>
        </div>
      )}

      {tab === 'sleep' && (
        <div className="wellness-grid">
          <Card>
            <SectionTitle title="Log your sleep" hint={`For ${formatDate(date, { month: 'long', day: 'numeric' })}`} />
            <div className="form-stack">
              <Field label="Hours slept"><div className="range-row"><input type="range" min="0" max="14" step="0.5" value={sleepForm.hours} onChange={(e) => setSleepForm({ ...sleepForm, hours: Number(e.target.value) })} /><strong>{sleepForm.hours} h</strong></div></Field>
              <Field label="Sleep quality"><div className="chip-wrap">{SLEEP_QUALITIES.map((q) => <Chip key={q.value} active={sleepForm.quality === q.value} onClick={() => setSleepForm({ ...sleepForm, quality: q.value as SleepLog['quality'] })}>{q.label}</Chip>)}</div></Field>
              <Field label="Notes (optional)"><textarea rows={3} value={sleepForm.notes} onChange={(e) => setSleepForm({ ...sleepForm, notes: e.target.value })} placeholder="Dreams, wake-ups, how you felt…" /></Field>
              <button className="btn btn-primary" onClick={saveSleep} disabled={busy}>{busy ? 'Saving…' : 'Save sleep'}</button>
            </div>
          </Card>
          <Card>
            <SectionTitle title="Sleep history" hint="Your last 30 days" />
            {sleepHistory.length === 0 ? <EmptyState icon={<Moon size={22} />} title="No sleep logged yet" description="Track a few nights to see your average." /> : (
              <>
                <div className="sleep-average"><span>{Math.round((sleepHistory.reduce((a, b) => a + b.hours, 0) / sleepHistory.length) * 10) / 10}h</span><small>average per night</small></div>
                <div className="history-list">{sleepHistory.slice(0, 12).map((s) => <div className="history-item" key={s.id}><div><strong>{s.hours} hours</strong><small>{formatDate(s.date, { month: 'short', day: 'numeric' })}</small></div><span className={`quality-pill q-${s.quality}`}>{s.quality}</span></div>)}</div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'exercise' && (
        <div className="wellness-grid">
          <Card>
            <SectionTitle title="Log movement" hint="All kinds of movement count." />
            <div className="form-stack">
              <Field label="Activity"><div className="chip-wrap">{ACTIVITIES.map((a) => <Chip key={a} active={activity === a} onClick={() => setActivity(a)}>{a}</Chip>)}</div></Field>
              <Field label="Duration (minutes)"><div className="range-row"><input type="range" min="5" max="180" step="5" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /><strong>{minutes} min</strong></div></Field>
              <Field label="Notes (optional)"><input value={exerciseNotes} onChange={(e) => setExerciseNotes(e.target.value)} placeholder="How did it feel?" /></Field>
              <button className="btn btn-primary" onClick={addExercise} disabled={busy}><Plus size={17} /> {busy ? 'Saving…' : 'Log activity'}</button>
            </div>
          </Card>
          <Card>
            <SectionTitle title="Recent activity" />
            {exerciseHistory.length === 0 ? <EmptyState icon={<Footprints size={22} />} title="No movement logged yet" description="A gentle walk is a wonderful place to start." /> : (
              <>
                <div className="exercise-total"><strong>{exerciseHistory.reduce((a, b) => a + b.minutes, 0)}</strong><span>minutes in the last 30 days</span></div>
                <div className="history-list">{exerciseHistory.slice(0, 12).map((e) => <div className="history-item" key={e.id}><div><strong>{e.activity} · {e.minutes} min</strong><small>{formatDate(e.date, { month: 'short', day: 'numeric' })}</small></div><button className="icon-button tiny" onClick={() => removeExercise(e.id)}><Trash2 size={14} /></button></div>)}</div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'nutrition' && (
        <div className="wellness-grid">
          <Card>
            <SectionTitle title="Food & cravings" hint="No judgement — just awareness." />
            <div className="form-stack">
              <Field label="What did you eat today?"><textarea rows={4} value={foodNotes} onChange={(e) => setFoodNotes(e.target.value)} placeholder="Meals, snacks, anything you noticed…" /></Field>
              <Field label="Any cravings?"><div className="chip-wrap">{CRAVINGS.map((c) => <Chip key={c} active={craving === c} onClick={() => setCraving(craving === c ? '' : c)}>{c}</Chip>)}</div></Field>
              <button className="btn btn-primary" onClick={saveNutrition} disabled={busy}>{busy ? 'Saving…' : 'Save nutrition notes'}</button>
            </div>
          </Card>
          <div className="wellness-side">
            <Card className="suggestion-card">
              <div className="suggestion-icon"><Lightbulb size={20} /></div>
              <h3>Gentle nutrition ideas</h3>
              <ul>
                <li>Pair iron-rich foods with vitamin C for better absorption.</li>
                <li>Keep a nourishing snack handy for low-energy days.</li>
                <li>Craving something sweet? Try fruit with yoghurt or a small square of dark chocolate.</li>
                <li>Regular meals can help steady energy and mood swings.</li>
              </ul>
            </Card>
            <Card>
              <SectionTitle title="Recent notes" />
              {nutritionHistory.length === 0 ? <EmptyState title="No notes yet" /> : <div className="history-list">{nutritionHistory.slice(0, 8).map((n) => <div className="history-item" key={n.date}><div><strong>{n.craving ? `Craving: ${n.craving}` : 'Food note'}</strong><small>{formatDate(n.date, { month: 'short', day: 'numeric' })} · {n.food_notes?.slice(0, 50) || 'No details'}</small></div></div>)}</div>}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
