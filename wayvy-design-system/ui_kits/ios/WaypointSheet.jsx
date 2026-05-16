// WaypointSheet.jsx — v2.1. Бот-шит для добавления точки во время записи.
// Содержит: фото с обложкой+подписями, голос, видео-кружок, название,
// описание, спутников, visibility-pill, авто-контекст.
// (категория / атмосфера / оценка — убраны по фидбеку)

function WaypointSheet({ dark, onCancel, onSave, address = 'Покровка, 27 · Москва', standalone = false }) {
  const [title, setTitle] = React.useState('Самокатная кофейня');
  const [desc, setDesc]   = React.useState('');
  const [vis, setVis]     = React.useState('followers'); // public | followers | private
  const [photos, setPhotos] = React.useState([
    { id: 1, bg: 'linear-gradient(135deg,#FFB1A4 0%, #FF5A4E 100%)', cover: true,  caption: 'Лучшее место у окна' },
    { id: 2, bg: 'linear-gradient(135deg,#7ADBE2 0%, #14B8C7 100%)', cover: false, caption: '' },
  ]);
  const [voice, setVoice] = React.useState({ recorded: true,  duration: 14 });
  const [video, setVideo] = React.useState({ recorded: false, duration: 0  });
  const [companions, setCompanions] = React.useState([
    { id: 1, name: 'Дима', bg: 'linear-gradient(135deg,#7ADBE2,#14B8C7)' },
  ]);

  const fg  = dark ? '#F4F6FA' : '#0E1116';
  const fg2 = dark ? '#8A93A4' : '#5B6577';
  const surface = dark ? '#16191F' : '#FFFFFF';
  const tint    = dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC';
  const border  = dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.10)';

  const makeCover = (id) =>
    setPhotos(photos.map(p => ({ ...p, cover: p.id === id })));

  const setCaption = (id, caption) =>
    setPhotos(photos.map(p => p.id === id ? { ...p, caption } : p));

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 41,
      background: surface, color: fg,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: '8px 0 22px',
      boxShadow: dark ? '0 -16px 40px rgba(0,0,0,0.65)' : '0 -8px 32px rgba(14,17,22,0.18)',
      maxHeight: '88%', overflowY: 'auto',
      animation: 'wv-sheet-up 320ms cubic-bezier(.16,1,.3,1)',
    }}>
      {/* GRIP */}
      <div style={{
        width: 36, height: 5, borderRadius: 999,
        background: dark ? 'rgba(255,255,255,0.22)' : 'rgba(14,17,22,0.18)',
        margin: '6px auto 14px',
      }}/>

      {/* HEADER */}
      <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <h3 style={{ margin: 0, flex: 1, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em' }}>
          {standalone ? 'Одиночная точка' : 'Новая точка'}
        </h3>
        <WPVisibilityPill value={vis} onChange={setVis} dark={dark}/>
        <button onClick={onCancel} aria-label="close" style={{
          width: 30, height: 30, borderRadius: 999, border: 'none',
          background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.06)',
          color: fg, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M6 18 18 6"/></svg>
        </button>
      </div>

      {/* MODE INDICATOR — only on standalone: makes it clear this point is
          NOT attached to a route (no walk recording in progress). */}
      {standalone && (
        <div style={{ padding: '0 20px', marginBottom: 10 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px 5px 8px', borderRadius: 999,
            background: dark ? 'rgba(255,255,255,0.06)' : '#F1F3F8',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(14,17,22,0.04)'}`,
            color: fg, fontFamily: 'Manrope', fontWeight: 700, fontSize: 11,
          }}>
            <span style={{
              width: 14, height: 14, borderRadius: 4, background: '#0E1116',
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
            </span>
            без маршрута
          </div>
        </div>
      )}

      {/* ADDRESS + AUTO-CONTEXT */}
      <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontFamily: 'Manrope', fontWeight: 500, fontSize: 13, color: fg2 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {address}
        </div>
        <span style={{ width: 3, height: 3, borderRadius: 999, background: fg2, opacity: .5 }}/>
        <WPAutoContext dark={dark}/>
      </div>

      {/* MEDIA */}
      <WPLabel dark={dark} style={{ padding: '0 20px' }}>Медиа</WPLabel>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {/* photos */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {photos.map((p) => (
            <WPPhotoCard key={p.id} photo={p} dark={dark}
              onCover={() => makeCover(p.id)}
              onCaption={(c) => setCaption(p.id, c)}
              onRemove={() => setPhotos(photos.filter(x => x.id !== p.id))}/>
          ))}
          <WPMediaAdd dark={dark} kind="photo"
            onClick={() => setPhotos([...photos, {
              id: Date.now(), bg: 'linear-gradient(135deg,#FCE3A8,#F4B740)', cover: false, caption: ''
            }])}/>
        </div>
        {/* voice + video */}
        <div style={{ display: 'flex', gap: 8 }}>
          <WPVoiceTile dark={dark} voice={voice} setVoice={setVoice}/>
          <WPVideoTile dark={dark} video={video} setVideo={setVideo}/>
        </div>
      </div>

      {/* TITLE */}
      <WPLabel dark={dark} style={{ padding: '0 20px' }}>Название</WPLabel>
      <div style={{ padding: '0 20px', marginBottom: 12 }}>
        <WPInput value={title} onChange={setTitle} dark={dark}/>
      </div>

      {/* DESCRIPTION */}
      <WPLabel dark={dark} style={{ padding: '0 20px' }}>Описание</WPLabel>
      <div style={{ padding: '0 20px', marginBottom: 16 }}>
        <WPInput value={desc} onChange={setDesc} dark={dark} multiline
          placeholder="Что попробовать? Когда лучше прийти? Что особенного?"
          rows={3}/>
      </div>

      {/* COMPANIONS */}
      <WPLabel dark={dark} style={{ padding: '0 20px' }}>С кем</WPLabel>
      <div style={{ padding: '0 20px', display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        {companions.map(c => (
          <div key={c.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px 4px 4px', borderRadius: 999,
            background: tint, border: `1px solid ${border}`,
          }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: c.bg }}/>
            <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 13, color: fg }}>{c.name}</span>
            <button onClick={() => setCompanions(companions.filter(x => x.id !== c.id))}
              style={{ background:'transparent', border:'none', cursor:'pointer', color: fg2, padding: 0, lineHeight: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M6 6l12 12M6 18 18 6"/></svg>
            </button>
          </div>
        ))}
        <button onClick={() => setCompanions([...companions, { id: Date.now(), name: 'Аня', bg: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)' }])}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 999,
            background: 'transparent', border: `1.5px dashed ${border}`,
            color: fg2, cursor: 'pointer', fontFamily: 'Manrope', fontWeight: 600, fontSize: 13,
          }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
          Добавить
        </button>
      </div>

      {/* ACTIONS */}
      <div style={{ padding: '0 20px', display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '13px', borderRadius: 14, border: 'none',
          background: dark ? 'rgba(255,255,255,0.06)' : '#EDF0F5',
          color: fg, fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>Черновик</button>
        <button onClick={() => onSave({ title, desc, photos, vis, companions, voice, video })} style={{
          flex: 2, padding: '14px', borderRadius: 14, border: 'none',
          background: '#FF5A4E', color: '#fff',
          boxShadow: '0 4px 14px rgba(255,90,78,0.40), 0 1px 0 rgba(255,255,255,.18) inset',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>{standalone ? 'Сохранить точку' : 'Добавить точку'}</button>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────

function WPLabel({ children, dark, style }) {
  return (
    <div style={{
      fontFamily: 'Manrope', fontWeight: 700, fontSize: 10,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      color: dark ? '#8A93A4' : '#5B6577',
      marginBottom: 8, ...style,
    }}>{children}</div>
  );
}

function WPInput({ value, onChange, placeholder, dark, multiline, rows = 2 }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Tag value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={multiline ? rows : undefined}
      style={{
        width: '100%', boxSizing: 'border-box',
        background: dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.10)'}`,
        borderRadius: 12, padding: '11px 14px',
        fontFamily: 'Manrope', fontWeight: 500, fontSize: 15,
        color: dark ? '#F4F6FA' : '#0E1116',
        outline: 'none', resize: multiline ? 'vertical' : 'none', lineHeight: 1.45,
      }}/>
  );
}

function WPVisibilityPill({ value, onChange, dark }) {
  const next = { public: 'followers', followers: 'private', private: 'public' };
  const meta = {
    public:    { label: 'Публично',  iconPath: 'M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0M2 12h20M12 2c2.5 3.5 4 7.5 4 10s-1.5 6.5-4 10c-2.5-3.5-4-7.5-4-10s1.5-6.5 4-10z' },
    followers: { label: 'Подписчики', iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11' },
    private:   { label: 'Только я',  iconPath: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3' },
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

function WPAutoContext({ dark }) {
  const fg2 = dark ? '#8A93A4' : '#5B6577';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'Manrope', fontWeight: 600, fontSize: 12, color: fg2,
      fontVariantNumeric: 'tabular-nums',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F4B740" strokeWidth="2.2">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4"/>
      </svg>
      <span>22° · 19:40 пт</span>
    </div>
  );
}

// ─── PHOTO TILE ─────────────────────────────────────────────────────────────

function WPPhotoCard({ photo, dark, onCover, onCaption, onRemove }) {
  return (
    <div style={{ width: 96, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        position: 'relative', width: 96, height: 96, borderRadius: 14,
        background: photo.bg, overflow: 'hidden',
        outline: photo.cover ? '2px solid #FF5A4E' : 'none',
        outlineOffset: 2,
      }}>
        {photo.cover ? (
          <div style={{
            position: 'absolute', top: 6, left: 6,
            background: '#FF5A4E', color: '#fff',
            padding: '2px 7px', borderRadius: 999,
            fontFamily: 'Manrope', fontWeight: 700, fontSize: 9, letterSpacing: '.04em',
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5L18.2 22 12 17.5 5.8 22l2.4-8.1L2 9.4h7.6z"/></svg>
            COVER
          </div>
        ) : (
          <button onClick={onCover} style={{
            position: 'absolute', top: 6, left: 6,
            background: 'rgba(14,17,22,.55)', color: '#fff',
            padding: '2px 7px', borderRadius: 999,
            border: 'none', cursor: 'pointer',
            fontFamily: 'Manrope', fontWeight: 600, fontSize: 9, letterSpacing: '.04em',
          }}>обложка</button>
        )}
        <button onClick={onRemove} style={{
          position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 999,
          background: 'rgba(14,17,22,.55)', border: 'none', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 6l12 12M6 18 18 6"/></svg>
        </button>
      </div>
      <input type="text" value={photo.caption} onChange={(e) => onCaption(e.target.value)} placeholder="подпись"
        style={{
          width: 96, boxSizing: 'border-box',
          background: 'transparent', border: 'none', outline: 'none', padding: '2px 4px',
          fontFamily: 'Manrope', fontWeight: 500, fontSize: 11,
          color: dark ? '#F4F6FA' : '#0E1116',
        }}/>
    </div>
  );
}

function WPMediaAdd({ dark, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 96, height: 96, borderRadius: 14, flexShrink: 0,
      background: dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      border: `1.5px dashed ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(14,17,22,0.16)'}`,
      color: dark ? '#8A93A4' : '#5B6577', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M8 5l2-2h4l2 2"/>
      </svg>
      <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 10 }}>Фото</span>
    </button>
  );
}

// ─── VOICE TILE ─────────────────────────────────────────────────────────────

function WPVoiceTile({ dark, voice, setVoice }) {
  const fg  = dark ? '#F4F6FA' : '#0E1116';
  const fg2 = dark ? '#8A93A4' : '#5B6577';
  const tint = dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC';

  if (!voice.recorded) {
    return (
      <button onClick={() => setVoice({ recorded: true, duration: 14 })} style={{
        flex: 1, padding: '12px 14px', borderRadius: 14,
        background: tint,
        border: `1.5px dashed ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(14,17,22,0.16)'}`,
        color: fg2, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: 'Manrope', fontWeight: 600, fontSize: 13,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 999,
          background: dark ? 'rgba(255,255,255,0.06)' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ color: fg, fontWeight: 700 }}>Голос</span>
          <span style={{ fontSize: 11 }}>Удерживай</span>
        </div>
      </button>
    );
  }

  const bars = [4, 8, 14, 22, 30, 26, 16, 24, 30, 22, 12, 18, 26, 20, 10, 14, 22, 16, 8, 4];

  return (
    <div style={{
      flex: 1, padding: '10px 12px', borderRadius: 14,
      background: 'rgba(255,90,78,0.08)',
      border: `1px solid rgba(255,90,78,0.35)`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <button style={{
        width: 34, height: 34, borderRadius: 999, border: 'none',
        background: '#FF5A4E', color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 3px 10px rgba(255,90,78,0.40)',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l12 7-12 7V5z"/></svg>
      </button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 30 }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 2.5, height: h, borderRadius: 999,
            background: i < 7 ? '#FF5A4E' : (dark ? 'rgba(255,255,255,0.22)' : 'rgba(14,17,22,0.22)'),
          }}/>
        ))}
      </div>
      <span style={{
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 12, color: fg,
        fontVariantNumeric: 'tabular-nums',
      }}>0:{String(voice.duration).padStart(2,'0')}</span>
      <button onClick={() => setVoice({ recorded: false, duration: 0 })}
        style={{ background:'transparent', border:'none', color: fg2, cursor:'pointer', padding: 0, lineHeight: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>
  );
}

// ─── VIDEO CIRCLE TILE ──────────────────────────────────────────────────────

function WPVideoTile({ dark, video, setVideo }) {
  const fg  = dark ? '#F4F6FA' : '#0E1116';
  const fg2 = dark ? '#8A93A4' : '#5B6577';
  const tint = dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC';

  if (!video.recorded) {
    return (
      <button onClick={() => setVideo({ recorded: true, duration: 12 })} style={{
        flex: 1, padding: '12px 14px', borderRadius: 14,
        background: tint,
        border: `1.5px dashed ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(14,17,22,0.16)'}`,
        color: fg2, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: 'Manrope', fontWeight: 600, fontSize: 13,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: dark ? 'rgba(255,255,255,0.06)' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="14" height="12" rx="2"/>
            <path d="M21 8l-4 2.5v3L21 16V8z" fill="currentColor" stroke="none"/>
            <circle cx="10" cy="12" r="1.6" fill="currentColor" stroke="none"/>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ color: fg, fontWeight: 700 }}>Видео</span>
          <span style={{ fontSize: 11 }}>квадрат · 15 сек</span>
        </div>
      </button>
    );
  }

  return (
    <div style={{
      flex: 1, padding: '10px 12px', borderRadius: 14,
      background: 'rgba(20,184,199,0.10)',
      border: `1px solid rgba(20,184,199,0.35)`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        position: 'relative', width: 42, height: 42, borderRadius: 10, overflow: 'hidden',
        background: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.22)',
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: 999,
          background: 'rgba(11,13,17,0.55)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff"><path d="M8 5l12 7-12 7V5z"/></svg>
        </span>
        {/* progress bar along the bottom edge instead of a ring */}
        <span style={{
          position: 'absolute', left: 3, right: 3, bottom: 3, height: 2.5, borderRadius: 999,
          background: 'rgba(255,255,255,0.30)',
        }}>
          <span style={{
            display: 'block', height: '100%', borderRadius: 999, background: '#14B8C7',
            width: `${Math.min(100, (video.duration / 15) * 100)}%`,
          }}/>
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 12, color: fg }}>Видео</span>
        <span style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 11, color: fg2, fontVariantNumeric: 'tabular-nums' }}>
          0:{String(video.duration).padStart(2,'0')} · 15 сек max
        </span>
      </div>
      <button onClick={() => setVideo({ recorded: false, duration: 0 })}
        style={{ background:'transparent', border:'none', color: fg2, cursor:'pointer', padding: 0, lineHeight: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>
  );
}

Object.assign(window, {
  WaypointSheet,
  WPLabel, WPInput, WPVisibilityPill, WPAutoContext,
  WPPhotoCard, WPMediaAdd, WPVoiceTile, WPVideoTile,
});
