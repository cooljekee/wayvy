// Cards.jsx — RouteCard, EventCard, FollowRow, VisibilityBadge

function VisibilityBadge({ kind = 'public', dark, size = 'sm' }) {
  const map = {
    public:    { label: 'Публичный',   bg: 'rgba(45,191,107,0.16)',  fg: dark ? '#7AD2A2' : '#1F8A4A',
                 icon: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>},
    followers: { label: 'Подписчики',  bg: 'rgba(20,184,199,0.18)', fg: dark ? '#7ADBE2' : '#0A7F8A',
                 icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>},
    private:   { label: 'Приватный',    bg: dark ? 'rgba(255,255,255,0.10)' : 'rgba(91,101,119,0.16)',
                 fg: dark ? '#C5CBD6' : '#3A4150',
                 icon: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>},
  };
  const v = map[kind] || map.public;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '3px 9px' : '5px 11px',
      borderRadius: 999, background: v.bg, color: v.fg,
      fontFamily: 'Manrope', fontWeight: 700, fontSize: size === 'sm' ? 10 : 11,
      letterSpacing: '0.01em',
    }}>
      <svg width={size === 'sm' ? 10 : 12} height={size === 'sm' ? 10 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">{v.icon}</svg>
      {v.label}
    </span>
  );
}

function PolylinePreview({ d, color = '#FF5A4E', width = 168, height = 110, dark, viewBox }) {
  const bg = dark
    ? 'radial-gradient(circle at 30% 40%, #2A2F3A 0 1px, transparent 1.5px), radial-gradient(circle at 70% 70%, #2A2F3A 0 1px, transparent 1.5px), linear-gradient(180deg, #1A1D24 0%, #14171D 100%)'
    : 'radial-gradient(circle at 30% 40%, #DDE2EA 0 1px, transparent 1.5px), radial-gradient(circle at 70% 70%, #DDE2EA 0 1px, transparent 1.5px), linear-gradient(180deg, #ECEEF2 0%, #E2E6EC 100%)';
  // Default viewBox matches the historical poly path coord space (168×110); callers
  // can override when their path uses a different coordinate space.
  const vb = viewBox || '0 0 168 110';
  return (
    <div style={{ width, height, background: bg, position: 'relative', borderRadius: 'inherit', overflow: 'hidden' }}>
      <svg viewBox={vb} preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: 'block' }}>
        <path d={d} stroke={color} strokeOpacity="0.3" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d={d} stroke={color} strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function RouteCard({ author, avatar, when, title, city, distance, duration, pace, visibility = 'public', poly, dark, mine = true }) {
  const accent = mine ? '#FF5A4E' : '#14B8C7';
  return (
    <div style={{
      background: dark ? '#16191F' : '#FFFFFF',
      border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(14,17,22,0.06)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: dark ? '0 6px 14px rgba(0,0,0,0.4)' : '0 4px 12px rgba(14,17,22,0.06)',
      display: 'grid', gridTemplateColumns: '128px 1fr',
      color: dark ? '#F4F6FA' : '#0E1116',
    }}>
      <div style={{ position: 'relative' }}>
        <PolylinePreview d={poly} color={accent} width={128} height={128} dark={dark} viewBox="0 0 128 128"/>
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <VisibilityBadge kind={visibility} dark={dark}/>
        </div>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 999, background: avatar, flexShrink: 0 }}/>
          <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 12, color: dark ? '#C5CBD6' : '#3A4150',
                         overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{author} · {when}</span>
        </div>
        <div style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 12, color: dark ? '#8A93A4' : '#5B6577',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city}</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 'auto', paddingTop: 4 }}>
          <Metric value={distance} label="км" dark={dark}/>
          <Metric value={duration} label="время" dark={dark}/>
          {pace && <Metric value={pace} label="км/ч" dark={dark}/>}
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label, dark }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <span style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 16,
                     fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
                     color: dark ? '#F4F6FA' : '#0E1116' }}>{value}</span>
      <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 9,
                     letterSpacing: '0.05em', textTransform: 'uppercase',
                     whiteSpace: 'nowrap',
                     color: dark ? '#8A93A4' : '#5B6577' }}>{label}</span>
    </div>
  );
}

function EventCard({ month, day, title, time, place, attendees = [], extra = 0, visibility = 'followers', dark, going = false, onToggle }) {
  return (
    <div style={{
      background: dark ? '#16191F' : '#FFFFFF',
      border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(14,17,22,0.06)',
      borderRadius: 20, padding: 14,
      boxShadow: dark ? '0 6px 14px rgba(0,0,0,0.4)' : '0 4px 12px rgba(14,17,22,0.06)',
      display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 14, alignItems: 'center',
      color: dark ? '#F4F6FA' : '#0E1116',
    }}>
      <div style={{
        background: dark ? '#0B0D11' : '#0E1116',
        border: dark ? '1px solid rgba(255,255,255,0.08)' : 'none',
        borderRadius: 14, padding: '6px 0', textAlign: 'center',
        boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset',
      }}>
        <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 10, color: '#8A93A4', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{month}</div>
        <div style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 22, color: '#FF5A4E', lineHeight: 1, marginTop: 2, letterSpacing: '-0.02em' }}>{day}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 12, color: dark ? '#8A93A4' : '#5B6577',
                      marginTop: 2, display: 'flex', alignItems: 'center', gap: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          {time} · {place}
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <VisibilityBadge kind={visibility} dark={dark}/>
          {attendees.length > 0 && <AvatarStack avatars={attendees} extra={extra} dark={dark}/>}
        </div>
      </div>
      <button onClick={onToggle} style={{
        background: going ? 'transparent' : '#FF5A4E',
        color: going ? '#FF5A4E' : '#fff',
        border: going ? '1.5px solid #FF5A4E' : 'none',
        padding: '7px 14px', borderRadius: 12,
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>{going ? 'Иду ✓' : 'Иду'}</button>
    </div>
  );
}

function AvatarStack({ avatars, extra = 0, dark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
      {avatars.slice(0, 3).map((a, i) => (
        <div key={i} style={{
          width: 22, height: 22, borderRadius: 999, background: a,
          border: `2px solid ${dark ? '#16191F' : '#FFFFFF'}`,
          marginLeft: i === 0 ? 0 : -8, flexShrink: 0,
        }}/>
      ))}
      {extra > 0 && <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 11,
                                    color: dark ? '#8A93A4' : '#5B6577', marginLeft: 6,
                                    whiteSpace: 'nowrap' }}>+{extra}</span>}
    </div>
  );
}

function FollowRow({ name, handle, avatar, state = 'default', meta, dark, onClick }) {
  const styles = {
    default:   { bg: dark ? '#F4F6FA' : '#0E1116', fg: dark ? '#0E1116' : '#FFFFFF', label: 'Подписаться', border: 'transparent' },
    following: { bg: 'transparent', fg: dark ? '#F4F6FA' : '#0E1116',  label: 'Подписан ✓', border: dark ? 'rgba(255,255,255,0.16)' : 'rgba(14,17,22,0.14)' },
    requested: { bg: dark ? 'rgba(255,255,255,0.08)' : '#EDF0F5', fg: dark ? '#8A93A4' : '#5B6577', label: 'Запрошено', border: 'transparent' },
    back:      { bg: 'rgba(255,90,78,0.14)', fg: '#C2331F', label: 'Подписаться в ответ', border: 'transparent' },
  };
  const s = styles[state] || styles.default;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', color: dark ? '#F4F6FA' : '#0E1116' }}>
      <div style={{ width: 38, height: 38, borderRadius: 999, background: avatar, flexShrink: 0 }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 12, color: dark ? '#8A93A4' : '#5B6577' }}>{meta || handle}</div>
      </div>
      <button onClick={onClick} style={{
        background: s.bg, color: s.fg, border: `1.5px solid ${s.border}`,
        padding: '7px 14px', borderRadius: 999,
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>{s.label}</button>
    </div>
  );
}

Object.assign(window, { VisibilityBadge, PolylinePreview, RouteCard, EventCard, FollowRow, AvatarStack, Metric });
