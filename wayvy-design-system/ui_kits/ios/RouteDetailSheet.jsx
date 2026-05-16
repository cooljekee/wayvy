// RouteDetailSheet.jsx — Bottom sheet preview/details for a tapped route.

function RouteDetailSheet({ dark, onClose, route }) {
  const r = route || {
    title: 'Покровка → Чистые пруды',
    city: 'Москва · 3 точки',
    author: 'Аня Соколова',
    handle: '@anya',
    avatar: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)',
    when: '2 часа назад',
    distance: '3,4',
    duration: '42:18',
    pace: '4,9',
    elev: '+12',
    visibility: 'public',
    poly: 'M10,110 C30,90 60,80 70,55 S100,40 118,18',
    waypoints: [
      { name: 'Самокатная кофейня', cat: 'Кофейня · Покровка, 27', photo: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)' },
      { name: 'Бар «Чайка»',         cat: 'Бар · Покровка, 16',    photo: 'linear-gradient(135deg,#7ADBE2,#14B8C7)' },
      { name: 'Лавка на Хохловке',   cat: 'Магазин · Хохловка, 5', photo: 'linear-gradient(135deg,#FCE3A8,#F4B740)' },
    ],
    likes: 12, comments: 3,
  };

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: dark ? '#16191F' : '#FFFFFF',
      color: dark ? '#F4F6FA' : '#0E1116',
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: '8px 0 22px',
      boxShadow: dark ? '0 -16px 40px rgba(0,0,0,0.65)' : '0 -8px 32px rgba(14,17,22,0.18)',
      maxHeight: '88%', overflowY: 'auto',
      zIndex: 41,
    }}>
      <div style={{ width: 36, height: 5, borderRadius: 999,
                     background: dark ? 'rgba(255,255,255,0.22)' : 'rgba(14,17,22,0.18)',
                     margin: '6px auto 14px' }}/>

      {/* Map preview header */}
      <div style={{ margin: '0 16px', borderRadius: 18, overflow: 'hidden', position: 'relative' }}>
        <PolylinePreview d={r.poly} color="#FF5A4E" width="100%" height={160} dark={dark} viewBox="0 0 128 128"/>
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <VisibilityBadge kind={r.visibility} dark={dark}/>
        </div>
        <button onClick={onClose} style={{
          position: 'absolute', top: 10, right: 10,
          width: 32, height: 32, borderRadius: 999, border: 'none',
          background: 'rgba(11,13,17,0.6)', backdropFilter: 'blur(8px)',
          color: '#F4F6FA', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M6 18 18 6"/></svg>
        </button>
      </div>

      {/* Title block */}
      <div style={{ padding: '14px 20px 0' }}>
        <h2 style={{ margin: 0, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em' }}>{r.title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: r.avatar }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13 }}>{r.author}</div>
            <div style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 11, color: dark ? '#8A93A4' : '#5B6577' }}>{r.handle} · {r.when}</div>
          </div>
          <button style={{
            background: '#FF5A4E', color: '#fff',
            padding: '7px 14px', borderRadius: 999, border: 'none',
            fontFamily: 'Manrope', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}>Подписаться</button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
        margin: '14px 16px 0',
        background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(14,17,22,0.06)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        <MetricCell value={r.distance} unit="км" label="дистанция" dark={dark}/>
        <MetricCell value={r.duration} unit="" label="время" dark={dark}/>
        <MetricCell value={r.pace} unit="км/ч" label="темп" dark={dark}/>
        <MetricCell value={r.elev} unit="м" label="подъём" dark={dark}/>
      </div>

      {/* Waypoints */}
      <div style={{ padding: '16px 20px 0' }}>
        <SectionHeader dark={dark}>Точки маршрута</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
          {r.waypoints.map((w, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: i < r.waypoints.length - 1 ? `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(14,17,22,0.06)'}` : 'none',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                background: 'transparent', color: '#FF5A4E',
                border: '2px solid #FF5A4E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Manrope', fontWeight: 800, fontSize: 11,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 14,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                <div style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 12, color: dark ? '#8A93A4' : '#5B6577',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.cat}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: w.photo, flexShrink: 0 }}/>
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        display: 'flex', gap: 8, padding: '16px 16px 0',
      }}>
        <ActionPill dark={dark} icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        }>{r.likes}</ActionPill>
        <ActionPill dark={dark} icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        }>{r.comments}</ActionPill>
        <ActionPill dark={dark} icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
        }>Поделиться</ActionPill>
      </div>
    </div>
  );
}

function MetricCell({ value, unit, label, dark }) {
  return (
    <div style={{
      background: dark ? '#16191F' : '#FFFFFF',
      padding: '10px 8px', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'Bricolage Grotesque', fontWeight: 700,
        fontSize: 20, lineHeight: 1, letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
        color: dark ? '#F4F6FA' : '#0E1116',
      }}>
        {value}<span style={{ fontSize: 12, color: dark ? '#8A93A4' : '#5B6577', fontWeight: 600, marginLeft: 2 }}>{unit}</span>
      </div>
      <div style={{
        fontFamily: 'Manrope', fontWeight: 500, fontSize: 10,
        color: dark ? '#8A93A4' : '#5B6577', marginTop: 4,
      }}>{label}</div>
    </div>
  );
}

function ActionPill({ icon, children, dark }) {
  return (
    <button style={{
      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '11px', borderRadius: 14, border: 'none',
      background: dark ? 'rgba(255,255,255,0.06)' : '#F4F6FA',
      color: dark ? '#F4F6FA' : '#0E1116',
      fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, cursor: 'pointer',
    }}>
      {icon}
      {children}
    </button>
  );
}

Object.assign(window, { RouteDetailSheet, MetricCell, ActionPill });
