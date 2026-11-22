import { useCallback, useEffect, useState } from 'react';
import {
  Bell, CalendarHeart, Sparkles, Flower2, Pill, Droplet, NotebookPen, ShieldCheck,
  Trash2, CheckCheck, BellRing, Globe, EyeOff, Clock3,
} from 'lucide-react';
import { api } from '../api';
import type { Notification, Reminder, Settings } from '../types';
import { REMINDER_META } from '../constants';
import { formatDate } from '../utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Card, EmptyState, PageHeader, SectionTitle, Spinner, Toggle } from '../components/ui';

const ICONS: Record<string, typeof Bell> = {
  calendar: CalendarHeart, sparkle: Sparkles, flower: Flower2,
  pill: Pill, droplet: Droplet, notebook: NotebookPen,
};

interface RemindersResponse {
  reminders: Reminder[];
  settings: { reminderTime: string; reminderDaysBefore: number; medicationName: string; sensitiveNotifications: boolean; browserNotifications: boolean };
  notifications: Notification[];
}

export default function RemindersPage() {
  const { settings, updateSettings } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<RemindersResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.get<RemindersResponse>('/reminders')); }
    catch (e) { toast((e as Error).message, 'error'); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const update = async (type: string, patch: Record<string, unknown>) => {
    try {
      const result = await api.patch<{ reminders: Reminder[] }>(`/reminders/${type}`, patch);
      setData((prev) => prev ? { ...prev, reminders: result.reminders } : prev);
      toast('Reminder settings saved.');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const togglePrivacy = async (field: 'sensitiveNotifications' | 'browserNotifications', value: boolean) => {
    if (field === 'browserNotifications' && value && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { toast('Browser notifications were not enabled. You can allow them in your browser settings.', 'info'); return; }
      new Notification('FLOURA reminders are on', { body: 'You will receive gentle nudges here.' });
    }
    try {
      await api.patch('/user/privacy', { [field]: value });
      await updateSettings({ [field]: value } as Partial<Settings>);
      await load();
      toast('Notification preference saved.');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const refresh = async () => {
    setRefreshing(true);
    try { const result = await api.post<{ message: string; notifications: Notification[] }>('/reminders/refresh'); setData((prev) => prev ? { ...prev, notifications: result.notifications } : prev); toast(result.message, 'info'); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setRefreshing(false); }
  };

  const markRead = async (id: number) => {
    try { await api.patch(`/reminders/notifications/${id}/read`); setData((prev) => prev ? { ...prev, notifications: prev.notifications.map((n) => n.id === id ? { ...n, is_read: 1 } : n) } : prev); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const deleteNotification = async (id: number) => {
    try { await api.delete(`/reminders/notifications/${id}`); setData((prev) => prev ? { ...prev, notifications: prev.notifications.filter((n) => n.id !== id) } : prev); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  if (!data) return <Spinner label="Loading your reminders…" />;
  const unread = data.notifications.filter((n) => !n.is_read).length;

  return (
    <div className="page reminders-page">
      <PageHeader eyebrow="Gentle nudges" title="Reminders" subtitle="Choose what you’d like to be reminded about — and how much detail appears."
        actions={<button className="btn btn-soft btn-small" onClick={refresh} disabled={refreshing}><BellRing size={16} /> {refreshing ? 'Checking…' : 'Check now'}</button>} />

      <Alert tone="info"><ShieldCheck size={16} /> By default, notification text stays general. Detailed cycle information is only shown if you explicitly enable it below.</Alert>

      <div className="reminders-layout">
        <div>
          <Card>
            <SectionTitle title="Your reminders" hint="Each one can be switched off independently." />
            <div className="reminder-list">
              {data.reminders.map((r) => {
                const meta = REMINDER_META[r.type] || { title: r.type, description: '', icon: 'bell' };
                const Icon = ICONS[meta.icon] || Bell;
                return (
                  <div className={`reminder-row ${r.enabled ? 'enabled' : ''}`} key={r.type}>
                    <span className="reminder-icon"><Icon size={19} /></span>
                    <div className="reminder-info"><strong>{meta.title}</strong><p>{meta.description}</p>
                      <div className="reminder-controls">
                        <label><Clock3 size={14} /> <input type="time" value={r.time} onChange={(e) => update(r.type, { time: e.target.value })} /></label>
                        {['period', 'ovulation', 'fertile'].includes(r.type) && <label>Days before <select value={r.days_before} onChange={(e) => update(r.type, { daysBefore: Number(e.target.value) })}>{[0, 1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d}</option>)}</select></label>}
                        {r.type === 'medication' && <label>Name <input className="inline-text" value={data.settings.medicationName || ''} onChange={(e) => setData((prev) => prev ? { ...prev, settings: { ...prev.settings, medicationName: e.target.value } } : prev)} onBlur={(e) => update('medication', { label: e.target.value })} placeholder="e.g. Vitamin D" /></label>}
                      </div>
                    </div>
                    <Toggle checked={Boolean(r.enabled)} onChange={(v) => update(r.type, { enabled: v })} label={`Toggle ${meta.title} reminder`} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Notification privacy & delivery" />
            <div className="privacy-toggle-row">
              <div className="privacy-toggle-icon"><EyeOff size={19} /></div>
              <div><strong>Show sensitive details</strong><p>Include cycle dates and specifics in notification text. Off means general, discreet wording.</p></div>
              <Toggle checked={data.settings.sensitiveNotifications} onChange={(v) => togglePrivacy('sensitiveNotifications', v)} label="Sensitive notification content" />
            </div>
            <div className="privacy-toggle-row">
              <div className="privacy-toggle-icon"><Globe size={19} /></div>
              <div><strong>Browser notifications</strong><p>Allow your browser to display gentle nudges even when FLOURA is in another tab.</p></div>
              <Toggle checked={data.settings.browserNotifications} onChange={(v) => togglePrivacy('browserNotifications', v)} label="Browser notifications" />
            </div>
          </Card>
        </div>

        <Card className="notification-inbox">
          <SectionTitle title={`Inbox${unread ? ` · ${unread} new` : ''}`} hint="Your gentle nudges appear here." />
          {data.notifications.length === 0 ? <EmptyState icon={<Bell size={22} />} title="No notifications yet" description="Turn on a reminder above and we’ll keep your nudges here." /> : (
            <div className="inbox-list">
              {data.notifications.map((n) => (
                <div className={`inbox-item ${n.is_read ? '' : 'unread'}`} key={n.id}>
                  <div className="inbox-icon"><Bell size={16} /></div>
                  <div className="inbox-content"><strong>{n.title}</strong><p>{n.body}</p><small>{formatDate(n.created_at.slice(0, 10), { month: 'short', day: 'numeric' })}</small></div>
                  <div className="inbox-actions">
                    {!n.is_read && <button className="icon-button tiny" title="Mark as read" onClick={() => markRead(n.id)}><CheckCheck size={15} /></button>}
                    <button className="icon-button tiny" title="Delete" onClick={() => deleteNotification(n.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
