// WaypointDetailSheet.jsx — read-only bottom sheet shown when a standalone
// waypoint pin is tapped on Карта·все. NOT for route-linked waypoints —
// those open FriendRouteSteps instead. Visually mirrors the step card so the
// waypoint reads as the same kind of object, just sans step navigation.

const SAMPLE_STANDALONE = {
  id: 'w3',
  title: 'Дом Мельникова',
  cat: 'Архитектура',
  addr: 'Кривоарбатский, 10 · Москва',
  author: { name: 'Маша Кутья', handle: '@mash', avatar: 'linear-gradient(135deg,#C5CBD6,#5B6577)' },
  when: 'вчера',
  photos: [
    'linear-gradient(180deg,#0E1116 0%, #5B6577 50%, #FFB1A4 100%)',
    'linear-gradient(160deg,#2A2F3A 0%, #5B6577 60%, #FFD9D2 100%)',
    'linear-gradient(200deg,#0E1116 0%, #5B6577 50%, #FF8876 100%)',
  ],
  voice: { duration: 16 },
  video: { duration: 11 },
  desc:  'Памятник конструктивизма во дворе. Внутрь не пускают, но можно обойти вокруг — окна-соты лучше всего читаются с южной стороны.',
};

function WaypointDetailSheet({ dark = true, waypoint = SAMPLE_STANDALONE, onClose, onRoute }) {
  const [photoIdx, setPhotoIdx] = React.useState(0);
  const photos = waypoint.photos || [];
  const heroPhoto = photos[photoIdx] || photos[0];
  const hasMultiPhoto = photos.length > 1;

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
      zIndex: 11, maxHeight: '72%', display: 'flex', flexDirection: 'column',
      animation: 'wv-sheet-up 320ms cubic-bezier(.16,1,.3,1)',
    }}>
      {/* GRIP */}
      <div style={{ width: 36, height: 5, borderRadius: 999, flexShrink: 0,
                     background: dark ? 'rgba(255,255,255,0.22)' : 'rgba(14,17,22,0.18)',
                     margin: '6px auto 12px' }}/>

      {/* TOP META — author + close */}
      <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, background: waypoint.author.avatar, flexShrink: 0 }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, lineHeight: 1.15,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{waypoint.author.name}</div>
          <div style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 11, color: fg2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            одиночная точка · {waypoint.when}
          </div>
        </div>
        <button onClick={onClose} aria-label="close" style={{
          width: 30, height: 30, borderRadius: 999, border: 'none',
          background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(14,17,22,0.06)',
          color: fg, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M6 18 18 6"/></svg>
        </button>
      </div>

      {/* PHOTO */}
      <div style={{ position: 'relative', margin: '0 16px', borderRadius: 18, overflow: 'hidden', height: 200, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: heroPhoto,
                       transition: 'background 220ms cubic-bezier(.16,1,.3,1)' }}/>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80,
                       background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)' }}/>
        {/* type marker — dark map-pin glyph matching the bubble badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 9px 4px 7px', borderRadius: 999,
          background: 'rgba(11,13,17,0.62)', backdropFilter: 'blur(8px)',
          color: '#fff', fontFamily: 'Manrope', fontWeight: 700, fontSize: 11,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="2.5" fill="currentColor"/></svg>
          Точка
        </div>
        {hasMultiPhoto && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            padding: '4px 9px', borderRadius: 999,
            background: 'rgba(11,13,17,0.55)', backdropFilter: 'blur(8px)',
            color: '#fff', fontFamily: 'Manrope', fontWeight: 700, fontSize: 11, fontVariantNumeric: 'tabular-nums',
          }}>{photoIdx + 1} / {photos.length}</div>
        )}
        {hasMultiPhoto && (
          <div style={{
            position: 'absolute', bottom: 10, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5,
          }}>
            {photos.map((_, i) => (
              <span key={i} style={{
                width: i === photoIdx ? 16 : 5, height: 5, borderRadius: 999,
                background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'all 220ms cubic-bezier(.16,1,.3,1)',
              }}/>
            ))}
          </div>
        )}
        {hasMultiPhoto && (
          <button aria-label="next photo"
            onClick={() => setPhotoIdx((photoIdx + 1) % photos.length)}
            style={{ position: 'absolute', inset: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}/>
        )}
      </div>

      {/* BODY */}
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 9px', borderRadius: 999,
            background: dark ? 'rgba(20,184,199,0.16)' : 'rgba(20,184,199,0.14)',
            color: dark ? '#7ADBE2' : '#0A7F8A',
            fontFamily: 'Manrope', fontWeight: 700, fontSize: 11,
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>
            {waypoint.cat}
          </span>
          <span style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 12, color: fg2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {waypoint.addr}
          </span>
        </div>
        <h2 style={{ margin: '2px 0 0', fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
          {waypoint.title}
        </h2>
        <p style={{ margin: 0, fontFamily: 'Manrope', fontWeight: 500, fontSize: 14, lineHeight: 1.5,
                    color: dark ? '#C5CBD6' : '#3A4150' }}>
          {waypoint.desc}
        </p>

        {(hasMultiPhoto || waypoint.voice || waypoint.video) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'stretch' }}>
            {hasMultiPhoto && photos.map((bg, i) => (
              <button key={i} onClick={() => setPhotoIdx(i)} style={{
                width: 52, height: 52, borderRadius: 12, padding: 0, flexShrink: 0,
                background: bg, border: 'none', cursor: 'pointer',
                outline: i === photoIdx ? '2px solid #FF5A4E' : 'none',
                outlineOffset: 2,
                opacity: i === photoIdx ? 1 : 0.85,
              }}/>
            ))}
            {waypoint.voice && <StepVoiceTile dark={dark} duration={waypoint.voice.duration}/>}
            {waypoint.video && <StepVideoTile dark={dark} duration={waypoint.video.duration}/>}
          </div>
        )}
      </div>

      {/* CTA — proceed to map directions; no route-walk option since standalone */}
      <div style={{
        padding: '12px 16px 16px', flexShrink: 0,
        background: dark ? '#16191F' : '#FFFFFF',
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(14,17,22,0.04)'}`,
        display: 'flex', gap: 10,
      }}>
        <button onClick={onRoute} style={{
          flex: 1, padding: '14px', borderRadius: 14, border: 'none',
          background: '#FF5A4E', color: '#fff',
          boxShadow: '0 6px 16px rgba(255,90,78,0.40), 0 1px 0 rgba(255,255,255,.18) inset',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M3 11l18-8-8 18-2-7-8-3z"/></svg>
          Маршрут сюда
        </button>
        <button aria-label="save" style={{
          width: 52, padding: '14px', borderRadius: 14, border: 'none',
          background: dark ? 'rgba(255,255,255,0.06)' : '#EDF0F5',
          color: dark ? '#F4F6FA' : '#0E1116',
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { WaypointDetailSheet, SAMPLE_STANDALONE });
