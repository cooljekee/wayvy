// EmptyState.jsx — Brand-aligned empty-state pattern.

function EmptyState({ kind = 'routes', dark, action, onAction }) {
  const variants = {
    routes: {
      title: 'Пока ни одного маршрута',
      body: 'Запиши первую прогулку — она появится здесь, на карте и у твоих друзей.',
      illo: <EmptyIlloRoute/>,
    },
    events: {
      title: 'Ничего на этой неделе',
      body: 'Подпишись на людей или создай первое событие — оно будет видно подписчикам.',
      illo: <EmptyIlloEvent/>,
    },
    friends: {
      title: 'Пока ни на кого не подписан',
      body: 'Найди друзей по нику — увидишь их маршруты и события на своей карте.',
      illo: <EmptyIlloFriends/>,
    },
  };
  const v = variants[kind] || variants.routes;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      padding: '32px 32px 24px', gap: 14, color: dark ? '#F4F6FA' : '#0E1116',
    }}>
      <div style={{
        width: 96, height: 96, borderRadius: 28,
        background: dark ? 'rgba(255,90,78,0.10)' : 'rgba(255,90,78,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {v.illo}
      </div>
      <h3 style={{ margin: 0, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em' }}>{v.title}</h3>
      <p style={{ margin: 0, fontFamily: 'Manrope', fontWeight: 500, fontSize: 14, color: dark ? '#8A93A4' : '#5B6577', lineHeight: 1.45, maxWidth: 280 }}>{v.body}</p>
      {action && (
        <button onClick={onAction} style={{
          marginTop: 6,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 14, border: 'none',
          background: '#FF5A4E', color: '#fff',
          boxShadow: '0 4px 14px rgba(255,90,78,0.36), 0 1px 0 rgba(255,255,255,.18) inset',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>{action}</button>
      )}
    </div>
  );
}

function EmptyIlloRoute() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
      <path d="M14 50 C 20 38, 30 38, 36 30 S 50 18, 52 12" stroke="#FF5A4E" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 5"/>
      <circle cx="14" cy="50" r="5.5" fill="#FF5A4E"/>
      <path d="M52 12 L48 18 L56 18 Z" fill="#FF5A4E"/>
    </svg>
  );
}
function EmptyIlloEvent() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
      <rect x="10" y="14" width="44" height="42" rx="8" stroke="#FF5A4E" strokeWidth="3"/>
      <path d="M10 26 L54 26" stroke="#FF5A4E" strokeWidth="3"/>
      <path d="M22 8 L22 18 M42 8 L42 18" stroke="#FF5A4E" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="22" cy="40" r="3.2" fill="#FF5A4E"/>
      <circle cx="32" cy="40" r="3.2" fill="#FF5A4E" opacity=".4"/>
      <circle cx="42" cy="40" r="3.2" fill="#FF5A4E" opacity=".4"/>
    </svg>
  );
}
function EmptyIlloFriends() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
      <circle cx="24" cy="22" r="8" stroke="#FF5A4E" strokeWidth="3"/>
      <path d="M10 50 C 10 40, 17 36, 24 36 C 31 36, 38 40, 38 50" stroke="#FF5A4E" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="44" cy="26" r="6" stroke="#FF5A4E" strokeWidth="3" opacity=".4"/>
      <path d="M36 46 C 36 40, 44 38, 50 38 C 54 38, 58 40, 58 46" stroke="#FF5A4E" strokeWidth="3" strokeLinecap="round" opacity=".4"/>
    </svg>
  );
}

Object.assign(window, { EmptyState, EmptyIlloRoute, EmptyIlloEvent, EmptyIlloFriends });
