import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplet, CalendarDays, Sparkles, HeartPulse, Smile, ChevronRight, Moon, Activity,
  ShieldCheck, ArrowUpRight, Check, Info, CircleHelp,
} from 'lucide-react';
import { api } from '../api';
import type { DayLog, Predictions, Period } from '../types';
import { MOOD_OPTIONS, PHASE_META, SEVERITIES, SYMPTOMS, WELLNESS_TIPS } from '../constants';
import { formatDate, greeting, plural, shortDate, todayISO } from '../utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Card, Chip, CircularProgress, EmptyState, PageHeader, PhaseBadge, SectionTitle, Spinner, StatCard } from '../components/ui';

interface CyclesResponse { periods: Period[]; stats: Predictions['stats']; predictions: Predictions }

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cycles, setCycles] = useState<CyclesResponse | null>(null);
  const [day, setDay] = useState<DayLog | null>(null);
  const [saving, setSaving] = useState(false);
  const [symptomDraft, setSymptomDraft] = useState<Record<string, string>>({});
  const [moodDraft, setMoodDraft] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const [cycleData, dayData] = await Promise.all([
        api.get<CyclesResponse>('/cycles'),
        api.get<DayLog>('/logs/day'),
      ]);
      setCycles(cycleData);
      setDay(dayData);
      setSymptomDraft(Object.fromEntries(dayData.symptoms.map((s) => [s.name, s.severity])));
      setMoodDraft(dayData.moods.map((m) => m.mood));
    } catch (e) { toast((e as Error).message, 'error'); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const tip = useMemo(() => WELLNESS_TIPS[new Date().getDate() % WELLNESS_TIPS.length], []);
  const p = cycles?.predictions;
  const stats = cycles?.stats;
  const meta = PHASE_META[p?.phase || 'unknown'];

  const saveSymptoms = async () => {
    setSaving(true);
    try {
      const items = Object.entries(symptomDraft).map(([name, severity]) => ({
        name, severity: severity as 'mild' | 'moderate' | 'severe',
        notes: day?.symptoms.find((s) => s.name === name)?.notes || null,
      }));
      await api.put('/logs/symptoms', { date: todayISO(), items });
      toast('Today’s symptoms saved.');
      await load();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setSaving(false); }
  };

  const saveMoods = async () => {
    setSaving(true);
    try {
      await api.put('/logs/moods', { date: todayISO(), moods: moodDraft.map((mood) => ({ mood, notes: day?.moods.find((m) => m.mood === mood)?.notes || null })) });
      toast('Today’s mood saved.');
      await load();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setSaving(false); }
  };

  const addWater = async () => {
    try {
      await api.put('/logs/water', { date: todayISO(), glasses: (day?.water || 0) + 1 });
      setDay((prev) => prev ? { ...prev, water: prev.water + 1 } : prev);
      toast('Glass logged. Keep it up!');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  if (!cycles || !day) return <Spinner label="Preparing your dashboard…" />;

  const countdown = p?.daysUntilPeriod;
  const headline = !p?.nextPeriod
    ? 'Start tracking your cycle'
    : countdown === 0 ? 'Your period is expected today'
      : countdown === 1 ? 'Your period is tomorrow'
        : `Your period is in ${countdown} days`;

  const symptomChanged = JSON.stringify(Object.entries(symptomDraft).sort()) !== JSON.stringify(day.symptoms.map((s) => [s.name, s.severity]).sort());
  const moodChanged = JSON.stringify([...moodDraft].sort()) !== JSON.stringify(day.moods.map((m) => m.mood).sort());

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow={formatDate(todayISO(), { weekday: 'long', month: 'long', day: 'numeric' })}
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'you'} 🌸`}
        subtitle="Here’s a gentle snapshot of where you are today."
        actions={<Link to="/calendar" className="btn btn-soft btn-small">Open calendar <ChevronRight size={16} /></Link>}
      />

      {!user?.emailVerified && (
        <Alert tone="info"><Info size={16} /> Your email is not verified yet. Check your inbox (or your account settings) to complete verification.</Alert>
      )}

      <section className="hero-card">
        <div className="hero-content">
          <PhaseBadge phase={p?.phase || 'unknown'} />
          <h2>{headline}</h2>
          <p>{p?.nextPeriod ? `Estimated around ${formatDate(p.nextPeriod)}. This is a personal estimate based on your ${plural(stats?.cycleCount || 0, 'recorded cycle')}.` : p?.phaseDescription}</p>
          <div className="hero-meta">
            <div><span>Cycle day</span><strong>{p?.cycleDay || 1} <small>/ {p?.cycleLength || '—'}</small></strong></div>
            <div><span>Current phase</span><strong>{meta.short}</strong></div>
            <div><span>Next period</span><strong>{p?.nextPeriod ? shortDate(p.nextPeriod) : '—'}</strong></div>
          </div>
        </div>
        <div className="hero-visual">
          <CircularProgress value={p?.progress || 0} size={206} stroke={14} color="rgba(255,255,255,.92)" track="rgba(255,255,255,.22)">
            <span className="ring-eyebrow">CYCLE DAY</span>
            <span className="ring-number">{p?.cycleDay || 1}</span>
            <span className="ring-sub">of {p?.cycleLength || '—'} days</span>
          </CircularProgress>
          <span className="hero-flower">✦</span>
        </div>
        <div className="hero-phase-bar">
          <div className="phase-track">
            <div className="phase-fill" style={{ width: `${p?.progress || 0}%` }} />
            <div className="phase-marker" style={{ left: `${p?.progress || 0}%` }}><span>you</span></div>
          </div>
          <div className="phase-track-labels"><span>Day 1</span><span>Ovulation ~{p?.ovulation ? shortDate(p.ovulation) : '—'}</span><span>Next period</span></div>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard label="Average cycle" value={`${stats?.avgCycleLength || '—'} days`} sub={stats?.cycleCount ? `from ${plural(stats.cycleCount, 'cycle')}` : 'Add cycles to personalise'} icon={<Activity size={18} />} tone="rose" />
        <StatCard label="Period length" value={`${stats?.avgPeriodDuration || '—'} days`} sub="Your average" icon={<Droplet size={18} />} tone="lavender" />
        <StatCard label="Est. ovulation" value={p?.ovulation ? shortDate(p.ovulation) : '—'} sub="Approximately day 14 before next period" icon={<Sparkles size={18} />} tone="plum" />
        <StatCard label="Cycle regularity" value={stats?.regularity || '—'} sub={stats?.regularityScore !== null && stats?.regularityScore !== undefined ? `${stats.regularityScore}/100 consistency` : 'Log 2+ cycles to see'} icon={<CalendarDays size={18} />} tone="cream" />
      </div>

      <div className="dashboard-columns">
        <Card className="checkin-card">
          <SectionTitle title="Today’s check-in" hint="Small notes build a clearer picture over time." />
          <div className="checkin-block">
            <div className="checkin-label"><HeartPulse size={17} /> How is your body feeling?</div>
            <div className="chip-wrap">
              {SYMPTOMS.map((name) => (
                <Chip key={name} active={Boolean(symptomDraft[name])} onClick={() => setSymptomDraft((prev) => {
                  const next = { ...prev };
                  if (next[name]) delete next[name]; else next[name] = 'mild';
                  return next;
                })}>{name}</Chip>
              ))}
            </div>
            {Object.keys(symptomDraft).length > 0 && (
              <div className="severity-rows">
                {Object.entries(symptomDraft).map(([name, severity]) => (
                  <div className="severity-row" key={name}>
                    <span>{name}</span>
                    <div className="segmented small">
                      {SEVERITIES.map((s) => <button key={s.value} className={severity === s.value ? 'active' : ''} onClick={() => setSymptomDraft((prev) => ({ ...prev, [name]: s.value }))}>{s.label}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary btn-small" disabled={!symptomChanged || saving} onClick={saveSymptoms}><Check size={16} /> Save symptoms</button>
          </div>

          <div className="checkin-block">
            <div className="checkin-label"><Smile size={17} /> How is your mood?</div>
            <div className="chip-wrap">
              {MOOD_OPTIONS.map((mood) => {
                const Icon = mood.icon;
                return <Chip key={mood.name} active={moodDraft.includes(mood.name)} color={mood.color} onClick={() => setMoodDraft((prev) => prev.includes(mood.name) ? prev.filter((m) => m !== mood.name) : [...prev, mood.name])}><Icon size={15} /> {mood.name}</Chip>;
              })}
            </div>
            <button className="btn btn-primary btn-small" disabled={!moodChanged || saving} onClick={saveMoods}><Check size={16} /> Save mood</button>
          </div>
        </Card>

        <div className="dashboard-side">
          <Card className="tip-card">
            <div className="tip-top"><span className="tip-icon"><Sparkles size={19} /></span><span className="tip-category">{tip.category}</span></div>
            <h3>A note for you</h3>
            <p>{tip.text}</p>
            <div className="tip-footer"><Moon size={15} /> Small acts of care add up.</div>
          </Card>

          <Card className="water-card">
            <div className="water-head"><span className="water-icon"><Droplet size={20} /></span><div><h3>Hydration today</h3><p>{plural(day.water, 'glass')} of {day.waterGoal || 8}</p></div></div>
            <div className="water-drops">
              {Array.from({ length: Math.max(day.waterGoal || 8, day.water) }, (_, i) => <span key={i} className={i < day.water ? 'filled' : ''}><Droplet size={15} /></span>)}
            </div>
            <div className="water-progress"><span style={{ width: `${Math.min(100, (day.water / (day.waterGoal || 8)) * 100)}%` }} /></div>
            <button className="btn btn-soft btn-small btn-block" onClick={addWater}>+ Log a glass of water</button>
          </Card>

          <Card className="insight-nudge">
            <div className="nudge-icon"><ShieldCheck size={20} /></div>
            <h3>Knowledge is power</h3>
            <p>Understand what each phase means and how to care for yourself through it.</p>
            <Link to="/learn" className="text-link">Explore the learning space <ArrowUpRight size={14} /></Link>
          </Card>
        </div>
      </div>

      <Card className="prediction-card">
        <SectionTitle title="Looking ahead" hint="Estimates improve as you record more cycles." action={<Link to="/calendar" className="text-link">View calendar <ChevronRight size={15} /></Link>} />
        {p?.upcoming?.length ? (
          <div className="upcoming-strip">
            {p.upcoming.slice(0, 4).map((u) => (
              <div className="upcoming-item" key={u.start}>
                <span className="upcoming-dot" />
                <div><small>Predicted period {u.cycleNumber}</small><strong>{formatDate(u.start, { month: 'short', day: 'numeric' })}</strong><span>Fertile {shortDate(u.fertileStart)} – {shortDate(u.fertileEnd)}</span></div>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No predictions yet" description="Log your first period on the calendar to get personalised estimates." action={<Link to="/calendar" className="btn btn-primary btn-small">Go to calendar</Link>} />}
        <div className="estimate-note"><CircleHelp size={15} /> Predictions are estimates based on your own recorded dates, not medical certainty or contraception advice.</div>
      </Card>
    </div>
  );
}
