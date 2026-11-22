import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Flower2, LockKeyhole, Mail, UserRound, Eye, EyeOff, ShieldCheck, Sparkles, CalendarHeart, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Field, InlineSpinner, Spinner } from '../components/ui';

function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="auth-shell">
      <aside className="auth-art">
        <Link to="/login" className="brand brand-light"><span className="brand-mark"><Flower2 size={22} /></span><span className="brand-name">FLOURA<span className="brand-dot">.</span></span></Link>
        <div className="auth-art-content">
          <div className="auth-orbit" aria-hidden="true">
            <div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" />
            <div className="orbit-core"><Flower2 size={44} strokeWidth={1.2} /></div>
            <span className="orbit-dot dot-a" /><span className="orbit-dot dot-b" /><span className="orbit-dot dot-c" />
          </div>
          <h2>Your cycle,<br /><em>beautifully understood.</em></h2>
          <p>A calm, private space to track your periods, symptoms and moods — and discover the patterns that make you, you.</p>
          <div className="auth-features">
            <span><Sparkles size={16} /> Personalised predictions</span>
            <span><CalendarHeart size={16} /> Beautiful cycle calendar</span>
            <span><ShieldCheck size={16} /> Your data stays yours</span>
          </div>
        </div>
        <div className="auth-art-foot">A gentle reminder: every body is different. This is your space to learn yours.</div>
      </aside>
      <main className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><Flower2 size={22} /> FLOURA</div>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder = 'Enter your password', id = 'password' }: { value: string; onChange: (v: string) => void; placeholder?: string; id?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-with-icon">
      <LockKeyhole size={17} />
      <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required autoComplete={id === 'current-password' ? 'current-password' : 'new-password'} />
      <button type="button" className="input-affix" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const result = await login(email, password);
      toast(result.message || 'Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your journey with FLOURA.">
      <form onSubmit={submit} className="auth-form">
        {error && <Alert tone="warning">{error}</Alert>}
        <Field label="Email address"><div className="input-with-icon"><Mail size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" /></div></Field>
        <Field label="Password"><PasswordInput value={password} onChange={setPassword} /></Field>
        <div className="form-row-between"><label className="checkbox"><input type="checkbox" id="remember" defaultChecked /><span>Keep me signed in</span></label><Link to="/forgot-password" className="text-link">Forgot password?</Link></div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? <InlineSpinner label="Signing in…" /> : <>Sign in <ArrowRight size={18} /></>}</button>
      </form>
      <p className="auth-switch">New to FLOURA? <Link to="/register">Create an account</Link></p>
      <div className="auth-privacy"><ShieldCheck size={16} /> Your health information is private and never shared.</div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', dateOfBirth: '', consent: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase and a number.'); return;
    }
    if (!form.consent) { setError('Please agree to the health data consent to continue.'); return; }
    setBusy(true);
    try {
      const result = await register({ ...form, dateOfBirth: form.dateOfBirth || undefined });
      toast(result.message || 'Welcome to FLOURA!');
      if (result.devToken) navigate(`/verify-email?token=${result.devToken}&new=1`, { replace: true });
      else navigate('/dashboard', { replace: true });
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your space" subtitle="A few details and your private wellness journey begins.">
      <form onSubmit={submit} className="auth-form">
        {error && <Alert tone="warning">{error}</Alert>}
        <Field label="Your name"><div className="input-with-icon"><UserRound size={17} /><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Ava Morgan" required minLength={2} /></div></Field>
        <Field label="Email address"><div className="input-with-icon"><Mail size={17} /><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" required /></div></Field>
        <Field label="Password" hint="At least 8 characters, with an uppercase letter, lowercase letter and number."><PasswordInput value={form.password} onChange={(v) => set('password', v)} /></Field>
        <Field label="Date of birth (optional)"><div className="input-with-icon"><CalendarHeart size={17} /><input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></div></Field>
        <label className="consent-box">
          <input type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} />
          <span>I consent to FLOURA storing my health information securely in my private account. I can export or permanently delete it at any time.</span>
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? <InlineSpinner label="Creating account…" /> : <>Create account <ArrowRight size={18} /></>}</button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const { verifyEmail, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const token = params.get('token');
  const [state, setState] = useState<'loading' | 'done' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? 'Verifying your email…' : 'This verification link is missing its token.');
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    verifyEmail(token).then(() => {
      setState('done'); setMessage('Your email is verified. Welcome to FLOURA!');
      toast('Your email is verified.', 'success');
    }).catch((e) => { setState('error'); setMessage(e.message); });
  }, [token]);

  return (
    <AuthShell title="Email verification" subtitle="One last step to keep your account secure.">
      <div className="auth-message">
        {state === 'loading' ? <Spinner label={message} /> : state === 'done' ? <CheckCircle2 size={48} className="success-icon" /> : <Mail size={44} className="muted-icon" />}
        <h3>{state === 'done' ? 'You’re all set' : state === 'loading' ? 'Just a moment' : 'Verification incomplete'}</h3>
        <p>{message}</p>
        {state !== 'loading' && <button className="btn btn-primary" onClick={() => navigate(user ? '/dashboard' : '/login')}>Continue to FLOURA <ArrowRight size={17} /></button>}
        {state === 'error' && <p className="auth-help">You can request a fresh link from your account settings.</p>}
      </div>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ message?: string; devToken?: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const result = await forgotPassword(email);
      setSent(result); toast(result.message || 'Check your email.', 'info');
    } catch (err) { toast((err as Error).message, 'error'); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Reset your password" subtitle="We’ll help you get back into your account.">
      {sent ? (
        <div className="auth-message">
          <Mail size={44} className="success-icon" /><h3>Check your inbox</h3><p>{sent.message}</p>
          {sent.devToken && <Alert tone="info">Demo mode: no email service is configured. <Link to={`/reset-password?token=${sent.devToken}`}>Use this reset link</Link>.</Alert>}
          <Link to="/login" className="btn btn-ghost"><ArrowLeft size={16} /> Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="auth-form">
          <Field label="Email address"><div className="input-with-icon"><Mail size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></div></Field>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? <InlineSpinner label="Sending…" /> : 'Send reset link'}</button>
          <Link to="/login" className="btn btn-ghost btn-block"><ArrowLeft size={16} /> Back to sign in</Link>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!token) { setError('This reset link is missing its token.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const result = await resetPassword(token, password);
      toast(result.message || 'Password updated.'); navigate('/login', { replace: true });
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Choose a new password" subtitle="Make it strong and unique to your FLOURA account.">
      <form onSubmit={submit} className="auth-form">
        {error && <Alert tone="warning">{error}</Alert>}
        <Field label="New password" hint="At least 8 characters, with uppercase, lowercase and a number."><PasswordInput value={password} onChange={setPassword} id="new-password" placeholder="New password" /></Field>
        <Field label="Confirm new password"><PasswordInput value={confirm} onChange={setConfirm} id="confirm-password" placeholder="Confirm password" /></Field>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? <InlineSpinner label="Updating…" /> : 'Update password'}</button>
      </form>
    </AuthShell>
  );
}
