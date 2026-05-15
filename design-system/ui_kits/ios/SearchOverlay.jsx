// SearchOverlay.jsx — Полноэкранный поиск.
// Две вкладки: «Маршруты» (тыкаешь — открывается RouteDetail)
//              «Люди» (тыкаешь — открывается профиль)

const SEARCH_PEOPLE = [
  { id: 'anya',   name: 'Аня Соколова',  handle: '@anya',     meta: '42 маршрута · Москва', avatar: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)' },
  { id: 'dima',   name: 'Дима Климовский', handle: '@dima_k', meta: '28 маршрутов · Москва', avatar: 'linear-gradient(135deg,#7ADBE2,#14B8C7)' },
  { id: 'liza',   name: 'Лиза Бар',       handle: '@liza',    meta: '15 маршрутов · СПб',    avatar: 'linear-gradient(135deg,#FCE3A8,#F4B740)' },
  { id: 'kostya', name: 'Костя',          handle: '@kostya',  meta: '12 маршрутов · Тбилиси', avatar: 'linear-gradient(135deg,#B9ECF0,#0A9CA9)' },
  { id: 'masha',  name: 'Маша Кутья',     handle: '@mash',    meta: '8 маршрутов · Москва',  avatar: 'linear-gradient(135deg,#C5CBD6,#5B6577)' },
];

const SEARCH_ROUTES = [
  { id: 1, title: 'Покровка → Чистые пруды',  author: 'Аня',   when: 'вчера',    distance: '3,4', duration: '42:18', city: 'Москва · 3 точки',  visibility: 'public',    poly: 'M10,110 C30,90 60,80 70,55 S100,40 118,18', avatar: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)' },
  { id: 2, title: 'Васька → Стрелка',         author: 'Аня',   when: '3 мая',    distance: '5,8', duration: '1:08',  city: 'СПб · 6 точек',     visibility: 'public',    poly: 'M10,80 C30,30 60,90 70,40 S100,90 118,30',  avatar: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)' },
  { id: 3, title: 'Парк Горького утром',      author: 'Дима',  when: 'суббота',  distance: '6,1', duration: '1:18',  city: 'Москва · 5 точек',  visibility: 'public',    poly: 'M10,40 C30,55 50,100 70,80 S100,100 118,60', avatar: 'linear-gradient(135deg,#7ADBE2,#14B8C7)' },
  { id: 4, title: 'Старый Тбилиси',           author: 'Костя', when: '27 апреля', distance: '8,2', duration: '2:14',  city: 'Тбилиси · 12 точек', visibility: 'public',    poly: 'M10,30 C30,80 60,40 70,90 S100,40 118,90',  avatar: 'linear-gradient(135deg,#B9ECF0,#0A9CA9)' },
  { id: 5, title: 'Бульварное кольцо',        author: 'Маша',  when: '11 мая',   distance: '4,7', duration: '58:02', city: 'Москва · 8 точек',  visibility: 'followers', poly: 'M14,70 C30,30 60,100 75,60 S100,30 118,80',  avatar: 'linear-gradient(135deg,#C5CBD6,#5B6577)' },
  { id: 6, title: 'Дворы у Спаса',            author: 'Аня',   when: 'вчера',    distance: '2,8', duration: '38:14', city: 'СПб · 6 точек',     visibility: 'public',    poly: 'M10,40 C30,55 50,100 70,80 S100,100 118,60', avatar: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)' },
];

function SearchOverlay({ dark, onClose, onTapRoute, onTapPerson }) {
  const [tab, setTab] = React.useState('routes');
  const [q, setQ] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    // autofocus
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const lower = q.trim().toLowerCase();
  const filteredPeople = lower
    ? SEARCH_PEOPLE.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.handle.toLowerCase().includes(lower))
    : SEARCH_PEOPLE;
  const filteredRoutes = lower
    ? SEARCH_ROUTES.filter(r =>
        r.title.toLowerCase().includes(lower) ||
        r.author.toLowerCase().includes(lower) ||
        r.city.toLowerCase().includes(lower))
    : SEARCH_ROUTES;

  const fg  = dark ? '#F4F6FA' : '#0E1116';
  const fg2 = dark ? '#8A93A4' : '#5B6577';
  const bg  = dark ? '#0B0D11' : '#F4F6FA';
  const surface = dark ? '#16191F' : '#FFFFFF';

  return (
    <div style={{
      position: 'absolute', inset: 0, background: bg, color: fg, zIndex: 60,
      display: 'flex', flexDirection: 'column',
      animation: 'wv-fade-in 220ms ease-out',
    }}>
      {/* HEADER WITH INPUT */}
      <div style={{ padding: '62px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 14,
          background: dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(14,17,22,0.06)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: fg2, flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>
          </svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={tab === 'routes' ? 'Маршрут, автор, город' : 'Имя или @ник'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'Manrope', fontWeight: 500, fontSize: 15, color: fg,
            }}/>
          {q && (
            <button onClick={() => setQ('')} style={{
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0,
              color: fg2,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9 9l6 6M9 15l6-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, color: '#FF5A4E', padding: 0,
        }}>Отмена</button>
      </div>

      {/* SEGMENT */}
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{
          display: 'flex', gap: 4, padding: 4, borderRadius: 12,
          background: dark ? 'rgba(255,255,255,0.04)' : '#EDF0F5',
        }}>
          <SOSegmentBtn label={`Маршруты · ${filteredRoutes.length}`} active={tab === 'routes'} dark={dark} onClick={() => setTab('routes')}/>
          <SOSegmentBtn label={`Люди · ${filteredPeople.length}`}     active={tab === 'people'} dark={dark} onClick={() => setTab('people')}/>
        </div>
      </div>

      {/* RESULTS */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>
        {tab === 'routes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!lower && (
              <div style={{
                fontFamily: 'Manrope', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: fg2, padding: '6px 4px',
              }}>Популярное у твоих подписок</div>
            )}
            {filteredRoutes.length === 0 ? (
              <SOEmpty dark={dark} text="Ничего не нашлось"/>
            ) : filteredRoutes.map(r => (
              <div key={r.id} onClick={() => onTapRoute && onTapRoute(r)} style={{ cursor: 'pointer' }}>
                <RouteCard dark={dark} mine={false}
                  author={r.author} when={r.when} avatar={r.avatar}
                  title={r.title} city={r.city} visibility={r.visibility}
                  distance={r.distance} duration={r.duration}
                  poly={r.poly}/>
              </div>
            ))}
          </div>
        )}

        {tab === 'people' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!lower && (
              <div style={{
                fontFamily: 'Manrope', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: fg2, padding: '6px 4px 4px',
              }}>Может быть знаком</div>
            )}
            {filteredPeople.length === 0 ? (
              <SOEmpty dark={dark} text="Ничего не нашлось"/>
            ) : filteredPeople.map(p => (
              <div key={p.id} onClick={() => onTapPerson && onTapPerson(p)} style={{ cursor: 'pointer' }}>
                <FollowRow dark={dark}
                  name={p.name} handle={p.handle} meta={p.meta}
                  avatar={p.avatar} state="default"/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SOSegmentBtn({ label, active, dark, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
      background: active ? (dark ? '#16191F' : '#FFFFFF') : 'transparent',
      color: active ? (dark ? '#F4F6FA' : '#0E1116') : (dark ? '#8A93A4' : '#5B6577'),
      fontFamily: 'Manrope', fontWeight: 700, fontSize: 12.5,
      boxShadow: active ? (dark ? '0 1px 0 rgba(255,255,255,0.06) inset, 0 2px 6px rgba(0,0,0,0.32)' : '0 1px 0 rgba(255,255,255,1) inset, 0 1px 4px rgba(14,17,22,0.10)') : 'none',
      transition: 'all 140ms cubic-bezier(.16,1,.3,1)',
    }}>{label}</button>
  );
}

function SOEmpty({ dark, text }) {
  return (
    <div style={{
      padding: '40px 20px', textAlign: 'center',
      fontFamily: 'Manrope', fontWeight: 500, fontSize: 13,
      color: dark ? '#8A93A4' : '#5B6577',
    }}>{text}</div>
  );
}

Object.assign(window, { SearchOverlay });
