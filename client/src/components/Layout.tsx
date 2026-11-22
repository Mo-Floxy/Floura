import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, HeartPulse, Smile, Droplets, ChartNoAxesCombined,
  BookOpen, Bell, Settings as SettingsIcon, Moon, Sun, Menu, X, Flower2, ChevronRight, LogOut, ShieldCheck,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import type { Notification } from '../types';
import { formatDate, todayISO } from '../utils';
import { Spinner } from './ui';

const NAV_GROUPS = [
  {
    label: 'YOUR CYCLE',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/calendar', label: 'Cycle calendar', icon: CalendarDays },
      { to: '/symptoms', label: 'Symptoms', icon: HeartPulse },
      { to: '/moods', label: 'Mood tracker', icon: Smile },
    ],
  },
  {
    label: 'WELLBEING',
    items: [
      { to: '/wellness', label: 'Wellness', icon: Droplets },
      { to: '/insights', label: 'Insights & reports', icon: ChartNoAxesCombined },
    ],
  },
  {
    label: 'SUPPORT',
    items: [
      { to: '/learn', label: 'Learn', icon: BookOpen },
      { to: '/reminders', label: 'Reminders', icon: Bell },
      { to: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard', calendar: 'Cycle calendar', symptoms: 'Symptom tracker', moods: 'Mood tracker',
  wellness: 'Wellness', insights: 'Insights & reports', learn: 'Learn', reminders: 'Reminders', settings: 'Settings',
};

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <NavLink to="/dashboard" className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark"><Flower2 size={22} strokeWidth={1.8} /></span>
      <span className="brand-name">FLOURA<span className="brand-dot">.</span></span>
    </NavLink>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggle } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  return (
    <div className="sidebar-inner">
      <Brand />
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onNavigate}>
                  <Icon size={19} strokeWidth={1.8} />
                  <span>{item.label}</span>
                  <ChevronRight size={14} className="nav-chevron" />
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="theme-switch" onClick={toggle} aria-label="Toggle dark mode">
          {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          <span>{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          <span className={`mini-switch ${resolvedTheme === 'dark' ? 'on' : ''}`}><i /></span>
        </button>
        <div className="sidebar-user">
          <div className="avatar">{user?.name?.charAt(0).toUpperCase() || 'F'}</div>
          <div className="sidebar-user-info">
            <strong>{user?.name || 'Your account'}</strong>
            <span>Private space</span>
          </div>
          <button className="icon-button" title="Sign out" onClick={async () => { await logout(); navigate('/login'); toast('You have been signed out.', 'info'); }}>
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const page = TITLES[location.pathname.split('/')[1]] || 'FLOURA';

  useEffect(() => { if (!loading && !user) navigate('/login', { replace: true }); }, [user, loading, navigate]);

  const loadNotifications = async () => {
    try {
      const last = localStorage.getItem('floura-reminder-refresh');
      if (last !== todayISO()) {
        await api.post('/reminders/refresh');
        localStorage.setItem('floura-reminder-refresh', todayISO());
      }
      const data = await api.get<{ notifications: Notification[] }>('/reminders');
      setNotifications(data.notifications);
    } catch { /* non-critical */ }
  };

  useEffect(() => { if (user) loadNotifications(); }, [user]);

  const unread = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);
  const markAll = async () => {
    try {
      await api.post('/reminders/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      toast('All caught up.', 'info');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  if (loading) return <div className="full-loader"><Spinner label="Opening your private space…" /></div>;
  if (!user) return null;

  return (
    <div className="app-shell">
      <aside className="sidebar"><SidebarContent /></aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-only" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={22} /></button>
            <div>
              <div className="topbar-date">{formatDate(todayISO(), { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              <div className="topbar-title">{page}</div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="privacy-pill"><ShieldCheck size={14} /> Private & secure</span>
            <div className="notification-wrap">
              <button className="icon-button bell-button" onClick={() => setShowNotifications((v) => !v)} aria-label="Notifications">
                <Bell size={20} />{unread > 0 && <span className="badge">{unread}</span>}
              </button>
              {showNotifications && (
                <>
                  <div className="popover-scrim" onClick={() => setShowNotifications(false)} />
                  <div className="notification-panel">
                    <div className="panel-head"><h3>Notifications</h3>{unread > 0 && <button onClick={markAll}>Mark all read</button>}</div>
                    {notifications.length === 0 ? (
                      <p className="panel-empty">No notifications yet. Set up reminders to see gentle nudges here.</p>
                    ) : notifications.slice(0, 8).map((n) => (
                      <div key={n.id} className={`notification-item ${n.is_read ? '' : 'unread'}`}>
                        <div className="notification-dot" />
                        <div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at.replace(' ', 'T')).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></div>
                      </div>
                    ))}
                    <button className="panel-link" onClick={() => { setShowNotifications(false); navigate('/reminders'); }}>Manage reminders →</button>
                  </div>
                </>
              )}
            </div>
            <NavLink to="/settings" className="avatar avatar-button" title="Your profile">{user.name.charAt(0).toUpperCase()}</NavLink>
          </div>
        </header>

        <main className="content"><Outlet /></main>
        <footer className="app-footer">
          <span>FLOURA · made for your wellbeing</span>
          <span>Estimates are guidance, not medical advice.</span>
        </footer>
      </div>

      <nav className="mobile-nav">
        {[NAV_GROUPS[0].items[0], NAV_GROUPS[0].items[1], NAV_GROUPS[0].items[2], NAV_GROUPS[1].items[0]].map((item) => {
          const Icon = item.icon;
          return <NavLink key={item.to} to={item.to} className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}><Icon size={20} /><span>{item.label.split(' ')[0]}</span></NavLink>;
        })}
        <button className="mobile-nav-item" onClick={() => setMobileMenu(true)}><Menu size={20} /><span>More</span></button>
      </nav>

      {mobileMenu && (
        <div className="drawer-backdrop" onClick={() => setMobileMenu(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head"><Brand compact /><button className="icon-button" onClick={() => setMobileMenu(false)}><X size={20} /></button></div>
            <SidebarContent onNavigate={() => setMobileMenu(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
