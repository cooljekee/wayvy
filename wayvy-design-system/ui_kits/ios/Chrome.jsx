// Chrome.jsx — Floating UI primitives that overlay the map.

function GlassPanel({ children, dark, radius = 24, style = {}, ...rest }) {
  const isDark = dark;
  return (
    <div {...rest} style={{
      background: isDark ? 'rgba(22, 25, 31, 0.78)' : 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(14,17,22,0.06)',
      borderRadius: radius,
      boxShadow: isDark
        ? '0 16px 36px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.30)'
        : '0 12px 28px rgba(14,17,22,0.10), 0 2px 6px rgba(14,17,22,0.05)',
      color: isDark ? '#F4F6FA' : '#0E1116',
      ...style,
    }}>{children}</div>
  );
}

// Top search pill
function SearchPill({ dark, onClick }) {
  return (
    <GlassPanel dark={dark} radius={999} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px 12px 14px',
      cursor: 'pointer', height: 46, boxSizing: 'border-box',
    }} onClick={onClick}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#8A93A4' : '#5B6577'} strokeWidth="2.2">
        <circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>
      </svg>
      <span style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 15, color: dark ? '#C5CBD6' : '#5B6577' }}>
        Найти место или человека
      </span>
    </GlassPanel>
  );
}

// Right-side floating control stack (locate, layers)
function ControlStack({ dark }) {
  const ic = (path) => (
    <GlassPanel dark={dark} radius={14} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dark ? '#F4F6FA' : '#0E1116'} strokeWidth="2">
        {path}
      </svg>
    </GlassPanel>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ic(<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8" strokeWidth="2"/></>)}
      {ic(<><polygon points="12,2 22,8 12,14 2,8"/><polyline points="2,12 12,18 22,12"/><polyline points="2,16 12,22 22,16"/></>)}
    </div>
  );
}

// Visibility filter chips above the map
function FilterChips({ dark, value = 'all', onChange = () => {} }) {
  const items = [
    { key: 'all',     label: 'Все' },
    { key: 'own',     label: 'Мои',     dot: '#FF5A4E' },
    { key: 'friends', label: 'Друзья',  dot: '#14B8C7' },
    { key: 'events',  label: 'События', dot: '#F4B740' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {items.map(it => {
        const active = value === it.key;
        return (
          <button key={it.key} onClick={() => onChange(it.key)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: active
              ? (dark ? '#F4F6FA' : '#0E1116')
              : (dark ? 'rgba(22,25,31,0.78)' : 'rgba(255,255,255,0.82)'),
            color: active
              ? (dark ? '#0E1116' : '#FFFFFF')
              : (dark ? '#F4F6FA' : '#0E1116'),
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(14,17,22,0.06)',
            padding: '8px 12px',
            borderRadius: 999, fontFamily: 'Manrope', fontWeight: 700, fontSize: 13,
            boxShadow: '0 4px 12px rgba(14,17,22,.10)',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {it.dot && <span style={{ width: 8, height: 8, borderRadius: 999, background: it.dot }}/>}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// Floating record FAB
function RecordFAB({ onClick, label = 'Записать' }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 22px 14px 18px',
      background: '#FF5A4E', color: '#FFFFFF', border: 'none', borderRadius: 999,
      fontFamily: 'Manrope', fontWeight: 700, fontSize: 16, letterSpacing: '-0.005em',
      boxShadow: '0 6px 18px rgba(255,90,78,0.42), 0 1px 0 rgba(255,255,255,.2) inset',
      cursor: 'pointer',
    }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#FF5A4E' }}/>
      </span>
      {label}
    </button>
  );
}

// Tab bar (floating, glass, dark- and light-mode aware)
function TabBar({ active = 'map', dark, onChange = () => {} }) {
  const items = [
    { key: 'map',     label: 'Карта',    icon: (s) => <><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" stroke={s} strokeWidth="2.2"/><path d="M9 4v14M15 6v14" stroke={s} strokeWidth="2.2"/></> },
    { key: 'record',  label: 'Запись',   icon: (s) => <><circle cx="12" cy="12" r="9" stroke={s} strokeWidth="2.2"/><circle cx="12" cy="12" r="3.5" fill={s}/></> },
    { key: 'events',  label: 'События',  icon: (s) => <><rect x="3" y="5" width="18" height="16" rx="3" stroke={s} strokeWidth="2.2"/><path d="M3 9h18M8 3v4M16 3v4" stroke={s} strokeWidth="2.2"/></> },
    { key: 'profile', label: 'Профиль',  icon: (s) => <><circle cx="12" cy="8" r="4" stroke={s} strokeWidth="2.2"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke={s} strokeWidth="2.2"/></> },
  ];
  return (
    <GlassPanel dark={dark} radius={24} style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: 8, gap: 4,
    }}>
      {items.map(it => {
        const isActive = active === it.key;
        const c = isActive ? '#FF5A4E' : (dark ? '#8A93A4' : '#5B6577');
        return (
          <button key={it.key} onClick={() => onChange(it.key)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '8px 0', border: 'none', borderRadius: 16, cursor: 'pointer',
            background: isActive ? 'rgba(255, 90, 78, 0.14)' : 'transparent',
            color: c, fontFamily: 'Manrope', fontWeight: 700, fontSize: 10,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{it.icon(c)}</svg>
            {it.label}
          </button>
        );
      })}
    </GlassPanel>
  );
}

Object.assign(window, { GlassPanel, SearchPill, ControlStack, FilterChips, RecordFAB, TabBar });
