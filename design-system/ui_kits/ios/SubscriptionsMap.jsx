// SubscriptionsMap.jsx — v3. Карта подписок «фото на местах».
// Главное на экране — фото-пузыри waypoint'ов (как Apple Photos «Места»).
// Маршруты-полилинии остаются, но субтильно; появляются ярче по фокусу.

// ─── DATA ──────────────────────────────────────────────────────────────────

const SMAP_FRIENDS = [
  { id: 'anya',   name: 'Аня',   bg: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)' },
  { id: 'dima',   name: 'Дима',  bg: 'linear-gradient(135deg,#7ADBE2,#14B8C7)' },
  { id: 'kostya', name: 'Костя', bg: 'linear-gradient(135deg,#B9ECF0,#0A9CA9)' },
  { id: 'liza',   name: 'Лиза',  bg: 'linear-gradient(135deg,#FCE3A8,#F4B740)' },
  { id: 'masha',  name: 'Маша',  bg: 'linear-gradient(135deg,#C5CBD6,#5B6577)' },
];

const SMAP_CATEGORIES = [
  { k: 'all',     label: 'Все' },
  { k: 'coffee',  label: 'Кофе' },
  { k: 'bar',     label: 'Бары' },
  { k: 'view',    label: 'Виды' },
  { k: 'park',    label: 'Парки' },
  { k: 'street',  label: 'Граффити' },
  { k: 'arch',    label: 'Архитектура' },
  { k: 'yard',    label: 'Дворы' },
  { k: 'shop',    label: 'Магазины' },
];

// 12 waypoints across the visible map area. Each is EITHER route-linked
// (`route: 'r-anya-pokrovka'` + `step` index) OR standalone (`route: null`).
// Route-linked → tap highlights the polyline + opens FriendRouteSteps focused
// on that waypoint. Standalone → tap opens WaypointDetailSheet (single card).
const SMAP_WAYPOINTS = [
  // Route: Аня · Покровка → Чистые пруды (4 waypoints in order)
  { id: 'w1',  x: 100, y: 250, cat: 'view',    author: 'anya',   title: 'Воробьёвы',     cover: 'linear-gradient(165deg,#FFB1A4,#FF5A4E,#C2331F)', route: 'r-anya-pokrovka', step: 0 },
  { id: 'w2',  x: 190, y: 220, cat: 'coffee',  author: 'anya',   title: 'Самокатная',    cover: 'linear-gradient(135deg,#FFE7BA,#F4B740)',          route: 'r-anya-pokrovka', step: 1 },
  { id: 'w6',  x: 320, y: 270, cat: 'coffee',  author: 'anya',   title: 'Кооператив',    cover: 'linear-gradient(135deg,#FFD9D2,#FF8876,#C2331F)', route: 'r-anya-pokrovka', step: 2 },
  { id: 'w4',  x: 240, y: 360, cat: 'bar',     author: 'anya',   title: 'Чайка',         cover: 'linear-gradient(155deg,#B9ECF0,#14B8C7,#0A7F8A)', route: 'r-anya-pokrovka', step: 3 },
  // Standalone — single drops
  { id: 'w3',  x: 60,  y: 380, cat: 'arch',    author: 'masha',  title: 'Дом Мельникова', cover: 'linear-gradient(180deg,#0E1116,#5B6577,#FFB1A4)', route: null },
  { id: 'w5',  x: 150, y: 470, cat: 'park',    author: 'dima',   title: 'Парк Горького', cover: 'linear-gradient(150deg,#7ADBE2,#0A9CA9)',          route: null },
  { id: 'w7',  x: 90,  y: 560, cat: 'street',  author: 'liza',   title: 'Винзавод',      cover: 'linear-gradient(135deg,#FCE3A8,#F4B740,#C97500)', route: null },
  { id: 'w8',  x: 270, y: 540, cat: 'yard',    author: 'kostya', title: 'Хохловский',    cover: 'linear-gradient(165deg,#C5CBD6,#5B6577)',          route: null },
  { id: 'w9',  x: 340, y: 460, cat: 'view',    author: 'liza',   title: 'Стрелка',       cover: 'linear-gradient(170deg,#7ADBE2,#FF8876)',          route: null },
  { id: 'w10', x: 60,  y: 480, cat: 'bar',     author: 'masha',  title: 'Куряж',         cover: 'linear-gradient(155deg,#FFB1A4,#5B6577)',          route: null },
  { id: 'w11', x: 200, y: 600, cat: 'shop',    author: 'kostya', title: 'Фаланстер',     cover: 'linear-gradient(135deg,#FFE7BA,#0A9CA9)',          route: null },
];

// The polyline that connects route-linked waypoints. Hidden by default;
// highlighted when a route-linked waypoint is tapped.
const SMAP_ROUTES = {
  'r-anya-pokrovka': {
    author: 'anya',
    poly:  'M 100 250 Q 145 232 190 220 T 320 270 T 240 360',
    color: '#14B8C7',
  },
};

// Cluster — single dense spot with 8 photos.
const SMAP_CLUSTERS = [
  { id: 'c1', x: 220, y: 410, count: 8, photos: [
      'linear-gradient(135deg,#FFB1A4,#FF5A4E)',
      'linear-gradient(135deg,#7ADBE2,#14B8C7)',
      'linear-gradient(135deg,#FCE3A8,#F4B740)',
  ]},
];

// Subtle background heatmap.
const SMAP_HEAT = [
  'M -10 480 Q 80 460 160 440 T 320 400 T 420 360',
  'M -10 520 Q 60 500 140 480 T 280 440 T 420 400',
  'M 80 720 Q 120 660 180 600 T 260 520 T 320 460',
  'M 200 220 Q 220 260 240 300 T 280 380 T 320 460',
];

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────

function SubscriptionsMapScreen({ dark, onTapTab, onStartRecording, onTapSearch, onTapRouteWaypoint, onTapStandaloneWaypoint, onCreatePoint }) {
  const [focus, setFocus] = React.useState(null); // waypoint id
  const focused = SMAP_WAYPOINTS.find(w => w.id === focus);
  const focusedRoute = focused && focused.route ? SMAP_ROUTES[focused.route] : null;

  const handleTap = (w) => {
    setFocus(w.id);
    if (w.route) {
      // brief polyline highlight, then open steps
      setTimeout(() => onTapRouteWaypoint && onTapRouteWaypoint(w), 480);
    } else {
      onTapStandaloneWaypoint && onTapStandaloneWaypoint(w);
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapBackground dark={dark}/>

      {/* SUBTLE HEAT */}
      <svg viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"
           style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <filter id="smap-heat" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14"/>
          </filter>
        </defs>
        <g filter="url(#smap-heat)" opacity="0.16">
          {SMAP_HEAT.map((d, i) => (
            <path key={i} d={d} stroke="#FF5A4E" strokeWidth="42" fill="none" strokeLinecap="round" opacity="0.5"/>
          ))}
        </g>
      </svg>

      {/* HIGHLIGHTED ROUTE POLYLINE — only when a route-linked waypoint is focused */}
      {focusedRoute && (
        <svg viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"
             style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
                      animation: 'wv-fade-in 220ms ease-out' }}>
          <path d={focusedRoute.poly} stroke={focusedRoute.color} strokeOpacity="0.28" strokeWidth="14" fill="none" strokeLinecap="round"/>
          <path d={focusedRoute.poly} stroke={focusedRoute.color} strokeWidth="4.5" fill="none" strokeLinecap="round"/>
        </svg>
      )}

      {/* WAYPOINT PHOTO-BUBBLES */}
      {SMAP_WAYPOINTS.map(w => (
        <WaypointBubble key={w.id} w={w}
          author={SMAP_FRIENDS.find(f => f.id === w.author)}
          focused={focus === w.id}
          dimmed={focus && focus !== w.id && !(focused?.route && w.route === focused.route)}
          siblingInFocusRoute={focused?.route && w.route === focused.route && focus !== w.id}
          onClick={() => handleTap(w)}/>
      ))}

      {/* CLUSTER */}
      {SMAP_CLUSTERS.map(c => (
        <WaypointCluster key={c.id} c={c}/>
      ))}

      <MeDot x={200} y={680}/>

      {/* ─── TOP CONTROLS ──────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: 64, left: 16, right: 16, zIndex: 10 }}>
        <SearchPill dark={dark} onClick={onTapSearch}/>
      </div>

      {/* ─── RIGHT CONTROL STACK ───────────────────────────────── */}
      <div style={{ position: 'absolute', top: 124, right: 16, zIndex: 10 }}>
        <ControlStack dark={dark}/>
      </div>

      {/* ─── LEFT-SIDE FILTER PILLS — friend stack + create point ─ */}
      <div style={{ position: 'absolute', top: 124, left: 16, zIndex: 10, display: 'flex', gap: 8 }}>
        <SMapFriendStackPill dark={dark} count={12}/>
        <SMapCreatePointPill dark={dark} onClick={onCreatePoint}/>
      </div>

      {/* ─── LEGEND — bottom-left, above tab bar — explains pin types ───── */}
      <div style={{ position: 'absolute', left: 16, bottom: 90, zIndex: 10 }}>
        <SMapLegend dark={dark}/>
      </div>

      {/* ─── RECORD FAB ────────────────────────────────────────── */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 90, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <RecordFAB onClick={onStartRecording}/>
      </div>

      {/* ─── TAB BAR ───────────────────────────────────────────── */}
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 24, zIndex: 11 }}>
        <TabBar active="mapall" dark={dark} onChange={onTapTab}/>
      </div>
    </div>
  );
}

// ─── WAYPOINT BUBBLE PIN ──────────────────────────────────────────────────
// Both variants share the photo-bubble + author micro-dot. A top-left badge
// is the differentiator — route-linked shows a path glyph + step number,
// standalone shows a map-pin glyph. Identical motif so they read as siblings.

function WaypointBubble({ w, author, focused, dimmed, siblingInFocusRoute, onClick }) {
  const size = focused ? 60 : 52;
  const isRoute = !!w.route;
  const borderColor = focused
    ? '#FF5A4E'
    : (siblingInFocusRoute ? '#14B8C7' : '#FFFFFF');
  return (
    <button onClick={onClick} style={{
      position: 'absolute', left: w.x - size/2, top: w.y - size/2, zIndex: focused ? 14 : (siblingInFocusRoute ? 13 : 12),
      width: size, height: size, padding: 0, border: 'none', background: 'transparent',
      cursor: 'pointer',
      opacity: dimmed ? 0.42 : 1,
      transition: 'all 200ms cubic-bezier(.16,1,.3,1)',
      filter: `drop-shadow(0 ${focused ? 8 : 5}px ${focused ? 14 : 10}px rgba(14,17,22,${focused ? .42 : .32}))`,
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 14, background: w.cover,
        border: `2.5px solid ${borderColor}`,
        boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      }}>
        {/* TYPE BADGE — top-left. Route → coral capsule with step number;
            Standalone → dark capsule with map-pin glyph. */}
        {isRoute ? (
          <div style={{
            position: 'absolute', top: -3, left: -3,
            minWidth: 18, height: 18, padding: '0 4px', borderRadius: 6,
            background: '#FF5A4E', border: '1.5px solid #FFFFFF',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2,
            fontFamily: 'Manrope', fontWeight: 800, fontSize: 9.5,
            color: '#FFFFFF', letterSpacing: '-0.01em',
            boxShadow: '0 1px 3px rgba(14,17,22,0.32)',
          }}>
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 18 C 8 18 10 14 12 12 C 14 10 16 6 20 6"/>
            </svg>
            {w.step + 1}
          </div>
        ) : (
          <div style={{
            position: 'absolute', top: -3, left: -3,
            width: 18, height: 18, borderRadius: 6,
            background: '#0E1116', border: '1.5px solid #FFFFFF',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(14,17,22,0.32)',
          }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none"/>
            </svg>
          </div>
        )}
        {/* author micro-avatar bottom-right corner */}
        <div style={{
          position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 999,
          background: author?.bg || '#FFB1A4',
          border: '2px solid #FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 9, color: '#fff', lineHeight: 1,
        }}>{author?.name[0]}</div>
      </div>
    </button>
  );
}

// ─── CLUSTER PIN ──────────────────────────────────────────────────────────

function WaypointCluster({ c }) {
  return (
    <div style={{
      position: 'absolute', left: c.x - 30, top: c.y - 30, zIndex: 13,
      width: 60, height: 60,
      filter: 'drop-shadow(0 6px 12px rgba(14,17,22,0.36))',
    }}>
      {/* stacked photos — 3 cards offset */}
      {c.photos.slice(0, 3).map((bg, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: i * 4, top: i * -3,
          width: 50, height: 50, borderRadius: 12,
          background: bg,
          border: '2.5px solid #FFFFFF',
          boxSizing: 'border-box',
          zIndex: 10 - i,
        }}/>
      ))}
      {/* count badge */}
      <div style={{
        position: 'absolute', bottom: -4, right: -4,
        padding: '3px 8px', borderRadius: 999,
        background: '#FF5A4E', color: '#fff',
        fontFamily: 'Manrope', fontWeight: 800, fontSize: 11, letterSpacing: '0.02em',
        boxShadow: '0 2px 6px rgba(14,17,22,0.35)',
        zIndex: 20,
        fontVariantNumeric: 'tabular-nums',
      }}>+{c.count}</div>
    </div>
  );
}

// ─── «+ ТОЧКА» PILL — create a standalone waypoint at user location ───

function SMapCreatePointPill({ dark, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 12px 8px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
      background: dark ? 'rgba(22,25,31,0.78)' : 'rgba(255,255,255,0.86)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.04)'}`,
      boxShadow: dark ? '0 8px 22px rgba(0,0,0,0.45)' : '0 4px 14px rgba(14,17,22,0.10)',
      color: dark ? '#F4F6FA' : '#0E1116',
      fontFamily: 'Manrope', fontWeight: 700, fontSize: 12.5,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 6, background: '#FF5A4E', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
      </span>
      Точка
    </button>
  );
}

// ─── LEGEND — explains the two pin types ──────────────────────────────────

function SMapLegend({ dark }) {
  const fg = dark ? '#F4F6FA' : '#0E1116';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      padding: '7px 12px', borderRadius: 999,
      background: dark ? 'rgba(22,25,31,0.78)' : 'rgba(255,255,255,0.86)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.04)'}`,
      boxShadow: dark ? '0 8px 22px rgba(0,0,0,0.45)' : '0 4px 14px rgba(14,17,22,0.10)',
      color: fg, fontFamily: 'Manrope', fontWeight: 700, fontSize: 11,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 14, height: 14, borderRadius: 4, background: '#FF5A4E',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18 C 8 18 10 14 12 12 C 14 10 16 6 20 6"/></svg>
        </span>
        в маршруте
      </span>
      <span style={{ width: 1, height: 12, background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(14,17,22,0.10)' }}/>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 14, height: 14, borderRadius: 4, background: '#0E1116', border: '1px solid rgba(255,255,255,0.18)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
        </span>
        одиночные
      </span>
    </div>
  );
}

// ─── FRIEND STACK PILL ────────────────────────────────────────────────────

function SMapFriendStackPill({ dark, count }) {
  const avatars = SMAP_FRIENDS.slice(0, 4);
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '6px 12px 6px 6px', borderRadius: 999, border: 'none', cursor: 'pointer',
      background: dark ? 'rgba(22,25,31,0.78)' : 'rgba(255,255,255,0.86)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.04)'}`,
      boxShadow: dark ? '0 8px 22px rgba(0,0,0,0.45)' : '0 4px 14px rgba(14,17,22,0.10)',
    }}>
      <div style={{ display: 'flex' }}>
        {avatars.map((a, i) => (
          <div key={a.id} style={{
            width: 22, height: 22, borderRadius: 999, background: a.bg,
            border: `2px solid ${dark ? '#16191F' : '#fff'}`,
            marginLeft: i === 0 ? 0 : -8,
          }}/>
        ))}
      </div>
      <span style={{
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 12,
        color: dark ? '#F4F6FA' : '#0E1116',
      }}>{count}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
        style={{ color: dark ? '#8A93A4' : '#5B6577' }}>
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
  );
}

// ─── BOTTOM CAROUSEL ──────────────────────────────────────────────────────

function WaypointCarousel({ dark, waypoints, friends, focus, onFocus }) {
  // Pick first 6 cards
  const cards = waypoints.slice(0, 6);
  const fg = dark ? '#F4F6FA' : '#0E1116';
  const fg2 = dark ? '#8A93A4' : '#5B6577';
  const surface = dark ? 'rgba(22,25,31,0.92)' : 'rgba(255,255,255,0.96)';

  return (
    <div>
      {/* Section header (chip-style on backdrop) above carousel */}
      <div style={{ padding: '0 16px 8px', display: 'flex' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 999,
          background: surface,
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(14,17,22,0.06)'}`,
          boxShadow: dark ? '0 4px 14px rgba(0,0,0,0.42)' : '0 2px 8px rgba(14,17,22,0.10)',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em',
          color: dark ? '#F4F6FA' : '#0E1116',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#FF5A4E' }}/>
          На неделе у твоих · {waypoints.length}
        </span>
      </div>

      <div style={{
        display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 16px 8px',
        scrollbarWidth: 'none',
      }}>
        {cards.length === 0 ? (
          <div style={{
            padding: '14px 16px', borderRadius: 16,
            background: surface,
            color: fg2, fontFamily: 'Manrope', fontWeight: 600, fontSize: 13,
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          }}>Нет точек в этой категории.</div>
        ) : cards.map(w => {
          const author = friends.find(f => f.id === w.author);
          const isFocus = focus === w.id;
          return (
            <button key={w.id} onClick={() => onFocus(isFocus ? null : w.id)}
              style={{
                flexShrink: 0, width: 200, borderRadius: 16,
                border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                background: surface, color: fg,
                backdropFilter: 'blur(20px) saturate(140%)',
                WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                boxShadow: isFocus
                  ? '0 8px 22px rgba(255,90,78,0.32)'
                  : (dark ? '0 8px 22px rgba(0,0,0,0.45)' : '0 4px 14px rgba(14,17,22,0.12)'),
                outline: isFocus ? '2px solid #FF5A4E' : 'none',
                outlineOffset: 0,
                overflow: 'hidden',
                transition: 'all 200ms cubic-bezier(.16,1,.3,1)',
              }}>
              <div style={{
                width: '100%', height: 110, background: w.cover, position: 'relative',
              }}>
                {/* media indicators */}
                <div style={{
                  position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4,
                }}>
                  <span style={{
                    padding: '3px 6px', borderRadius: 999,
                    background: 'rgba(11,13,17,0.55)', color: '#fff',
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontFamily: 'Manrope', fontWeight: 700, fontSize: 9,
                  }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
                    0:14
                  </span>
                </div>
                {/* category badge */}
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  padding: '3px 8px', borderRadius: 999,
                  background: 'rgba(11,13,17,0.55)', color: '#fff',
                  fontFamily: 'Manrope', fontWeight: 700, fontSize: 9, letterSpacing: '.04em',
                }}>{(SMAP_CATEGORIES.find(c => c.k === w.cat) || {}).label}</div>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{
                  fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 14,
                  letterSpacing: '-0.01em', lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{w.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 999, background: author?.bg, flexShrink: 0 }}/>
                  <span style={{
                    fontFamily: 'Manrope', fontWeight: 600, fontSize: 11, color: fg2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{author?.name} · 200 м</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, {
  SubscriptionsMapScreen,
  WaypointBubble, WaypointCluster, SMapFriendStackPill, SMapCreatePointPill, SMapLegend,
  WaypointCarousel,
  SMAP_FRIENDS, SMAP_CATEGORIES, SMAP_WAYPOINTS, SMAP_ROUTES,
});
