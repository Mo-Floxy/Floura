import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, CalendarRange, ShieldCheck, KeyRound, Download, Trash2, MailCheck, Check, LockKeyhole } from 'lucide-react';
import { api, downloadFile } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Alert, Card, Field, Modal, PageHeader, SectionTitle, Spinner } from '../components/ui';

export default function SettingsPage() {
  const { user, settings, updateProfile, updateSettings, refreshUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: user?.name || '', dateOfBirth: user?.dateOfBirth || '' });
  const [cycle, setCycle] = useState({ cycleLength: settings?.cycleLength || 28, periodDuration: settings?.periodDuration || 5, useManualCycleLength: settings?.useManualCycleLength || false, waterGoal: settings?.waterGoal || 8 });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [resendResult, setResendResult] = useState<{ devToken?: string } | null>(null);

  useEffect(() => { if (user) setProfile({ name: user.name, dateOfBirth: user.dateOfBirth || '' }); }, [user]);
  useEffect(() => { if (settings) setCycle({ cycleLength: settings.cycleLength, periodDuration: settings.periodDuration, useManualCycleLength: settings.useManualCycleLength, waterGoal: settings.waterGoal }); }, [settings]);

  const saveProfile = async () => {
    setBusy(true);
    try { await updateProfile({ name: profile.name, dateOfBirth: profile.dateOfBirth || null }); toast('Profile updated.'); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const saveCycle = async () => {
    setBusy(true);
    try { await updateSettings(cycle); toast('Cycle preferences saved.'); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const changeTheme = async (value: 'light' | 'dark' | 'system') => {
    setTheme(value);
    try { await api.patch('/user/cycle-settings', { theme: value }); }
    catch { /* local theme still applies */ }
  };

  const changePassword = async () => {
    if (passwords.newPassword !== passwords.confirm) { toast('New passwords do not match.', 'error'); return; }
    setBusy(true);
    try {
      await api.post('/user/change-password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Password changed successfully.');
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const setPrivacy = async (patch: Record<string, boolean>) => {
    try { await api.patch('/user/privacy', patch); await refreshUser(); toast('Privacy preference saved.'); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const verify = async () => {
    try {
      await api.post('/auth/verify-email', { token: verifyToken });
      await refreshUser(); setVerifyToken(''); toast('Email verified. Thank you!');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const resend = async () => {
    try { const result = await api.post<{ message: string; devToken?: string }>('/auth/resend-verification'); setResendResult(result); toast(result.message, 'info'); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const exportData = async () => {
    try { await downloadFile('/user/export', `floura-my-data-${new Date().toISOString().slice(0, 10)}.json`); toast('Your data export is downloading.'); }
    catch (e) { toast((e as Error).message, 'error'); }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await api.delete('/user/account', { password: deletePassword });
      toast('Your account and data have been permanently deleted.', 'info');
      setDeleteOpen(false); await logout(); navigate('/login', { replace: true });
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  if (!user || !settings) return <Spinner label="Loading settings…" />;

  return (
    <div className="page settings-page">
      <PageHeader eyebrow="Your account" title="Settings" subtitle="Manage your profile, predictions, privacy and data — all in one place." />

      {!user.emailVerified && (
        <Card className="verify-banner">
          <MailCheck size={22} />
          <div><strong>Verify your email</strong><p>A verification link was sent when you signed up. In demo mode, use the token below or request a new one.</p>
            {resendResult?.devToken && <code>{resendResult.devToken}</code>}
            <div className="verify-actions"><input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="Paste verification token" /><button className="btn btn-primary btn-small" onClick={verify}>Verify</button><button className="btn btn-ghost btn-small" onClick={resend}>Resend link</button></div>
          </div>
        </Card>
      )}

      <div className="settings-layout">
        <div className="settings-main">
          <Card>
            <SectionTitle title="Personal information" hint="Only you can see this information." />
            <div className="form-grid">
              <Field label="Full name"><div className="input-with-icon"><UserRound size={17} /><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div></Field>
              <Field label="Email address"><div className="input-with-icon"><MailCheck size={17} /><input value={user.email} disabled /></div></Field>
              <Field label="Date of birth (optional)"><input type="date" value={profile.dateOfBirth} onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })} /></Field>
              <Field label="Member since"><input value={new Date(user.createdAt.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} disabled /></Field>
            </div>
            <button className="btn btn-primary btn-small" onClick={saveProfile} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
          </Card>

          <Card>
            <SectionTitle title="Cycle preferences" hint="Defaults are used until your own history provides personal averages." />
            <div className="form-grid">
              <Field label="Typical cycle length" hint="Days from one period start to the next"><div className="input-with-icon"><CalendarRange size={17} /><input type="number" min={15} max={90} value={cycle.cycleLength} onChange={(e) => setCycle({ ...cycle, cycleLength: Number(e.target.value) })} /></div></Field>
              <Field label="Typical period duration"><input type="number" min={1} max={15} value={cycle.periodDuration} onChange={(e) => setCycle({ ...cycle, periodDuration: Number(e.target.value) })} /></Field>
              <Field label="Daily water goal (glasses)"><input type="number" min={1} max={30} value={cycle.waterGoal} onChange={(e) => setCycle({ ...cycle, waterGoal: Number(e.target.value) })} /></Field>
              <div className="switch-field"><span>Use my manual cycle length</span><label className="checkbox"><input type="checkbox" checked={cycle.useManualCycleLength} onChange={(e) => setCycle({ ...cycle, useManualCycleLength: e.target.checked })} /><span>Override history-based prediction</span></label></div>
            </div>
            <button className="btn btn-primary btn-small" onClick={saveCycle} disabled={busy}>Save cycle preferences</button>
            <p className="field-hint spaced">Your personal averages are calculated automatically from recorded cycles and shown on your dashboard.</p>
          </Card>

          <Card>
            <SectionTitle title="Appearance" />
            <div className="theme-options">
              {[{ key: 'light', label: 'Light', emoji: '☀️' }, { key: 'dark', label: 'Dark', emoji: '🌙' }, { key: 'system', label: 'System', emoji: '🖥️' }].map((option) => (
                <button key={option.key} className={`theme-option ${theme === option.key ? 'active' : ''}`} onClick={() => changeTheme(option.key as 'light' | 'dark' | 'system')}>
                  <span>{option.emoji}</span><strong>{option.label}</strong>{theme === option.key && <Check size={15} />}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Security" hint="Keep your private space protected." />
            <div className="form-stack narrow">
              <Field label="Current password"><div className="input-with-icon"><LockKeyhole size={17} /><input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} /></div></Field>
              <Field label="New password" hint="At least 8 characters including uppercase, lowercase and a number."><div className="input-with-icon"><KeyRound size={17} /><input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} /></div></Field>
              <Field label="Confirm new password"><input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} /></Field>
              <button className="btn btn-soft btn-small" onClick={changePassword} disabled={busy || !passwords.currentPassword || !passwords.newPassword}>Change password</button>
            </div>
          </Card>
        </div>

        <div className="settings-side">
          <Card>
            <SectionTitle title="Privacy" hint="You are in control." />
            <div className="privacy-list">
              <div><div><strong>Discreet notifications</strong><p>General wording unless you opt in to details.</p></div><button className="text-link" onClick={() => navigate('/reminders')}>Manage</button></div>
              <div><div><strong>Visible profile</strong><p>{settings.profileVisible ? 'On' : 'Off'} — your account stays private either way.</p></div><input type="checkbox" checked={settings.profileVisible} onChange={(e) => setPrivacy({ profileVisible: e.target.checked })} /></div>
              <div><div><strong>Research opt-in</strong><p>{settings.researchOptIn ? 'You opted in to anonymous research.' : 'No data is used for research.'}</p></div><input type="checkbox" checked={settings.researchOptIn} onChange={(e) => setPrivacy({ researchOptIn: e.target.checked })} /></div>
              <div><div><strong>Health data consent</strong><p>{user.consentHealthData ? 'You consented to secure storage of your health data.' : 'No health data consent recorded.'}</p></div><input type="checkbox" checked={user.consentHealthData} onChange={(e) => setPrivacy({ consentHealthData: e.target.checked })} /></div>
            </div>
          </Card>

          <Card>
            <SectionTitle title="Your data" hint="Take it with you, or remove it completely." />
            <button className="data-action" onClick={exportData}><span className="data-icon"><Download size={18} /></span><div><strong>Download personal data</strong><p>Export all your records as a JSON file.</p></div></button>
            <button className="data-action danger" onClick={() => setDeleteOpen(true)}><span className="data-icon"><Trash2 size={18} /></span><div><strong>Delete account</strong><p>Permanently erase your account and all health data.</p></div></button>
          </Card>

          <Card className="commitment-card">
            <ShieldCheck size={24} />
            <h3>Our privacy commitment</h3>
            <p>Your health records belong to you. They are stored in a private account, never exposed through public endpoints, never sold and never shared with third parties for advertising.</p>
          </Card>
        </div>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account permanently"
        footer={<><button className="btn btn-ghost" onClick={() => setDeleteOpen(false)}>Cancel</button><button className="btn btn-danger" onClick={deleteAccount} disabled={busy || !deletePassword}>{busy ? 'Deleting…' : 'Yes, delete everything'}</button></>}>
        <div className="form-stack">
          <Alert tone="warning">This cannot be undone. All period dates, symptoms, moods, wellness logs and preferences will be permanently erased.</Alert>
          <Field label="Confirm with your password"><div className="input-with-icon"><LockKeyhole size={17} /><input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} /></div></Field>
        </div>
      </Modal>
    </div>
  );
}
