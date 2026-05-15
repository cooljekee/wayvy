// Profile.jsx — Wayvy профиль v2.
// Поддерживает:
//   • own (свой профиль) — кнопки «Редактировать» + «Поделиться»
//   • friend (чужой) — кнопки «Подписаться» / «Сообщение»
//   • bio + локацию + ссылку-pill
//   • Сегмент-контрол: Маршруты · События · Точки · Подписки
//   • Sticky city-фильтр для маршрутов
//   • Tab-контент для каждой секции

const PROFILE_DATA = {
  own: {
    initial: 'Т',
    name: 'Ты',
    handle: '@me',
    city: 'Москва',
    bio: 'Хожу пешком везде. Архитектура 1920–1960. Кофе у окна, без молока.',
    link: 'kirillk.ru',
    stats: { routes: 42, following: 186, followers: 91, km: 312 },
    avatarBg: 'linear-gradient(135deg,#FFB1A4 0%, #FF5A4E 100%)',
  },
  anya: {
    initial: 'А',
    name: 'Аня Соколова',
    handle: '@anya',
    city: 'Москва · сейчас в Питере',
    bio: 'Гуляю и записываю. Любимое: каналы, дворы, фонари.',
    link: 'instagram.com/anya',
    stats: { routes: 38, following: 124, followers: 412, km: 256 },
    avatarBg: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)',
    relation: 'following', // following | requested | default | back
  },
};

// All routes (mixed cities). Used by both own & anya, just different copy.
const PROFILE_ROUTES = {
  own: [
    { id: 1, when: 'вчера',     title: 'Покровка → Чистые пруды',  city: 'Москва',  points: 3, distance: '3,4', duration: '42:18', pace: '4,9', visibility: 'public',    poly: 'M10,110 C30,90 60,80 70,55 S100,40 118,18' },
    { id: 2, when: 'суббота',   title: 'Парк Горького утром',       city: 'Москва',  points: 5, distance: '6,1', duration: '1:18', pace: '4,6', visibility: 'followers', poly: 'M10,40 C30,55 50,100 70,80 S100,100 118,60' },
    { id: 3, when: '11 мая',    title: 'Бульварное кольцо',          city: 'Москва',  points: 8, distance: '4,7', duration: '58:02', pace: '4,8', visibility: 'private',   poly: 'M14,70 C30,30 60,100 75,60 S100,30 118,80' },
    { id: 4, when: '3 мая',     title: 'Васька → Стрелка',          city: 'СПб',     points: 6, distance: '5,8', duration: '1:08', pace: '4,7', visibility: 'public',    poly: 'M10,80 C30,30 60,90 70,40 S100,90 118,30' },
    { id: 5, when: '27 апреля', title: 'Старый Тбилиси',             city: 'Тбилиси', points: 12, distance: '8,2', duration: '2:14', pace: '5,1', visibility: 'public',    poly: 'M10,30 C30,80 60,40 70,90 S100,40 118,90' },
  ],
  anya: [
    { id: 1, when: 'сегодня',   title: 'Петроградская сторона',     city: 'СПб',     points: 4, distance: '4,2', duration: '52:00', pace: '4,8', visibility: 'public',    poly: 'M10,80 C30,30 60,90 70,40 S100,90 118,30' },
    { id: 2, when: 'вчера',     title: 'Дворы у Спаса',               city: 'СПб',     points: 6, distance: '2,8', duration: '38:14', pace: '4,5', visibility: 'public',    poly: 'M10,40 C30,55 50,100 70,80 S100,100 118,60' },
    { id: 3, when: '14 мая',    title: 'Парк Горького утром',         city: 'Москва',  points: 5, distance: '6,1', duration: '1:18', pace: '4,6', visibility: 'public',    poly: 'M10,110 C30,90 60,80 70,55 S100,40 118,18' },
    { id: 4, when: '10 мая',    title: 'Бульварное кольцо',           city: 'Москва',  points: 8, distance: '4,7', duration: '58:02', pace: '4,8', visibility: 'followers', poly: 'M14,70 C30,30 60,100 75,60 S100,30 118,80' },
    { id: 5, when: '7 мая',     title: 'Васильевский остров',         city: 'СПб',     points: 7, distance: '5,2', duration: '1:02', pace: '4,9', visibility: 'public',    poly: 'M10,30 C30,80 60,40 70,90 S100,40 118,90' },
    { id: 6, when: '2 мая',     title: 'Замоскворечье',               city: 'Москва',  points: 4, distance: '3,8', duration: '46:00', pace: '4,7', visibility: 'public',    poly: 'M10,90 C30,40 60,80 70,50 S100,80 118,40' },
    { id: 7, when: '25 апреля', title: 'Хохловский · Маросейка',      city: 'Москва',  points: 6, distance: '2,9', duration: '34:11', pace: '4,4', visibility: 'public',    poly: 'M10,60 C30,90 60,30 70,70 S100,40 118,80' },
    { id: 8, when: '18 апреля', title: 'Старый Тбилиси',               city: 'Тбилиси', points: 12, distance: '8,2', duration: '2:14', pace: '5,1', visibility: 'public',    poly: 'M10,30 C30,80 60,40 70,90 S100,40 118,90' },
  ],
};

function ProfileScreenV2({ dark, onTapTab, who = 'own', onSwitchTo }) {
  const user = PROFILE_DATA[who];
  const isOwn = who === 'own';
  const [tab, setTab] = React.useState('routes');         // routes | events
  const [city, setCity] = React.useState('all');
  const [sort, setSort] = React.useState('recent');
  const [relation, setRelation] = React.useState(user.relation || 'default');

  const allRoutes = PROFILE_ROUTES[who] || [];
  const cityCounts = allRoutes.reduce((acc, r) => { acc[r.city] = (acc[r.city] || 0) + 1; return acc; }, {});
  const cities = [
    { k: 'all', label: 'Все', count: allRoutes.length },
    ...Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ k: c, label: c, count: n })),
  ];
  const visibleRoutes = city === 'all' ? allRoutes : allRoutes.filter(r => r.city === city);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: dark ? '#0B0D11' : '#F4F6FA',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* SCROLL CONTAINER */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        {/* HERO COVER ─────────────────────────────────────────── */}
        <ProfileHero dark={dark} user={user} isOwn={isOwn} onSwitchTo={onSwitchTo}/>

        {/* AVATAR + NAME row */}
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: -44, position: 'relative', zIndex: 2 }}>
          <div style={{
            width: 88, height: 88, borderRadius: 999,
            background: user.avatarBg,
            border: `4px solid ${dark ? '#0B0D11' : '#F4F6FA'}`,
            boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 32, color: '#fff', letterSpacing: '-0.02em',
            flexShrink: 0,
          }}>{user.initial}</div>
          <div style={{ flex: 1, paddingBottom: 6 }}>
            <h1 style={{ margin: 0, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em', color: dark ? '#F4F6FA' : '#0E1116' }}>{user.name}</h1>
            <div style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 13, color: dark ? '#8A93A4' : '#5B6577', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{user.handle}</span>
              <span style={{ width: 3, height: 3, borderRadius: 999, background: 'currentColor', opacity: .5 }}/>
              <span>{user.city}</span>
            </div>
          </div>
        </div>

        {/* BIO */}
        <div style={{ padding: '14px 20px 0' }}>
          <p style={{
            margin: 0, fontFamily: 'Manrope', fontWeight: 500, fontSize: 14, lineHeight: 1.45,
            color: dark ? '#D7DBE3' : '#2A3140', textWrap: 'pretty',
          }}>{user.bio}</p>
          {user.link && (
            <a href="#" onClick={(e) => e.preventDefault()} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
              fontFamily: 'Manrope', fontWeight: 700, fontSize: 12,
              color: '#FF5A4E', textDecoration: 'none',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07L11.7 5.27M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07L12.3 18.73"/>
              </svg>
              {user.link}
            </a>
          )}
        </div>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: '16px 20px 12px' }}>
          <ProfileStat value={user.stats.routes}    label="маршрутов" dark={dark}/>
          <ProfileStat value={user.stats.following} label="подписок"  dark={dark}/>
          <ProfileStat value={user.stats.followers} label={isOwn ? 'на тебя' : 'на неё'} dark={dark}/>
          <ProfileStat value={user.stats.km}        label="км пройдено" dark={dark}/>
        </div>

        {/* ACTIONS */}
        <div style={{ padding: '0 20px', display: 'flex', gap: 8 }}>
          {isOwn ? (
            <>
              <button style={btnSecondary(dark, { flex: 2 })}>Редактировать профиль</button>
              <button style={btnSecondary(dark, { flex: 1 })}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setRelation(relation === 'following' ? 'default' : 'following')}
                style={relation === 'following' ? btnSecondary(dark, { flex: 2 }) : btnPrimary({ flex: 2 })}>
                {relation === 'following' ? 'Подписан' : 'Подписаться'}
              </button>
              <button style={btnSecondary(dark, { flex: 1 })}>Сообщение</button>
            </>
          )}
        </div>

        {/* SEGMENT CONTROL */}
        <div style={{ padding: '20px 20px 0' }}>
          <ProfileSegment dark={dark} value={tab} onChange={setTab}/>
        </div>

        {/* CITY FILTER (sticky) — только для маршрутов */}
        {tab === 'routes' && (
          <ProfileCityFilter dark={dark} cities={cities} value={city} onChange={setCity}
            sort={sort} setSort={setSort}/>
        )}

        {/* TAB CONTENT */}
        <div style={{ padding: '8px 20px 0' }}>
          {tab === 'routes' && <ProfileRoutesList dark={dark} routes={visibleRoutes} city={city} who={who}/>}
          {tab === 'events' && <ProfileEventsList dark={dark} who={who}/>}
        </div>
      </div>

      {/* TAB BAR */}
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 24, zIndex: 10 }}>
        <TabBar active="profile" dark={dark} onChange={onTapTab}/>
      </div>
    </div>
  );
}

// ─── HERO COVER + PROFILE SWITCHER ──────────────────────────────────────────

function ProfileHero({ dark, user, isOwn, onSwitchTo }) {
  return (
    <div style={{
      height: 168, position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(150deg, #FF8876 0%, #FF5A4E 60%, #C2331F 100%)',
    }}>
      <svg viewBox="0 0 402 168" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: .18 }}>
        <path d="M-20 80 C 100 70, 160 110, 240 100 S 380 60, 440 78" stroke="#fff" strokeWidth="1.2" fill="none"/>
        <path d="M-20 100 C 100 90, 160 130, 240 120 S 380 80, 440 98" stroke="#fff" strokeWidth="1.2" fill="none"/>
        <path d="M-20 120 C 100 110, 160 150, 240 140 S 380 100, 440 118" stroke="#fff" strokeWidth="1.2" fill="none"/>
        <path d="M-20 140 C 100 130, 160 170, 240 160 S 380 120, 440 138" stroke="#fff" strokeWidth="1.2" fill="none"/>
      </svg>

      {/* top-right control */}
      <button style={{
        position: 'absolute', top: 62, right: 16,
        width: 38, height: 38, borderRadius: 999,
        background: 'rgba(255,255,255,0.18)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.20)',
        color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isOwn ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>
          </svg>
        )}
      </button>

      {/* dev: profile switcher pill (top-left) */}
      {onSwitchTo && (
        <button onClick={() => onSwitchTo(isOwn ? 'anya' : 'own')} style={{
          position: 'absolute', top: 62, left: 16,
          padding: '8px 12px', borderRadius: 999,
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(12px) saturate(140%)',
          WebkitBackdropFilter: 'blur(12px) saturate(140%)',
          border: '1px solid rgba(255,255,255,0.20)',
          color: '#fff', cursor: 'pointer',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 11.5,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M15 6l-6 6 6 6"/></svg>
          {isOwn ? 'Я' : '@anya'} · смена
        </button>
      )}
    </div>
  );
}

// ─── SEGMENT CONTROL ────────────────────────────────────────────────────────

function ProfileSegment({ dark, value, onChange }) {
  const items = [
    { k: 'routes', label: 'Маршруты' },
    { k: 'events', label: 'События'  },
  ];
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4, borderRadius: 12,
      background: dark ? 'rgba(255,255,255,0.04)' : '#EDF0F5',
    }}>
      {items.map(it => (
        <button key={it.k} onClick={() => onChange(it.k)} style={{
          flex: 1, padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
          background: value === it.k ? (dark ? '#16191F' : '#FFFFFF') : 'transparent',
          color: value === it.k ? (dark ? '#F4F6FA' : '#0E1116') : (dark ? '#8A93A4' : '#5B6577'),
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 12.5,
          boxShadow: value === it.k ? (dark ? '0 1px 0 rgba(255,255,255,0.06) inset, 0 2px 6px rgba(0,0,0,0.32)' : '0 1px 0 rgba(255,255,255,1) inset, 0 1px 4px rgba(14,17,22,0.10)') : 'none',
          transition: 'all 140ms cubic-bezier(.16,1,.3,1)',
        }}>{it.label}</button>
      ))}
    </div>
  );
}

// ─── CITY FILTER (sticky) ───────────────────────────────────────────────────

function ProfileCityFilter({ dark, cities, value, onChange, sort, setSort }) {
  const SORT_LABELS = { recent: 'Свежие', distance: 'Длинные', popular: 'Популярные' };
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 5,
      padding: '12px 20px 10px',
      background: dark ? 'rgba(11,13,17,0.94)' : 'rgba(244,246,250,0.94)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(14,17,22,0.04)'}`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', flex: 1,
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {cities.map(c => (
          <button key={c.k} onClick={() => onChange(c.k)} style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 11px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: value === c.k ? '#FF5A4E' : (dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'),
            color:      value === c.k ? '#fff'    : (dark ? '#F4F6FA' : '#0E1116'),
            fontFamily: 'Manrope', fontWeight: 700, fontSize: 12,
            border: value === c.k ? 'none' : (dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(14,17,22,0.04)'),
          }}>
            <span>{c.label}</span>
            <span style={{
              fontVariantNumeric: 'tabular-nums', fontSize: 10, opacity: value === c.k ? .85 : .55,
            }}>{c.count}</span>
          </button>
        ))}
      </div>
      <button style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
        padding: '6px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
        background: dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
        color: dark ? '#F4F6FA' : '#0E1116',
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 11.5,
        border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(14,17,22,0.04)',
      }}>
        {SORT_LABELS[sort]}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    </div>
  );
}

// ─── ROUTES LIST ────────────────────────────────────────────────────────────

function ProfileRoutesList({ dark, routes, city, who }) {
  if (routes.length === 0) {
    return <div style={{ padding: 30, textAlign: 'center', fontFamily: 'Manrope', fontWeight: 500, fontSize: 13, color: dark ? '#8A93A4' : '#5B6577' }}>
      Ничего по этому городу.
    </div>;
  }
  // Group by city if not filtered
  const grouped = city === 'all'
    ? Object.entries(routes.reduce((acc, r) => { (acc[r.city] = acc[r.city] || []).push(r); return acc; }, {}))
    : [[city, routes]];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10 }}>
      {grouped.map(([cityName, list]) => (
        <div key={cityName} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {city === 'all' && (
            <SectionHeader dark={dark}>{cityName} · {list.length}</SectionHeader>
          )}
          {list.map(r => (
            <RouteCard key={r.id}
              dark={dark} mine={who === 'own'}
              author={who === 'own' ? 'Я' : PROFILE_DATA[who].name.split(' ')[0]}
              avatar={PROFILE_DATA[who].avatarBg}
              when={r.when}
              title={r.title}
              city={`${r.city} · ${r.points} точек`}
              visibility={r.visibility}
              distance={r.distance} duration={r.duration} pace={r.pace}
              poly={r.poly}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── EVENTS LIST (профиль) ─────────────────────────────────────────────────

function ProfileEventsList({ dark, who }) {
  const isOwn = who === 'own';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10 }}>
      <SectionHeader dark={dark}>Будущие · 2</SectionHeader>
      <EventCard dark={dark}
        month="Май" day="18" title="Пикник в Парке Горького" time="18:00" place="Главный вход"
        visibility="followers"
        attendees={['linear-gradient(135deg,#FFB1A4,#FF5A4E)', 'linear-gradient(135deg,#7ADBE2,#14B8C7)', 'linear-gradient(135deg,#FCE3A8,#F4B740)']}
        extra={5}/>
      <EventCard dark={dark}
        month="Май" day="24" title="Закат на Стрелке" time="20:30" place="Биржевая площадь"
        visibility="public"
        attendees={['linear-gradient(135deg,#B9ECF0,#0A9CA9)']}
        extra={11}/>
      <SectionHeader dark={dark}>Прошедшие · 4</SectionHeader>
      <EventCard dark={dark}
        month="Май" day="04" title="Утренний забег по Воробьёвым" time="07:00" place="Метромост"
        visibility="public"
        attendees={['linear-gradient(135deg,#FFB1A4,#FF5A4E)', 'linear-gradient(135deg,#FCE3A8,#F4B740)']}
        extra={3}/>
      <EventCard dark={dark}
        month="Апр" day="27" title="Кофе и Хохловка" time="11:00" place="м. Китай-город"
        visibility="followers"
        attendees={['linear-gradient(135deg,#7ADBE2,#14B8C7)']}
        extra={6}/>
    </div>
  );
}

// ─── POINTS GRID (галерея cover-фото waypoint'ов) ──────────────────────────

function ProfilePointsGrid({ dark, city }) {
  const points = [
    { id: 1, bg: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)', cat: 'Кофе',      title: 'Самокатная' },
    { id: 2, bg: 'linear-gradient(135deg,#7ADBE2,#14B8C7)', cat: 'Вид',        title: 'Воробьёвы' },
    { id: 3, bg: 'linear-gradient(135deg,#FCE3A8,#F4B740)', cat: 'Граффити',   title: 'Винзавод' },
    { id: 4, bg: 'linear-gradient(135deg,#B9ECF0,#0A9CA9)', cat: 'Архитектура', title: 'Дом Мельникова' },
    { id: 5, bg: 'linear-gradient(135deg,#C5CBD6,#5B6577)', cat: 'Двор',       title: 'Хохловский' },
    { id: 6, bg: 'linear-gradient(135deg,#FFD9D2,#FF8876)', cat: 'Бар',        title: 'Чайка' },
  ];
  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
      }}>
        {points.map(p => (
          <div key={p.id} style={{
            position: 'relative', aspectRatio: '1', borderRadius: 8,
            background: p.bg, overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.55) 100%)',
            }}/>
            <div style={{
              position: 'absolute', top: 6, left: 6,
              padding: '2px 6px', borderRadius: 4,
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              fontFamily: 'Manrope', fontWeight: 700, fontSize: 9, letterSpacing: '.04em',
            }}>{p.cat}</div>
            <div style={{
              position: 'absolute', bottom: 6, left: 6, right: 6,
              fontFamily: 'Manrope', fontWeight: 700, fontSize: 11, color: '#fff',
              lineHeight: 1.2,
            }}>{p.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FOLLOWS LIST (компактно) ───────────────────────────────────────────────

function ProfileFollowsList({ dark }) {
  const [seg, setSeg] = React.useState('following');
  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button onClick={() => setSeg('following')} style={pillTab(dark, seg === 'following')}>Подписки · 186</button>
        <button onClick={() => setSeg('followers')} style={pillTab(dark, seg === 'followers')}>На тебя · 91</button>
      </div>
      <FollowRow dark={dark} name="Аня Соколова" handle="@anya" meta="@anya · 42 маршрута"
        avatar="linear-gradient(135deg,#FFB1A4,#FF5A4E)" state="following"/>
      <FollowRow dark={dark} name="Дима К." handle="@dima_k" meta="@dima_k · Москва"
        avatar="linear-gradient(135deg,#7ADBE2,#14B8C7)" state="following"/>
      <FollowRow dark={dark} name="Лиза Бар" handle="@liza" meta="@liza · 12 маршрутов"
        avatar="linear-gradient(135deg,#FCE3A8,#F4B740)" state="following"/>
      <FollowRow dark={dark} name="Костя" handle="@kostya" meta="@kostya · подписан на тебя"
        avatar="linear-gradient(135deg,#B9ECF0,#0A9CA9)" state="following"/>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function ProfileStat({ value, label, dark }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{
        fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 20,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
        color: dark ? '#F4F6FA' : '#0E1116',
      }}>{value}</span>
      <span style={{
        fontFamily: 'Manrope', fontWeight: 500, fontSize: 11, lineHeight: 1.2,
        color: dark ? '#8A93A4' : '#5B6577',
      }}>{label}</span>
    </div>
  );
}

function btnPrimary(extra = {}) {
  return {
    padding: '11px', borderRadius: 12, border: 'none',
    background: '#FF5A4E', color: '#fff',
    boxShadow: '0 4px 14px rgba(255,90,78,0.36), 0 1px 0 rgba(255,255,255,.18) inset',
    fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, cursor: 'pointer',
    ...extra,
  };
}

function btnSecondary(dark, extra = {}) {
  return {
    padding: '11px', borderRadius: 12,
    background: dark ? '#1F232C' : '#FFFFFF',
    color: dark ? '#F4F6FA' : '#0E1116',
    border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(14,17,22,0.06)',
    fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    ...extra,
  };
}

function pillTab(dark, active) {
  return {
    padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
    background: active ? '#FF5A4E' : (dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'),
    color:      active ? '#fff'    : (dark ? '#F4F6FA' : '#0E1116'),
    border: active ? 'none' : (dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(14,17,22,0.06)'),
    fontFamily: 'Manrope', fontWeight: 700, fontSize: 12,
  };
}

Object.assign(window, { ProfileScreenV2, PROFILE_DATA });
