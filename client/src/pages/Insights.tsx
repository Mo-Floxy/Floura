import { useEffect, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Download, CalendarRange, Activity, HeartPulse, Smile, Droplet, Droplets, Moon, Footprints, CircleHelp, FileText } from 'lucide-react';
import { api, downloadFile } from '../api';
import type { InsightData } from '../types';
import { MOOD_OPTIONS } from '../constants';
import { formatDate } from '../utils';
import { useToast } from '../context/ToastContext';
import { Alert, Card, EmptyState, PageHeader, SectionTitle, Spinner, StatCard } from '../components/ui';

const RANGES = [{ key: 'week', label: 'Weekly' }, { key: 'month', label: 'Monthly' }, { key: 'year', label: 'Yearly' }, { key: 'all', label: 'All time' }];
const PIE_COLORS = ['#D98BA6', '#B9A3D6', '#8FC2A6', '#E9B44C', '#C79BC7', '#8CA8C9', '#E08B78', '#A78B8B'];

export default function InsightsPage() {
  const { toast } = useToast();
  const [range, setRange] = useState('month');
  const [data, setData] = useState<InsightData | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    api.get<InsightData>(`/insights?range=${range}`).then((d) => { if (!cancelled) setData(d); })
      .catch((e) => toast((e as Error).message, 'error'));
    return () => { cancelled = true; };
  }, [range, toast]);

  const exportPdf = async () => {
    setExporting(true);
    try {
      await downloadFile(`/insights/export/pdf?range=${range}`, `floura-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast('Your PDF report is downloading.');
    } catch (e) { toast((e as Error).message, 'error'); } finally { setExporting(false); }
  };

  if (!data) return <Spinner label="Putting your insights together…" />;
  const { kpis } = data;
  const hasCycles = data.cycleTrend.length > 0;
  const hasSymptoms = data.symptomFrequency.length > 0;
  const hasMoods = data.moodFrequency.length > 0;

  return (
    <div className="page insights-page">
      <PageHeader eyebrow="Understand your patterns" title="Insights & reports" subtitle={`A closer look at your cycle and wellbeing · ${formatDate(data.from, { month: 'short', day: 'numeric' })} – ${formatDate(data.to, { month: 'short', day: 'numeric' })}`}
        actions={<button className="btn btn-primary btn-small" onClick={exportPdf} disabled={exporting}><Download size={16} /> {exporting ? 'Preparing…' : 'Export PDF'}</button>} />

      <div className="segmented range-segmented">
        {RANGES.map((r) => <button key={r.key} className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)}><CalendarRange size={14} /> {r.label}</button>)}
      </div>

      <div className="stat-grid four">
        <StatCard label="Average cycle" value={`${kpis.avgCycleLength} days`} sub={`${kpis.cycleCount} cycles recorded`} icon={<Activity size={18} />} tone="rose" />
        <StatCard label="Period duration" value={`${kpis.avgPeriodDuration} days`} sub={`${kpis.periodCount} periods recorded`} icon={<Droplet size={18} />} tone="lavender" />
        <StatCard label="Regularity" value={kpis.regularity} sub={kpis.regularityScore !== null ? `${kpis.regularityScore}/100 consistency` : 'Log more cycles'} icon={<HeartPulse size={18} />} tone="plum" />
        <StatCard label="Days logged" value={kpis.loggedDays} sub={`Prediction confidence ${kpis.predictionConfidence}%`} icon={<Smile size={18} />} tone="cream" />
      </div>

      <div className="insight-charts">
        <Card>
          <SectionTitle title="Cycle length trend" hint="Your recorded cycle lengths over time." />
          {hasCycles ? <div className="chart-box"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.cycleTrend} margin={{ top: 10, right: 18, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis domain={['dataMin - 3', 'dataMax + 3']} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="length" name="Cycle (days)" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer></div> : <EmptyState title="No cycle trend yet" description="Record at least two periods to see your cycle lengths." />}
        </Card>

        <Card>
          <SectionTitle title="Period duration trend" hint="How many days each period lasted." />
          {data.durationTrend.length ? <div className="chart-box"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.durationTrend} margin={{ top: 10, right: 18, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--hover)' }} />
              <Bar dataKey="days" name="Days" fill="var(--primary-soft)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div> : <EmptyState title="No duration data yet" description="Add an end date to your periods to see this chart." />}
        </Card>

        <Card>
          <SectionTitle title="Symptom frequency" hint="What you have logged most often." />
          {hasSymptoms ? <div className="chart-box"><ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.symptomFrequency.slice(0, 8)} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={78} paddingAngle={3} stroke="none">
                {data.symptomFrequency.slice(0, 8).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
            <div className="pie-legend">{data.symptomFrequency.slice(0, 8).map((s, i) => <span key={s.name}><i style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{s.name}</span>)}</div>
          </div> : <EmptyState title="No symptom data" description="Log symptoms to discover your most common patterns." />}
        </Card>

        <Card>
          <SectionTitle title="Mood patterns" hint="How often each mood appeared." />
          {hasMoods ? <div className="chart-box"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.moodFrequency} layout="vertical" margin={{ top: 8, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--hover)' }} />
              <Bar dataKey="count" name="Days" radius={[0, 8, 8, 0]}>
                {data.moodFrequency.map((m) => <Cell key={m.name} fill={MOOD_OPTIONS.find((x) => x.name === m.name)?.color || 'var(--primary-soft)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer></div> : <EmptyState title="No mood data" description="Your mood patterns will appear as you log them." />}
        </Card>
      </div>

      <Card>
        <SectionTitle title="Wellbeing over time" hint="Symptoms, moods, water and movement across the selected period." />
        <div className="chart-box tall"><ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.buckets} margin={{ top: 10, right: 18, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8CA8C9" stopOpacity={0.5} /><stop offset="100%" stopColor="#8CA8C9" stopOpacity={0.02} /></linearGradient>
              <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D98BA6" stopOpacity={0.45} /><stop offset="100%" stopColor="#D98BA6" stopOpacity={0.02} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="water" name="Water (glasses)" stroke="#8CA8C9" strokeWidth={2} fill="url(#waterFill)" />
            <Area type="monotone" dataKey="moods" name="Mood entries" stroke="#D98BA6" strokeWidth={2} fill="url(#moodFill)" />
            <Area type="monotone" dataKey="symptoms" name="Symptom entries" stroke="#B9A3D6" strokeWidth={2} fill="transparent" />
          </AreaChart>
        </ResponsiveContainer></div>
      </Card>

      <div className="insight-bottom">
        <Card>
          <SectionTitle title="Period history" hint="Your most recent recorded cycles." />
          {data.periodHistory.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Start</th><th>End</th><th>Duration</th></tr></thead><tbody>
            {data.periodHistory.slice().reverse().map((p) => <tr key={p.startDate}><td>{formatDate(p.startDate, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>{p.endDate ? formatDate(p.endDate, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'}</td><td>{p.days ? `${p.days} days` : '—'}</td></tr>)}
          </tbody></table></div> : <EmptyState title="No period history yet" />}
        </Card>
        <Card>
          <SectionTitle title="Personal statistics" hint="A snapshot of your recorded data." />
          <div className="personal-stats">
            <div><span>Shortest cycle</span><strong>{kpis.shortestCycle ? `${kpis.shortestCycle} days` : '—'}</strong></div>
            <div><span>Longest cycle</span><strong>{kpis.longestCycle ? `${kpis.longestCycle} days` : '—'}</strong></div>
            <div><span>Avg. water</span><strong><Droplets size={15} /> {kpis.avgWater} glasses</strong></div>
            <div><span>Avg. sleep</span><strong><Moon size={15} /> {kpis.avgSleep} h</strong></div>
            <div><span>Avg. movement</span><strong><Footprints size={15} /> {kpis.avgExercise} min</strong></div>
            <div><span>Prediction confidence</span><strong>{kpis.predictionConfidence}%</strong></div>
          </div>
        </Card>
      </div>

      <Alert tone="info"><CircleHelp size={16} /> <span><strong>About these insights.</strong> Everything here is calculated from what you have recorded. Estimates are not medical advice, diagnosis, or contraception guidance. Your data is never sold or shared. <FileText size={13} /> Download your PDF report any time.</span></Alert>
    </div>
  );
}

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 12, boxShadow: 'var(--shadow)' };
