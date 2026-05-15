// EventSheets.jsx — two surfaces for events:
//   • EventCreateSheet — bottom sheet to author a new event.
//   • EventDetailSheet — bottom sheet shown when an event pin is tapped on the map.
// Both follow Wayvy sheet patterns: top corners 28, drag grip, dark surface,
// coral primary CTA, visibility pill, AvatarStack for attendees.

// ─── EVENT CREATE SHEET ──────────────────────────────────────────────────────

function EventCreateSheet({ dark, onCancel, onSave, defaultPlace = 'м. Чистые пруды · Москва' }) {
  const [title, setTitle] = React.useState('Закат на Воробьёвых');
  const [desc, setDesc]   = React.useState('');
  const [day, setDay]     = React.useState({ d: 18, m: 'мая', wd: 'сб' });
  const [time, setTime]   = React.useState('20:42');
  const [place, setPlace] = React.useState(defaultPlace);
  const [vis, setVis]     = React.useState('followers'); // public | followers
  const [cover, setCover] = React.useState('linear-gradient(150deg,#FFB1A4 0%, #FF5A4E 55%, #C2331F 100%)');
  const [invited, setInvited] = React.useState([
    { id: 1, name: 'Аня',  bg: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)' },
    { id: 2, name: 'Дима', bg: 'linear-gradient(135deg,#7ADBE2,#14B8C7)' },
  ]);

  const fg     = dark ? '#F4F6FA' : '#0E1116';
  const fg2    = dark ? '#8A93A4' : '#5B6577';
  const surface= dark ? '#16191F' : '#FFFFFF';
  const tint   = dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC';
  const border = dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.10)';
  const canSave = title.trim().length > 0;

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 41,
      height: 'calc(100% - 64px)',
      background: surface, color: fg,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingTop: 8,
      boxShadow: dark ? '0 -16px 40px rgba(0,0,0,0.65)' : '0 -8px 32px rgba(14,17,22,0.18)',
      display: 'flex', flexDirection: 'column',
      animation: 'wv-sheet-up 320ms cubic-bezier(.16,1,.3,1)',
    }}>
      {/* GRIP */}
      <div style={{
        width: 36, height: 5, borderRadius: 999, flexShrink: 0,
        background: dark ? 'rgba(255,255,255,0.22)' : 'rgba(14,17,22,0.18)',
        margin: '6px auto 10px',
      }}/>

      {/* HEADER */}
      <div style={{ padding: '0 20px 8px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <h3 style={{ margin: 0, flex: 1, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em' }}>
          Новое событие
        </h3>
        <ECVisibilityPill value={vis} onChange={setVis} dark={dark}/>
        <button onClick={onCancel} aria-label="close" style={{
          width: 30, height: 30, borderRadius: 999, border: 'none',
          background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.06)',
          color: fg, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M6 18 18 6"/></svg>
        </button>
      </div>

      {/* SCROLLABLE BODY */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 0 16px' }}>
        {/* COVER */}
        <div style={{ padding: '0 20px', marginBottom: 14 }}>
          <div style={{
            position: 'relative', height: 124, borderRadius: 18, overflow: 'hidden',
            background: cover,
          }}>
            {/* date chip on cover, matches EventCard */}
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: '#0E1116',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '6px 10px 5px', textAlign: 'center', minWidth: 48,
              boxShadow: '0 4px 10px rgba(0,0,0,0.28)',
            }}>
              <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 9, color: '#8A93A4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{day.m}</div>
              <div style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 20, color: '#FF5A4E', lineHeight: 1, marginTop: 2, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {String(day.d).padStart(2, '0')}
              </div>
            </div>
            {/* swap cover button */}
            <button onClick={() => {
              const palette = [
                'linear-gradient(150deg,#FFB1A4 0%, #FF5A4E 55%, #C2331F 100%)',
                'linear-gradient(160deg,#B9ECF0 0%, #14B8C7 55%, #0A7F8A 100%)',
                'linear-gradient(170deg,#FCE3A8 0%, #F4B740 55%, #C97500 100%)',
                'linear-gradient(180deg,#2A2F3A 0%, #5B6577 50%, #FF8876 100%)',
              ];
              setCover(palette[(palette.indexOf(cover) + 1) % palette.length]);
            }} style={{
              position: 'absolute', top: 12, right: 12,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 999, border: 'none',
              background: 'rgba(11,13,17,0.55)', color: '#fff', backdropFilter: 'blur(8px)',
              cursor: 'pointer', fontFamily: 'Manrope', fontWeight: 700, fontSize: 11,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M8 5l2-2h4l2 2"/></svg>
              Обложка
            </button>
            {/* bottom shade for legibility if needed */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 50,
                           background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.32) 100%)' }}/>
          </div>
        </div>

        {/* TITLE */}
        <ECLabel dark={dark}>Название</ECLabel>
        <div style={{ padding: '0 20px', marginBottom: 14 }}>
          <ECInput value={title} onChange={setTitle} dark={dark} placeholder="Закат, забег, кофе…"/>
        </div>

        {/* WHEN — date + time chips */}
        <ECLabel dark={dark}>Когда</ECLabel>
        <div style={{ padding: '0 20px', marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ECChip dark={dark} active iconPath="M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8 3v4M16 3v4">
            {day.d} {day.m} · {day.wd}
          </ECChip>
          <ECChip dark={dark} active iconPath="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z">
            {time}
          </ECChip>
        </div>

        {/* PLACE — input + map preview with pin */}
        <ECLabel dark={dark}>Место</ECLabel>
        <div style={{ padding: '0 20px', marginBottom: 6 }}>
          <ECInput value={place} onChange={setPlace} dark={dark}
            iconPath="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
        </div>
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <ECMapPreview dark={dark}/>
        </div>

        {/* DESCRIPTION */}
        <ECLabel dark={dark}>Описание</ECLabel>
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <ECInput value={desc} onChange={setDesc} dark={dark} multiline rows={3}
            placeholder="Что будет? Что взять? Где встречаемся?"/>
        </div>

        {/* WHO — invited */}
        <ECLabel dark={dark}>Кого позвать</ECLabel>
        <div style={{ padding: '0 20px', display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {invited.map(c => (
            <div key={c.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px 4px 4px', borderRadius: 999,
              background: tint, border: `1px solid ${border}`,
            }}>
              <div style={{ width: 22, height: 22, borderRadius: 999, background: c.bg }}/>
              <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 13, color: fg }}>{c.name}</span>
              <button onClick={() => setInvited(invited.filter(x => x.id !== c.id))}
                style={{ background:'transparent', border:'none', cursor:'pointer', color: fg2, padding: 0, lineHeight: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M6 6l12 12M6 18 18 6"/></svg>
              </button>
            </div>
          ))}
          <button onClick={() => setInvited([...invited, { id: Date.now(), name: 'Лиза', bg: 'linear-gradient(135deg,#FCE3A8,#F4B740)' }])}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 999,
              background: 'transparent', border: `1.5px dashed ${border}`,
              color: fg2, cursor: 'pointer', fontFamily: 'Manrope', fontWeight: 600, fontSize: 13,
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
            Друга
          </button>
        </div>
        <div style={{ padding: '0 20px 18px', fontFamily: 'Manrope', fontWeight: 500, fontSize: 11, color: fg2, lineHeight: 1.4 }}>
          {vis === 'public'
            ? 'Видят все. Эти — получат уведомление.'
            : 'Видят только твои подписчики. Эти — получат уведомление.'}
        </div>
      </div>

      {/* ACTIONS */}
      <div style={{
        flexShrink: 0, padding: '12px 20px 22px',
        background: surface,
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(14,17,22,0.04)'}`,
        display: 'flex', gap: 10,
      }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '13px', borderRadius: 14, border: 'none',
          background: dark ? 'rgba(255,255,255,0.06)' : '#EDF0F5',
          color: fg, fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>Черновик</button>
        <button disabled={!canSave}
          onClick={() => onSave({ title, desc, day, time, place, vis, cover, invited })} style={{
          flex: 2, padding: '14px', borderRadius: 14, border: 'none',
          background: canSave ? '#FF5A4E' : (dark ? 'rgba(255,255,255,0.08)' : '#EDF0F5'),
          color: canSave ? '#fff' : fg2,
          boxShadow: canSave ? '0 4px 14px rgba(255,90,78,0.40), 0 1px 0 rgba(255,255,255,.18) inset' : 'none',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: canSave ? 'pointer' : 'default',
        }}>Создать событие</button>
      </div>
    </div>
  );
}

// ─── EVENT DETAIL ON MAP ─────────────────────────────────────────────────────

const SAMPLE_EVENT = {
  title: 'Закат на Воробьёвых',
  day: 18, month: 'Май', wd: 'сб',
  time: '20:42', place: 'Смотровая · Воробьёвы горы',
  distance: '2,3', // km from user
  cover: 'linear-gradient(150deg,#FFB1A4 0%, #FF5A4E 55%, #C2331F 100%)',
  desc:  'Соберёмся на смотровой за 20 минут до заката, потом — спуститься к набережной по лестнице, по пути кофе у Метромоста.',
  vis:   'public',
  author: { name: 'Аня Соколова', handle: '@anya', avatar: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)' },
  attendees: [
    'linear-gradient(135deg,#FFB1A4,#FF5A4E)',
    'linear-gradient(135deg,#7ADBE2,#14B8C7)',
    'linear-gradient(135deg,#FCE3A8,#F4B740)',
  ],
  attCount: 17,
};

// Full-screen overlay: faux map + centered event pin + bottom sheet.
function EventDetailScreen({ dark = true, event = SAMPLE_EVENT, onClose, onShare }) {
  const [going, setGoing] = React.useState(false);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <MapBackground dark={dark}>
        {/* a few ambient friend routes for context */}
        <MapPolyline d="M -20 380 Q 90 360 160 320 T 290 350 T 420 320" color="#14B8C7" width={3.2} glow/>
      </MapBackground>

      {/* Nearby people / events as pins, to give context */}
      <MapPin x={92}  y={420} kind="friend"/>
      <MapPin x={320} y={520} kind="friend"/>
      <MeDot x={140} y={560}/>

      {/* CENTERED EVENT PIN — distinctive square w/ date chip */}
      <EventMapPin x={201} y={340} event={event}/>

      {/* TOP BAR — close + author + share */}
      <div style={{ position: 'absolute', top: 62, left: 12, right: 12, display: 'flex', gap: 8, zIndex: 12 }}>
        <button onClick={onClose} style={{
          width: 44, height: 44, borderRadius: 999, border: 'none',
          background: dark ? 'rgba(22,25,31,0.78)' : 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          color: dark ? '#F4F6FA' : '#0E1116', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(14,17,22,.18)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px 6px 6px',
          background: dark ? 'rgba(22,25,31,0.78)' : 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          borderRadius: 999, height: 44, boxSizing: 'border-box',
          boxShadow: '0 4px 12px rgba(14,17,22,.18)',
          color: dark ? '#F4F6FA' : '#0E1116', minWidth: 0,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: event.author.avatar, flexShrink: 0 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, lineHeight: 1.1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.author.name}</div>
            <div style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 11,
                          color: dark ? '#8A93A4' : '#5B6577',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              автор события
            </div>
          </div>
        </div>
        <button onClick={onShare} aria-label="share" style={{
          width: 44, height: 44, borderRadius: 999, border: 'none',
          background: dark ? 'rgba(22,25,31,0.78)' : 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          color: dark ? '#F4F6FA' : '#0E1116', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(14,17,22,.18)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/>
          </svg>
        </button>
      </div>

      {/* BOTTOM SHEET — event card expanded */}
      <EventDetailSheet event={event} going={going} setGoing={setGoing} dark={dark}/>
    </div>
  );
}

function EventDetailSheet({ event, dark, going, setGoing }) {
  const fg  = dark ? '#F4F6FA' : '#0E1116';
  const fg2 = dark ? '#8A93A4' : '#5B6577';

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: dark ? '#16191F' : '#FFFFFF',
      color: fg,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: '8px 0 0',
      boxShadow: dark ? '0 -16px 40px rgba(0,0,0,0.55)' : '0 -8px 28px rgba(14,17,22,0.12)',
      zIndex: 11, maxHeight: '70%', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ width: 36, height: 5, borderRadius: 999, flexShrink: 0,
                     background: dark ? 'rgba(255,255,255,0.22)' : 'rgba(14,17,22,0.18)',
                     margin: '6px auto 12px' }}/>

      {/* COVER + DATE */}
      <div style={{ position: 'relative', margin: '0 16px 14px', borderRadius: 18, overflow: 'hidden', height: 132, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: event.cover }}/>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 60,
                       background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)' }}/>
        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: '#0E1116', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '6px 10px 5px', textAlign: 'center', minWidth: 48,
          boxShadow: '0 4px 10px rgba(0,0,0,0.32)',
        }}>
          <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 9, color: '#8A93A4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{event.month}</div>
          <div style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 22, color: '#FF5A4E', lineHeight: 1, marginTop: 2, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {String(event.day).padStart(2, '0')}
          </div>
        </div>
        <div style={{
          position: 'absolute', bottom: 10, left: 14, right: 14, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            padding: '4px 9px', borderRadius: 999,
            background: 'rgba(11,13,17,0.55)', backdropFilter: 'blur(8px)',
            color: '#fff', fontFamily: 'Manrope', fontWeight: 700, fontSize: 11,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            {event.time}
          </span>
          <span style={{
            padding: '4px 9px', borderRadius: 999,
            background: 'rgba(11,13,17,0.55)', backdropFilter: 'blur(8px)',
            color: '#fff', fontFamily: 'Manrope', fontWeight: 700, fontSize: 11,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.place}</span>
          </span>
        </div>
      </div>

      {/* BODY */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 6 }}>
        <h2 style={{ margin: 0, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
          {event.title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <VisibilityBadge kind={event.vis} dark={dark}/>
          <span style={{ width: 3, height: 3, borderRadius: 999, background: fg2, opacity: .5 }}/>
          <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 12, color: fg2, fontVariantNumeric: 'tabular-nums' }}>
            {event.distance} км от тебя
          </span>
        </div>
        <p style={{ margin: '2px 0 0', fontFamily: 'Manrope', fontWeight: 500, fontSize: 14, lineHeight: 1.5,
                    color: dark ? '#C5CBD6' : '#3A4150' }}>
          {event.desc}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <AvatarStack avatars={event.attendees} extra={Math.max(0, event.attCount - event.attendees.length)} dark={dark}/>
          <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 12, color: fg2 }}>
            идут {event.attCount}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div style={{
        padding: '12px 16px 16px', flexShrink: 0,
        background: dark ? '#16191F' : '#FFFFFF',
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(14,17,22,0.04)'}`,
        display: 'flex', gap: 10,
      }}>
        <button onClick={() => setGoing(!going)} style={{
          flex: 1, padding: '14px', borderRadius: 14, border: going ? `1.5px solid #FF5A4E` : 'none',
          background: going ? 'transparent' : '#FF5A4E',
          color: going ? '#FF5A4E' : '#fff',
          boxShadow: going ? 'none' : '0 6px 16px rgba(255,90,78,0.40), 0 1px 0 rgba(255,255,255,.18) inset',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {going ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path d="m5 12 5 5 9-11"/></svg>
              Иду
            </>
          ) : 'Иду'}
        </button>
        <button style={{
          width: 52, padding: '14px', borderRadius: 14, border: 'none',
          background: dark ? 'rgba(255,255,255,0.06)' : '#EDF0F5',
          color: dark ? '#F4F6FA' : '#0E1116',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// Centered, scaled-up event pin that matches the EventCard date chip.
function EventMapPin({ x, y, event }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)',
      filter: 'drop-shadow(0 8px 14px rgba(14,17,22,.45))',
      zIndex: 8,
    }}>
      {/* halo */}
      <span style={{
        position: 'absolute', left: '50%', top: '50%', width: 80, height: 80,
        marginLeft: -40, marginTop: -40, borderRadius: 18,
        background: 'rgba(255,90,78,0.22)',
        animation: 'wv-pin-pulse 2.2s ease-out infinite',
      }}/>
      <div style={{
        position: 'relative',
        width: 64, padding: '8px 8px 9px',
        background: '#0E1116', borderRadius: 14,
        border: '2.5px solid #FFFFFF', boxSizing: 'border-box', textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 9, color: '#8A93A4', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{event.month}</div>
        <div style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 24, color: '#FF5A4E', lineHeight: 1, marginTop: 2, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {String(event.day).padStart(2, '0')}
        </div>
        {/* anchor */}
        <span style={{
          position: 'absolute', left: '50%', bottom: -7, transform: 'translateX(-50%) rotate(45deg)',
          width: 12, height: 12, background: '#0E1116',
          borderRight: '2.5px solid #FFFFFF', borderBottom: '2.5px solid #FFFFFF',
        }}/>
      </div>
    </div>
  );
}

// ─── SHARED SUB-COMPONENTS ───────────────────────────────────────────────────

function ECLabel({ children, dark }) {
  return (
    <div style={{
      padding: '0 20px',
      fontFamily: 'Manrope', fontWeight: 700, fontSize: 10,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      color: dark ? '#8A93A4' : '#5B6577',
      marginBottom: 8,
    }}>{children}</div>
  );
}

function ECInput({ value, onChange, placeholder, dark, multiline, rows = 2, iconPath }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div style={{
      position: 'relative',
      background: dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.10)'}`,
      borderRadius: 12,
      display: 'flex', alignItems: multiline ? 'flex-start' : 'center',
    }}>
      {iconPath && (
        <span style={{
          paddingLeft: 12, color: dark ? '#8A93A4' : '#5B6577',
          display: 'inline-flex', alignItems: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d={iconPath}/>
          </svg>
        </span>
      )}
      <Tag value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={multiline ? rows : undefined}
        style={{
          flex: 1, boxSizing: 'border-box', background: 'transparent', border: 'none',
          padding: iconPath ? '11px 14px 11px 8px' : '11px 14px',
          fontFamily: 'Manrope', fontWeight: 500, fontSize: 15,
          color: dark ? '#F4F6FA' : '#0E1116',
          outline: 'none', resize: multiline ? 'vertical' : 'none', lineHeight: 1.45,
        }}/>
    </div>
  );
}

function ECChip({ children, dark, active, iconPath, onClick }) {
  const bgActive   = dark ? 'rgba(255,90,78,0.14)' : 'rgba(255,90,78,0.10)';
  const bgInactive = dark ? 'rgba(255,255,255,0.06)' : '#F1F3F8';
  const fg = active ? '#FF5A4E' : (dark ? '#F4F6FA' : '#0E1116');
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '9px 14px', borderRadius: 999, border: active ? '1px solid rgba(255,90,78,0.35)' : `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(14,17,22,0.04)'}`,
      background: active ? bgActive : bgInactive, color: fg,
      fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, cursor: 'pointer',
      fontVariantNumeric: 'tabular-nums',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d={iconPath}/>
      </svg>
      {children}
    </button>
  );
}

function ECVisibilityPill({ value, onChange, dark }) {
  // events have two states only — public or followers
  const next = { public: 'followers', followers: 'public' };
  const meta = {
    public:    { label: 'Публично',  iconPath: 'M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0M2 12h20M12 2c2.5 3.5 4 7.5 4 10s-1.5 6.5-4 10c-2.5-3.5-4-7.5-4-10s1.5-6.5 4-10z' },
    followers: { label: 'Подписчики', iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11' },
  };
  const m = meta[value];
  return (
    <button onClick={() => onChange(next[value])} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 10px', borderRadius: 999,
      background: dark ? 'rgba(255,255,255,0.06)' : '#F1F3F8',
      color: dark ? '#F4F6FA' : '#0E1116',
      border: 'none', cursor: 'pointer',
      fontFamily: 'Manrope', fontWeight: 700, fontSize: 11.5,
    }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <path d={m.iconPath}/>
      </svg>
      {m.label}
    </button>
  );
}

// Inline mini-map preview with a single event pin. Pure visual — taps it to
// re-center / change place in production.
function ECMapPreview({ dark }) {
  return (
    <div style={{
      position: 'relative', height: 120, borderRadius: 14, overflow: 'hidden',
      background: dark ? '#1B1F27' : '#EAEEF4',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(14,17,22,0.06)'}`,
    }}>
      <svg viewBox="0 0 360 120" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: 'block' }}>
        {/* faux blocks + roads */}
        <rect x="0" y="0" width="360" height="120" fill={dark ? '#1B1F27' : '#EAEEF4'}/>
        <g opacity={dark ? 0.36 : 0.55}>
          <rect x="14"  y="14"  width="60" height="36" rx="4" fill={dark ? '#2A2F3A' : '#FFFFFF'}/>
          <rect x="88"  y="14"  width="80" height="48" rx="4" fill={dark ? '#2A2F3A' : '#FFFFFF'}/>
          <rect x="184" y="20"  width="50" height="32" rx="4" fill={dark ? '#2A2F3A' : '#FFFFFF'}/>
          <rect x="248" y="14"  width="98" height="40" rx="4" fill={dark ? '#2A2F3A' : '#FFFFFF'}/>
          <rect x="14"  y="72"  width="92" height="38" rx="4" fill={dark ? '#2A2F3A' : '#FFFFFF'}/>
          <rect x="120" y="78"  width="58" height="32" rx="4" fill={dark ? '#2A2F3A' : '#FFFFFF'}/>
          <rect x="190" y="68"  width="80" height="42" rx="4" fill={dark ? '#2A2F3A' : '#FFFFFF'}/>
          <rect x="282" y="74"  width="64" height="36" rx="4" fill={dark ? '#2A2F3A' : '#FFFFFF'}/>
        </g>
        <path d="M0 60 L 360 64" stroke={dark ? '#3B4150' : '#C5CBD6'} strokeWidth="2.5" fill="none"/>
        <path d="M180 0 L 180 120" stroke={dark ? '#3B4150' : '#C5CBD6'} strokeWidth="2" fill="none"/>
        {/* event pin */}
        <g transform="translate(180 60)">
          <rect x="-14" y="-22" width="28" height="28" rx="6" fill="#0E1116" stroke="#FFFFFF" strokeWidth="1.6"/>
          <text x="0" y="-13" textAnchor="middle" fontFamily="Manrope" fontWeight="700" fontSize="4.5" fill="#8A93A4" letterSpacing="0.6">МАЙ</text>
          <text x="0" y="0"  textAnchor="middle" fontFamily="Bricolage Grotesque" fontWeight="800" fontSize="12" fill="#FF5A4E">18</text>
          <path d="M-4 6 L 0 11 L 4 6 Z" fill="#0E1116" stroke="#FFFFFF" strokeWidth="1.6"/>
        </g>
      </svg>
      {/* corner — change place affordance */}
      <button style={{
        position: 'absolute', top: 8, right: 8,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 9px', borderRadius: 999, border: 'none',
        background: 'rgba(11,13,17,0.65)', color: '#fff', backdropFilter: 'blur(8px)',
        cursor: 'pointer', fontFamily: 'Manrope', fontWeight: 700, fontSize: 10.5,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        Передвинуть
      </button>
    </div>
  );
}

Object.assign(window, {
  EventCreateSheet, EventDetailScreen, EventDetailSheet, EventMapPin,
  ECLabel, ECInput, ECChip, ECVisibilityPill, ECMapPreview, SAMPLE_EVENT,
});
